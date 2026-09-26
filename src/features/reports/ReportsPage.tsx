import { useEffect, useState } from 'react'
import {
  loadingState,
  type AssistentialOperationalReport,
  type AsyncState,
  type OperationalReportSection,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import {
  createReportsIntegration,
  type CAPOReportsIntegration,
} from './reports-integration'
import { getRpcService } from '../../lib/supabase/rpc'
import './reports-page.css'

const defaultIntegration = createReportsIntegration()

const reportSections: ReadonlyArray<
  readonly [keyof AssistentialOperationalReport, string]
> = [
  ['agenda', 'Agenda'],
  ['retornos', 'Retornos'],
  ['fila_especialidade', 'Fila da especialidade'],
  ['solicitacoes', 'Solicitacoes'],
  ['encaminhamentos', 'Encaminhamentos'],
  ['encerramentos', 'Encerramentos'],
]

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function metricLabel(value: string) {
  const labels: Record<string, string> = {
    agendado: 'Agendados',
    confirmado: 'Confirmados',
    realizado: 'Realizados',
    faltou: 'Faltas',
    cancelado: 'Cancelados',
    remarcado: 'Remarcados',
    waiting: 'Aguardando',
    paused: 'Pausados',
    called: 'Convocados',
    scheduled: 'Agendados',
    cancelled: 'Cancelados',
    removed: 'Removidos',
    pending: 'Pendentes',
    in_progress: 'Em andamento',
    completed: 'Concluidos',
    pending_approval: 'Aguardando aprovacao',
    approved: 'Aprovados',
    rejected: 'Recusados',
    enabled: 'Disponivel',
    pendente: 'Pendentes',
    encerrado: 'Encerrados',
    reaberto: 'Reabertos',
  }
  return labels[value] ?? value.replaceAll('_', ' ')
}

function sectionEntries(section: OperationalReportSection) {
  return Object.entries(section).filter(([key]) => key !== 'scope')
}

function startOfCurrentMonth() {
  const date = new Date()
  return dateInputValue(new Date(date.getFullYear(), date.getMonth(), 1))
}

function dashboardRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function dashboardEntries(value: unknown): readonly [string, string | number | boolean][] {
  const record = dashboardRecord(value)
  if (!record) return []
  return Object.entries(record).flatMap(([key, item]) =>
    typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
      ? [[key, item] as const]
      : [],
  )
}

function dashboardSections(value: unknown) {
  const record = dashboardRecord(value)
  if (!record) return [] as readonly [string, Record<string, unknown>][]
  return Object.entries(record).flatMap(([key, item]) => {
    const section = dashboardRecord(item)
    return section && key !== 'meta' ? [[key, section] as [string, Record<string, unknown>]] : []
  })
}

function dashboardSpecialties(value: unknown) {
  const record = dashboardRecord(value)
  const options = record?.specialty_options
  if (!Array.isArray(options)) return [] as readonly { id: string; name: string }[]
  return options.flatMap((item) => {
    const row = dashboardRecord(item)
    return row && typeof row.id === 'string' && typeof row.name === 'string'
      ? [{ id: row.id, name: row.name }]
      : []
  })
}

function dashboardSpecialtyRows(value: unknown) {
  const record = dashboardRecord(value)
  const rows = record?.agenda_by_specialty
  return Array.isArray(rows)
    ? rows.filter((item): item is Record<string, unknown> => Boolean(dashboardRecord(item)))
    : []
}

export function ReportsPage({
  accessContext,
  integration = defaultIntegration,
}: Readonly<{
  accessContext: AccessContext
  integration?: CAPOReportsIntegration
}>) {
  const [specialtiesState, setSpecialtiesState] = useState<
    AsyncState<
      readonly {
        specialty_id: string
        specialty_name: string
        is_current_context: boolean
      }[]
    >
  >(loadingState)
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [startDate, setStartDate] = useState(startOfCurrentMonth)
  const [endDate, setEndDate] = useState(() => dateInputValue(new Date()))
  const [reportState, setReportState] =
    useState<AsyncState<AssistentialOperationalReport>>(loadingState)
  const [dashboardState, setDashboardState] = useState<AsyncState<unknown>>(loadingState)
  const [managerSpecialty, setManagerSpecialty] = useState('')
  const isProfessional =
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some(
      (role) => role.code === 'profissional',
    )
  const isManager = accessContext.roles.some((role) => ['administrador', 'coordenador'].includes(role.code))

  useEffect(() => {
    if (!isProfessional) return
    let active = true
    void integration.loadSpecialties().then((nextState) => {
      if (!active) return
      setSpecialtiesState(nextState)
      if (nextState.status === 'success' && nextState.data.length > 0) {
        const current = nextState.data.find((item) => item.is_current_context)
        setSelectedSpecialty(
          current?.specialty_id ?? nextState.data[0].specialty_id,
        )
      }
    })
    return () => {
      active = false
    }
  }, [integration, isProfessional])

  useEffect(() => {
    if (!isProfessional || !selectedSpecialty || endDate < startDate) return
    let active = true
    void integration
      .loadReport(selectedSpecialty, startDate, endDate)
      .then((nextState) => {
        if (active) setReportState(nextState)
      })
    return () => {
      active = false
    }
  }, [endDate, integration, isProfessional, selectedSpecialty, startDate])

  useEffect(() => {
    const specialtyId = isManager
      ? managerSpecialty || null
      : isProfessional
        ? selectedSpecialty || null
        : null
    if (!isManager && isProfessional && !specialtyId) return
    if (!isManager && !isProfessional) return
    let active = true
    const loadDashboard = integration.loadDashboard ?? ((from, to, specialty) => getRpcService().getReportsDashboard(from, to, specialty))
    void loadDashboard(startDate, endDate, specialtyId).then((nextState) => {
      if (active) setDashboardState(nextState)
    })
    return () => { active = false }
  }, [endDate, integration, isManager, isProfessional, managerSpecialty, selectedSpecialty, startDate])

  if (isManager) {
    const managerSpecialties =
      dashboardState.status === 'success'
        ? dashboardSpecialties(dashboardState.data)
        : []
    return (
      <section className="reports-page" aria-labelledby="manager-reports-title">
        <header className="reports-card reports-heading">
          <div>
            <p className="eyebrow">Governança e Gestão</p>
            <h2 id="manager-reports-title">Relatórios Gerenciais</h2>
            <p>Indicadores institucionais calculados a partir dos registros reais do CAPO.</p>
          </div>
          <div className="reports-filters">
            <label>
              De
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>
            <label>
              Até
              <input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>
            <label>
              Especialidade
              <select value={managerSpecialty} onChange={(event) => setManagerSpecialty(event.target.value)}>
                <option value="">Todas</option>
                {managerSpecialties.map((specialty) => (
                  <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <DashboardPanel state={dashboardState} management />
      </section>
    )
  }

  if (!isProfessional) {
    return (
      <section className="reports-page" aria-labelledby="reports-blocked-title">
        <div className="reports-card">
          <p className="eyebrow">Relatorios</p>
          <h2 id="reports-blocked-title">Relatorios indisponiveis</h2>
          <p>Este relatorio exige vinculo profissional assistencial ativo.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="reports-page" aria-labelledby="reports-title">
      <header className="reports-card reports-heading">
        <div>
          <p className="eyebrow">Relatorios autorizados</p>
          <h2 id="reports-title">Relatorio operacional</h2>
          <p>Indicadores reais da especialidade no periodo selecionado.</p>
        </div>
        <label>
          Especialidade
          <select
            value={selectedSpecialty}
            disabled={specialtiesState.status !== 'success'}
            onChange={(event) => setSelectedSpecialty(event.target.value)}
          >
            {specialtiesState.status === 'success' &&
              specialtiesState.data.map((specialty) => (
                <option
                  key={specialty.specialty_id}
                  value={specialty.specialty_id}
                >
                  {specialty.specialty_name}
                </option>
              ))}
          </select>
        </label>
      </header>

      {specialtiesState.status === 'loading' && (
        <div className="reports-card">Carregando especialidades...</div>
      )}
      {specialtiesState.status === 'empty' && (
        <div className="reports-card">
          Nenhuma especialidade assistencial ativa foi encontrada.
        </div>
      )}
      {specialtiesState.status === 'error' && (
        <div className="reports-card reports-error" role="alert">
          Nao foi possivel carregar as especialidades:{' '}
          {specialtiesState.error.message}
        </div>
      )}

      {selectedSpecialty && (
        <article className="reports-card">
          <div className="reports-toolbar">
            <div>
              <h3>Indicadores</h3>
              <p>Fonte: contrato operacional da especialidade.</p>
            </div>
            <div className="reports-filters">
              <label>
                De
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label>
                Ate
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>
          </div>
          {reportState.status === 'loading' && <p>Carregando indicadores...</p>}
          {reportState.status === 'empty' && <p>Resumo indisponivel.</p>}
          {reportState.status === 'error' && (
            <p className="reports-error" role="alert">
              Nao foi possivel carregar o relatorio: {reportState.error.message}
            </p>
          )}
          {reportState.status === 'success' && (
            <div className="reports-metrics">
              {reportSections.map(([key, label]) => {
                const section = reportState.data[key]
                if (typeof section !== 'object') return null
                return (
                  <section key={key} aria-label={label}>
                    <h4>{label}</h4>
                    <dl>
                      {sectionEntries(section).map(([metric, value]) => (
                        <div key={metric}>
                          <dt>{metricLabel(metric)}</dt>
                          <dd>
                            {typeof value === 'boolean'
                              ? value
                                ? 'Sim'
                                : 'Nao'
                              : value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )
              })}
            </div>
          )}
          <DashboardPanel state={dashboardState} />
        </article>
      )}
    </section>
  )
}

function DashboardPanel({ state, management = false }: Readonly<{ state: AsyncState<unknown>; management?: boolean }>) {
  if (state.status === 'loading') return <article className="reports-card"><p>Carregando dashboard oficial...</p></article>
  if (state.status === 'empty') return <article className="reports-card"><p>Nenhum indicador autorizado foi retornado.</p></article>
  if (state.status === 'error') return <article className="reports-card reports-error" role="alert"><p>Não foi possível carregar o dashboard: {state.error.message}</p></article>
  const entries = dashboardEntries(state.data)
  const sections = management ? dashboardSections(state.data) : []
  const specialtyRows = management ? dashboardSpecialtyRows(state.data) : []
  return (
    <article className="reports-card">
      <h3>Dashboard oficial</h3>
      {management ? (
        <>
          {sections.length === 0 && specialtyRows.length === 0 && (
            <p>O backend não retornou indicadores gerenciais estruturados.</p>
          )}
          <div className="reports-metrics">
            {sections.map(([sectionName, section]) => {
              const metrics = dashboardEntries(section)
              if (metrics.length === 0) return null
              return (
                <section key={sectionName} aria-label={metricLabel(sectionName)}>
                  <h4>{metricLabel(sectionName)}</h4>
                  <dl>
                    {metrics.map(([key, value]) => (
                      <div key={key}><dt>{metricLabel(key)}</dt><dd>{String(value)}</dd></div>
                    ))}
                  </dl>
                </section>
              )
            })}
          </div>
          {specialtyRows.length > 0 && (
            <div className="reports-card">
              <h4>Agenda por especialidade</h4>
              <table>
                <thead><tr><th>Especialidade</th><th>Válidos</th><th>Realizados</th><th>Faltas</th><th>Retornos</th><th>Absenteísmo</th></tr></thead>
                <tbody>
                  {specialtyRows.map((row, index) => (
                    <tr key={String(row.specialty_id ?? index)}>
                      <td>{String(row.specialty_name ?? 'Sem especialidade')}</td>
                      <td>{String(row.valid_period ?? 0)}</td>
                      <td>{String(row.realized_period ?? 0)}</td>
                      <td>{String(row.no_show_period ?? 0)}</td>
                      <td>{String(row.returns_period ?? 0)}</td>
                      <td>{String(row.absenteeism_rate_pct ?? 0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : entries.length === 0 ? (
        <p>O backend não retornou métricas escalares para este contexto.</p>
      ) : (
        <dl className="reports-metrics">
          {entries.map(([key, value]) => <div key={key}><dt>{metricLabel(key)}</dt><dd>{String(value)}</dd></div>)}
        </dl>
      )}
    </article>
  )
}
