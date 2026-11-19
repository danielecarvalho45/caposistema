import { CapoDateInput } from '../../components/inputs/CapoDateInput'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type NoShowContact,
  type NoShowContactInput,
  type NoShowContactRegistration,
  type NoShowFollowup,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import './no-shows-page.css'

type NoShowsService = Pick<
  ReturnType<typeof getRpcService>,
  | 'getNoShowFollowups'
  | 'getNoShowContacts'
  | 'registerNoShowContact'
>

const defaultService = getRpcService()

const statusLabels: Readonly<Record<string, string>> = {
  pendente: 'Pendente',
  em_contato: 'Em contato',
  contatado: 'Contatado',
  nao_localizado: 'Não localizado',
  recusou: 'Recusou',
  remarcacao_solicitada: 'Remarcação solicitada',
  encerrado: 'Encerrado',
}

const noShowColumns = [
  { id: 'novas', title: 'Ocorrências novas', empty: 'Nenhuma ocorrência nova.' },
  { id: 'pendentes', title: 'Ocorrências pendentes', empty: 'Nenhuma ocorrência pendente.' },
  { id: 'encerradas', title: 'Ocorrências encerradas', empty: 'Nenhuma ocorrência encerrada.' },
] as const

function noShowColumn(status: string): typeof noShowColumns[number]['id'] {
  if (status === 'pendente') return 'novas'
  if (status === 'encerrado') return 'encerradas'
  return 'pendentes'
}

const methodLabels: Readonly<Record<string, string>> = {
  phone: 'Telefone',
  whatsapp: 'WhatsApp',
  in_person: 'Presencial',
  other: 'Outro',
}

