import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessContext } from '../../types/access'
import {
  getRpcService,
  type AsyncState,
  type InterprofessionalReferral,
  type ReferralEvent,
  type ReferralPatient,
  type ReferralSpecialty,
  type ReferralTarget,
} from '../../lib/supabase/rpc'
import './referrals-page.css'

type Service = Pick<
  ReturnType<typeof getRpcService>,
  | 'getReferralSpecialties'
  | 'getReferralTargets'
  | 'searchReferralPatients'
  | 'getInterprofessionalReferrals'
  | 'getReferralEvents'
  | 'createInterprofessionalReferral'
  | 'updateInterprofessionalReferral'
>

type Props = Readonly<{ accessContext: AccessContext; service?: Service }>

const statusLabels: Record<string, string> = {
  pending_approval: 'Aguardando triagem',
  approved: 'Aprovado / atribuído',
  in_progress: 'Em atendimento',
  completed: 'Concluído',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
}

const eventLabels: Record<string, string> = {
  created: 'Encaminhamento criado',
  approved: 'Aprovado e atribuído',
  started: 'Atendimento iniciado',
  providence_recorded: 'Providência registrada',
  completed: 'Concluído',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
}

function errorMessage<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function ReferralsPage({
  accessContext,
  service = getRpcService(),
}: Props) {
  const [view, setView] = useState('recebidos')
  const [direction, setDirection] = useState('all')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<readonly InterprofessionalReferral[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [events, setEvents] = useState<readonly ReferralEvent[]>([])
  const [specialties, setSpecialties] = useState<readonly ReferralSpecialty[]>(
    [],
  )
  const [targets, setTargets] = useState<readonly ReferralTarget[]>([])
  const [patients, setPatients] = useState<readonly ReferralPatient[]>([])
  const [patientQuery, setPatientQuery] = useState('')
  const [patientId, setPatientId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [targetId, setTargetId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const selected = items.find((item) => item.referral_id === selectedId) ?? null
  const roleCodes = useMemo(
    () => accessContext.roles.map((role) => role.code),
    [accessContext.roles],
  )
  const canManage = roleCodes.some((role) =>
    ['administrador', 'administrativo_operacional', 'coordenador'].includes(role),
  )
  const canCreate =
    Boolean(accessContext.professional_id) &&
    accessContext.capabilities.includes('encaminhamento_interprofissional')
  const isRequester =
    selected?.requesting_professional_id === accessContext.professional_id
  const isRecipient =
    selected?.target_professional_id === accessContext.professional_id

  const loadItems = useCallback(async () => {
    setLoading(true)
    const result = await service.getInterprofessionalReferrals(
      direction,
      status || null,
      100,
      0,
    )
    if (result.status === 'success') {
      setItems(result.data)
      setSelectedId((current) =>
        current && result.data.some((item) => item.referral_id === current)
          ? current
          : null,
      )
    } else if (result.status === 'empty') {
      setItems([])
      setSelectedId(null)
    } else setFeedback(errorMessage(result))
    setLoading(false)
  }, [direction, service, status])

  const loadEvents = useCallback(
    async (referralId: string) => {
      const result = await service.getReferralEvents(referralId, 100, 0)
      setEvents(result.status === 'success' ? result.data : [])
      if (result.status === 'error') setFeedback(result.error.message)
    },
    [service],
  )

  useEffect(() => {
    let active = true
    void service
      .getInterprofessionalReferrals(direction, status || null, 100, 0)
      .then((result) => {
        if (!active) return
        if (result.status === 'success') setItems(result.data)
        else if (result.status === 'empty') setItems([])
        else setFeedback(errorMessage(result))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [direction, service, status])

  useEffect(() => {
    if (!selectedId) return
    let active = true
    void service.getReferralEvents(selectedId, 100, 0).then((result) => {
      if (!active) return
      setEvents(result.status === 'success' ? result.data : [])
      if (result.status === 'error') setFeedback(result.error.message)
    })
    return () => {
      active = false
    }
  }, [selectedId, service])

  useEffect(() => {
    if (!canCreate) return
    void service.getReferralSpecialties().then((result) => {
      if (result.status === 'success') setSpecialties(result.data)
      else if (result.status === 'error') setFeedback(result.error.message)
    })
  }, [canCreate, service])

  useEffect(() => {
    if (!canManage || selected?.status !== 'pending_approval') return
    void service
      .getReferralTargets(selected.requested_specialty_id)
      .then((result) => {
        if (result.status === 'success') setTargets(result.data)
        else if (result.status === 'error') setFeedback(result.error.message)
      })
  }, [canManage, selected?.requested_specialty_id, selected?.status, service])

  async function searchPatients() {
    if (patientQuery.trim().length < 2) {
      setFeedback('Informe ao menos dois caracteres para buscar o paciente.')
      return
    }
    const result = await service.searchReferralPatients(
      patientQuery.trim(),
      20,
      0,
    )
    setPatients(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setFeedback(result.error.message)
  }

  async function createReferral() {
    if (!patientId || !specialtyId || reason.trim().length < 5) {
      setFeedback(
        'Selecione paciente e destino e informe o motivo operacional.',
      )
      return
    }
    setBusy(true)
    const result = await service.createInterprofessionalReferral(
      patientId,
      specialtyId,
      reason.trim(),
    )
    if (result.status === 'success') {
      setPatientId('')
      setPatientQuery('')
      setPatients([])
      setSpecialtyId('')
      setReason('')
      setDirection('sent')
      setFeedback('Encaminhamento enviado para triagem administrativa.')
      await loadItems()
      setSelectedId(result.data.referral_id)
    } else setFeedback(errorMessage(result))
    setBusy(false)
  }

  async function act(action: string) {
    if (!selected || busy) return
    if (action === 'approve' && !targetId) {
      setFeedback('Selecione o profissional destinatário.')
      return
    }
    if (
      ['record', 'complete', 'reject', 'cancel'].includes(action) &&
      detail.trim().length < 5
    ) {
      setFeedback('Informe uma providência ou justificativa válida.')
      return
    }
    setBusy(true)
    const result = await service.updateInterprofessionalReferral(
      selected.referral_id,
      action,
      detail.trim() || null,
      action === 'approve' ? targetId : null,
    )
    if (result.status === 'success') {
      setDetail('')
      setFeedback('Encaminhamento atualizado e registrado no histórico.')
      await loadItems()
      await loadEvents(selected.referral_id)
    } else setFeedback(errorMessage(result))
    setBusy(false)
  }

  const open =
    selected &&
    !['completed', 'rejected', 'cancelled'].includes(selected.status)

  return (
    <section className="referrals-page" aria-labelledby="referrals-title">
      <header className="referrals-header">
        <div>
          <p className="eyebrow">Fluxos e Providências</p>
          <h2 id="referrals-title">Encaminhamentos</h2>
          <p>Receber, encaminhar e acompanhar providências administrativas autorizadas.</p>
        </div>
        <div className="referral-filters">
          <label>
            Direção
            <select
              value={direction}
              onChange={(e) => {
                setLoading(true)
                setSelectedId(null)
                setEvents([])
                setDirection(e.target.value)
              }}
            >
              <option value="all">Todos</option>
              <option value="sent">Enviados</option>
              <option value="received">Recebidos</option>
            </select>
          </label>
          <label>
            Situação
            <select
              value={status}
              onChange={(e) => {
                setLoading(true)
                setSelectedId(null)
                setEvents([])
                setStatus(e.target.value)
              }}
            >
              <option value="">Todas</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <nav className="referrals-status-tabs" aria-label="Visões de encaminhamentos">
        {[
          ['recebidos', 'Recebidos', 'received', ''],
          ['enviados', 'Enviados', 'sent', ''],
          ['andamento', 'Em andamento', 'all', 'in_progress'],
          ['concluidos', 'Concluídos', 'all', 'completed'],
        ].map(([value, label, nextDirection, nextStatus]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => {
              setView(value)
              setLoading(true)
              setSelectedId(null)
              setEvents([])
              setDirection(nextDirection)
              setStatus(nextStatus)
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {feedback && (
        <p className="referrals-feedback" role="status">
          {feedback}
        </p>
      )}

      {canCreate && (
        <article className="referrals-card referral-create">
          <h3>Novo encaminhamento</h3>
          <div className="patient-search">
            <label>
              Buscar paciente por nome, CMS ou nº CAPO
              <input
                value={patientQuery}
                onChange={(e) => {
                  setPatientQuery(e.target.value)
                  setPatientId('')
                }}
              />
            </label>
            <button type="button" onClick={() => void searchPatients()}>
              Buscar
            </button>
          </div>
          {patients.length > 0 && (
            <div className="patient-results" aria-label="Pacientes encontrados">
              {patients.map((patient) => (
                <button
                  type="button"
                  key={patient.patient_id}
                  className={
                    patientId === patient.patient_id ? 'is-selected' : undefined
                  }
                  onClick={() => {
                    setPatientId(patient.patient_id)
                    setPatientQuery(patient.full_name)
                  }}
                >
                  <strong>{patient.full_name}</strong>
                  <small>
                    CMS {patient.cms ?? '—'} · Nº CAPO{' '}
                    {patient.patient_number ?? '—'}
                  </small>
                </button>
              ))}
            </div>
          )}
          <label>
            Especialidade de destino
            <select
              value={specialtyId}
              onChange={(e) => setSpecialtyId(e.target.value)}
            >
              <option value="">Selecionar</option>
              {specialties.map((specialty) => (
                <option
                  key={specialty.specialty_id}
                  value={specialty.specialty_id}
                >
                  {specialty.specialty_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Informação operacional
            <textarea
              value={reason}
              maxLength={1000}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createReferral()}
          >
            Enviar para triagem
          </button>
        </article>
      )}

      <div className="referrals-layout">
        <article className="referrals-card">
          <h3>
            Encaminhamentos {loading ? '— carregando…' : `— ${items.length}`}
          </h3>
          {!loading && items.length === 0 && (
            <p>Nenhum encaminhamento encontrado.</p>
          )}
          <div className="referrals-list">
            {items.map((item) => (
              <button
                type="button"
                key={item.referral_id}
                className={
                  item.referral_id === selectedId ? 'is-selected' : undefined
                }
                onClick={() => {
                  setSelectedId(item.referral_id)
                  setEvents([])
                  setTargets([])
                  setTargetId('')
                  setFeedback(null)
                }}
              >
                <strong>{item.patient_name}</strong>
                <span>
                  {item.origin_specialty_name ?? 'Origem não registrada'} →{' '}
                  {item.requested_specialty_name}
                </span>
                <small>
                  {statusLabels[item.status] ?? item.status} ·{' '}
                  {dateTime(item.updated_at)}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="referrals-card referral-detail">
          {!selected ? (
            <p>
              Selecione um encaminhamento para consultar o detalhe e o
              histórico.
            </p>
          ) : (
            <>
              <h3>{selected.patient_name}</h3>
              <dl className="referral-summary">
                <div>
                  <dt>Situação</dt>
                  <dd>{statusLabels[selected.status] ?? selected.status}</dd>
                </div>
                <div>
                  <dt>Origem</dt>
                  <dd>
                    {selected.origin_specialty_name ?? 'Não registrada'} ·{' '}
                    {selected.requesting_professional_name}
                  </dd>
                </div>
                <div>
                  <dt>Destino</dt>
                  <dd>{selected.requested_specialty_name}</dd>
                </div>
                <div>
                  <dt>Responsável</dt>
                  <dd>
                    {selected.target_professional_name ??
                      'Aguardando atribuição'}
                  </dd>
                </div>
              </dl>
              <section className="referral-text">
                <h4>Informação operacional</h4>
                <p>{selected.operational_reason}</p>
              </section>
              {selected.response && (
                <section className="referral-text">
                  <h4>Última providência</h4>
                  <p>{selected.response}</p>
                </section>
              )}

              {open && (canManage || isRequester || isRecipient) && (
                <div className="referral-actions">
                  {canManage && selected.status === 'pending_approval' && (
                    <label>
                      Profissional destinatário
                      <select
                        value={targetId}
                        onChange={(e) => setTargetId(e.target.value)}
                      >
                        <option value="">Selecionar</option>
                        {targets.map((target) => (
                          <option
                            key={target.professional_id}
                            value={target.professional_id}
                          >
                            {target.professional_name}
                          </option>
                        ))}
                      </select>
                      {targets.length === 0 && (
                        <small>
                          Nenhum profissional ativo com conta vinculada nesta
                          especialidade.
                        </small>
                      )}
                    </label>
                  )}
                  <label>
                    Providência, contrarreferência ou justificativa
                    <textarea
                      value={detail}
                      maxLength={1000}
                      onChange={(e) => setDetail(e.target.value)}
                    />
                  </label>
                  <div>
                    {canManage && selected.status === 'pending_approval' && (
                      <button
                        disabled={busy}
                        onClick={() => void act('approve')}
                      >
                        Aprovar e atribuir
                      </button>
                    )}
                    {canManage && selected.status === 'pending_approval' && (
                      <button
                        disabled={busy}
                        onClick={() => void act('reject')}
                      >
                        Recusar
                      </button>
                    )}
                    {(canManage || isRecipient) &&
                      selected.status === 'approved' && (
                        <button
                          disabled={busy}
                          onClick={() => void act('start')}
                        >
                          Iniciar atendimento
                        </button>
                      )}
                    {(canManage || isRecipient) &&
                      selected.status === 'in_progress' && (
                        <button
                          disabled={busy}
                          onClick={() => void act('record')}
                        >
                          Registrar providência
                        </button>
                      )}
                    {(canManage || isRecipient) &&
                      ['approved', 'in_progress'].includes(selected.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void act('complete')}
                        >
                          Concluir
                        </button>
                      )}
                    {(canManage ||
                      (isRequester &&
                        selected.status === 'pending_approval')) && (
                      <button
                        disabled={busy}
                        onClick={() => void act('cancel')}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              )}

              <section className="referral-history">
                <h4>Histórico</h4>
                {events.length === 0 && <p>Nenhum evento registrado.</p>}
                {events.map((event) => (
                  <article key={event.event_id}>
                    <strong>
                      {eventLabels[event.event_type] ?? event.event_type}
                    </strong>
                    <span>
                      {event.actor_name} · {dateTime(event.created_at)}
                    </span>
                    {event.detail && <p>{event.detail}</p>}
                  </article>
                ))}
              </section>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
