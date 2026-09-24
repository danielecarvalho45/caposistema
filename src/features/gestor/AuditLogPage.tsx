import { useState } from 'react'
import { AsyncStateView } from '../../components/feedback/AsyncStateView'
import { getRpcService, type AsyncState } from '../../lib/supabase/rpc'

function isoBoundary(date: string, end: boolean) {
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}`).toISOString()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function entries(value: unknown): readonly Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const list = record.items ?? record.logs ?? record.audit_logs
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []
}

function value(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) if (typeof record[key] === 'string') return record[key]
  return null
}

export function AuditLogPage() {
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [entityName, setEntityName] = useState('')
  const [action, setAction] = useState('')
  const [state, setState] = useState<AsyncState<unknown> | null>(null)

  async function load(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (endDate < startDate) return
    setState({ status: 'loading' })
    setState(await getRpcService().getAuditLogs({ startAt: isoBoundary(startDate, false), endAt: isoBoundary(endDate, true), entityName: entityName.trim() || null, action: action.trim() || null, limit: 100 }))
  }

  return <section className="gestor-route" aria-labelledby="audit-title"><header><span>Governança e Gestão</span><h2 id="audit-title">Auditoria</h2><p>Registros retornados pelo log oficial do CAPO.</p></header><article className="gestor-panel"><form className="gestor-audit-filters" onSubmit={(event) => void load(event)}><label>De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Até<input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label><label>Entidade<input value={entityName} onChange={(event) => setEntityName(event.target.value)} /></label><label>Ação<input value={action} onChange={(event) => setAction(event.target.value)} /></label><button type="submit" disabled={endDate < startDate}>Consultar</button></form></article>{state && <article className="gestor-panel"><AsyncStateView state={state} loading="Consultando auditoria..." empty="Nenhum registro autorizado foi retornado.">{(data) => { const logs = entries(data); return logs.length === 0 ? <p>Nenhum registro autorizado foi retornado.</p> : <ul className="gestor-audit-list">{logs.map((log, index) => <li key={value(log, ['id', 'audit_log_id']) ?? index}><strong>{value(log, ['action', 'event_type']) ?? 'Alteração registrada'}</strong><span>{value(log, ['entity_name', 'entity_type']) ?? 'Entidade autorizada'}</span><small>{value(log, ['created_at', 'occurred_at']) ?? ''}</small></li>)}</ul> }}</AsyncStateView></article>}</section>
}
