import { useLocation } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { useAccessFlow } from '../features/access/access-context'
import { AgendaPage } from '../features/agenda/AgendaPage'
import { AgendaChangeRequestPage } from '../features/agenda/AgendaChangeRequestPage'
import { NoShowsPage } from '../features/no-shows/NoShowsPage'
import { HomePage } from '../features/home/HomePage'
import { PatientsPage } from '../features/patients/PatientsPage'
import { AssistentialPage } from '../features/professional/AssistentialPage'
import { NutritionPage } from '../features/nutrition/NutritionPage'
import { QueuePage } from '../features/queues/QueuePage'
import { RequestsPage } from '../features/requests/RequestsPage'
import { ReferralsPage } from '../features/referrals/ReferralsPage'
import { ReportsPage } from '../features/reports/ReportsPage'
import { TechnicalPage } from '../features/technical/TechnicalPage'
import { TransportPage } from '../features/transport/TransportPage'
import { RenewalPrescriptionPage } from '../features/renewals/RenewalPrescriptionPage'
import { SocialPage } from '../features/social/SocialPage'
import { FamilyCaregiverPage } from '../features/social/FamilyCaregiverPage'
import { DentistryPage } from '../features/dentistry/DentistryPage'
import { NotificationsPage } from '../features/notifications/NotificationsPage'
import { ClosuresPage } from '../features/closures/ClosuresPage'
import { GestorSocialOverview } from '../features/gestor/GestorSocialOverview'
import { BereavementPage } from '../features/social/BereavementPage'
import { OperationalTimeline } from '../features/gestor/OperationalTimeline'
import { AuditLogPage } from '../features/gestor/AuditLogPage'
import { ActiveSearchPage } from '../features/gestor/ActiveSearchPage'
import { CoordinationDashboard } from '../features/coordination/CoordinationDashboard'
import { GestorShell } from '../features/gestor/GestorShell'
import { GestorDashboard } from '../features/gestor/GestorDashboard'
import { GestorManagementPage } from '../features/gestor/GestorManagementPage'
import { GestorFamilyPage } from '../features/gestor/GestorFamilyPage'
import { GestorOperationalPage } from '../features/gestor/GestorOperationalPage'
import { TechnicalSupportRequest } from '../components/forms/TechnicalSupportRequest'
import { canAccessAppRoute, isKnownAppRoute } from './route-access'
import type { Notification } from '../features/notifications/notifications-integration'

function notificationContextHref(
  notification: Notification,
  accessContext: NonNullable<ReturnType<typeof useAccessFlow>['accessContext']>,
) {
  const routeByEntityType: Record<string, '/solicitacoes' | '/encaminhamentos' | '/faltosos'> = {
    administrative_request: '/solicitacoes',
    administrative_requests: '/solicitacoes',
    interprofessional_referral: '/encaminhamentos',
    interprofessional_referrals: '/encaminhamentos',
    no_show_followup: '/faltosos',
    no_show_followups: '/faltosos',
  }
  const route = notification.entity_type
    ? routeByEntityType[notification.entity_type]
    : undefined
  return route && canAccessAppRoute(accessContext, route) ? route : null
}

export function ConstructionPage({ path }: { path: string }) {
  const routeLabel =
    path === '/em-construcao'
      ? 'Módulo em construção'
      : 'Rota em desenvolvimento'

  return (
    <section className="home-page" aria-labelledby="construction-title">
      <div className="home-welcome">
        <p className="eyebrow">Status</p>
        <h1 id="construction-title">Em construção</h1>
        <p>{routeLabel}.</p>
        <p className="home-slogan">
          Este módulo ainda não está disponível nesta etapa.
        </p>
      </div>
    </section>
  )
}

