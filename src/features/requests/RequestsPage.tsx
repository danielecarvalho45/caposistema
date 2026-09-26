import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AccessContext } from '../../types/access'
import {
  getRpcService,
  type AdministrativeRequest,
  type AdministrativeRequestEvent,
  type AsyncState,
} from '../../lib/supabase/rpc'
import './requests-page.css'

type Service = Pick<
  ReturnType<typeof getRpcService>,
  | 'getAdministrativeRequests'
  | 'getAdministrativeRequestEvents'
  | 'createAdministrativeRequest'
  | 'updateAdministrativeRequest'
>

type Props = Readonly<{
  accessContext: AccessContext
  service?: Service
  initialContextId?: string | null
}>

const statusLabels: Record<string, string> = {
  pending: 'Recebida',
  in_progress: 'Em atendimento',
  returned: 'Devolvida',
  completed: 'Concluída',
  refused: 'Recusada',
  cancelled: 'Cancelada',
}

const eventLabels: Record<string, string> = {
  created: 'Solicitação criada',
  started: 'Atendimento iniciado',
  providence_recorded: 'Providência registrada',
  returned: 'Devolvida para complemento',
  resubmitted: 'Complementada e reenviada',
  completed: 'Concluída',
  refused: 'Recusada',
  cancelled: 'Cancelada',
}

function errorMessage<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

