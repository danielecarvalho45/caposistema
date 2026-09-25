import { useEffect, useState } from 'react'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'

function rows(value: unknown): readonly Record<string, unknown>[] {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  const list = Array.isArray(value) ? value : source && [source.items, source.searches, source.rows, source.data].find(Array.isArray)
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}
function label(item: Record<string, unknown>, ...keys: string[]) {
  const value = keys.map((key) => item[key]).find((entry) => typeof entry === 'string' && entry.trim())
  return typeof value === 'string' ? value : '—'
}
export function ActiveSearchPage() {
  const [filter, setFilter] = useState('ativo')
  const [state, setState] = useState<AsyncState<unknown>>(loadingState)
  useEffect(() => {
    let active = true
    void getRpcService().getInitialActiveSearches(filter || null, 50, 0).then((result) => { if (active) setState(result) })
    return () => { active = false }
  }, [filter])
  return <section className="gestor-route" aria-labelledby="active-search-title"><header><span>Atendimento e Acompanhamento</span><h2 id="active-search-title">Busca Ativa Inicial</h2><p>Fluxos autorizados consultados no banco CAPO.</p></header>
    <article className="gestor-panel"><label>Situação <select value={filter} onChange={(event) => { setState(loadingState()); setFilter(event.target.value) }}><option value="ativo">Ativo</option><option value="encerrado">Encerrado</option><option value="">Todos</option></select></label>
      {state.status === 'loading' && <p>Carregando busca ativa…</p>}
      {state.status === 'error' && <p role="alert">{state.error.message}</p>}
      {state.status === 'empty' && <p>Nenhum fluxo retornado.</p>}
      {state.status === 'success' && (rows(state.data).length ? <ul className="gestor-result-list">{rows(state.data).map((item, index) => <li key={label(item, 'search_id', 'patient_id') + index}><strong>{label(item, 'patient_name', 'full_name')}</strong><small>{label(item, 'flow_status', 'status')} · {label(item, 'next_action', 'last_contact_at')}</small></li>)}</ul> : <p>Nenhum fluxo retornado para este filtro.</p>)}
    </article></section>
}
