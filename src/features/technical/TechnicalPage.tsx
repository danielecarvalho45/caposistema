import { useCallback, useEffect, useState } from 'react'
import {
  loadingState,
  type AsyncState,
  type TechnicalDashboard,
  type TechnicalIntegrationInventory,
  type TechnicalRuntimeLog,
  type TechnicalSupportHistory,
  type TechnicalSupportRequest,
  type TechnicalSystemStatus,
} from '../../lib/supabase/rpc'
import { normalizeSupabaseError } from '../../lib/supabase/errors'
import type { AccessContext } from '../../types/access'
import {
  createTechnicalIntegration,
  type CAPOTechnicalIntegration,
} from './technical-integration'
import './technical-page.css'

const defaultIntegration = createTechnicalIntegration()

type TechnicalTab =
  | 'painel'
  | 'chamados'
  | 'estado'
  | 'integracoes'
  | 'logs'
  | 'manutencao'
  | 'documentacao'
  | 'ferramentas'
  | 'historico'
  | 'avisos'
  | 'perfil'

type TechnicalSnapshot = Readonly<{
  dashboard: TechnicalDashboard
  systemStatus: TechnicalSystemStatus
  integrations: TechnicalIntegrationInventory
  logs: readonly TechnicalRuntimeLog[]
  supportRequests: readonly TechnicalSupportRequest[]
}>

const tabs: ReadonlyArray<readonly [TechnicalTab, string]> = [
  ['painel', 'Painel'],
  ['chamados', 'Chamados'],
  ['estado', 'Estado do sistema'],
  ['integracoes', 'Conectividade e integrações'],
  ['logs', 'Logs técnicos'],
  ['manutencao', 'Manutenção e correções'],
  ['documentacao', 'Documentação técnica'],
  ['ferramentas', 'Ferramentas'],
  ['historico', 'Histórico de suporte'],
  ['avisos', 'Avisos'],
  ['perfil', 'Perfil'],
]

const TECHNICAL_LOAD_TIMEOUT_MS = 30_000
const TECHNICAL_UI_WATCHDOG_MS = 10_000

async function withTechnicalLoadTimeout<T>(promise: Promise<T>) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new Error(
              'A área técnica demorou além do limite para responder. Tente atualizar novamente.',
            ),
          )
        }, TECHNICAL_LOAD_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

function inputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function initialStartDate() {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return inputDate(date)
}

function periodBoundary(value: string, end: boolean) {
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00'}`)
  return date.toISOString()
}

function formatDateTime(value: string | null) {
  if (!value) return 'Não registrado'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
}

function metricLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function StateMessage({
  state,
}: Readonly<{ state: AsyncState<TechnicalSnapshot> }>) {
  if (state.status === 'loading') return <p>Carregando área técnica…</p>
  if (state.status === 'empty') return <p>Nenhum dado técnico disponível.</p>
  if (state.status === 'error') {
    return (
      <p className="technical-error" role="alert">
        Não foi possível carregar a área técnica: {state.error.message}
      </p>
    )
  }
  return null
}

