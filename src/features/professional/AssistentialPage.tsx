import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  loadingState,
  type AssistentialOperationalReport,
  type AssistentialPatient,
  type AssistentialSpecialty,
  type AgendaAppointment,
  type AsyncState,
  type OperationalReportSection,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { AgendaPage } from '../agenda/AgendaPage'
import {
  createAssistentialIntegration,
  type CAPOProfissionalAssistencialIntegration,
} from './assistential-integration'
import './assistential-page.css'
import { Link } from 'react-router-dom'

const defaultIntegration = createAssistentialIntegration()

const reportSections: ReadonlyArray<
  readonly [keyof AssistentialOperationalReport, string]
> = [
  ['agenda', 'Agenda'],
  ['retornos', 'Retornos'],
  ['fila_especialidade', 'Fila da especialidade'],
  ['solicitacoes', 'Solicitações'],
  ['encaminhamentos', 'Encaminhamentos'],
  ['encerramentos', 'Encerramentos'],
]

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfCurrentMonth() {
  const date = new Date()
  return dateInputValue(new Date(date.getFullYear(), date.getMonth(), 1))
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
    completed: 'Concluídos',
    pending_approval: 'Aguardando aprovação',
    approved: 'Aprovados',
    rejected: 'Recusados',
    enabled: 'Disponível',
    pendente: 'Pendentes',
    encerrado: 'Encerrados',
    reaberto: 'Reabertos',
  }
  return labels[value] ?? value.replaceAll('_', ' ')
}

function sectionEntries(section: OperationalReportSection) {
  return Object.entries(section).filter(([key]) => key !== 'scope')
}

