import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type BirthdayOverview,
  type AgendaScheduleSlot,
  type PendingItem,
  type NoShowFollowup,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { ProfileDashboard } from './ProfileDashboard'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import './home-page.css'
import '../../styles/quick-access.css'

function normalized(value: string | null | undefined) {
  const cleanValue = value?.trim()
  return cleanValue || null
}

function pluralizeCapabilities(total: number) {
  return total === 1
    ? '1 permissão funcional reconhecida'
    : `${total} permissões funcionais reconhecidas`
}

type HomePageProps = Readonly<{
  accessContext: AccessContext
  loadBirthdays?: () => Promise<AsyncState<BirthdayOverview>>
  loadOperationalAgendaGrid?: (
    startDate: string,
    endDate: string,
    professionalId: string | null,
  ) => Promise<AsyncState<readonly AgendaScheduleSlot[]>>
}>

function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}

function agendaBlockLabel(value: string | null) {
  switch (value) {
    case 'intervalo': return '☕ Intervalo / Café'
    case 'alimentacao': return '🍽️ Almoço'
    case 'estudo_caso': return '📚 Estudo de caso'
    case 'atendimento_online': return '💻 Atendimentos online'
    case 'rotina_administrativa': return '📋 Rotinas administrativas'
    case 'reuniao': return '👥 Reunião'
    case 'relatorio': return '📊 Relatório'
    case 'atividade': return '📋 Atividade interna'
    case 'bloqueio': return '⛔ Bloqueio'
    default: return value ?? 'Bloqueado'
  }
}

function slotTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(date)
}