export function AccessDeniedPage() {
  return (
    <section className="home-page" aria-labelledby="access-denied-title">
      <div className="home-welcome">
        <p className="eyebrow">Acesso</p>
        <h1 id="access-denied-title">Área não autorizada</h1>
        <p>Seu contexto de trabalho atual não permite acessar este módulo.</p>
        <a className="home-slogan" href="/">
          Voltar ao início
        </a>
      </div>
    </section>
  )
}

export function App() {
  const { accessContext, logout } = useAccessFlow()
  const location = useLocation()
  const pendingContextId = typeof location.state?.contextId === 'string'
    ? location.state.contextId
    : null
  const isPatientsRoute = location.pathname === '/pacientes'
  const isAgendaRoute = location.pathname === '/agenda'
  const isAgendaChangeRequestRoute = location.pathname === '/minha-agenda/solicitar-alteracao'
  const isAssistentialRoute = location.pathname === '/atuacao'
  const isNutritionRoute = location.pathname === '/nutricao'
  const isSocialRoute = location.pathname === '/assistencia-social'
  const isBereavementRoute = location.pathname === '/luto'
  const isFamilyCaregiverRoute = location.pathname === '/familiar-cuidador'
  const isQueueRoute = location.pathname === '/fila'
  const isNoShowsRoute = location.pathname === '/faltosos'
  const isRequestsRoute = location.pathname === '/solicitacoes'
  const isTransportRoute = location.pathname === '/transporte'
  const isRenewalRoute = location.pathname === '/receita'
  const isReferralsRoute = location.pathname === '/encaminhamentos'
  const isDentistryRoute = location.pathname === '/odontologia'
  const isNotificationsRoute = location.pathname === '/notificacoes'
  const isSupportRoute = location.pathname === '/suporte'
  const isTechnicalRoute = location.pathname === '/tecnica'
  const isReportsRoute = location.pathname === '/relatorios'
  const isClosuresRoute = location.pathname === '/encerramentos'
  const isCoordinationRoute = location.pathname === '/coordenacao'
  const gestorView = {
    '/gestor/equipe': 'equipe',
    '/gestor/administracao': 'administracao',
    '/gestor/timeline': 'timeline',
    '/gestor/auditoria': 'auditoria',
    '/gestor/suporte': 'suporte',
    '/gestor/fluxos': 'fluxos',
    '/gestor/busca-ativa': 'busca-ativa',
  } as const
  const gestorRoute = gestorView[location.pathname as keyof typeof gestorView]
  const isConstructionRoute =
    location.pathname === '/em-construcao' ||
    !isKnownAppRoute(location.pathname)

  if (!accessContext) {
    return (
      <main className="app-context-loading" aria-live="polite">
        Carregando contexto de acesso…
      </main>
    )
  }

  const canAccess = isKnownAppRoute(location.pathname)
    ? canAccessAppRoute(accessContext, location.pathname)
    : false
  const isGestor = accessContext.primary_context.code === 'administrador'
  const primaryContextCode = accessContext.primary_context.code
  const professionalSpecialty = accessContext.primary_specialty_name
    ?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
  const isProfessionalHome =
    location.pathname === '/' &&
    Boolean(accessContext.professional_id) &&
    primaryContextCode === 'profissional' &&
    professionalSpecialty !== 'nutricao' &&
    professionalSpecialty !== 'assistencia social'
  const isNutritionHome =
    location.pathname === '/' &&
    Boolean(accessContext.professional_id) &&
    primaryContextCode === 'profissional' &&
    professionalSpecialty === 'nutricao'
  const isSocialHome =
    location.pathname === '/' &&
    Boolean(accessContext.professional_id) &&
    primaryContextCode === 'profissional' &&
    professionalSpecialty === 'assistencia social'

  const content = isConstructionRoute ? (
    <ConstructionPage path={location.pathname} />
  ) : !canAccess ? (
    <AccessDeniedPage />
  ) : isGestor && location.pathname === '/' ? (
    <GestorDashboard />
  ) : primaryContextCode === 'coordenador' && location.pathname === '/' ? (
    <CoordinationDashboard accessContext={accessContext} />
  ) : isCoordinationRoute ? (
    <CoordinationDashboard accessContext={accessContext} />
  ) : isNutritionHome ? (
    <NutritionPage accessContext={accessContext} />
  ) : isSocialHome ? (
    <SocialPage accessContext={accessContext} />
  ) : isProfessionalHome ? (
    <AssistentialPage accessContext={accessContext} />
  ) : location.pathname === '/gestor/social' ? (
    <GestorSocialOverview />
  ) : location.pathname === '/gestor/luto' ? (
    <BereavementPage accessContext={accessContext} />
  ) : location.pathname === '/coordenacao/timeline' ? (
    <OperationalTimeline />
  ) : location.pathname === '/coordenacao/auditoria' ? (
    <AuditLogPage />
  ) : location.pathname === '/coordenacao/busca-ativa' ? (
    <ActiveSearchPage accessContext={accessContext} />
  ) : location.pathname === '/gestor/familiares' ? (
    <GestorFamilyPage />
  ) : location.pathname === '/gestor/operacional' ? (
    <GestorOperationalPage />
  ) : gestorRoute ? (
    <GestorManagementPage view={gestorRoute} accessContext={accessContext} />
  ) : isPatientsRoute ? (
    <PatientsPage accessContext={accessContext} />
  ) : isAgendaRoute ? (
    <AgendaPage accessContext={accessContext} />
  ) : isAgendaChangeRequestRoute ? (
    <AgendaChangeRequestPage accessContext={accessContext} />
  ) : isAssistentialRoute ? (
    <AssistentialPage accessContext={accessContext} />
  ) : isNutritionRoute ? (
    <NutritionPage accessContext={accessContext} />
  ) : isSocialRoute ? (
    <SocialPage accessContext={accessContext} />
  ) : isBereavementRoute ? (
    <BereavementPage accessContext={accessContext} />
  ) : isFamilyCaregiverRoute ? (
    <FamilyCaregiverPage accessContext={accessContext} />
  ) : isQueueRoute ? (
    <QueuePage accessContext={accessContext} />
  ) : isNoShowsRoute ? (
    <NoShowsPage accessContext={accessContext} initialContextId={pendingContextId} />
  ) : isRequestsRoute ? (
    <RequestsPage accessContext={accessContext} initialContextId={pendingContextId} />
  ) : isTransportRoute ? (
    <TransportPage accessContext={accessContext} />
  ) : isRenewalRoute ? (
    <RenewalPrescriptionPage accessContext={accessContext} />
  ) : isReferralsRoute ? (
    <ReferralsPage accessContext={accessContext} />
  ) : isDentistryRoute ? (
    <DentistryPage accessContext={accessContext} />
  ) : isNotificationsRoute ? (
      <NotificationsPage
        getContextHref={(notification) =>
          notificationContextHref(notification, accessContext)
        }
      />
  ) : isSupportRoute ? (
    <section className="home-page" aria-labelledby="support-title"><header className="home-welcome"><p className="eyebrow">Suporte técnico</p><h1 id="support-title">Solicitar suporte</h1><p>Descreva o problema para registro no atendimento técnico do CAPO.</p></header><section className="home-profile"><TechnicalSupportRequest affectedModule={location.pathname} /></section></section>
  ) : isTechnicalRoute ? (
    <TechnicalPage accessContext={accessContext} />
  ) : isReportsRoute ? (
    <ReportsPage accessContext={accessContext} />
  ) : isClosuresRoute ? (
    <ClosuresPage accessContext={accessContext} />
  ) : (
    <HomePage accessContext={accessContext} />
  )

  if (isGestor) {
    return (
      <GestorShell accessContext={accessContext} onLogout={logout} activePath={location.pathname}>
        {content}
      </GestorShell>
    )
  }

  return <AppShell accessContext={accessContext} onLogout={logout} activePath={location.pathname}>{content}</AppShell>
}
