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
  const isProfessional =
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some(
      (role) => role.code === 'profissional',
    )
  const isManager = accessContext.primary_context.code === 'administrador'

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

  if (!isProfessional && isManager) {
    return (
      <section className="reports-page" aria-labelledby="manager-reports-title">
        <header className="reports-card reports-heading">
          <div>
            <p className="eyebrow">Governança e Gestão</p>
            <h2 id="manager-reports-title">Relatórios Gerenciais</h2>
            <p>Indicadores institucionais de agenda, filas, faltosos, solicitações e fluxos autorizados.</p>
          </div>
        </header>
        <article className="reports-card">
          <h3>Visão gerencial</h3>
          <p>O painel está reservado para os indicadores retornados pelo contrato gerencial oficial.</p>
          <p className="reports-muted">Nenhum indicador gerencial real foi retornado nesta sessão.</p>
        </article>
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
        </article>
      )}
    </section>
  )
}
