import { useEffect, useMemo, useState } from 'react'
import {
  getRpcService,
  type AsyncState,
  type DentistryAccessContext,
  type DentistryPatient,
  type DentistryReferral,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import './dentistry-page.css'

const DENTISTRY_CAPABILITY = 'emitir_encaminhamento_odontologico_externo'

const statusLabels: Record<string, string> = {
  pending_approval: 'Aguardando aprovação',
  in_progress: 'Em atendimento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const actionLabels: Record<string, string> = {
  start: 'Iniciar atendimento',
  complete: 'Concluir atendimento',
  cancel: 'Cancelar encaminhamento',
}

export type DentistryService = Pick<
  ReturnType<typeof getRpcService>,
  | 'getDentistryAccessContextForInterface'
  | 'searchDentistryPatientsForInterface'
  | 'createDentistryReferralForInterface'
  | 'getDentistryReferralsForInterface'
  | 'manageDentistryReferralForInterface'
>

type Props = Readonly<{
  accessContext: AccessContext
  service?: DentistryService
}>

function errorMessage<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

export function DentistryPage({ accessContext, service }: Props) {
  const rpcService = useMemo(() => service ?? getRpcService(), [service])
  const [backendAccess, setBackendAccess] =
    useState<DentistryAccessContext | null>(null)
  const [patients, setPatients] = useState<readonly DentistryPatient[]>([])
  const [referrals, setReferrals] = useState<readonly DentistryReferral[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  )
  const [patientQuery, setPatientQuery] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(
    null,
  )

  const selectedPatient = patients.find(
    (patient) => patient.patient_id === selectedPatientId,
  )
  const selectedReferral =
    referrals.find((referral) => referral.referral_id === selectedReferralId) ??
    referrals[0] ??
    null

  const localCapabilityAuthorized =
    accessContext.capabilities.includes(DENTISTRY_CAPABILITY)
  const backendAuthorized = Boolean(backendAccess?.can_issue)
  const canManage = Boolean(backendAccess?.can_manage)
  const authorized = backendAccess
    ? backendAuthorized || canManage
    : loading && localCapabilityAuthorized

  const loadReferrals = async () => {
    const result = await rpcService.getDentistryReferralsForInterface(
      statusFilter === 'all' ? null : statusFilter,
      50,
      0,
    )
    if (result.status === 'success') {
      setReferrals(result.data)
      setSelectedReferralId((current) =>
        current && result.data.some((item) => item.referral_id === current)
          ? current
          : (result.data[0]?.referral_id ?? null),
      )
    } else if (result.status === 'empty') {
      setReferrals([])
      setSelectedReferralId(null)
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível carregar histórico.',
      )
    }
  }

  useEffect(() => {
    let active = true
    void rpcService.getDentistryAccessContextForInterface().then((result) => {
      if (!active) return
      if (result.status === 'success') {
        setBackendAccess(result.data)
        setFeedback(null)
      } else if (result.status === 'error') {
        setFeedback(result.error.message)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [rpcService])

  useEffect(() => {
    if (!backendAccess?.can_issue && !backendAccess?.can_manage) return
    let active = true
    void rpcService
      .getDentistryReferralsForInterface(
        statusFilter === 'all' ? null : statusFilter,
        50,
        0,
      )
      .then((result) => {
        if (!active) return
        if (result.status === 'success') {
          setReferrals(result.data)
          setSelectedReferralId((current) =>
            current && result.data.some((item) => item.referral_id === current)
              ? current
              : (result.data[0]?.referral_id ?? null),
          )
        } else if (result.status === 'empty') {
          setReferrals([])
          setSelectedReferralId(null)
        } else if (result.status === 'error') {
          setFeedback(result.error.message)
        }
      })
    return () => {
      active = false
    }
  }, [backendAccess, rpcService, statusFilter])

  async function searchPatients() {
    if (patientQuery.trim().length < 2) {
      setFeedback('Informe ao menos 2 caracteres para buscar o paciente.')
      return
    }
    setSearching(true)
    setFeedback(null)
    const result = await rpcService.searchDentistryPatientsForInterface(
      patientQuery.trim(),
      10,
      0,
    )
    if (result.status === 'success') {
      setPatients(result.data)
      setSelectedPatientId(null)
      if (result.data.length === 0) {
        setFeedback('Nenhum paciente encontrado para este critério.')
      }
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setSearching(false)
  }

  async function createReferral() {
    if (!selectedPatientId || reason.trim().length < 5) {
      setFeedback(
        'Selecione o paciente e informe um motivo operacional válido.',
      )
      return
    }
    setSubmitting(true)
    setFeedback(null)
    const result = await rpcService.createDentistryReferralForInterface(
      selectedPatientId,
      reason.trim(),
    )
    if (result.status === 'success') {
      setPatients([])
      setSelectedPatientId(null)
      setPatientQuery('')
      setReason('')
      setFeedback(
        'Encaminhamento odontológico enviado para a etapa administrativa.',
      )
      await loadReferrals()
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível criar o encaminhamento.',
      )
    }
    setSubmitting(false)
  }

  async function act(action: string) {
    if (!selectedReferral || busy) return
    const payload =
      action === 'cancel' ? 'Cancelamento solicitado pela administração.' : null
    setBusy(true)
    setFeedback(null)
    const result = await rpcService.manageDentistryReferralForInterface(
      selectedReferral.referral_id,
      action,
      payload,
    )
    if (result.status === 'success') {
      setFeedback('Atualização do encaminhamento registrada com sucesso.')
      await loadReferrals()
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível atualizar o encaminhamento.',
      )
    }
    setBusy(false)
  }

  const visibleReferrals = useMemo(
    () =>
      referrals.filter(
        (referral) =>
          statusFilter === 'all' || referral.status === statusFilter,
      ),
    [referrals, statusFilter],
  )

  if (loading && !backendAccess && !localCapabilityAuthorized) {
    return (
      <section className="home-page" aria-labelledby="dentistry-loading-title">
        <div className="home-ops">
          <p className="eyebrow">Odontologia</p>
          <h1 id="dentistry-loading-title">
            Carregando contexto odontológico…
          </h1>
          <p>Validando autorização e fluxo externo do backend CAPO.</p>
        </div>
      </section>
    )
  }

  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="dentistry-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Odontologia</p>
          <h1 id="dentistry-blocked-title">Odontologia indisponível</h1>
          <p>
            {feedback ??
              'O contexto atual não possui autorização para emitir encaminhamento odontológico externo.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="dentistry-page" aria-labelledby="dentistry-title">
      <header className="home-welcome">
        <p className="eyebrow">Continuidade do cuidado</p>
        <h1 id="dentistry-title">Encaminhamento odontológico externo</h1>
        <p>
          Fluxo de emissão e acompanhamento controlado pelo backend do CAPO.
          {backendAccess?.professional_name
            ? ` Emissor atual: ${backendAccess.professional_name}.`
            : ''}
        </p>
      </header>

      <div className="dentistry-layout">
        {backendAccess?.can_issue && <div className="dentistry-panel">
          <h2>Nova emissão</h2>
          <label htmlFor="dentistry-patient-search">Buscar paciente</label>
          <div className="dentistry-search">
            <input
              id="dentistry-patient-search"
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder="Nome, Nº CAPO ou CMS"
              aria-label="Buscar paciente"
            />
            <button
              type="button"
              onClick={() => void searchPatients()}
              disabled={searching}
            >
              {searching ? 'Buscando…' : 'Buscar paciente'}
            </button>
          </div>
          {patients.length > 0 && (
            <ul className="dentistry-results">
              {patients.map((patient) => (
                <li key={patient.patient_id}>
                  <button
                    type="button"
                    aria-label={patient.full_name}
                    onClick={() => setSelectedPatientId(patient.patient_id)}
                    className={
                      selectedPatientId === patient.patient_id ? 'is-selected' : ''
                    }
                  >
                    {patient.full_name} ·{' '}
                    {patient.patient_number ?? 'Nº CAPO não informado'} ·{' '}
                    {patient.cms ?? 'CMS não informado'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedPatient && (
            <div className="dentistry-form">
              <p>
                <strong>Paciente selecionado:</strong>{' '}
                {selectedPatient.full_name}
              </p>
              <label htmlFor="dentistry-reason">Motivo operacional</label>
              <textarea
                id="dentistry-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                aria-label="Motivo operacional"
              />
              <button
                type="button"
                onClick={() => void createReferral()}
                disabled={submitting}
              >
                {submitting ? 'Emitindo…' : 'Emitir encaminhamento'}
              </button>
            </div>
          )}
        </div>}

        <div className="dentistry-panel">
          <h2>Histórico e acompanhamento</h2>
          <label htmlFor="dentistry-status">Status</label>
          <select
            id="dentistry-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending_approval">Aguardando aprovação</option>
            <option value="in_progress">Em atendimento</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>

          {visibleReferrals.length === 0 ? (
            <p>Nenhum encaminhamento odontológico externo foi encontrado.</p>
          ) : (
            <ul className="dentistry-list">
              {visibleReferrals.map((referral) => (
                <li key={referral.referral_id} className="dentistry-item">
                  <button
                    type="button"
                    onClick={() => setSelectedReferralId(referral.referral_id)}
                  >
                    {referral.patient_name}
                  </button>
                  <p>
                    <strong>Status:</strong>{' '}
                    {statusLabels[referral.status] ?? referral.status}
                  </p>
                  <p>
                    <strong>Destino:</strong>{' '}
                    {referral.destination ?? 'Destino institucional CAPO'}
                  </p>
                  <p>
                    <strong>Emissor:</strong>{' '}
                    {referral.requesting_professional_name}
                  </p>
                  <p>
                    <strong>Motivo:</strong> {referral.operational_reason}
                  </p>
                  {canManage && (
                    <div className="dentistry-actions">
                      {referral.status === 'pending_approval' && (
                        <button type="button" onClick={() => void act('start')}>
                          {actionLabels.start}
                        </button>
                      )}
                      {referral.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => void act('complete')}
                        >
                          {actionLabels.complete}
                        </button>
                      )}
                      {['pending_approval', 'in_progress'].includes(
                        referral.status,
                      ) && (
                        <button
                          type="button"
                          onClick={() => void act('cancel')}
                        >
                          {actionLabels.cancel}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedReferral && (
          <div className="dentistry-panel dentistry-history-panel">
            <h3>Histórico do encaminhamento</h3>
            {selectedReferral.history.length === 0 ? (
              <p>Nenhum evento registrado.</p>
            ) : (
              <ul className="dentistry-history-list">
                {selectedReferral.history.map((event) => (
                  <li key={event.event_id}>
                    <strong>{event.actor_name}</strong> · {event.created_at}
                    <div>{event.detail ?? event.event_type}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {feedback && <p className="dentistry-feedback" role="status">{feedback}</p>}
    </section>
  )
}
