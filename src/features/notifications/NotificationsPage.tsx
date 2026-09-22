import { useEffect, useState } from 'react'
import type { AsyncState } from '../../lib/supabase/rpc'
import {
  getNotificationsService,
  type Notification,
  type NotificationsService,
} from './notifications-integration'
import './notifications-page.css'

type Props = Readonly<{
  service?: NotificationsService
  getContextHref?: (notification: Notification) => string | null
}>

const pageSize = 20

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function isUnread(item: Notification) {
  return item.read_at === null
}

export function NotificationsPage({
  service = getNotificationsService(),
  getContextHref,
}: Props) {
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [page, setPage] = useState(0)
  const [state, setState] = useState<AsyncState<readonly Notification[]>>({
    status: 'loading',
  })
  const [busyId, setBusyId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void service
      .getNotifications(onlyUnread, pageSize, page * pageSize)
      .then((nextState) => {
        if (active) setState(nextState)
      })
    return () => {
      active = false
    }
  }, [onlyUnread, page, service])

  async function update(item: Notification, action: 'lida' | 'resolvida') {
    setBusyId(item.notification_id)
    setFeedback(null)
    const result = await service.updateNotification(
      item.notification_id,
      action,
      '',
    )
    if (result.status === 'error') {
      setFeedback(result.error.message)
      setBusyId(null)
      return
    }
    const refreshed = await service.getNotifications(
      onlyUnread,
      pageSize,
      page * pageSize,
    )
    setState(refreshed)
    setFeedback(
      refreshed.status === 'error'
        ? refreshed.error.message
        : action === 'lida'
          ? 'Notificação marcada como lida.'
          : 'Notificação marcada como resolvida.',
    )
    setBusyId(null)
  }

  function changeFilter(value: string) {
    setState({ status: 'loading' })
    setFeedback(null)
    setOnlyUnread(value === 'unread')
    setPage(0)
  }

  const items = state.status === 'success' ? state.data : []
  const totalCount = items[0]?.total_count ?? 0
  const canGoBack = page > 0
  const canGoForward = (page + 1) * pageSize < totalCount

  return (
    <section
      className="notifications-page"
      aria-labelledby="notifications-title"
    >
      <header className="notifications-header">
        <div>
          <p className="eyebrow">Central do CAPO</p>
          <h1 id="notifications-title">Notificações</h1>
          <p>Alertas direcionados pelos fluxos oficiais do sistema.</p>
        </div>
        <label>
          Exibição
          <select
            aria-label="Filtrar notificações"
            value={onlyUnread ? 'unread' : 'all'}
            onChange={(event) => changeFilter(event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="unread">Não lidas</option>
          </select>
        </label>
      </header>

      <p className="notifications-counter" aria-live="polite">
        {totalCount}{' '}
        {onlyUnread
          ? `não lida${totalCount === 1 ? '' : 's'}`
          : `notificação${totalCount === 1 ? '' : 'ões'}`}
      </p>

      {state.status === 'loading' && (
        <p className="notifications-feedback" role="status">
          Carregando notificações…
        </p>
      )}
      {state.status === 'error' && (
        <p className="notifications-feedback notifications-error" role="alert">
          {state.error.message}
        </p>
      )}
      {state.status === 'empty' && (
        <p className="notifications-empty" role="status">
          Nenhuma notificação encontrada.
        </p>
      )}
      {feedback && (
        <p className="notifications-feedback" role="status">
          {feedback}
        </p>
      )}

      {state.status === 'success' && (
        <div className="notifications-list" aria-label="Lista de notificações">
          {items.map((item) => {
            const contextHref = getContextHref?.(item) ?? null
            const busy = busyId === item.notification_id
            return (
              <article
                className={`notification-item${isUnread(item) ? ' is-unread' : ''}`}
                key={item.notification_id}
              >
                <div className="notification-content">
                  <div className="notification-heading">
                    <h2>{item.title}</h2>
                    {isUnread(item) && (
                      <span className="notification-dot">Não lida</span>
                    )}
                  </div>
                  <p>{item.message}</p>
                  <small>
                    {item.notification_type} · {dateTime(item.created_at)}
                  </small>
                </div>
                <div className="notification-actions">
                  {contextHref && <a href={contextHref}>Abrir contexto</a>}
                  {isUnread(item) && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void update(item, 'lida')}
                    >
                      Marcar como lida
                    </button>
                  )}
                  {item.resolved_at === null && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void update(item, 'resolvida')}
                    >
                      Marcar como resolvida
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <nav
        className="notifications-pagination"
        aria-label="Paginação de notificações"
      >
        <button
          type="button"
          disabled={!canGoBack || state.status === 'loading'}
          onClick={() => {
            setState({ status: 'loading' })
            setFeedback(null)
            setPage((value) => value - 1)
          }}
        >
          Anterior
        </button>
        <span>Página {page + 1}</span>
        <button
          type="button"
          disabled={!canGoForward || state.status === 'loading'}
          onClick={() => {
            setState({ status: 'loading' })
            setFeedback(null)
            setPage((value) => value + 1)
          }}
        >
          Próxima
        </button>
      </nav>
    </section>
  )
}
