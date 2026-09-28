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
  | 'diagnostico'
  | 'manutencao'

type TechnicalSnapshot = Readonly<{
  dashboard: TechnicalDashboard
  systemStatus: TechnicalSystemStatus
  integrations: TechnicalIntegrationInventory
  logs: readonly TechnicalRuntimeLog[]
  supportRequests: readonly TechnicalSupportRequest[]
}>

const tabs: ReadonlyArray<readonly [TechnicalTab, string]> = [
  ['painel', 'Painel Técnico'],
  ['chamados', 'Chamados'],
  ['diagnostico', 'Diagnóstico'],
  ['manutencao', 'Manutenção'],
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
  const labels: Record<string, string> = {
    pendente: 'Recebidos',
    em_atendimento: 'Em atendimento',
    aguardando_teste: 'Aguardando teste',
    resolvido: 'Resolvidos',
    resolvida: 'Resolvidos',
    cancelado: 'Cancelados',
    cancelada: 'Cancelados',
  }
  return labels[value] ?? value.replaceAll('_', ' ')
}

function publicStatus(value: string) {
  const normalized = value.toLowerCase()
  if (normalized === 'operacional' || normalized === 'ok' || normalized === 'success') {
    return { label: 'Operacional', className: 'operacional' }
  }
  if (
    normalized === 'indisponivel' ||
    normalized === 'indisponível' ||
    normalized === 'error' ||
    normalized === 'critical'
  ) {
    return { label: 'Indisponível', className: 'indisponivel' }
  }
  return { label: 'Atenção', className: 'atencao' }
}

