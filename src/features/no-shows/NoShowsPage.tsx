import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type NoShowContact,
  type NoShowContactInput,
  type NoShowContactRegistration,
  type NoShowFollowup,
  type NoShowReschedulingRequest,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import './no-shows-page.css'

type NoShowsService = Pick<
  ReturnType<typeof getRpcService>,
  | 'getNoShowFollowups'
  | 'getNoShowContacts'
  | 'registerNoShowContact'
  | 'requestNoShowRescheduling'
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
  const [statusFilter, setStatusFilter] = useState('')
  const [followups, setFollowups] =
    useState<AsyncState<readonly NoShowFollowup[]>>(loadingState)
  const [selectedId, setSelectedId] = useState<string | null>(initialContextId)
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
  const [reschedulingNotes, setReschedulingNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const authorized = canManageNoShows(accessContext)
  const canExecuteContact = accessContext.roles.some((role) =>
    ['administrador', 'administrativo_operacional', 'coordenador'].includes(role.code),
  )

  const loadFollowups = useCallback(async () => {
    setFollowups(loadingState())
    setFollowups(await service.getNoShowFollowups(statusFilter || null))
  }, [service, statusFilter])

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
      .getNoShowFollowups(statusFilter || null)
      .then((state) => active && setFollowups(state))
    return () => {
      active = false
    }
  }, [authorized, service, statusFilter])

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

  async function requestRescheduling() {
    if (!selectedId || reschedulingNotes.trim().length < 5) {
      setFeedback(
        'Informe uma justificativa de remarcação com pelo menos 5 caracteres.',
      )
      return
    }

    setBusy(true)
    setFeedback(null)
    const result: AsyncState<NoShowReschedulingRequest> =
      await service.requestNoShowRescheduling(
        selectedId,
        reschedulingNotes.trim(),
      )
    if (result.status !== 'success') {
      setFeedback(
        stateError(result) ?? 'Não foi possível solicitar a remarcação.',
      )
      setBusy(false)
      return
    }

    setReschedulingNotes('')
    setFeedback('Remarcação encaminhada para a fila administrativa.')
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
          <h2 id="no-shows-title">Faltosos</h2>
          <p>
            Fluxo originado pela Falta registrada na agenda profissional. Não é
            Busca Ativa.
          </p>
        </div>
        <div className="no-shows-toolbar">
          <label htmlFor="noShowStatus">Situação</label>
          <select
            id="noShowStatus"
            value={statusFilter}
            onChange={(event) => {
              setSelectedId(null)
              setContacts({ status: 'empty' })
              setFollowups(loadingState())
              setStatusFilter(event.target.value)
            }}
          >
            <option value="">Todas</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => void loadFollowups()}>
            Atualizar
          </button>
        </div>
      </header>

      <div className="no-shows-status-tabs" aria-label="Visões de faltosos">
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
      </div>

      <div className="no-shows-layout">
        <article
          className="no-shows-card"
          aria-labelledby="no-shows-list-title"
        >
          <h3 id="no-shows-list-title">Ocorrências</h3>
          {followups.status === 'loading' && <p>Carregando faltosos…</p>}
          {followups.status === 'error' && (
            <p role="alert">
              Não foi possível carregar: {followups.error.message}
            </p>
          )}
          {(followups.status === 'empty' ||
            (followups.status === 'success' &&
              followups.data.length === 0)) && (
            <p>Nenhum faltoso encontrado para o filtro atual.</p>
          )}
          {followups.status === 'success' && followups.data.length > 0 && (
            <div className="no-shows-list">
              {followups.data.map((item) => (
                <button
                  key={item.followup_id}
                  type="button"
                  className={
                    item.followup_id === selectedId ? 'is-selected' : ''
                  }
                  onClick={() => {
                    setFeedback(null)
                    setContacts(loadingState())
                    setSelectedId(item.followup_id)
                  }}
                >
                  <strong>{item.patient_name}</strong>
                  <span>
                    {statusLabels[item.active_search_status] ??
                      item.active_search_status}
                  </span>
                  <small>
                    Falta em {formatDate(item.no_show_date)} ·{' '}
                    {item.professional_name ?? 'Profissional não informado'}
                  </small>
                </button>
              ))}
            </div>
          )}
        </article>

        <article
          className="no-shows-card"
          aria-labelledby="no-show-detail-title"
        >
          <h3 id="no-show-detail-title">Acompanhamento</h3>
          {!selected && (
            <p>
              Selecione uma ocorrência para consultar e registrar providências.
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

              {canExecuteContact && <><form className="no-show-form" onSubmit={submitContact}>
                <h4>Registrar contato ou providência</h4>
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
                <label>
                  Aceitou o serviço
                  <select
                    value={acceptedService}
                    onChange={(event) => setAcceptedService(event.target.value)}
                  >
                    <option value="">Não informado</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </label>
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
                <label>
                  Próximo contato
                  <input
                    type="date"
                    value={nextContactDate}
                    onChange={(event) => setNextContactDate(event.target.value)}
                  />
                </label>
                <label className="span-all">
                  Próxima ação
                  <textarea
                    value={nextAction}
                    maxLength={500}
                    onChange={(event) => setNextAction(event.target.value)}
                  />
                </label>
                <label className="span-all">
                  Observação administrativa
                  <textarea
                    value={notes}
                    maxLength={1000}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </label>
                <button type="submit" disabled={busy}>
                  Registrar acompanhamento
                </button>
              </form>

              <div className="no-show-reschedule">
                <h4>Remarcação</h4>
                {selected.rescheduling_requested ? (
                  <p>Remarcação já solicitada para esta ocorrência.</p>
                ) : (
                  <>
                    <label>
                      Justificativa
                      <textarea
                        value={reschedulingNotes}
                        maxLength={500}
                        onChange={(event) =>
                          setReschedulingNotes(event.target.value)
                        }
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void requestRescheduling()}
                    >
                      Solicitar remarcação
                    </button>
                  </>
                )}
              </div>

              </>}
              {feedback && (
                <p className="no-show-feedback" role="status">
                  {feedback}
                </p>
              )}

              <div className="no-show-history">
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
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  )
}
