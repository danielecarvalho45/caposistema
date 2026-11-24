import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AsyncState, type TechnicalSystemStatus } from '../../lib/supabase/rpc'

type AuditEntry = Readonly<Record<string, unknown>>
const auditActions: Record<string, string> = { INSERT: 'Registro criado', UPDATE: 'Registro atualizado', DELETE: 'Registro excluído' }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null
}
function words(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
function formatTime(value: unknown): string {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return ''
  return new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short', hour12: false })
}
function auditEntries(value: unknown): readonly AuditEntry[] {
  const data = asRecord(value)
  const list = data?.items
  return Array.isArray(list) ? list.filter((item): item is AuditEntry => asRecord(item) !== null) : []
}
function useHomeRefresh<T>(load: () => Promise<AsyncState<T>>) {
  const [state, setState] = useState<AsyncState<T>>(loadingState)
  const refresh = useCallback(async () => {
    const result = await load()
    setState(result)
  }, [load])
  useEffect(() => {
    let active = true
    const run = async () => {
      const result = await load()
      if (active) setState(result)
    }
    void run()
    const onFocus = () => { void run() }
    window.addEventListener('focus', onFocus)
    const interval = window.setInterval(() => {
      if (!document.hidden) void run()
    }, 60_000)
    return () => {
      active = false
      window.removeEventListener('focus', onFocus)
      window.clearInterval(interval)
    }
  }, [load])
  return { state, refresh }
}
function AuditRecentActivities() {
  const load = useCallback(() => {
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
    return getRpcService().getAuditLogs({ startAt: start.toISOString(), endAt: end.toISOString(), limit: 6 })
  }, [])
  const { state, refresh } = useHomeRefresh(load)
  const entries = state.status === 'success' ? auditEntries(state.data) : []
  return (
    <article className="gestor-panel gestor-home-snapshot">
      <header><h3>Atividades Recentes</h3><button type="button" onClick={() => void refresh()}>Atualizar</button></header>
      {state.status === 'loading' && <p>Consultando atividades…</p>}
      {state.status === 'error' && <p role="alert">Não foi possível consultar a auditoria: {state.error.message}</p>}
      {(state.status === 'empty' || (state.status === 'success' && entries.length === 0)) && <p>Nenhuma atividade autorizada nos últimos sete dias.</p>}
      {entries.length > 0 && <ol className="gestor-home-activity-list">
        {entries.map((entry, index) => (
          <li key={words(entry.audit_id) ?? index}>
            <strong>{auditActions[words(entry.action) ?? ''] ?? 'Atividade registrada'} · {words(entry.entity_label) ?? 'Registro operacional'}</strong>
            <small>{formatTime(entry.created_at)}{words(entry.actor_name) ? ` · ${entry.actor_name}` : ''}</small>
            {words(entry.summary) && <span>{words(entry.summary)}</span>}
          </li>
        ))}
      </ol>}
      <Link to="/gestor/auditoria">Ver auditoria completa</Link>
    </article>
  )
}
function HomeIndicatorSummary() {
  const load = useCallback(() => getRpcService().getHomePatientStatusCounts(), [])
  const { state, refresh } = useHomeRefresh(load)
  const data = state.status === 'success' ? asRecord(state.data) : null
  const definitions = [
    ['registered', 'Pacientes cadastrados'],
    ['active', 'Pacientes ativos'],
    ['awaiting_response', 'Aguardando resposta'],
    ['awaiting_start', 'Aguardando início'],
    ['closed', 'Encerrados'],
  ] as const
  return (
    <article className="gestor-panel gestor-home-snapshot">
      <header><h3>Indicadores do Sistema</h3><button type="button" onClick={() => void refresh()}>Atualizar</button></header>
      <p>Quantidade atual de pacientes no CAPO, sem duplicidade entre situações.</p>
      {state.status === 'loading' && <p>Carregando indicadores…</p>}
      {state.status === 'error' && <p role="alert">Indicadores indisponíveis: {state.error.message}</p>}
      {state.status === 'empty' && <p>Nenhum indicador autorizado retornado.</p>}
      {data && (
        <dl className="gestor-home-metrics">
          {definitions.map(([key, name]) => (
            <div key={key}>
              <dt>{name}</dt>
              <dd>{typeof data[key] === 'number' ? String(data[key]) : '—'}</dd>
            </div>
          ))}
        </dl>
      )}
      <small>Ativos: pacientes em acompanhamento; aguardando resposta: Oferta CAPO ou Resgate em aberto; aguardando início: oferta aceita com ciclo encerrado administrativamente e cadastro mantido; encerrados: cadastros inativos, encerrados ou por óbito.</small>
      <Link to="/relatorios">Ver relatórios e indicadores</Link>
    </article>
  )
}
function HomeTechnicalStatus() {
  const load = useCallback(() => getRpcService().getTechnicalSystemStatus(), [])
  const { state, refresh } = useHomeRefresh(load)
  const components = state.status === 'success' ? state.data.components : []
  const status = technicalSummary(components)
  return (
    <article className="gestor-panel gestor-home-snapshot">
      <header><h3>Status do Sistema</h3><button type="button" onClick={() => void refresh()}>Atualizar</button></header>
      {state.status === 'loading' && <p>Verificando componentes…</p>}
      {state.status === 'error' && <p role="alert">Verificação técnica indisponível: {state.error.message}</p>}
      {(state.status === 'empty' || (state.status === 'success' && components.length === 0)) && <p>Estado técnico não informado.</p>}
      {state.status === 'success' && components.length > 0 && <>
        <p className="gestor-home-status-label">Situação verificada: <strong>{status}</strong></p>
        <ul className="gestor-home-status-items">{components.slice(0, 4).map((component) =>
          <li key={component.component}><span>{component.label}</span><strong>{technicalLabel(component.status)}</strong></li>,
        )}</ul>
        <small>Verificado em {formatTime(state.data.checked_at)}</small>
      </>}
      <Link to="/tecnica">Abrir diagnóstico técnico</Link>
    </article>
  )
}
function technicalLabel(value: string): string {
  if (['ok', 'operacional', 'success'].includes(value.toLowerCase())) return 'Operacional'
  if (['error', 'critical', 'indisponivel', 'indisponível'].includes(value.toLowerCase())) return 'Indisponível'
  return 'Atenção'
}
function technicalSummary(items: TechnicalSystemStatus['components']): string {
  const labels = items.map((item) => technicalLabel(item.status))
  if (labels.includes('Indisponível')) return 'Indisponível'
  if (labels.includes('Atenção')) return 'Atenção'
  return labels.length ? 'Operacional' : 'Não informado'
}
export { AuditRecentActivities, HomeIndicatorSummary, HomeTechnicalStatus }