function integrationLabel(value: string) {
  const normalized = value.toLowerCase()
  if (normalized.includes('supabase') && normalized.includes('auth')) {
    return normalized.includes('edge')
      ? 'Supabase Auth / Edge Functions'
      : 'Supabase Auth'
  }
  if (normalized.includes('edge')) return 'Edge Functions'
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function findComponent(
  components: TechnicalSystemStatus['components'],
  terms: readonly string[],
) {
  return components.find((item) => {
    const source = `${item.component} ${item.label}`.toLowerCase()
    return terms.some((term) => source.includes(term))
  })
}

function combinedStatus(values: readonly string[]) {
  if (values.length === 0) return publicStatus('desconhecido')
  const statuses = values.map((value) => publicStatus(value))
  if (statuses.some((item) => item.label === 'Indisponível')) {
    return publicStatus('indisponivel')
  }
  if (statuses.some((item) => item.label === 'Atenção')) {
    return publicStatus('desconhecido')
  }
  return publicStatus('operacional')
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
  const [supportResponse, setSupportResponse] = useState('')
  const [supportFeedback, setSupportFeedback] = useState<string | null>(null)
  const [supportBusy, setSupportBusy] = useState(false)
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

  async function processSupport(
    request: TechnicalSupportRequest,
    action: 'iniciar' | 'solicitar_teste' | 'resolver' | 'cancelar',
  ) {
    if (supportBusy) return
    const response = supportResponse.trim()
    if (action !== 'iniciar' && response.length < 3) {
      setSupportFeedback('Informe uma resposta ou justificativa com pelo menos três caracteres.')
      return
    }
    setSupportBusy(true)
    setSupportFeedback(null)
    const result = await integration.processSupportRequest(
      request.request_id,
      action,
      response || null,
    )
    if (result.status === 'success') {
      setSupportResponse('')
      setSupportFeedback('Chamado técnico atualizado no banco.')
      const refreshed = await loadSnapshot()
      setState(refreshed)
      await openHistory(request.request_id)
    } else {
      setSupportFeedback(
        result.status === 'error'
          ? result.error.message
          : 'O banco não confirmou a atualização do chamado.',
      )
    }
    setSupportBusy(false)
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
          <h2 id="technical-title">Área Técnica do CAPO</h2>
          <p>
            Situação do sistema, chamados, diagnóstico e manutenção em um único lugar.
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

      <nav className="technical-tabs technical-quick-access" aria-label="Módulos técnicos">
        <h2>Acessos rápidos</h2>
        <div className="technical-quick-grid">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`technical-quick-card technical-quick-${key}${activeTab === key ? ' is-active' : ''}`}
            aria-current={activeTab === key ? 'page' : undefined}
            onClick={() => setActiveTab(key)}
          >
            <span className="technical-quick-icon" aria-hidden="true">{{ painel: '▣', chamados: '▤', diagnostico: '◷', manutencao: '⚙' }[key]}</span>
            <strong>{label}</strong>
            <span>{{ painel: 'Estado do sistema', chamados: 'Receber e acompanhar', diagnostico: 'Conexão, integrações e logs', manutencao: 'Ferramentas e documentação' }[key]}</span>
          </button>
        ))}
        </div>
      </nav>

      <StateMessage state={state} />

      {state.status === 'success' && activeTab === 'painel' && (() => {
        const database = findComponent(state.data.systemStatus.components, [
          'database',
          'banco',
        ])
        const auth = findComponent(state.data.systemStatus.components, [
          'auth',
          'autenticação',
          'autenticacao',
        ])
        const systemSituation = combinedStatus(
          state.data.systemStatus.components.map((item) => item.status),
        )
        const integrationsSituation = combinedStatus(
          state.data.integrations.integrations.map((item) => item.status),
        )
        const recentIncidents = state.data.dashboard.runtime.recent_errors.length
        const supportTotal = Object.values(state.data.dashboard.support).reduce<number>(
          (total, value) => total + Number(value || 0),
          0,
        )

        const cards = [
          {
            title: 'Situação geral do sistema',
            status: systemSituation,
            detail:
              systemSituation.label === 'Operacional'
                ? 'Os componentes verificados estão funcionando normalmente.'
                : 'Existe pelo menos um componente que precisa de atenção.',
          },
          {
            title: 'Banco',
            status: publicStatus(database?.status ?? 'desconhecido'),
            detail:
              publicStatus(database?.status ?? 'desconhecido').label === 'Operacional'
                ? 'O banco respondeu normalmente à verificação do sistema.'
                : publicStatus(database?.status ?? 'desconhecido').label === 'Indisponível'
                  ? 'O banco não respondeu à verificação e precisa de intervenção.'
                  : 'A situação do banco precisa ser conferida em Diagnóstico.',
          },
          {
            title: 'Autenticação',
            status: publicStatus(auth?.status ?? 'desconhecido'),
            detail:
              publicStatus(auth?.status ?? 'desconhecido').label === 'Operacional'
                ? 'O acesso e a autenticação responderam normalmente à verificação.'
                : publicStatus(auth?.status ?? 'desconhecido').label === 'Indisponível'
                  ? 'A autenticação não respondeu à verificação e precisa de intervenção.'
                  : 'A situação da autenticação precisa ser conferida em Diagnóstico.',
          },
          {
            title: 'Integrações',
            status: integrationsSituation,
            detail:
              state.data.integrations.integrations.length === 0
                ? 'Nenhuma integração externa foi retornada para verificação.'
                : `${state.data.integrations.integrations.length} integração(ões) acompanhada(s).`,
          },
          {
            title: 'Avisos / incidentes',
            status: publicStatus(recentIncidents > 0 ? 'desconhecido' : 'operacional'),
            detail:
              recentIncidents > 0
                ? `${recentIncidents} ocorrência(s) recente(s) precisa(m) de análise em Diagnóstico.`
                : 'Nenhum incidente crítico recente foi registrado no período.',
          },
          {
            title: 'Resumo dos chamados',
            status: publicStatus('operacional'),
            detail: `${supportTotal} chamado(s) contabilizado(s) no período selecionado.`,
          },
        ]

        return (
          <div className="technical-grid technical-overview-grid">
            {cards.map((card) => (
              <article className="technical-card" key={card.title}>
                <div className="technical-card-heading">
                  <h3>{card.title}</h3>
                  <span className={`technical-status is-${card.status.className}`}>
                    {card.status.label}
                  </span>
                </div>
                <p>{card.detail}</p>
              </article>
            ))}
            <article className="technical-card technical-span">
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
          </div>
        )
      })()}

      {state.status === 'success' && activeTab === 'diagnostico' && (
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
                  <span className={`technical-status is-${publicStatus(item.status).className}`}>
                    {publicStatus(item.status).label}
                  </span>
                </div>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </article>
      )}

      {state.status === 'success' && activeTab === 'chamados' && (
        <article className="technical-card">
          <h3>Chamados de suporte recebidos</h3>
          <label>
            Resposta / justificativa técnica
            <textarea
              value={supportResponse}
              onChange={(event) => setSupportResponse(event.target.value)}
              maxLength={2000}
              rows={4}
            />
          </label>
          {supportFeedback && <p role="status">{supportFeedback}</p>}
          {state.data.supportRequests.length === 0 ? (
            <p>Nenhum chamado real disponível no contexto técnico.</p>
          ) : (
            <div className="technical-request-list">
              {state.data.supportRequests.map((request) => (
                <div key={request.request_id}>
                  <button
                    type="button"
                    className={selectedRequest === request.request_id ? 'is-selected' : undefined}
                    onClick={() => void openHistory(request.request_id)}
                  >
                    <strong>{request.subject}</strong>
                    <span>{request.status}</span>
                    <small>{formatDateTime(request.created_at)}</small>
                  </button>
                  <div>
                    {request.status === 'pendente' && (
                      <button type="button" disabled={supportBusy} onClick={() => void processSupport(request, 'iniciar')}>Iniciar atendimento</button>
                    )}
                    {request.status === 'em_atendimento' && (
                      <>
                        <button type="button" disabled={supportBusy || supportResponse.trim().length < 3} onClick={() => void processSupport(request, 'solicitar_teste')}>Solicitar teste</button>
                        <button type="button" disabled={supportBusy || supportResponse.trim().length < 3} onClick={() => void processSupport(request, 'resolver')}>Resolver</button>
                        <button type="button" disabled={supportBusy || supportResponse.trim().length < 3} onClick={() => void processSupport(request, 'cancelar')}>Cancelar</button>
                      </>
                    )}
                    {request.status === 'aguardando_teste' && (
                      <>
                        <button type="button" disabled={supportBusy || supportResponse.trim().length < 3} onClick={() => void processSupport(request, 'resolver')}>Resolver</button>
                        <button type="button" disabled={supportBusy || supportResponse.trim().length < 3} onClick={() => void processSupport(request, 'cancelar')}>Cancelar</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      )}

      {state.status === 'success' && activeTab === 'manutencao' && (
        <article className="technical-card">
          <h3>Manutenção</h3>
          <p>
            Acessos e referências para executar somente correções técnicas autorizadas.
          </p>
          <div className="technical-action-grid">
            <a
              className="technical-action-card"
              href="https://github.com/danielecarvalho45/caposistema"
              target="_blank"
              rel="noreferrer"
            >
              <strong>GitHub</strong>
              <span>Abrir repositório oficial do Sistema CAPO</span>
            </a>
            <a
              className="technical-action-card"
              href="https://supabase.com/dashboard/project/fftebavlhbfcrvrtnrld"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Supabase</strong>
              <span>Abrir projeto oficial do Sistema CAPO</span>
            </a>
            <div className="technical-action-card is-disabled">
              <strong>IA de Desenvolvimento do CAPO</strong>
              <span>Acesso externo não configurado nesta interface.</span>
            </div>
            <a
              className="technical-action-card"
              href="https://github.com/danielecarvalho45/caposistema/blob/main/CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1).md"
              target="_blank"
              rel="noreferrer"
            >
              <strong>Documentação Técnica</strong>
              <span>Abrir manual técnico vigente no repositório</span>
            </a>
          </div>
          <div className="technical-maintenance-status">
            <h4>Correções / manutenções em andamento</h4>
            <p>
              Nenhuma lista de manutenção em andamento é criada por estimativa.
              Quando houver registro técnico real disponível, ele deve ser apresentado aqui.
            </p>
          </div>
        </article>
      )}

      {state.status === 'success' && activeTab === 'manutencao' && (
        <article className="technical-card">
          <h3>Perfil técnico</h3>
          <dl className="technical-profile-list">
            <div><dt>Contexto</dt><dd>{accessContext.primary_context.name ?? accessContext.primary_context.code}</dd></div>
            <div><dt>Usuário</dt><dd>{accessContext.username}</dd></div>
            <div><dt>Funções</dt><dd>{accessContext.roles.map((role) => role.name).join(' · ')}</dd></div>
          </dl>
        </article>
      )}

      {state.status === 'success' && activeTab === 'diagnostico' && (
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
                    <strong>{integrationLabel(item.technical_name)}</strong>
                    <span
                      className={`technical-status is-${publicStatus(item.status).className}`}
                    >
                      {publicStatus(item.status).label}
                    </span>
                  </div>
                  <p>{item.evidence}</p>
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

      {state.status === 'success' && activeTab === 'diagnostico' && (
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

      {state.status === 'success' && activeTab === 'chamados' && (
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