function canManageNoShows(accessContext: AccessContext) {
  return accessContext.roles.some((role) =>
    ['administrador', 'coordenador', 'administrativo_operacional'].includes(
      role.code,
    ),
  )
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return 'Não informado'
  if (!includeTime && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')
    return `${day}/${month}/${year}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(date)
}

function stateError<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

export function NoShowsPage({
  accessContext,
  service = defaultService,
  initialContextId = null,
}: Readonly<{
  accessContext: AccessContext
  service?: NoShowsService
  initialContextId?: string | null
}>) {
  const [view, setView] = useState<
    'faltas' | 'contatos' | 'motivo' | 'remarcar'
  >('faltas')
  const [searchParams] = useSearchParams()
  const selectedId = searchParams.get('ocorrencia') || initialContextId
  const [hasMoreOccurrences, setHasMoreOccurrences] = useState(false)
  const [loadingMoreOccurrences, setLoadingMoreOccurrences] = useState(false)
  const [followups, setFollowups] =
    useState<AsyncState<readonly NoShowFollowup[]>>(loadingState)
  const [contacts, setContacts] = useState<
    AsyncState<readonly NoShowContact[]>
  >({ status: 'empty' })
  const [contactMethod, setContactMethod] = useState('phone')
  const [contactResult, setContactResult] = useState('')
  const [acceptedService, setAcceptedService] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [notes, setNotes] = useState('')
  const [nextContactDate, setNextContactDate] = useState('')
  const [newStatus, setNewStatus] = useState('contatado')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const authorized = canManageNoShows(accessContext)
  const canExecuteContact = accessContext.roles.some((role) =>
    ['administrador', 'administrativo_operacional', 'coordenador'].includes(role.code),
  )

  const loadFollowups = useCallback(async () => {
    setFollowups(loadingState())
    const result = await service.getNoShowFollowups(null, 100, 0)
    setFollowups(result)
    setHasMoreOccurrences(result.status === 'success' && result.data.length === 100)
  }, [service])

  async function loadMoreFollowups() {
    if (loadingMoreOccurrences || followups.status !== 'success' || !hasMoreOccurrences) return
    setLoadingMoreOccurrences(true)
    const next = await service.getNoShowFollowups(null, 100, followups.data.length)
    if (next.status === 'success') {
      const existing = new Set(followups.data.map((item) => item.followup_id))
      const extra = next.data.filter((item) => !existing.has(item.followup_id))
      setFollowups({ status: 'success', data: [...followups.data, ...extra] })
      setHasMoreOccurrences(next.data.length === 100 && extra.length > 0)
    } else if (next.status === 'empty') {
      setHasMoreOccurrences(false)
    } else if (next.status === 'error') {
      setHasMoreOccurrences(false)
      setFeedback('Não foi possível carregar mais ocorrências: ' + next.error.message)
    }
    setLoadingMoreOccurrences(false)
  }

  const loadContacts = useCallback(
    async (followupId: string) => {
      setContacts(loadingState())
      setContacts(await service.getNoShowContacts(followupId))
    },
    [service],
  )

  useEffect(() => {
    if (!authorized) return
    let active = true
    void service
      .getNoShowFollowups(null, 100, 0)
      .then((state) => {
        if (!active) return
        setFollowups(state)
        setHasMoreOccurrences(state.status === 'success' && state.data.length === 100)
      })
    return () => {
      active = false
    }
  }, [authorized, service])

  useEffect(() => {
    if (!authorized || !selectedId) return
    let active = true
    void service
      .getNoShowContacts(selectedId)
      .then((state) => active && setContacts(state))
    return () => {
      active = false
    }
  }, [authorized, selectedId, service])

  const selected =
    followups.status === 'success'
      ? (followups.data.find((item) => item.followup_id === selectedId) ?? null)
      : null

  // Os links de notificações podem apontar para ocorrências fora do primeiro lote.
  // Carrega os lotes seguintes apenas até localizar a ocorrência solicitada.
  useEffect(() => {
    if (!authorized || !selectedId || followups.status !== 'success'
      || followups.data.some((item) => item.followup_id === selectedId)
      || !hasMoreOccurrences || loadingMoreOccurrences) return
    void loadMoreFollowups()
  }, [authorized, selectedId, followups, hasMoreOccurrences, loadingMoreOccurrences])

  async function reloadSelected() {
    await loadFollowups()
    if (selectedId) await loadContacts(selectedId)
  }

  async function submitContact(event: FormEvent) {
    event.preventDefault()
    if (!selectedId || contactResult.trim().length < 2) {
      setFeedback(
        'Informe um resultado de contato com pelo menos 2 caracteres.',
      )
      return
    }

    const input: NoShowContactInput = {
      followupId: selectedId,
      contactMethod,
      contactResult: contactResult.trim(),
      acceptedService:
        acceptedService === '' ? null : acceptedService === 'sim',
      nextAction: nextAction.trim() || null,
      notes: notes.trim() || null,
      nextContactDate: nextContactDate || null,
      newStatus,
    }

    setBusy(true)
    setFeedback(null)
    const result: AsyncState<NoShowContactRegistration> =
      await service.registerNoShowContact(input)
    if (result.status !== 'success') {
      setFeedback(
        stateError(result) ?? 'Não foi possível registrar o acompanhamento.',
      )
      setBusy(false)
      return
    }

    setContactResult('')
    setNextAction('')
    setNotes('')
    setNextContactDate('')
    setFeedback('Contato e providência registrados no CAPO.')
    await reloadSelected()
    setBusy(false)
  }


  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="no-shows-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Faltosos</p>
          <h2 id="no-shows-blocked-title">Acompanhamento indisponível</h2>
          <p>
            O contexto atual não pode operar o fluxo administrativo de faltosos.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="no-shows-page" aria-labelledby="no-shows-title">
      <header className="no-shows-header">
        <div>
          <p className="eyebrow">Atendimento e Acompanhamento</p>
          <h2 id="no-shows-title">{selectedId ? 'Acompanhamento de Faltosos' : 'Faltosos'}</h2>
          <p>
            Fluxo originado pela Falta registrada na agenda profissional. Não é
            Busca Ativa.
          </p>
        </div>
        <div className="no-shows-toolbar">
          {selectedId && <Link className="no-shows-back" to="/faltosos" state={{ contextId: null }}>
            Voltar para Faltosos
          </Link>}
          <button type="button" onClick={() => void loadFollowups()}>
            Atualizar
          </button>
        </div>
      </header>

      {selectedId && <div className="no-shows-status-tabs" aria-label="Visões de faltosos">
        {[
          ['faltas', 'Acompanhar faltas'],
          ['contatos', 'Contatos'],
          ['motivo', 'Motivo / providência'],
          ['remarcar', 'Remanejamento / Remarcação'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value as typeof view)}
          >
            {label}
          </button>
        ))}
      </div>}

      {!selectedId && <div className="no-shows-board" aria-label="Ocorrências por etapa">
        {noShowColumns.map((column) => {
          const occurrences = followups.status === 'success'
            ? followups.data.filter((item) => noShowColumn(item.active_search_status) === column.id)
            : []
          return (
            <article className="no-shows-card no-shows-column" key={column.id}>
              <h3>{column.title} <span className="no-shows-count">{occurrences.length}</span></h3>
              {followups.status === 'loading' && <p>Carregando faltosos…</p>}
              {followups.status === 'error' && <p role="alert">Não foi possível carregar: {followups.error.message}</p>}
              {(followups.status === 'empty' || (followups.status === 'success' && occurrences.length === 0)) && (
                <p className="no-shows-empty">{column.empty}</p>
              )}
              {occurrences.length > 0 && (
                <div className="no-shows-list">
                  {occurrences.map((item) => (
                    <Link key={item.followup_id}
                      to={`/faltosos?ocorrencia=${encodeURIComponent(item.followup_id)}`}
                      className="no-shows-occurrence-link">
                      <strong>{item.patient_name}</strong>
                      <span>{statusLabels[item.active_search_status] ?? item.active_search_status}</span>
                      <small>Falta em {formatDate(item.no_show_date)} · {item.professional_name ?? 'Profissional não informado'}</small>
                    </Link>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>}

      {!selectedId && hasMoreOccurrences && followups.status === 'success' && (
        <button type="button" className="no-shows-load-more"
          disabled={loadingMoreOccurrences} onClick={() => void loadMoreFollowups()}>
          {loadingMoreOccurrences ? 'Carregando ocorrências…' : 'Carregar mais ocorrências'}
        </button>
      )}

      {selectedId && <div className="no-shows-layout">
        <article
          className="no-shows-card"
          aria-labelledby="no-show-detail-title"
        >
          <h3 id="no-show-detail-title">{{
            faltas: 'Acompanhamento',
            contatos: 'Contatos',
            motivo: 'Motivo / providência',
            remarcar: 'Remanejamento / Remarcação',
          }[view]}</h3>
          {!selected && (
            <p role="status">
              {followups.status === 'loading'
                ? 'Carregando acompanhamento…'
                : 'Ocorrência não encontrada nesta consulta. Volte para Faltosos e atualize a lista.'}
            </p>
          )}
          {selected && (
            <>
              <dl className="no-show-summary">
                <div>
                  <dt>Paciente</dt>
                  <dd>{selected.patient_name}</dd>
                </div>
                <div>
                  <dt>Nº CAPO</dt>
                  <dd>{selected.patient_number ?? 'Não informado'}</dd>
                </div>
                <div>
                  <dt>CMS</dt>
                  <dd>{selected.cms ?? 'Não informado'}</dd>
                </div>
                <div>
                  <dt>Tentativas</dt>
                  <dd>{selected.contact_attempts}</dd>
                </div>
                <div>
                  <dt>Próximo contato</dt>
                  <dd>{formatDate(selected.next_contact_date)}</dd>
                </div>
                <div>
                  <dt>Situação</dt>
                  <dd>
                    {statusLabels[selected.active_search_status] ??
                      selected.active_search_status}
                  </dd>
                </div>
              </dl>

              {view === 'faltas' && (
                <p className="no-show-feedback">Selecione Contatos para registrar a comunicação, Motivo / providência para registrar o desfecho, ou Remanejamento / Remarcação para agendar.</p>
              )}

              {view === 'contatos' && canExecuteContact && (
                <PatientWhatsAppButton
                  patientId={selected.patient_id}
                  label="WhatsApp do paciente"
                />
              )}

              {canExecuteContact && (view === 'contatos' || view === 'motivo') && (
                selected.active_search_status === 'encerrado'
                  ? <p className="no-show-feedback">Acompanhamento encerrado. Os registros anteriores permanecem no histórico.</p>
                  : <form className="no-show-form" onSubmit={submitContact}>
                <h4>{view === 'contatos' ? 'Registrar contato' : 'Registrar motivo e providência'}</h4>
                <label>
                  Meio de contato
                  <select
                    value={contactMethod}
                    onChange={(event) => setContactMethod(event.target.value)}
                  >
                    {Object.entries(methodLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Resultado
                  <input
                    value={contactResult}
                    maxLength={500}
                    onChange={(event) => setContactResult(event.target.value)}
                  />
                </label>
                {view === 'contatos' && <label>
                  Aceitou o serviço
                  <select
                    value={acceptedService}
                    onChange={(event) => setAcceptedService(event.target.value)}
                  >
                    <option value="">Não informado</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </label>}
                <label>
                  Nova situação
                  <select
                    value={newStatus}
                    onChange={(event) => setNewStatus(event.target.value)}
                  >
                    {[
                      'em_contato',
                      'contatado',
                      'nao_localizado',
                      'recusou',
                      'encerrado',
                    ].map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                {view === 'motivo' && <label>
                  Próximo contato
                  <CapoDateInput
                    
                    value={nextContactDate}
                    onChange={(event) => setNextContactDate(event.target.value)}
                  />
                </label>}
                {view === 'motivo' && <label className="span-all">
                  Próxima ação
                  <textarea
                    value={nextAction}
                    maxLength={500}
                    onChange={(event) => setNextAction(event.target.value)}
                  />
                </label>}
                {view === 'motivo' && <label className="span-all">
                  Observação administrativa
                  <textarea
                    value={notes}
                    maxLength={1000}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>}
                <button type="submit" disabled={busy}>
                  {view === 'contatos' ? 'Registrar contato' : 'Registrar providência'}
                </button>
              </form>
              )}

              {view === 'remarcar' && <div className="no-show-reschedule">
                <h4>Remarcação</h4>
                {selected.active_search_status === 'encerrado' ? (
                  <p>Ocorrência encerrada. Consulte o histórico de remarcação.</p>
                ) : (
                  <>
                    {selected.rescheduling_requested && (
                      <p>Remarcação já solicitada. Abra a agenda do profissional para concluir.</p>
                    )}
                    <Link
                      to="/agenda"
                      state={{
                        patientId: selected.patient_id,
                        patientName: selected.patient_name,
                        professionalId: selected.professional_id,
                        appointmentId: selected.appointment_id,
                        origin: 'no_show_reschedule',
                      }}
                    >
                      Agendar
                    </Link>
                  </>
                )}
              </div>}
              {feedback && (
                <p className="no-show-feedback" role="status">
                  {feedback}
                </p>
              )}

              {(view === 'contatos' || view === 'motivo' || view === 'faltas') && <div className="no-show-history">
                <h4>Histórico de contatos</h4>
                {contacts.status === 'loading' && <p>Carregando histórico…</p>}
                {contacts.status === 'error' && (
                  <p role="alert">
                    Não foi possível carregar o histórico:{' '}
                    {contacts.error.message}
                  </p>
                )}
                {(contacts.status === 'empty' ||
                  (contacts.status === 'success' &&
                    contacts.data.length === 0)) && (
                  <p>Nenhum contato registrado.</p>
                )}
                {contacts.status === 'success' &&
                  contacts.data.map((contact) => (
                    <article key={contact.contact_id}>
                      <strong>
                        {methodLabels[contact.contact_method] ??
                          contact.contact_method}
                      </strong>
                      <span>{formatDate(contact.created_at, true)}</span>
                      <p>{contact.contact_result}</p>
                      <small>
                        Situação registrada:{' '}
                        {statusLabels[contact.resulting_status] ??
                          contact.resulting_status}
                      </small>
                      {contact.accepted_service !== null && (
                        <small>
                          Aceitou o serviço:{' '}
                          {contact.accepted_service ? 'Sim' : 'Não'}
                        </small>
                      )}
                      {contact.next_action && (
                        <small>Próxima ação: {contact.next_action}</small>
                      )}
                      {contact.next_contact_date && (
                        <small>
                          Próximo contato:{' '}
                          {formatDate(contact.next_contact_date)}
                        </small>
                      )}
                      {contact.notes && <p>{contact.notes}</p>}
                    </article>
                  ))}
              </div>}
            </>
          )}
        </article>
      </div>}
    </section>
  )
}
