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
import '../../styles/quick-access.css'
import { Link } from 'react-router-dom'
import { BirthdayPanel } from '../../components/birthdays/BirthdayPanel'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import { PatientCareSpecialties } from '../../components/patients/PatientCareSpecialties'
import { PatientDischargeProximityIndicator } from '../../components/patients/PatientDischargeProximityIndicator'
import { canAccessAppRoute } from '../../app/route-access'
import type { ProfessionalScreenKind } from './professional-screen'

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
  profileKind = 'assistencial_padrao',
  integration = defaultIntegration,
  homeOnly = false,
}: Readonly<{
  accessContext: AccessContext
  profileKind?: Extract<ProfessionalScreenKind, 'clinico_geral' | 'assistencial_padrao'>
  integration?: CAPOProfissionalAssistencialIntegration
  homeOnly?: boolean
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
    accessContext.roles.some((role) => role.code === 'profissional')
  const canEditDischargeProximity =
    profileKind === 'clinico_geral' &&
    (accessContext.specialties ?? []).some(
      (specialty) =>
        specialty.specialty_name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase() === 'clinica geral',
    )
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
    if (!isProfessional || homeOnly || !selectedSpecialty || endDate < startDate) return
    let active = true
    void integration
      .loadReport(selectedSpecialty, startDate, endDate)
      .then((nextState) => {
        if (active) setReportState(nextState)
      })
    return () => {
      active = false
    }
  }, [endDate, homeOnly, integration, isProfessional, selectedSpecialty, startDate])

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
    const result = await integration.loadAppointmentContext(appointment.appointment_id)
    if (result.status === 'success') {
      setSearchState({
        status: 'success',
        data: [{
          patient_id: result.data.patient_id,
          full_name: result.data.patient_name,
          patient_number: result.data.patient_number,
          cms: result.data.cms,
          status: 'ativo',
          total_count: 1,
        }],
      })
      globalThis.document.getElementById('assistential-patients')?.scrollIntoView?.({ block: 'start' })
    } else {
      setSearchState(result.status === 'error' ? result : { status: 'empty' })
    }
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
    <section className="assistential-page home-mobile-standard" aria-labelledby="assistential-title">
      <nav className="assistential-card home-profile-standard" aria-label="Acessos rápidos do profissional">
        <h2 id="assistential-title">Acessos rápidos</h2>
        <div className="home-profile-grid">
          <Link className="home-profile-card quick-blue" to="/agenda"><span className="home-profile-icon" aria-hidden="true">▣</span><strong>Minha Agenda</strong><span>Dia, semana e mês</span></Link>
          <Link className="home-profile-card quick-blue" to="/atuacao"><span className="home-profile-icon" aria-hidden="true">♙</span><strong>Pacientes</strong><span>Consultar a própria atuação</span></Link>
          <Link className="home-profile-card quick-blue" to="/minha-agenda/gerenciar"><span className="home-profile-icon" aria-hidden="true">⏱</span><strong>Gerenciar minha agenda</strong><span>Bloqueios e ajustes temporários</span></Link>
          <Link className="home-profile-card quick-purple" to="/minha-agenda/solicitar-alteracao"><span className="home-profile-icon" aria-hidden="true">▤</span><strong>Solicitar alteração de agenda</strong><span>Mudança estrutural para análise da Coordenação</span></Link>
          {canAccessAppRoute(accessContext, '/solicitacoes') && <Link className="home-profile-card quick-purple" to="/solicitacoes"><span className="home-profile-icon" aria-hidden="true">▤</span><strong>Solicitações</strong><span>Acompanhar demandas autorizadas</span></Link>}
          {canAccessAppRoute(accessContext, '/encaminhamentos') && accessContext.capabilities.includes('encaminhamento_interprofissional') && <Link className="home-profile-card quick-mint" to="/encaminhamentos"><span className="home-profile-icon" aria-hidden="true">↗</span><strong>Encaminhamentos</strong><span>Consultar e encaminhar</span></Link>}
          {profileKind === 'clinico_geral' && canAccessAppRoute(accessContext, '/receita') && <Link className="home-profile-card quick-yellow" to="/receita"><span className="home-profile-icon" aria-hidden="true">▰</span><strong>Renovação de Receita</strong><span>Solicitações recebidas</span></Link>}
          <Link className="home-profile-card quick-violet" to="/relatorios"><span className="home-profile-icon" aria-hidden="true">▥</span><strong>Relatórios</strong><span>Indicadores da própria atuação</span></Link>
          <Link className="home-profile-card quick-yellow" to="/suporte"><span className="home-profile-icon" aria-hidden="true">?</span><strong>Solicitar manutenção</strong><span>Informar problema ao suporte</span></Link>
        </div>
      </nav>

      <section id="assistential-agenda">
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
            Não foi possível carregar as especialidades: {specialtiesState.error.message}
          </div>
        )}
        {specialtiesState.status === 'success' && specialtiesState.data.length > 1 && (
          <label className="assistential-specialty-selector">
            Especialidade
            <select
              value={selectedSpecialty}
              onChange={(event) => setSelectedSpecialty(event.target.value)}
            >
              {specialtiesState.data.map((specialty) => (
                <option key={specialty.specialty_id} value={specialty.specialty_id}>
                  {specialty.specialty_name}
                </option>
              ))}
            </select>
          </label>
        )}
        <AgendaPage
          accessContext={accessContext}
          loadAgenda={integration.loadAgenda}
          onConfirmed={(appointment) => void openConfirmedPatient(appointment)}
          embeddedHome
        />
      </section>

      <BirthdayPanel title="Aniversariantes de hoje" allowPatientWhatsApp />

      {(!homeOnly || searchState !== null) && (
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
                  <PatientCareSpecialties patientId={patient.patient_id} />
                  <PatientDischargeProximityIndicator
                    patientId={patient.patient_id}
                    editable={canEditDischargeProximity}
                  />
                  <div className="assistential-patient-actions">
                    <PatientWhatsAppButton patientId={patient.patient_id} />
                    {canAccessAppRoute(accessContext, '/solicitacoes') && (
                      <Link
                        to="/solicitacoes"
                        state={{
                          patientId: patient.patient_id,
                          patientName: patient.full_name,
                          origin: 'assistential_patient',
                        }}
                      >
                        Solicitação
                      </Link>
                    )}
                    {canAccessAppRoute(accessContext, '/encaminhamentos') &&
                      accessContext.capabilities.includes('encaminhamento_interprofissional') && (
                        <Link
                          to="/encaminhamentos"
                          state={{
                            patientId: patient.patient_id,
                            patientName: patient.full_name,
                            origin: 'assistential_patient',
                          }}
                        >
                          Encaminhamento
                        </Link>
                      )}
                    {canAccessAppRoute(accessContext, '/encerramentos') && (
                      <Link
                        to="/encerramentos"
                        state={{
                          patientId: patient.patient_id,
                          patientName: patient.full_name,
                          origin: 'assistential_patient',
                        }}
                      >
                        Encerramento
                      </Link>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </article>
      )}

      {!homeOnly && selectedSpecialty && (
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

      {!homeOnly && (
        <aside className="assistential-notice">
          Registros clínicos continuam nos fluxos próprios de cada especialidade;
          esta área não cria conteúdo clínico genérico nem dados simulados.
        </aside>
      )}
    </section>
  )
}