export function HomePage({
  accessContext,
  loadBirthdays = getRpcService().getBirthdays,
  loadOperationalAgendaGrid = getRpcService().getAgendaScheduleGrid,
}: HomePageProps) {
  const [birthdays, setBirthdays] =
    useState<AsyncState<BirthdayOverview>>(loadingState())
  const [operationalAgenda, setOperationalAgenda] =
    useState<AsyncState<readonly AgendaScheduleSlot[]>>(loadingState())
  const [operationalPending, setOperationalPending] =
    useState<AsyncState<readonly PendingItem[]>>(loadingState())
  const [operationalNoShows, setOperationalNoShows] =
    useState<AsyncState<readonly NoShowFollowup[]>>(loadingState())
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const functionTitle = normalized(accessContext.function_title)
  const primaryCode = normalized(accessContext.primary_context.code)
  const isAdministrativeOperational =
    primaryCode === 'administrativo_operacional'
  const canViewBirthdays = accessContext.roles.some((role) =>
    [
      'administrador',
      'administrativo_operacional',
      'coordenador',
      'profissional',
    ].includes(role.code),
  )

  useEffect(() => {
    if (!canViewBirthdays) return
    let active = true
    void loadBirthdays().then((state) => active && setBirthdays(state))
    return () => {
      active = false
    }
  }, [canViewBirthdays, loadBirthdays])

  useEffect(() => {
    if (!isAdministrativeOperational) return
    let active = true
    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
    })
    const rpc = getRpcService()
    void loadOperationalAgendaGrid(today, today, null).then((state) => {
      if (active) setOperationalAgenda(state)
    })
    void rpc.getPendingItems(8, 0).then((state) => {
      if (active) setOperationalPending(state)
    })
    void rpc.getNoShowFollowups(null, 8, 0).then((state) => {
      if (active) setOperationalNoShows(state)
    })
    return () => {
      active = false
    }
  }, [isAdministrativeOperational, loadOperationalAgendaGrid])

  return (
    <div className="home-page home-mobile-standard">
      <ProfileDashboard accessContext={accessContext} />

      {isAdministrativeOperational && (
        <section className="operational-dashboard-grid" aria-label="Rotina operacional do dia">
          <article className="gestor-panel operational-agenda-panel">
            <header className="gestor-panel-head">
              <div>
                <p className="eyebrow">Hoje</p>
                <h2>Agenda do dia</h2>
              </div>
            </header>
            {operationalAgenda.status === 'loading' && <p>Carregando agendas dos profissionais…</p>}
            {operationalAgenda.status === 'error' && (
              <p role="alert">Não foi possível carregar as agendas dos profissionais.</p>
            )}
            {(operationalAgenda.status === 'empty' ||
              (operationalAgenda.status === 'success' && operationalAgenda.data.length === 0)) && (
              <div className="gestor-empty-state">Nenhum horário cadastrado para os profissionais neste dia.</div>
            )}
            {operationalAgenda.status === 'success' && operationalAgenda.data.length > 0 && (
              <div className="operational-agenda-slot-list" aria-label="Agendas dos profissionais">
                {operationalAgenda.data.map((slot) => (
                  <div
                    className={`operational-agenda-slot is-${slot.slot_status}`}
                    key={`${slot.professional_id}:${slot.slot_start}`}
                  >
                    <strong>{slotTime(slot.slot_start)}</strong>
                    <span className="operational-agenda-professional">{slot.professional_name}</span>
                    <span className="operational-agenda-status">
                      {slot.slot_status === 'livre'
                        ? 'Livre'
                        : slot.slot_status === 'bloqueado'
                          ? agendaBlockLabel(slot.block_type)
                          : slot.patient_name ?? 'Horário ocupado'}
                    </span>
                    {slot.slot_status === 'livre' && (
                      <Link
                        className="operational-agenda-action"
                        to="/agenda"
                        state={{
                          origin: 'home_free_slot',
                          professionalId: slot.professional_id,
                          slotDate: slot.slot_date,
                          slotStart: slot.slot_start,
                        }}
                      >
                        Agendar
                      </Link>
                    )}
                    {slot.slot_status === 'agendado' && slot.appointment_id && (
                      <Link
                        className="operational-agenda-action"
                        to="/agenda"
                        state={{
                          origin: 'home_cancel_appointment',
                          appointmentId: slot.appointment_id,
                          professionalId: slot.professional_id,
                          slotDate: slot.slot_date,
                        }}
                      >
                        Abrir
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link className="gestor-panel-foot" to="/agenda">Abrir Agenda Geral ›</Link>
          </article>

          <aside className="gestor-side-stack">
            <article className="gestor-panel">
              <header className="gestor-panel-head"><div><p className="eyebrow">Ação necessária</p><h2>Pendências do dia</h2></div></header>
              {operationalPending.status === 'loading' && <p>Carregando pendências…</p>}
              {operationalPending.status === 'error' && <p role="alert">Não foi possível carregar as pendências.</p>}
              {(operationalPending.status === 'empty' || (operationalPending.status === 'success' && operationalPending.data.length === 0)) && <div className="gestor-empty-state">Nenhuma pendência encontrada.</div>}
              {operationalPending.status === 'success' && operationalPending.data.length > 0 && (
                <ul className="operational-compact-list">
                  {operationalPending.data.slice(0, 5).map((item) => <li key={item.source_id}><strong>{item.title}</strong>{item.patient_name && <span>{item.patient_name}</span>}</li>)}
                </ul>
              )}
            </article>
            <article className="gestor-panel">
              <header className="gestor-panel-head"><div><p className="eyebrow">Faltas</p><h2>Faltosos</h2></div></header>
              {operationalNoShows.status === 'loading' && <p>Carregando faltosos…</p>}
              {operationalNoShows.status === 'error' && <p role="alert">Não foi possível carregar faltosos.</p>}
              {(operationalNoShows.status === 'empty' || (operationalNoShows.status === 'success' && operationalNoShows.data.length === 0)) && <div className="gestor-empty-state">Nenhum faltoso aguardando providência.</div>}
              {operationalNoShows.status === 'success' && operationalNoShows.data.length > 0 && (
                <ul className="operational-compact-list">
                  {operationalNoShows.data.slice(0, 5).map((item) => <li key={item.followup_id}><strong>{item.patient_name}</strong><span>{item.active_search_status}</span></li>)}
                </ul>
              )}
              <Link className="gestor-panel-foot" to="/faltosos">Abrir Faltosos ›</Link>
            </article>
          </aside>
        </section>
      )}

      {canViewBirthdays && (
        <section className="home-birthdays" aria-labelledby="birthdays-title">
          <div className="home-birthdays-heading">
            <div>
              <p className="eyebrow">Hoje</p>
              <h2 id="birthdays-title">Aniversariantes de hoje</h2>
            </div>
            {birthdays.status === 'success' && (
              <span>{formatDateOnly(birthdays.data.reference_date)}</span>
            )}
          </div>

          {birthdays.status === 'loading' && (
            <p aria-live="polite">Carregando aniversariantes autorizados…</p>
          )}
          {birthdays.status === 'error' && (
            <p className="home-birthdays-error" role="alert">
              Não foi possível carregar os aniversariantes autorizados.
            </p>
          )}
          {birthdays.status === 'empty' && (
            <p>Nenhum aniversariante autorizado foi retornado.</p>
          )}
          {birthdays.status === 'success' && (
            <div className="home-birthday-grid">
              <article>
                <h3>Pacientes</h3>
                {birthdays.data.patients.length === 0 ? (
                  <p>Nenhum paciente acompanhado faz aniversário hoje.</p>
                ) : (
                  <ul>
                    {birthdays.data.patients.map((patient) => (
                      <li key={patient.patient_id}>
                        <strong>{patient.full_name}</strong>
                        {(patient.patient_number || patient.cms) && (
                          <small>
                            {patient.patient_number
                              ? `Nº CAPO ${patient.patient_number}`
                              : ''}
                            {patient.patient_number && patient.cms ? ' · ' : ''}
                            {patient.cms ? `CMS ${patient.cms}` : ''}
                          </small>
                        )}
                        {isAdministrativeOperational && (
                          <PatientWhatsAppButton
                            patientId={patient.patient_id}
                            message={`Olá, ${patient.full_name}. 🎉 A equipe do CAPO deseja a você um feliz aniversário, com saúde, alegria e bons momentos. Receba nosso carinho e nossos melhores votos!`}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article>
                <h3>Equipe CAPO</h3>
                {birthdays.data.team.length === 0 ? (
                  <p>Nenhum integrante da equipe faz aniversário hoje.</p>
                ) : (
                  <ul>
                    {birthdays.data.team.map((member) => (
                      <li key={member.professional_id}>
                        <strong>{member.full_name}</strong>
                        <small>{member.function_title}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </div>
          )}
          <p className="home-birthdays-note">
            A lista e eventual ação de saudação respeitam o contexto autorizado
            retornado pelo backend. Dados pessoais da Equipe CAPO não são exibidos.
          </p>
        </section>
      )}

      {!isAdministrativeOperational && <section className="home-access" aria-labelledby="access-summary-title">
        <div>
          <p className="eyebrow">Acesso atual</p>
          <h2 id="access-summary-title">Resumo do seu contexto</h2>
        </div>

        <dl className="home-access-grid">
          <div>
            <dt>Contexto principal</dt>
            <dd>{contextName}</dd>
          </div>
          {functionTitle && (
            <div>
              <dt>Função</dt>
              <dd>{functionTitle}</dd>
            </div>
          )}
          <div>
            <dt>Perfis ativos</dt>
            <dd>{accessContext.roles.map((role) => role.name).join(', ')}</dd>
          </div>
          <div>
            <dt>Permissões</dt>
            <dd>{pluralizeCapabilities(accessContext.capabilities.length)}</dd>
          </div>
        </dl>

        <p className="home-access-note">
          A disponibilidade de cada módulo continuará sendo validada pelas
          regras de acesso do backend.
        </p>
      </section>}
    </div>
  )
}
