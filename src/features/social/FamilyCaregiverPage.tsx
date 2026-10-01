import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import type { ReferralPatient } from '../../lib/supabase/rpc'
import {
  createFamilyCaregiverService,
  type FamilyContext,
  type FamilyCaregiverService,
  type FamilyMember,
} from './family-caregiver-integration'
import './family-caregiver-page.css'

function digits(value: string) {
  return value.replace(/\D/g, '')
}

function openFamilyWhatsApp(phone: string, fullName: string) {
  const clean = digits(phone)
  if (!clean) return
  const normalized = clean.startsWith('55') ? clean : `55${clean}`
  const message = encodeURIComponent(
    `Olá, ${fullName}. Aqui é a equipe do CAPO — Centro de Acolhimento ao Paciente Oncológico.`,
  )
  globalThis.open(
    `https://web.whatsapp.com/send?phone=${encodeURIComponent(normalized)}&text=${message}`,
    '_blank',
    'noopener,noreferrer',
  )
}

export function FamilyCaregiverPage({
  service: serviceProp,
}: Readonly<{
  accessContext: AccessContext
  service?: FamilyCaregiverService
}>) {
  const location = useLocation()
  const service = useMemo(
    () => serviceProp ?? createFamilyCaregiverService(),
    [serviceProp],
  )
  const [patientQuery, setPatientQuery] = useState('')
  const [patients, setPatients] = useState<readonly ReferralPatient[]>([])
  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [context, setContext] = useState<FamilyContext | null>(null)
  const [familyQuery, setFamilyQuery] = useState('')
  const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>(
    [],
  )
  const [form, setForm] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const authorized = context?.can_operate ?? false

  useEffect(() => {
    const stateValue =
      location.state && typeof location.state === 'object'
        ? location.state as Record<string, unknown>
        : null
    const selectedPatientId =
      typeof stateValue?.patientId === 'string' ? stateValue.patientId : ''
    const selectedPatientName =
      typeof stateValue?.patientName === 'string' ? stateValue.patientName : ''

    if (!selectedPatientId) return

    setPatientId(selectedPatientId)
    setPatientName(selectedPatientName)
    setPatientQuery(selectedPatientName)
    setLoading(true)
    setError(null)

    let active = true
    void service.getFamilyContext(selectedPatientId).then((result) => {
      if (!active) return
      if (result.status === 'success') {
        setContext(result.data)
        setError(null)
      } else {
        setContext(null)
        setError(result.status === 'error' ? result.error.message : null)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [location.state, service])

  async function loadContext(id = patientId) {
    if (!id) return
    setLoading(true)
    const result = await service.getFamilyContext(id)
    if (result.status === 'success') {
      setContext(result.data)
      setError(null)
    } else {
      setContext(null)
      setError(result.status === 'error' ? result.error.message : null)
    }
    setLoading(false)
  }

  async function searchPatients() {
    if (patientQuery.trim().length < 2) return
    const result = await service.searchPatients(patientQuery.trim(), 20)
    setPatients(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setError(result.error.message)
  }

  async function searchFamilies() {
    if (!context?.can_admin_correct || familyQuery.trim().length < 2) return
    const result = await service.searchFamilyMembers(familyQuery.trim(), 20)
    setFamilyMembers(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setError(result.error.message)
  }

  function setField(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function write(action: 'create' | 'replace') {
    if (!patientId || busy) return
    if (action === 'replace' && reason.trim().length < 5) {
      setError('Informe o motivo da substituição com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    const input = {
      p_patient_id: patientId,
      p_relationship: form.relationship ?? '',
      p_psychological_interest: form.psychological_interest ?? 'nao',
      p_existing_family_member_id: form.existing_family_member_id || null,
      p_full_name: form.full_name || null,
      p_phone: form.phone || null,
      p_email: form.email || null,
      p_birth_date: form.birth_date || null,
      p_address: form.address || null,
      ...(action === 'replace' ? { p_unlink_reason: reason.trim() } : {}),
    }
    const result =
      action === 'create'
        ? await service.createFamilyLink(input)
        : await service.replaceFamilyLink(input)
    if (result.status === 'success') {
      setFeedback('Vínculo registrado.')
      setReason('')
      await loadContext()
    } else if (result.status === 'error') setError(result.error.message)
    setBusy(false)
  }

  async function closeLink() {
    const linkId = String(
      context?.active_link?.link_id ?? context?.active_link?.id ?? '',
    )
    if (!linkId || reason.trim().length < 5 || busy) {
      setError('Informe o motivo do encerramento com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    const result = await service.closeFamilyLink(linkId, reason.trim())
    if (result.status === 'success') {
      setFeedback('Vínculo encerrado.')
      setReason('')
      await loadContext()
    } else if (result.status === 'error') setError(result.error.message)
    setBusy(false)
  }

  async function updateOperational() {
    const linkId = String(
      context?.active_link?.link_id ?? context?.active_link?.id ?? '',
    )
    if (!linkId || !context?.can_admin_correct || busy) return
    if (reason.trim().length < 5) {
      setError('Informe o motivo da correção com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    const result = await service.updateFamilyLinkOperational({
      p_link_id: linkId,
      p_relationship: form.relationship || null,
      p_psychological_interest: form.psychological_interest || null,
      p_full_name: form.full_name || null,
      p_phone: form.phone || null,
      p_email: form.email || null,
      p_birth_date: form.birth_date || null,
      p_address: form.address || null,
      p_reason: reason.trim(),
    })
    if (result.status === 'success') {
      setFeedback('Dados operacionais atualizados.')
      setReason('')
      await loadContext()
    } else if (result.status === 'error') setError(result.error.message)
    setBusy(false)
  }

  async function requestPsychology() {
    const linkId = String(
      context?.active_link?.link_id ?? context?.active_link?.id ?? '',
    )
    if (!linkId || busy) return
    setBusy(true)
    const result = await service.createPsychologyRequest(linkId)
    if (result.status === 'success') {
      setFeedback('Solicitação administrativa criada.')
      await loadContext()
    } else if (result.status === 'error') setError(result.error.message)
    setBusy(false)
  }

  return (
    <section
      className="family-caregiver-page"
      aria-labelledby="family-caregiver-title"
    >
      <header className="family-caregiver-header">
        <div>
          <p className="eyebrow">Fluxo autorizado</p>
          <h1 id="family-caregiver-title">Familiar / Cuidador</h1>
          <p>
            Somente um familiar pode permanecer ativo por paciente; substituições preservam o histórico.
          </p>
        </div>
        <span className="family-caregiver-connection">
          Conexão — Disponível
        </span>
      </header>

      <a className="family-caregiver-back" href="/">
        ← Voltar ao painel inicial
      </a>

      <section className="family-caregiver-panel">
        <h2>Paciente</h2>
        <div className="family-caregiver-search">
          <label>
            Nome, CMS ou Nº CAPO
            <input
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
            />
          </label>
          <button type="button" onClick={() => void searchPatients()}>
            Buscar paciente
          </button>
        </div>
        {patients.length > 0 && (
          <ul className="family-caregiver-results">
            {patients.map((patient) => (
              <li key={patient.patient_id}>
                <button
                  type="button"
                  onClick={() => {
                    setFeedback(null)
                    setError(null)
                    setPatientId(patient.patient_id)
                    setPatientName(patient.full_name)
                    void loadContext(patient.patient_id)
                  }}
                >
                  {patient.full_name} ·{' '}
                  {patient.cms ??
                    patient.patient_number ??
                    'Identificação disponível'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {patientId && (
          <p className="family-caregiver-selected">
            Paciente selecionado: {patientName}
          </p>
        )}
      </section>
      {loading && <p role="status">Carregando vínculo familiar...</p>}
      {error && (
        <p className="family-caregiver-error" role="alert">
          {error}
        </p>
      )}
      {feedback && (
        <p className="family-caregiver-feedback" role="status">
          {feedback}
        </p>
      )}

      <section
        className="family-caregiver-sections"
        aria-label="Estrutura do módulo"
      >
        <article>
          <h2>Familiar ativo</h2>
          {context?.active_link ? (
            <>
              <p>
                {String(
                  context.active_link.full_name ??
                    context.active_link.family_member_name ??
                    'Familiar identificado',
                )}
              </p>
              <span>
                {String(
                  context.active_link.relationship ?? 'Relação não informada',
                )}{' '}
                · início{' '}
                {String(context.active_link.linked_at ?? 'não informado')}
              </span>
              {typeof context.active_link.phone === 'string' &&
                context.active_link.phone.trim() && (
                  <button
                    type="button"
                    onClick={() =>
                      openFamilyWhatsApp(
                        String(context.active_link?.phone ?? ''),
                        String(
                          context.active_link?.full_name ??
                            context.active_link?.family_member_name ??
                            'Familiar',
                        ),
                      )
                    }
                  >
                    WhatsApp do familiar
                  </button>
                )}
            </>
          ) : (
            <>
              <p>Nenhum familiar ativo para o paciente selecionado.</p>
              <span>
                Selecione um paciente para consultar o familiar/cuidador vinculado.
              </span>
            </>
          )}
        </article>
        <article>
          <h2>Histórico de vínculos</h2>
          <p>{context?.history.length ?? 0} vínculo(s) encerrado(s)</p>
          <span>
            Vínculos anteriores permanecem preservados no histórico.
          </span>
        </article>
      </section>

      {patientId && authorized && (
        <section className="family-caregiver-panel">
          <h2>Vincular / substituir familiar</h2>
          <div className="family-caregiver-form">
            {(
              [
                'full_name',
                'relationship',
                'phone',
                'email',
                'birth_date',
                'address',
              ] as const
            ).map((field) => (
              <label key={field}>
                {field === 'full_name'
                  ? 'Nome completo'
                  : field === 'relationship'
                    ? 'Relação'
                    : field === 'phone'
                      ? 'Telefone'
                      : field === 'email'
                        ? 'E-mail'
                        : field === 'birth_date'
                          ? 'Data de nascimento'
                          : field === 'address'
                            ? 'Endereço'
                            : field}
                <input
                  type={field === 'birth_date' ? 'date' : 'text'}
                  value={form[field] ?? ''}
                  onChange={(event) => setField(field, event.target.value)}
                />
              </label>
            ))}
            <label>
              Interesse psicológico
              <select
                value={form.psychological_interest ?? 'nao'}
                onChange={(event) =>
                  setField('psychological_interest', event.target.value)
                }
              >
                <option value="nao">Não</option>
                <option value="avaliacao">Avaliação</option>
              </select>
            </label>
          </div>
          {context?.can_admin_correct && (
            <div className="family-caregiver-search">
              <label>
                Buscar familiar existente
                <input
                  value={familyQuery}
                  onChange={(event) => setFamilyQuery(event.target.value)}
                />
              </label>
              <button type="button" onClick={() => void searchFamilies()}>
                Buscar familiar
              </button>
            </div>
          )}
          {context?.can_admin_correct && familyMembers.length > 0 && (
            <ul className="family-caregiver-results">
              {familyMembers.map((member, index) => {
                const familyMemberId = String(
                  member.family_member_id ?? member.id ?? '',
                )
                return (
                  <li key={familyMemberId || String(index)}>
                    <button
                      type="button"
                      disabled={!familyMemberId}
                      onClick={() =>
                        setField('existing_family_member_id', familyMemberId)
                      }
                    >
                      {String(member.full_name ?? member.name ?? 'Familiar')}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {context?.active_link && (
            <label>
              Motivo da substituição/encerramento
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <div className="family-caregiver-actions">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void write(context?.active_link ? 'replace' : 'create')
              }
            >
              {context?.active_link
                ? 'Substituir familiar'
                : 'Vincular familiar'}
            </button>
            {context?.active_link && context.can_admin_correct && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void updateOperational()}
              >
                Atualizar dados operacionais
              </button>
            )}
            {context?.active_link && context.can_admin_correct && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void closeLink()}
              >
                Encerrar vínculo
              </button>
            )}
            {context?.active_link &&
              String(context.active_link.psychological_interest) ===
                'avaliacao' && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void requestPsychology()}
                >
                  Solicitar avaliação psicológica
                </button>
              )}
          </div>
        </section>
      )}
      {context?.history.length ? (
        <section className="family-caregiver-panel">
          <h2>Histórico de substituições</h2>
          <ul className="family-caregiver-history">
            {context.history.map((item, index) => (
              <li key={String(item.link_id ?? item.id ?? index)}>
                <strong>
                  {String(
                    item.full_name ?? item.family_member_name ?? 'Familiar',
                  )}
                </strong>
                <span>
                  {String(item.relationship ?? 'Relação não informada')} ·{' '}
                  {String(item.linked_at ?? 'início não informado')} até{' '}
                  {String(item.unlinked_at ?? 'ativo')}
                </span>
                {Boolean(item.unlink_reason) && (
                  <small>Motivo: {String(item.unlink_reason)}</small>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

    </section>
  )
}