function canAccessRequests(accessContext: AccessContext) {
  return (
    (Boolean(accessContext.professional_id) && accessContext.roles.some((role) =>
      role.code === 'profissional',
    )) ||
    accessContext.roles.some((role) =>
      ['administrador', 'coordenador', 'administrativo_operacional'].includes(
        role.code,
      ),
    )
  )
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function RequestsPage({
  accessContext,
  service = getRpcService(),
  initialContextId = null,
}: Props) {
  const [view, setView] = useState('recebidas')
  const [status, setStatus] = useState<string>('')
  const [items, setItems] = useState<readonly AdministrativeRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(initialContextId)
  const [events, setEvents] = useState<readonly AdministrativeRequestEvent[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [response, setResponse] = useState('')
  const [counterReference, setCounterReference] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const selected = items.find((item) => item.request_id === selectedId) ?? null
  const authorized = canAccessRequests(accessContext)
  const roleCodes = useMemo(
    () => accessContext.roles.map((role) => role.code),
    [accessContext.roles],
  )
  const canManage = roleCodes.some((role) =>
    ['administrador', 'administrativo_operacional'].includes(role),
  )
  const canCreateProfessionalRequest =
    Boolean(accessContext.professional_id) && roleCodes.includes('profissional')
  const isRequester =
    selected?.requesting_professional_id === accessContext.professional_id

  const loadItems = useCallback(async () => {
    setLoading(true)
    const result = await service.getAdministrativeRequests(
      status || null,
      100,
      0,
    )
    if (result.status === 'success') {
      setItems(result.data)
      setSelectedId((current) =>
        current && result.data.some((item) => item.request_id === current)
          ? current
          : null,
      )
    } else if (result.status === 'empty') {
      setItems([])
      setSelectedId(null)
    } else {
      setFeedback(errorMessage(result))
    }
    setLoading(false)
    return result
  }, [service, status])

  const loadEvents = useCallback(
    async (requestId: string) => {
      setHistoryLoading(true)
      const result = await service.getAdministrativeRequestEvents(
        requestId,
        100,
        0,
      )
      setEvents(result.status === 'success' ? result.data : [])
      if (result.status === 'error') setFeedback(result.error.message)
      setHistoryLoading(false)
      return result
    },
    [service],
  )

  useEffect(() => {
    if (!authorized) return
    let active = true
    void service
      .getAdministrativeRequests(status || null, 100, 0)
      .then((result) => {
        if (!active) return
        if (result.status === 'success') {
          setItems(result.data)
          setSelectedId((current) => current && result.data.some((item) => item.request_id === current) ? current : null)
        }
        else if (result.status === 'empty') setItems([])
        else setFeedback(errorMessage(result))
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [authorized, service, status])
  useEffect(() => {
    if (!authorized || !selectedId) return
    let active = true
    void service
      .getAdministrativeRequestEvents(selectedId, 100, 0)
      .then((result) => {
        if (!active) return
        setEvents(result.status === 'success' ? result.data : [])
        if (result.status === 'error') setFeedback(result.error.message)
        setHistoryLoading(false)
      })
    return () => {
      active = false
    }
  }, [authorized, service, selectedId])

  async function act(action: string) {
    if (!selected || busy) return
    const needsText = action !== 'start'
    if (needsText && response.trim().length < 5) {
      setFeedback(
        'Informe uma providência ou justificativa com pelo menos 5 caracteres.',
      )
      return
    }
    setBusy(true)
    const result = await service.updateAdministrativeRequest(
      selected.request_id,
      action,
      response.trim() || null,
      counterReference.trim() || null,
    )
    if (result.status === 'success') {
      const updatedId = selected.request_id
      const list = await loadItems()
      const history = await loadEvents(updatedId)
      if (list.status === 'error' || history.status === 'error') {
        setFeedback('A atualização foi confirmada, mas a consulta atualizada falhou.')
      } else {
        setResponse('')
        setCounterReference('')
        setFeedback('Solicitação atualizada e registrada no histórico.')
      }
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível atualizar a solicitação.',
      )
    }
    setBusy(false)
  }

  async function createRequest() {
    if (busy) return
    if (newSubject.trim().length < 3 || newDescription.trim().length < 5) {
      setFeedback(
        'Informe assunto e descrição válidos para enviar a solicitação.',
      )
      return
    }
    setBusy(true)
    const result = await service.createAdministrativeRequest(
      null,
      newSubject.trim(),
      newDescription.trim(),
    )
    if (result.status === 'success') {
      const list = await loadItems()
      if (list.status === 'success' && list.data.some((item) => item.request_id === result.data.request_id)) {
        setNewSubject('')
        setNewDescription('')
        setSelectedId(result.data.request_id)
        setHistoryLoading(true)
        setFeedback('Solicitação enviada ao Administrativo Operacional.')
      } else {
        setFeedback(list.status === 'error' ? `Solicitação registrada, mas a recarga falhou: ${list.error.message}` : 'Solicitação registrada, mas ainda não apareceu na lista retornada pelo banco.')
      }
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível criar a solicitação.',
      )
    }
    setBusy(false)
  }

  const open =
    selected && !['completed', 'refused', 'cancelled'].includes(selected.status)

  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="requests-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Solicitações</p>
          <h2 id="requests-blocked-title">Solicitações indisponíveis</h2>
          <p>
            O contexto atual não possui autorização para consultar esta área.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="requests-page" aria-labelledby="requests-title">
      <header className="requests-header">
        <div>
          <p className="eyebrow">Atendimento e Acompanhamento</p>
          <h2 id="requests-title">Solicitações</h2>
          <p>Receber, executar, encaminhar e concluir providências administrativas.</p>
        </div>
        <label>
          Situação
          <select
            value={status}
            onChange={(event) => {
              setLoading(true)
              setSelectedId(null)
              setEvents([])
              setStatus(event.target.value)
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
      </header>

      <nav className="requests-status-tabs" aria-label="Visões de solicitações">
        {[
          ['recebidas', 'Recebidas', ''],
          ['atendimento', 'Aceitas / Em atendimento', 'in_progress'],
          ['concluidas', 'Concluídas', 'completed'],
          ['devolvidas', 'Devolvidas / pendentes', 'returned'],
        ].map(([value, label, nextStatus]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => {
              setView(value)
              setLoading(true)
              setSelectedId(null)
              setEvents([])
              setStatus(nextStatus)
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {feedback && (
        <p className="requests-feedback" role="status">
          {feedback}
        </p>
      )}
      {canCreateProfessionalRequest && (
        <article className="requests-card request-create">
          <h3>Nova solicitação geral</h3>
          <p>
            Solicitações vinculadas a um atendimento continuam sendo abertas no
            respectivo atendimento.
          </p>
          <label>
            Assunto
            <input
              value={newSubject}
              onChange={(event) => setNewSubject(event.target.value)}
              maxLength={150}
            />
          </label>
          <label>
            Descrição
            <textarea
              value={newDescription}
              onChange={(event) => setNewDescription(event.target.value)}
              maxLength={1000}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createRequest()}
          >
            Enviar solicitação
          </button>
        </article>
      )}
      <div className="requests-layout">
        <article className="requests-card">
          <h3>
            Solicitações {loading ? '— carregando…' : `— ${items.length}`}
          </h3>
          {!loading && items.length === 0 && (
            <p>Nenhuma solicitação encontrada.</p>
          )}
          <div className="requests-list">
            {items.map((item) => (
              <button
                type="button"
                key={item.request_id}
                className={
                  item.request_id === selectedId ? 'is-selected' : undefined
                }
                onClick={() => {
                  setHistoryLoading(true)
                  setEvents([])
                  setSelectedId(item.request_id)
                  setFeedback(null)
                }}
              >
                <strong>{item.subject}</strong>
                <span>{item.patient_name ?? 'Sem paciente vinculado'}</span>
                <small>
                  {statusLabels[item.status] ?? item.status} ·{' '}
                  {dateTime(item.updated_at)}
                </small>
              </button>
            ))}
          </div>
        </article>

        <article className="requests-card requests-detail">
          {!selected ? (
            <p>
              Selecione uma solicitação para consultar o detalhe e o histórico.
            </p>
          ) : (
            <>
              <h3>{selected.subject}</h3>
              <dl className="request-summary">
                <div>
                  <dt>Situação</dt>
                  <dd>{statusLabels[selected.status] ?? selected.status}</dd>
                </div>
                <div>
                  <dt>Solicitante</dt>
                  <dd>{selected.requesting_professional_name}</dd>
                </div>
                <div>
                  <dt>Paciente</dt>
                  <dd>{selected.patient_name ?? 'Não vinculado'}</dd>
                </div>
                {selected.patient_number && (
                  <div>
                    <dt>Nº CAPO</dt>
                    <dd>{selected.patient_number}</dd>
                  </div>
                )}
                {selected.cms && (
                  <div>
                    <dt>CMS</dt>
                    <dd>{selected.cms}</dd>
                  </div>
                )}
                <div>
                  <dt>Recebida</dt>
                  <dd>{dateTime(selected.created_at)}</dd>
                </div>
              </dl>
              <section className="request-description">
                <h4>Descrição</h4>
                <p>{selected.description}</p>
              </section>
              {selected.administrative_response && (
                <section className="request-description">
                  <h4>Último retorno</h4>
                  <p>{selected.administrative_response}</p>
                </section>
              )}

              {open && (canManage || isRequester) && (
                <div className="request-actions">
                  <label>
                    Providência, feedback ou justificativa
                    <textarea
                      value={response}
                      onChange={(event) => setResponse(event.target.value)}
                      maxLength={1000}
                    />
                  </label>
                  {canManage && (
                    <label>
                      Contrarreferência (opcional)
                      <textarea
                        value={counterReference}
                        onChange={(event) =>
                          setCounterReference(event.target.value)
                        }
                        maxLength={1000}
                      />
                    </label>
                  )}
                  <div>
                    {canManage && selected.status === 'pending' && (
                      <button disabled={busy} onClick={() => void act('start')}>
                        Aceitar / iniciar
                      </button>
                    )}
                    {canManage &&
                      ['pending', 'in_progress'].includes(selected.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void act('record')}
                        >
                          Registrar providência
                        </button>
                      )}
                    {canManage &&
                      ['pending', 'in_progress'].includes(selected.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void act('complete')}
                        >
                          Concluir
                        </button>
                      )}
                    {canManage &&
                      ['pending', 'in_progress'].includes(selected.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void act('return')}
                        >
                          Devolver
                        </button>
                      )}
                    {canManage &&
                      ['pending', 'in_progress'].includes(selected.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void act('refuse')}
                        >
                          Recusar
                        </button>
                      )}
                    {isRequester && selected.status === 'returned' && (
                      <button
                        disabled={busy}
                        onClick={() => void act('resubmit')}
                      >
                        Complementar e reenviar
                      </button>
                    )}
                    {(canManage ||
                      (isRequester &&
                        ['pending', 'returned'].includes(selected.status))) && (
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

              <section className="request-history">
                <h4>Histórico</h4>
                {historyLoading && <p>Carregando histórico…</p>}
                {!historyLoading && events.length === 0 && (
                  <p>Nenhum evento registrado.</p>
                )}
                {events.map((event) => (
                  <article key={event.event_id}>
                    <strong>
                      {eventLabels[event.event_type] ?? event.event_type}
                    </strong>
                    <span>
                      {event.actor_name} · {dateTime(event.created_at)}
                    </span>
                    {event.detail && <p>{event.detail}</p>}
                    {event.counter_reference && (
                      <small>
                        Contrarreferência: {event.counter_reference}
                      </small>
                    )}
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
