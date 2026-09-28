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
import { AdministrativeOperationalReport } from './AdministrativeOperationalReport'
import { buildReportPdf, type ReportExport } from './report-export'
import documentHeader from '../../assets/capo-timbre-oficial.png'
import { capoPdfFooter } from '../../lib/pdf/capo-document-pdf'

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
    patients: 'Pacientes',
    agenda: 'Agenda',
    active_search: 'Busca ativa',
    no_show_followup: 'Acompanhamento de Faltosos',
    waiting_list: 'Fila de espera',
    administrative_requests: 'Solicitações administrativas',
    referrals: 'Encaminhamentos',
    dentistry: 'Odontologia',
    transport: 'Transporte',
    closures: 'Encerramentos',
    social: 'Acompanhamento Social',
    prescription_renewal: 'Renovação de Receita',
    nutrition: 'Nutrição',
    family_links: 'Vínculos familiares',
    total_period: 'Total no período',
    total_current: 'Total atual',
    registered_period: 'Cadastrados no período',
    active_current: 'Ativos atualmente',
    deaths_period: 'Óbitos no período',
    valid_period: 'Válidos no período',
    scheduled_period: 'Agendados no período',
    confirmed_period: 'Confirmados no período',
    realized_period: 'Realizados no período',
    no_show_period: 'Faltas no período',
    cancelled_period: 'Cancelados no período',
    rescheduled_period: 'Remarcados no período',
    returns_period: 'Retornos no período',
    absenteeism_numerator: 'Faltas para cálculo de absenteísmo',
    absenteeism_denominator: 'Atendimentos para cálculo de absenteísmo',
    absenteeism_rate_pct: 'Taxa de absenteísmo (%)',
    open_flows_current: 'Fluxos abertos atualmente',
    attempts_period: 'Tentativas no período',
    closed_flows_period: 'Fluxos encerrados no período',
    open_current: 'Abertos atualmente',
    rescheduling_requested_period: 'Remarcações solicitadas no período',
    waiting_current: 'Aguardando atualmente',
    entries_period: 'Entradas no período',
    called_period: 'Convocados no período',
    removed_period: 'Removidos no período',
    created_period: 'Criados no período',
    completed_period: 'Concluídos no período',
    rejected_current: 'Recusados atualmente',
    approved_period: 'Aprovados no período',
    need_active_current: 'Necessidades ativas atualmente',
    need_started_period: 'Necessidades iniciadas no período',
    need_cancellation_requested_period: 'Cancelamentos solicitados no período',
    need_closed_period: 'Necessidades encerradas no período',
    requested_period: 'Solicitados no período',
    external_forwarded_period: 'Encaminhados externamente no período',
    pending_current: 'Pendentes atualmente',
    initiated_period: 'Iniciados no período',
    closed_period: 'Encerrados no período',
    reopened_period: 'Reabertos no período',
    reopening_requests_period: 'Reaberturas solicitadas no período',
    reopening_approved_period: 'Reaberturas aprovadas no período',
    reopening_denied_period: 'Reaberturas negadas no período',
    started_period: 'Iniciados no período',
    in_flow_current: 'Em fluxo atualmente',
    documents_generated_period: 'Documentos gerados no período',
    deliveries_registered_period: 'Entregas registradas no período',
    admin_deliveries_open_current: 'Entregas administrativas abertas atualmente',
    deliveries_completed_period: 'Entregas concluídas no período',
    deliveries_cancelled_period: 'Entregas canceladas no período',
    active_links_current: 'Vínculos ativos atualmente',
    linked_period: 'Vinculados no período',
    unlinked_period: 'Desvinculados no período',
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

function dashboardLabel(value: string) {
  const label = metricLabel(value)
  return label === value.replaceAll('_', ' ') ? 'Indicador adicional' : label
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
  const isAdministrativeOperationalContext =
    accessContext.primary_context.code === 'administrativo_operacional'
  if (isAdministrativeOperationalContext) return <AdministrativeOperationalReport />
  return <AuthorizedReportsPage accessContext={accessContext} integration={integration} />
}

