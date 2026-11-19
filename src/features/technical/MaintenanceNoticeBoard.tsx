import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AsyncState, type TechnicalSupportRequest } from '../../lib/supabase/rpc'
import './maintenance-notice-board.css'

const pendingStatuses = new Set(['pendente', 'em_atendimento', 'aguardando_teste'])
const statusLabels: Record<string, string> = {
  pendente: 'Pendente',
  em_atendimento: 'Em atendimento',
  aguardando_teste: 'Aguardando teste',
}
export function maintenancePendingRequests(items: readonly TechnicalSupportRequest[]) {
  return items.filter(item => pendingStatuses.has(item.status))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
}

type Props = Readonly<{
  onOpen?: (requestId: string) => void
  source?: readonly TechnicalSupportRequest[]
  className?: string
}>

export function MaintenanceNoticeBoard({ onOpen, source, className = '' }: Props) {
  const [state, setState] = useState<AsyncState<readonly TechnicalSupportRequest[]>>(loadingState)
  const refresh = useCallback(async () => {
    // Usa a RPC já existente, protegida pelo isolamento de homologação do Supabase.
    const result = await getRpcService().getTechnicalSupportRequests(null, 100, 0)
    setState(result)
  }, [])

  useEffect(() => {
    if (source) return
    let active = true
    const load = async () => {
      const next = await getRpcService().getTechnicalSupportRequests(null, 100, 0)
      if (active) setState(next)
    }
    void load()
    const onFocus = () => { if (document.visibilityState === 'visible') void load() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void load() }, 30000)
    return () => {
      active = false
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [source])

  const status = source ? 'success' : state.status
  const notices = maintenancePendingRequests(source ?? (state.status === 'success' ? state.data : []))
  return <section className={`capo-maintenance-notices ${className}`.trim()} aria-label="Avisos de Manutenção">
    <header>
      <h3>🛠 Avisos de Manutenção{notices.length ? ` · ${notices.length}` : ''}</h3>
      {!source && <button type="button" onClick={() => void refresh()} disabled={state.status === 'loading'}>Atualizar</button>}
    </header>
    {status === 'loading' && <p>Consultando chamados de manutenção…</p>}
    {status === 'error' && state.status === 'error' && <p role="alert">Não foi possível consultar os avisos: {state.error.message}</p>}
    {status !== 'loading' && status !== 'error' && notices.length === 0 &&
      <p>Nenhum chamado de manutenção pendente neste ambiente.</p>}
    {notices.length > 0 && <ul>
      {notices.slice(0, 8).map(item => <li key={item.request_id}>
        <strong>{item.subject}</strong>
        <span>Solicitante: {item.requester_username}</span>
        <small>{statusLabels[item.status] ?? item.status} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.created_at))}</small>
        {onOpen
          ? <button type="button" onClick={() => onOpen(item.request_id)}>Abrir chamado</button>
          : <Link to={`/tecnica?chamado=${encodeURIComponent(item.request_id)}`}>Abrir chamado</Link>}
      </li>)}
    </ul>}
    {notices.length > 8 && <Link to="/tecnica">Consultar todos os chamados na Área Técnica</Link>}
  </section>
}