export function AssistentialPage({
  accessContext,
  integration = defaultIntegration,
}: Readonly<{
  accessContext: AccessContext
  integration?: CAPOProfissionalAssistencialIntegration
}>) {
  const [specialtiesState, setSpecialtiesState] =
    useState<AsyncState<readonly AssistentialSpecialty[]>>(loadingState)
  const [selectedSpecialty, setSelectedSpecialty] = useState('')
  const [startDate, setStartDate] = useState(startOfCurrentMonth)
  const [endDate, setEndDate] = useState(() => dateInputValue(new Date()))
  const [reportState, setReportState] =
    useState<AsyncState<AssistentialOperationalReport>>(loadingState)
  const [query, setQuery] = useState('')
  const [searchState, setSearchState] = useState<AsyncState<
    readonly AssistentialPatient[]
  > | null>(null)
  const isProfessional =
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some((role) =>
      [
        'profissional',
        'medico_clinico_geral',
        'assistencia_social',
        'assistente_social',
        'social',
      ].includes(role.code),
    )
  const isClinicalGeneral = accessContext.roles.some(
    (role) => role.code === 'medico_clinico_geral',
  ) || accessContext.primary_specialty_name?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'clinica geral'
  const pageTitle = isClinicalGeneral
    ? 'Atuação do Médico Clínico Geral'
    : 'Minha atuação assistencial'

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

  const loadReport = useCallback(async () => {
    if (!selectedSpecialty) return
    setReportState(loadingState())
    setReportState(
      await integration.loadReport(selectedSpecialty, startDate, endDate),
    )
  }, [endDate, integration, selectedSpecialty, startDate])

  async function searchPatients(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2) {
      setSearchState(null)
      return
    }
    setSearchState(loadingState())
    setSearchState(await integration.searchPatients(cleanQuery))
  }

  async function openConfirmedPatient(appointment: AgendaAppointment) {
    setQuery(appointment.patient_name)
    setSearchState(loadingState())
    const result = await integration.searchPatients(appointment.patient_name)
    if (result.status === 'success') {
      const patient = result.data.find((item) => item.patient_id === appointment.patient_id)
      setSearchState(patient ? { status: 'success', data: [patient] } : { status: 'empty' })
      if (patient) globalThis.document.getElementById('assistential-patients')?.scrollIntoView?.({ block: 'start' })
    } else setSearchState(result)
  }

  if (!isProfessional) {
    return (
      <section
        className="assistential-page"
        aria-labelledby="assistential-blocked-title"
      >
        <div className="assistential-card">
          <p className="eyebrow">Atuação assistencial</p>
          <h2 id="assistential-blocked-title">
            Área assistencial indisponível
          </h2>
          <p>É necessário um vínculo profissional assistencial ativo.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="assistential-page" aria-labelledby="assistential-title">
      <header className="assistential-card assistential-heading">
        <div>
          <p className="eyebrow">Área compartilhada</p>
          <h2 id="assistential-title">{pageTitle}</h2>
          <p>
            {isClinicalGeneral
              ? 'Agenda, pacientes vinculados, retornos, solicitações e encaminhamentos da atuação clínica.'
              : 'Visão operacional comum às especialidades vinculadas ao profissional.'}
          </p>
        </div>
        {!isClinicalGeneral && (
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
        )}
      </header>

      {specialtiesState.status === 'loading' && (
        <div className="assistential-card" aria-live="polite">
          Carregando especialidades…
        </div>
      )}
      {specialtiesState.status === 'empty' && (
        <div className="assistential-card" role="status">
          Nenhuma especialidade assistencial ativa foi encontrada.
        </div>
      )}
      {specialtiesState.status === 'error' && (
        <div className="assistential-card assistential-error" role="alert">
          Não foi possível carregar as especialidades:{' '}
          {specialtiesState.error.message}
        </div>
      )}

      <section className="assistential-card assistential-shortcuts" aria-labelledby="assistential-shortcuts-title">
        <div>
          <p className="eyebrow">Acessos rápidos</p>
          <h3 id="assistential-shortcuts-title">Rotina profissional</h3>
        </div>
        <nav aria-label="Atalhos da rotina profissional">
          <a href="#assistential-agenda">Minha Agenda</a>
          <a href="#assistential-patients">Pacientes vinculados</a>
          <a href="#assistential-summary">Resumo operacional</a>
          {specialtiesState.status === 'success' && specialtiesState.data.some((item) => item.specialty_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'nutricao') && <Link to="/nutricao">Nutrição</Link>}
        </nav>
      </section>

      <section id="assistential-agenda" aria-labelledby="assistential-agenda-title">
        <h3
          id="assistential-agenda-title"
          className="assistential-section-title"
        >
          Minha agenda
        </h3>
        <AgendaPage
          accessContext={accessContext}
          loadAgenda={integration.loadAgenda}
          onConfirmed={(appointment) => void openConfirmedPatient(appointment)}
        />
      </section>

      <article id="assistential-patients" className="assistential-card">
        <h3>Pacientes sob sua atuação</h3>
        <p className="assistential-muted">
          A busca retorna somente pacientes vinculados à sua atuação atual.
        </p>
        <form className="assistential-search" onSubmit={searchPatients}>
          <label>
            Nome, número CAPO ou CMS
            <input
              value={query}
              minLength={2}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite ao menos 2 caracteres"
            />
          </label>
          <button type="submit" disabled={query.trim().length < 2}>
            Buscar
          </button>
        </form>
        <div aria-live="polite">
          {searchState?.status === 'loading' && <p>Buscando pacientes…</p>}
          {searchState?.status === 'empty' && (
            <p>Nenhum paciente encontrado.</p>
          )}
          {searchState?.status === 'error' && (
            <p className="assistential-error" role="alert">
              Não foi possível realizar a busca: {searchState.error.message}
            </p>
          )}
          {searchState?.status === 'success' &&
            searchState.data.length === 0 && <p>Nenhum paciente encontrado.</p>}
          {searchState?.status === 'success' && searchState.data.length > 0 && (
            <div className="assistential-patients">
              {searchState.data.map((patient) => (
                <article key={patient.patient_id}>
                  <strong>{patient.full_name}</strong>
                  <span>
                    Nº CAPO {patient.patient_number ?? 'não informado'} · CMS{' '}
                    {patient.cms ?? 'não informado'}
                  </span>
                  <small>Situação: {patient.status}</small>
                </article>
              ))}
            </div>
          )}
        </div>
      </article>

      {selectedSpecialty && (
        <article id="assistential-summary" className="assistential-card">
          <div className="assistential-heading">
            <div>
              <h3>Resumo operacional</h3>
              <p className="assistential-muted">
                Indicadores reais da especialidade no período.
              </p>
            </div>
            <div className="assistential-filters">
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
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={
                  reportState.status === 'loading' || endDate < startDate
                }
                onClick={() => void loadReport()}
              >
                Atualizar
              </button>
            </div>
          </div>

          <div aria-live="polite">
            {reportState.status === 'loading' && <p>Carregando indicadores…</p>}
            {reportState.status === 'empty' && <p>Resumo indisponível.</p>}
            {reportState.status === 'error' && (
              <p className="assistential-error" role="alert">
                Não foi possível carregar o resumo: {reportState.error.message}
              </p>
            )}
            {reportState.status === 'success' && (
              <div className="assistential-metrics">
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
                                  : 'Não'
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
          </div>
        </article>
      )}

      <aside className="assistential-notice">
        Registros clínicos continuam nos fluxos próprios de cada especialidade;
        esta área não cria conteúdo clínico genérico nem dados simulados.
      </aside>
    </section>
  )
}