function AuthorizedReportsPage({ accessContext, integration }: Readonly<{
  accessContext: AccessContext
  integration: CAPOReportsIntegration
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
  const [dashboardLoadedKey, setDashboardLoadedKey] = useState('')
  const [managerSpecialty, setManagerSpecialty] = useState('')
  const [selectedManagerReport, setSelectedManagerReport] = useState('')
  const [printGeneratedAt, setPrintGeneratedAt] = useState<Date | null>(null)
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
      if (active) { setDashboardState(nextState); setDashboardLoadedKey(`${startDate}:${endDate}:${specialtyId ?? ''}`) }
    })
    return () => { active = false }
  }, [endDate, integration, isManager, isProfessional, managerSpecialty, selectedSpecialty, startDate])

  if (isManager) {
    const managerSpecialties =
      dashboardState.status === 'success'
        ? dashboardSpecialties(dashboardState.data)
        : []
    const specialtyName = managerSpecialties.find((item) => item.id === managerSpecialty)?.name ?? (managerSpecialty ? 'Especialidade selecionada' : 'Todas')
    const availableSections = dashboardState.status === 'success' ? dashboardSections(dashboardState.data) : []
    const specialtyRows = dashboardState.status === 'success' ? dashboardSpecialtyRows(dashboardState.data) : []
    const reportOptions = [
      ...availableSections.filter(([, section]) => dashboardEntries(section).length > 0).map(([key]) => ({ key, label: dashboardLabel(key) })),
      ...(specialtyRows.length ? [{ key: 'agenda_by_specialty', label: 'Agenda por especialidade' }] : []),
    ]
    const selectedOption = reportOptions.find((option) => option.key === selectedManagerReport)
    const report: ReportExport | null = (dashboardState.status === 'success' || dashboardState.status === 'empty') && dashboardLoadedKey === `${startDate}:${endDate}:${managerSpecialty}` && (!selectedManagerReport || selectedOption) ? {
      scope: accessContext.roles.some((role) => role.code === 'administrador') ? 'Gestor / Titular' : 'Coordenador',
      from: startDate,
      to: endDate,
      specialty: specialtyName,
      reportType: selectedOption?.label ?? 'Visão geral',
      issuedAt: new Date().toLocaleString('pt-BR'),
      generatedBy: accessContext.full_name?.trim() || accessContext.username,
      sections: [
        ...availableSections.filter(([key, section]) => (!selectedManagerReport || key === selectedManagerReport) && dashboardEntries(section).length > 0).map(([key, section]) => ({ title: dashboardLabel(key), metrics: dashboardEntries(section).map(([metric, value]) => [dashboardLabel(metric), String(value)] as const) })),
        ...(specialtyRows.length && (!selectedManagerReport || selectedManagerReport === 'agenda_by_specialty') ? [{ title: 'Agenda por especialidade', metrics: specialtyRows.map((row) => [String(row.specialty_name ?? 'Sem especialidade'), `Válidos: ${row.valid_period ?? 0}; Realizados: ${row.realized_period ?? 0}; Faltas: ${row.no_show_period ?? 0}; Retornos: ${row.returns_period ?? 0}; Absenteísmo: ${row.absenteeism_rate_pct ?? 0}%`] as const) }] : []),
      ],
    } : null
    function downloadPdf() {
      if (!report) return
      const generatedAt = new Date()
      const url = URL.createObjectURL(buildReportPdf({ ...report, generatedAt, issuedAt: generatedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }))
      const link = document.createElement('a')
      link.href = url
      link.download = `CAPO-relatorio-gerencial-${startDate}-${endDate}.pdf`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    }
    return (
      <section className="reports-page" aria-labelledby="manager-reports-title">
        <div className="reports-print-brand"><img src={documentHeader} alt="CAPO, Secretaria Municipal de Saúde e Prefeitura de Pouso Alegre" /></div>
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
            <label>
              Relatório para PDF
              <select value={selectedManagerReport} onChange={(event) => setSelectedManagerReport(event.target.value)}>
                <option value="">Visão geral — todos os relatórios</option>
                {reportOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
              </select>
            </label>
          </div>
        </header>
        {report && <div className="reports-card reports-export-meta">
          <strong>CAPO — Relatórios Gerenciais</strong>
          <span>Relatório: {report.reportType} · Escopo: {report.scope} · Período: {report.from} a {report.to} · Especialidade: {report.specialty} · Emissão: {report.issuedAt}</span>
        </div>}
        <div className="reports-card reports-export-actions">
          <button type="button" disabled={!report} onClick={() => { setPrintGeneratedAt(new Date()); window.setTimeout(() => window.print(), 0) }}>Imprimir</button>
          <button type="button" disabled={!report} onClick={downloadPdf}>Gerar / salvar PDF</button>
        </div>
        <DashboardPanel state={dashboardState} management />
        {report && <div className="reports-print-footer">{capoPdfFooter(report.generatedBy ?? 'Autoria não informada', printGeneratedAt ?? new Date())}</div>}
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
            <p>Nenhum indicador gerencial disponível para esta seleção.</p>
          )}
          <div className="reports-metrics">
            {sections.map(([sectionName, section]) => {
              const metrics = dashboardEntries(section)
              if (metrics.length === 0) return null
              return (
                <section key={sectionName} aria-label={dashboardLabel(sectionName)}>
                  <h4>{dashboardLabel(sectionName)}</h4>
                  <dl>
                    {metrics.map(([key, value]) => (
                      <div key={key}><dt>{dashboardLabel(key)}</dt><dd>{String(value)}</dd></div>
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
          {entries.map(([key, value]) => <div key={key}><dt>{dashboardLabel(key)}</dt><dd>{String(value)}</dd></div>)}
        </dl>
      )}
    </article>
  )
}
