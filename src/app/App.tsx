import { useLocation } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { useAccessFlow } from '../features/access/access-context'
import { AgendaPage } from '../features/agenda/AgendaPage'
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
import { BereavementPage } from '../features/social/BereavementPage'
import { DentistryPage } from '../features/dentistry/DentistryPage'
import { NotificationsPage } from '../features/notifications/NotificationsPage'
import { ClosuresPage } from '../features/closures/ClosuresPage'
import { GestorShell } from '../features/gestor/GestorShell'
import { GestorDashboard } from '../features/gestor/GestorDashboard'
import { GestorManagementPage } from '../features/gestor/GestorManagementPage'
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
  const isPatientsRoute = location.pathname === '/pacientes'
  const isAgendaRoute = location.pathname === '/agenda'
  const isAssistentialRoute = location.pathname === '/atuacao'
  const isNutritionRoute = location.pathname === '/nutricao'
  const isSocialRoute = location.pathname === '/assistencia-social'
  const isFamilyCaregiverRoute = location.pathname === '/familiar-cuidador'
  const isBereavementRoute = location.pathname === '/luto'
  const isQueueRoute = location.pathname === '/fila'
  const isNoShowsRoute = location.pathname === '/faltosos'
  const isRequestsRoute = location.pathname === '/solicitacoes'
  const isTransportRoute = location.pathname === '/transporte'
  const isRenewalRoute = location.pathname === '/receita'
  const isReferralsRoute = location.pathname === '/encaminhamentos'
  const isDentistryRoute = location.pathname === '/odontologia'
  const isNotificationsRoute = location.pathname === '/notificacoes'
  const isTechnicalRoute = location.pathname === '/tecnica'
  const isReportsRoute = location.pathname === '/relatorios'
  const isClosuresRoute = location.pathname === '/encerramentos'
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

  const content = isConstructionRoute ? (
    <ConstructionPage path={location.pathname} />
  ) : !canAccess ? (
    <AccessDeniedPage />
  ) : isGestor && location.pathname === '/' ? (
    <GestorDashboard />
  ) : gestorRoute ? (
    <GestorManagementPage view={gestorRoute} />
  ) : isPatientsRoute ? (
    <PatientsPage accessContext={accessContext} />
  ) : isAgendaRoute ? (
    <AgendaPage accessContext={accessContext} />
  ) : isAssistentialRoute ? (
    <AssistentialPage accessContext={accessContext} />
  ) : isNutritionRoute ? (
    <NutritionPage accessContext={accessContext} />
  ) : isSocialRoute ? (
    <SocialPage accessContext={accessContext} />
  ) : isFamilyCaregiverRoute ? (
    <FamilyCaregiverPage accessContext={accessContext} />
  ) : isBereavementRoute ? (
    <BereavementPage accessContext={accessContext} />
  ) : isQueueRoute ? (
    <QueuePage accessContext={accessContext} />
  ) : isNoShowsRoute ? (
    <NoShowsPage accessContext={accessContext} />
  ) : isRequestsRoute ? (
    <RequestsPage accessContext={accessContext} />
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