export function TechnicalPage({
  accessContext,
  integration = defaultIntegration,
}: Readonly<{
  accessContext: AccessContext
  integration?: CAPOTechnicalIntegration
}>) {
  const [activeTab, setActiveTab] = useState<TechnicalTab>('painel')
  const [startDate, setStartDate] = useState(initialStartDate)
  const [endDate, setEndDate] = useState(() => inputDate(new Date()))
  const [severity, setSeverity] = useState('')
  const [component, setComponent] = useState('')
  const [eventCode, setEventCode] = useState('')
  const [state, setState] =
    useState<AsyncState<TechnicalSnapshot>>(loadingState)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [historyState, setHistoryState] =
    useState<AsyncState<TechnicalSupportHistory> | null>(null)
  const isAuthorized = accessContext.roles.some((role) =>
    ['administrador', 'administrador_tecnico'].includes(role.code),
  )

  const loadSnapshot = useCallback(async (): Promise<
    AsyncState<TechnicalSnapshot>
  > => {
    try {
      const startAt = periodBoundary(startDate, false)
      const endAt = periodBoundary(endDate, true)
      const results = await withTechnicalLoadTimeout(
        Promise.all([
          integration.loadDashboard(startAt, endAt, 10),
          integration.loadSystemStatus(),
          integration.loadIntegrations(),
          integration.loadRuntimeLogs(
            startAt,
            endAt,
            severity || null,
            component.trim() || null,
            eventCode.trim() || null,
            50,
            0,
          ),
          integration.loadSupportRequests(null, 50, 0),
        ]),
      )
      const error = results.find((result) => result.status === 'error')
      if (error?.status === 'error') return error
      if (results.some((result) => result.status !== 'success')) {
        return { status: 'empty' }
      }
      const [dashboard, systemStatus, integrations, logs, supportRequests] =
        results
      if (
        dashboard.status !== 'success' ||
        systemStatus.status !== 'success' ||
        integrations.status !== 'success' ||
        logs.status !== 'success' ||
        supportRequests.status !== 'success'
      ) {
        return { status: 'empty' }
      }
      return {
        status: 'success',
        data: {
          dashboard: dashboard.data,
          systemStatus: systemStatus.data,
          integrations: integrations.data,
          logs: logs.data,
          supportRequests: supportRequests.data,
        },
      }
    } catch (error) {
      return {
        status: 'error',
        error: normalizeSupabaseError('technical_snapshot', error),
      }
    }
  }, [component, endDate, eventCode, integration, severity, startDate])

  useEffect(() => {
    if (!isAuthorized) return
    let active = true
    const watchdogId = setTimeout(() => {
      if (active) {
        setState({
          status: 'error',
          error: normalizeSupabaseError(
            'technical_snapshot',
            new Error(
              'A área técnica não concluiu o carregamento no tempo esperado. Tente atualizar novamente.',
            ),
          ),
        })
      }
    }, TECHNICAL_UI_WATCHDOG_MS)
    void loadSnapshot().then((nextState) => {
      if (active) {
        clearTimeout(watchdogId)
        setState(nextState)
      }
    })
    return () => {
      active = false
      clearTimeout(watchdogId)
    }
  }, [isAuthorized, loadSnapshot])

  async function refresh() {
    setState(loadingState())
    setState(await loadSnapshot())
  }

  async function openHistory(requestId: string) {
    setSelectedRequest(requestId)
    setHistoryState(loadingState())
    setHistoryState(await integration.loadSupportHistory(requestId))
  }

  if (!isAuthorized) {
    return (
      <section
        className="technical-page"
        aria-labelledby="technical-blocked-title"
      >
        <div className="technical-card">
          <p className="eyebrow">Administração técnica</p>
          <h2 id="technical-blocked-title">Área técnica indisponível</h2>
          <p>
            Esta conta não possui um papel técnico ou administrativo autorizado.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="technical-page" aria-labelledby="technical-title">
      <header className="technical-card technical-heading">
        <div>
          <p className="eyebrow">Administração técnica</p>
          <h2 id="technical-title">Operação e observabilidade</h2>
          <p>
            Estado real do CAPO, integrações, eventos runtime e histórico de
            suporte.
          </p>
        </div>
        <div className="technical-period">
          <label>
            De
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label>
            Até
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={state.status === 'loading' || endDate < startDate}
            onClick={() => void refresh()}
          >
            Atualizar
          </button>
        </div>
      </header>

      <nav className="technical-tabs" aria-label="Módulos técnicos">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={activeTab === key ? 'is-active' : undefined}
            aria-current={activeTab === key ? 'page' : undefined}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      <StateMessage state={state} />

      {state.status === 'success' && activeTab === 'painel' && (
        <div className="technical-grid">
          <article className="technical-card">
            <h3>Chamados por situação</h3>
            <dl className="technical-metrics">
              {Object.entries(state.data.dashboard.support).map(
                ([key, value]) => (
                  <div key={key}>
                    <dt>{metricLabel(key)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ),
              )}
            </dl>
          </article>
          <article className="technical-card">
            <h3>Eventos por severidade</h3>
            <dl className="technical-metrics">
              {Object.entries(state.data.dashboard.runtime.by_severity).map(
                ([key, value]) => (
                  <div key={key}>
                    <dt>{metricLabel(key)}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ),
              )}
            </dl>
          </article>
          <article className="technical-card technical-span">
            <h3>Erros recentes</h3>
            {state.data.dashboard.runtime.recent_errors.length === 0 ? (
              <p>Nenhum erro ou evento crítico registrado no período.</p>
            ) : (
              <div className="technical-events">
                {state.data.dashboard.runtime.recent_errors.map((event) => (
                  <article key={event.id}>
                    <strong>{event.component}</strong>
                    <span>{event.event_code ?? event.result}</span>
                    <small>{formatDateTime(event.occurred_at)}</small>
                    <p>{event.technical_message ?? 'Sem mensagem técnica.'}</p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </div>
      )}

      {state.status === 'success' && activeTab === 'estado' && (
        <article className="technical-card">
          <h3>Componentes verificados</h3>
          <p className="technical-muted">
            Verificação executada em{' '}
            {formatDateTime(state.data.systemStatus.checked_at)}.
          </p>
          <div className="technical-components">
            {state.data.systemStatus.components.map((item) => (
              <article key={item.component}>
                <div>
                  <strong>{item.label}</strong>
                  <span className={`technical-status is-${item.status}`}>
                    {item.status}
                  </span>
                </div>
                <p>{item.detail}</p>
                <small>Método: {item.verification}</small>
              </article>
            ))}
          </div>
        </article>
      )}

      {state.status === 'success' && activeTab === 'chamados' && (
        <article className="technical-card">
          <h3>Chamados de suporte recebidos</h3>
          {state.data.supportRequests.length === 0 ? (
            <p>Nenhum chamado real disponível no contexto técnico.</p>
          ) : (
            <div className="technical-request-list">
              {state.data.supportRequests.map((request) => (
                <button
                  type="button"
                  key={request.request_id}
                  className={selectedRequest === request.request_id ? 'is-selected' : undefined}
                  onClick={() => void openHistory(request.request_id)}
                >
                  <strong>{request.subject}</strong>
                  <span>{request.status}</span>
                  <small>{formatDateTime(request.created_at)}</small>
                </button>
              ))}
            </div>
          )}
        </article>
      )}

      {state.status === 'success' && activeTab === 'manutencao' && (
        <article className="technical-card">
          <h3>Manutenção e correções</h3>
          <p>As operações de manutenção permanecem condicionadas aos contratos técnicos autorizados.</p>
          <p className="technical-muted">Nenhuma ferramenta de alteração foi criada nesta interface.</p>
        </article>
      )}

      {state.status === 'success' && activeTab === 'documentacao' && (
        <article className="technical-card">
          <h3>Documentação técnica</h3>
          <p>Documentação consultada conforme os registros técnicos disponíveis.</p>
          <p className="technical-muted">Nenhum documento técnico retornado pelo inventário real.</p>
        </article>
      )}

      {state.status === 'success' && activeTab === 'ferramentas' && (
        <article className="technical-card">
          <h3>Ferramentas / atalhos</h3>
          <p>Nenhuma ferramenta operacional disponível para execução nesta sessão.</p>
        </article>
      )}

      {state.status === 'success' && activeTab === 'avisos' && (
        <article className="technical-card">
          <h3>Avisos técnicos</h3>
          <p>Nenhum aviso técnico real disponível.</p>
        </article>
      )}

      {state.status === 'success' && activeTab === 'perfil' && (
        <article className="technical-card">
          <h3>Perfil técnico</h3>
          <dl className="technical-profile-list">
            <div><dt>Contexto</dt><dd>{accessContext.primary_context.name ?? accessContext.primary_context.code}</dd></div>
            <div><dt>Usuário</dt><dd>{accessContext.username}</dd></div>
            <div><dt>Funções</dt><dd>{accessContext.roles.map((role) => role.name).join(' · ')}</dd></div>
          </dl>
        </article>
      )}

      {state.status === 'success' && activeTab === 'integracoes' && (
        <article className="technical-card">
          <h3>Integrações inventariadas</h3>
          <p className="technical-muted">
            Inventário atualizado em{' '}
            {formatDateTime(state.data.integrations.inventoried_at)}.
          </p>
          {state.data.integrations.integrations.length === 0 ? (
            <p>Nenhuma dependência externa foi identificada pelo backend.</p>
          ) : (
            <div className="technical-components">
              {state.data.integrations.integrations.map((item) => (
                <article key={item.technical_name}>
                  <div>
                    <strong>{item.technical_name}</strong>
                    <span className={`technical-status is-${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                  <p>{item.evidence}</p>
                  <small>Monitoramento: {item.monitoring_source}</small>
                  <small>
                    Último sucesso: {formatDateTime(item.last_success_at)} ·
                    Último erro: {formatDateTime(item.last_error_at)}
                  </small>
                </article>
              ))}
            </div>
          )}
        </article>
      )}

      {state.status === 'success' && activeTab === 'logs' && (
        <article className="technical-card">
          <div className="technical-heading">
            <div>
              <h3>Logs técnicos autorizados</h3>
              <p className="technical-muted">
                Mensagens sanitizadas pelo backend.
              </p>
            </div>
            <div className="technical-log-filters">
              <label>
                Severidade
                <select
                  value={severity}
                  onChange={(event) => setSeverity(event.target.value)}
                >
                  <option value="">Todas</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
              <label>
                Componente
                <input
                  value={component}
                  onChange={(event) => setComponent(event.target.value)}
                />
              </label>
              <label>
                Código
                <input
                  value={eventCode}
                  onChange={(event) => setEventCode(event.target.value)}
                />
              </label>
            </div>
          </div>
          {state.data.logs.length === 0 ? (
            <p>Nenhum log técnico encontrado no período.</p>
          ) : (
            <div className="technical-table-wrap">
              <table className="technical-table">
                <caption>
                  {state.data.logs[0].total_count} evento(s) encontrado(s)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Severidade</th>
                    <th scope="col">Componente</th>
                    <th scope="col">Resultado</th>
                    <th scope="col">Código</th>
                    <th scope="col">Mensagem</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.occurred_at)}</td>
                      <td>{log.severity}</td>
                      <td>{log.component}</td>
                      <td>{log.result}</td>
                      <td>{log.event_code ?? '—'}</td>
                      <td>{log.technical_message ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      )}

      {state.status === 'success' && activeTab === 'historico' && (
        <div className="technical-history-layout">
          <article className="technical-card">
            <h3>Chamados técnicos</h3>
            {state.data.supportRequests.length === 0 ? (
              <p>Nenhum chamado técnico encontrado.</p>
            ) : (
              <div className="technical-request-list">
                {state.data.supportRequests.map((request) => (
                  <button
                    key={request.request_id}
                    type="button"
                    className={
                      selectedRequest === request.request_id
                        ? 'is-selected'
                        : undefined
                    }
                    onClick={() => void openHistory(request.request_id)}
                  >
                    <strong>{request.subject}</strong>
                    <span>
                      {request.priority} · {request.status}
                    </span>
                    <small>{request.requester_username}</small>
                  </button>
                ))}
              </div>
            )}
          </article>
          <article className="technical-card">
            <h3>Histórico persistido</h3>
            {!historyState && (
              <p>Selecione um chamado para consultar o histórico.</p>
            )}
            {historyState?.status === 'loading' && <p>Carregando histórico…</p>}
            {historyState?.status === 'empty' && (
              <p>Nenhum evento encontrado.</p>
            )}
            {historyState?.status === 'error' && (
              <p className="technical-error" role="alert">
                Não foi possível carregar o histórico:{' '}
                {historyState.error.message}
              </p>
            )}
            {historyState?.status === 'success' &&
              historyState.data.events.length === 0 && (
                <p>Nenhum evento encontrado.</p>
              )}
            {historyState?.status === 'success' &&
              historyState.data.events.length > 0 && (
                <div className="technical-events">
                  {historyState.data.events.map((event) => (
                    <article key={event.audit_id}>
                      <strong>{event.action}</strong>
                      <span>
                        {event.previous_status ?? 'Início'} →{' '}
                        {event.new_status ?? 'Sem alteração'}
                      </span>
                      <small>{formatDateTime(event.occurred_at)}</small>
                    </article>
                  ))}
                </div>
              )}
          </article>
        </div>
      )}

      <aside className="technical-notice">
        Esta área exibe somente dados técnicos sanitizados. Logs do provedor e
        segredos de infraestrutura não são expostos ao navegador.
      </aside>
    </section>
  )
}
