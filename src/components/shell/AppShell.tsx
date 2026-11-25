import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useBackToPreviousFunction } from '../../lib/navigation/back'
import type { AccessContext } from '../../types/access'
import { authorizedNavigationItems } from '../navigation/navigation-config'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { getNotificationsService, NOTIFICATIONS_UPDATED_EVENT } from '../../features/notifications/notifications-integration'
import { getRpcService } from '../../lib/supabase/rpc'
import { ProfileShortcuts } from './ProfileShortcuts'
import { CommunicationUnreadLink } from '../../features/communication/CommunicationUnreadLink'
import { useCapoGreeting } from './useCapoGreeting'
import './app-shell.css'

type AppShellProps = Readonly<{
  accessContext: AccessContext
  children: ReactNode
  onLogout: () => Promise<void>
  onRefreshAccessContext?: () => Promise<void>
  activePath?: string
}>

function normalized(value: string | null | undefined) {
  const cleanValue = value?.trim()
  return cleanValue || null
}

function AccumulatedIcon({ kind }: { kind: 'inicio' | 'operacional' | 'profissional' | 'gestor' | 'ti' | 'sair' }) {
  return (
    <svg width="28" height="28" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {kind === 'inicio' && <path d="M3 15L17 3 31 15 M7 13V30H27V13 M14 30V20H20V30" />}
      {kind === 'operacional' && <><rect x="6" y="6" width="22" height="25" rx="3" /><rect x="12" y="2" width="10" height="7" rx="2" fill="var(--titular-light)" /><path d="M11 15H23 M11 21H23 M11 27H19" /></>}
      {kind === 'profissional' && <><path d="M5 3V11A7 7 0 0 0 19 11V3 M3 3H7 M17 3H21 M12 18V24A6 6 0 0 0 24 24V17"/><circle cx="24" cy="13" r="4"/></>}
      {kind === 'gestor' && <><circle cx="12" cy="9" r="6" /><path d="M1 30V26Q1 17 12 17T23 26V30 M24 3Q36 8 25 15 M26 19Q33 21 33 29" /></>}
      {kind === 'ti' && <><rect x="2" y="3" width="30" height="21" rx="3" /><path d="M5 19H29 M17 24V30 M8 31H26 M10 9L14 12L10 15 M18 15H25" /></>}
      {kind === 'sair' && <path d="M15 4H5V30H15 M12 17H31 M24 10L31 17 24 24" />}
    </svg>
  )
}

const accumulatedMenuStyles = `
.app-sidebar--accumulated .titular-menu-button {
  --titular-light: #e1f3ff; --titular-base: #94c7ea; --titular-edge: #6398bf; --titular-ink: #245c88;
  box-sizing: border-box; display: flex; align-items: center; gap: 12px;
  width: calc(100% - 16px); min-height: 54px; margin: 8px 8px 16px; padding: 10px 12px;
  border: 1px solid var(--titular-light); border-radius: 12px;
  background: linear-gradient(170deg, var(--titular-light), var(--titular-base));
  box-shadow: 0 5px 0 var(--titular-edge), 0 8px 9px -3px var(--titular-edge), inset 0 2px 0 rgb(255 255 255 / 68%);
  color: var(--titular-ink); line-height: 1.2; font-family: inherit; font-size: 15px; font-weight: 600;
  text-decoration: none; text-align: left; cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease;
}
.app-sidebar--accumulated .titular-menu-button[data-tone="operacional"], .app-sidebar--accumulated .titular-menu-button[data-tone="profissional"] { --titular-light: #fce9f0; --titular-base: #eca6bf; --titular-edge: #c6809a; --titular-ink: #873c5b; }
.app-sidebar--accumulated .titular-menu-button[data-tone="gestor"] { --titular-light: #fff6d7; --titular-base: #f1d47d; --titular-edge: #c6a550; --titular-ink: #80611e; }
.app-sidebar--accumulated .titular-menu-button[data-tone="ti"] { --titular-light: #eaf7e1; --titular-base: #afd49a; --titular-edge: #7ea96c; --titular-ink: #3b6735; }
.app-sidebar--accumulated .titular-menu-button[data-tone="sair"] { --titular-light: #f3eafb; --titular-base: #cdb8e2; --titular-edge: #a08ab7; --titular-ink: #654c7c; width: auto; min-height: 34px; padding: 5px 18px; margin: 10px auto 8px; border-radius: 999px; gap: 7px; font-size: 12px; box-shadow: 0 3px 0 var(--titular-edge), 0 5px 7px -3px var(--titular-edge), inset 0 1px 0 rgb(255 255 255 / 70%); }
.app-sidebar--accumulated .titular-menu-button[data-tone="sair"] svg { width: 19px; height: 19px; }
.app-sidebar--accumulated .titular-menu-button svg { flex-shrink: 0; }
.app-sidebar--accumulated .titular-menu-button .titular-chevron { margin-left: auto; width: auto; font-size: 13px; }
.app-sidebar--accumulated .titular-menu-button:hover { transform: translateY(-2px); }
.app-sidebar--accumulated .titular-menu-button:active, .app-sidebar--accumulated .titular-menu-button[aria-expanded="true"] { transform: translateY(2px); box-shadow: 0 2px 0 var(--titular-edge), inset 0 1px 0 rgb(255 255 255 / 65%); }
.app-sidebar--accumulated .titular-menu-button:focus-visible { outline: 2px solid var(--titular-ink); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .app-sidebar--accumulated .titular-menu-button { transition: none; } }
`

export function AppShell({
  accessContext,
  children,
  onLogout,
  onRefreshAccessContext,
  activePath = '/',
}: AppShellProps) {
  const goBack = useBackToPreviousFunction()
  const greeting = useCapoGreeting(accessContext)
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpenedAtPath, setMenuOpenedAtPath] = useState<string | null>(null)
  const menuOpen = menuOpenedAtPath === activePath
  const [expandedArea, setExpandedArea] = useState<string | null>(null)
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(
    null,
  )
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const mainRef = useRef<HTMLElement>(null)
  const currentPath = activePath || '/'
  const displayName =
    normalized(accessContext.full_name) ?? accessContext.username
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const professionalSpecialty = accessContext.primary_context.code === 'profissional'
    ? normalized(accessContext.primary_specialty_name)
      ?? normalized(accessContext.specialties?.find((specialty) => specialty.is_primary)?.specialty_name)
      ?? (accessContext.specialties?.length === 1
        ? normalized(accessContext.specialties[0].specialty_name)
        : null)
      ?? (accessContext.homologation_context?.enabled
        ? normalized(accessContext.homologation_context.specialty_name)
        : null)
    : null
  const userCaption =
    professionalSpecialty ??
    normalized(accessContext.primary_context.name) ??
    normalized(accessContext.function_title) ??
    contextName
  const homologation = accessContext.homologation_context
  const primaryNavigation = authorizedNavigationItems(accessContext, 'principal')
  const managementNavigation = authorizedNavigationItems(accessContext, 'gestao')
  const technicalNavigation = authorizedNavigationItems(accessContext, 'tecnica')
  const canAccessNotifications = managementNavigation.some(
    (item) => item.path === '/notificacoes',
  )
  const hasRole = (roleCode: string) =>
    accessContext.roles.some((role) => role.code === roleCode)
  const accumulatedNavigation: readonly Readonly<{
    path: AppRoute
    label: string
    icon: string
  }>[] = [
    ...(hasRole('administrador') && accessContext.primary_context.code !== 'administrador'
      ? [
          { path: '/gestor/administracao' as AppRoute, label: 'Administração do Sistema', icon: '⚙' },
          { path: '/gestor/equipe' as AppRoute, label: 'Equipe e Agendas', icon: '👥' },
          { path: '/gestor/fluxos' as AppRoute, label: 'Fluxos e Acompanhamentos', icon: '◉' },
          { path: '/gestor/timeline' as AppRoute, label: 'Linha do Tempo Operacional', icon: '◷' },
          { path: '/gestor/auditoria' as AppRoute, label: 'Auditoria e Relatórios', icon: '▥' },
        ]
      : []),
    ...(hasRole('coordenador') && accessContext.primary_context.code !== 'coordenador'
      ? [{ path: '/coordenacao' as AppRoute, label: 'Coordenação', icon: '◇' }]
      : []),
  ].filter((item) => canAccessAppRoute(accessContext, item.path))

  // Presentation only: partition the existing authorized links, never infer new grants.
  const knownRoles = ['administrativo_operacional', 'profissional', 'administrador', 'coordenador', 'administrador_tecnico']
  const multipleRoles = knownRoles.filter(hasRole).length > 1
  const primaryRole = accessContext.primary_context.code
  const mainItems = [...primaryNavigation.filter((item) => item.path !== '/'), ...managementNavigation]
  const professionalOnlyPaths = ['/minha-agenda/gerenciar', '/minha-agenda/solicitar-alteracao', '/assistencia-social', '/luto']
  const professionalItems = hasRole('profissional') && primaryRole !== 'profissional'
    ? mainItems.filter((item) => professionalOnlyPaths.includes(item.path)) : []
  const mainArea = primaryRole === 'profissional' ? 'profissional' : primaryRole === 'coordenador' ? 'coordenacao' : primaryRole === 'administrador_tecnico' ? 'ti' : 'operacional'
  const groups = [
    { id: 'operacional', label: 'Operacional', tone: 'operacional', icon: 'operacional' as const, items: mainArea === 'operacional' ? mainItems.filter((item) => !professionalItems.includes(item)) : [] },
    { id: 'profissional', label: 'Profissional', tone: 'profissional', icon: 'profissional' as const, items: mainArea === 'profissional' ? mainItems : professionalItems },
    { id: 'gestor', label: 'Gestor', tone: 'gestor', icon: 'gestor' as const, items: accumulatedNavigation.filter((item) => item.path.startsWith('/gestor/')) },
    { id: 'coordenacao', label: 'Coordenação', tone: 'gestor', icon: 'gestor' as const, items: [...(mainArea === 'coordenacao' ? mainItems.filter((item) => !professionalItems.includes(item)) : []), ...accumulatedNavigation.filter((item) => item.path === '/coordenacao')] },
    { id: 'ti', label: 'TI', tone: 'ti', icon: 'ti' as const, items: [...(mainArea === 'ti' ? mainItems.filter((item) => !professionalItems.includes(item)) : []), ...technicalNavigation] },
  ].filter((group) => group.items.length > 0)
  useEffect(() => {
    mainRef.current?.focus()
  }, [activePath])

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpenedAtPath(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [menuOpen])

  useEffect(() => {
    let active = true
    const verifyConnection = async () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (active) setConnectionStatus('unavailable')
        return
      }
      const result = await getRpcService().getMyAccessContext()
      if (active) setConnectionStatus(result.status === 'success' ? 'available' : 'unavailable')
    }
    void verifyConnection()
    const handleOnline = () => void verifyConnection()
    const handleOffline = () => setConnectionStatus('unavailable')
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      active = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const connectionLabel = connectionStatus === 'available'
    ? 'Disponível'
    : connectionStatus === 'unavailable'
      ? 'Indisponível'
      : 'Verificando…'

  useEffect(() => {
    if (!canAccessNotifications) return

    let active = true
    const refreshUnread = () => {
      void getNotificationsService()
        .getNotifications(true, 1, 0)
        .then((state) => {
          if (!active) return
          setUnreadNotifications(
            state.status === 'success' ? (state.data[0]?.total_count ?? 0) : 0,
          )
        })
    }
    refreshUnread()
    globalThis.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshUnread)

    return () => {
      active = false
      globalThis.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshUnread)
    }
  }, [canAccessNotifications, activePath])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    await onLogout()
  }

  return (
    <div className="app-shell">
      <aside
        id="app-sidebar"
        className={`app-sidebar${menuOpen ? ' is-open' : ''}${multipleRoles ? ' app-sidebar--accumulated' : ''}`}
        aria-label="Navegação do CAPO"
      >
        <div className="app-brand">
          <img src="/assets/capo-logo.jpg" alt="CAPO" />
          <button
            className="app-sidebar-close"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMenuOpenedAtPath(null)}
          >
            ×
          </button>
        </div>

        {multipleRoles && <style>{accumulatedMenuStyles}</style>}
        <nav className="app-nav" aria-label="Navegação principal">
          {multipleRoles ? <>
            <Link className="titular-menu-button" data-tone="inicio" to="/" aria-current={currentPath === '/' ? 'page' : undefined} onClick={() => setExpandedArea(null)}><AccumulatedIcon kind="inicio" /> Início</Link>
            {groups.map((group) => <div key={group.id}>
              <button className="titular-menu-button" data-tone={group.tone} type="button" aria-expanded={expandedArea === group.id} aria-controls={`app-area-${group.id}`} onClick={() => setExpandedArea((current) => current === group.id ? null : group.id)}>
                <AccumulatedIcon kind={group.icon} /> {group.label}<span className="titular-chevron" aria-hidden="true">{expandedArea === group.id ? '▴' : '▾'}</span>
              </button>
              <div id={`app-area-${group.id}`} hidden={expandedArea !== group.id}>
                {group.items.map((item) => <Link className="app-nav-link" to={item.path} aria-current={currentPath === item.path ? 'page' : undefined} key={item.path}>
                  <span aria-hidden="true">{item.icon}</span><span>{item.label}</span>
                  {item.path === '/notificacoes' && unreadNotifications !== null && unreadNotifications > 0 && <span className="app-nav-badge" aria-label={`${unreadNotifications} notificações não lidas`}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
                </Link>)}
              </div>
            </div>)}
          </> : <>
          <div className="app-nav-group">
            <p className="app-nav-label">Principal</p>
            <Link
              className="app-nav-link"
              to="/"
              aria-current={currentPath === '/' ? 'page' : undefined}
            >
              <span aria-hidden="true">⌂</span>
              <span>Início</span>
            </Link>
            {primaryNavigation.filter((item) => item.path !== '/').map((item) => (
              <Link
                className="app-nav-link"
                to={item.path}
                aria-current={currentPath === item.path ? 'page' : undefined}
                key={item.path}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            {managementNavigation.map((item) => (
              <Link
                className="app-nav-link"
                to={item.path}
                aria-current={currentPath === item.path ? 'page' : undefined}
                key={item.path}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                {item.path === '/notificacoes' && unreadNotifications !== null && unreadNotifications > 0 && (
                  <span
                    className="app-nav-badge"
                    aria-label={`${unreadNotifications} notificações não lidas`}
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            ))}
            {technicalNavigation.map((item) => (
              <Link
                className="app-nav-link"
                to={item.path}
                aria-current={currentPath === item.path ? 'page' : undefined}
                key={item.path}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="app-nav-group app-nav-authorized">
            <p className="app-nav-label">Áreas autorizadas</p>
            {accumulatedNavigation.length > 0 ? (
              accumulatedNavigation.map((item) => (
                <Link
                  className="app-nav-link"
                  to={item.path}
                  aria-current={currentPath === item.path ? 'page' : undefined}
                  key={item.path}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))
            ) : (
              <p className="app-nav-pending">
                Nenhuma função acumulada adicional neste contexto.
              </p>
            )}
          </div>
          </>}
        </nav>

        <button
          className={multipleRoles ? 'titular-menu-button' : 'app-logout'}
          data-tone={multipleRoles ? 'sair' : undefined}
          type="button"
          disabled={loggingOut}
          aria-busy={loggingOut}
          onClick={() => void logout()}
        >
          {multipleRoles ? <AccumulatedIcon kind="sair" /> : <span aria-hidden="true">↪</span>}
          <span>{loggingOut ? 'Saindo…' : 'Sair'}</span>
        </button>

        <p className="app-motto">
          Juntos
          <br />
          pela vida <span aria-hidden="true">♡</span>
        </p>
        <div className="app-connection" data-status={connectionStatus} aria-label={`Conexão — ${connectionLabel}`}>
          <span>Conexão</span>
          <strong><i aria-hidden="true" />{connectionLabel}</strong>
        </div>
      </aside>

      <button
        className={`app-sidebar-backdrop${menuOpen ? ' is-visible' : ''}`}
        type="button"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpenedAtPath(null)}
      />

      <div className="app-workspace">
        <header className="app-header">
          <button
            className="app-mobile-menu"
            type="button"
            aria-label="Abrir menu"
            aria-controls="app-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpenedAtPath(activePath)}
          >
            ☰
          </button>
          <div className="app-user">
            <p className="app-user-name">{displayName}</p>
            <p className={`app-user-caption${professionalSpecialty ? " app-user-caption--specialty" : ""}`}>{userCaption}</p>
          </div>
          <div className="app-header-actions">
            <CommunicationUnreadLink accessContext={accessContext} />
            <button
              className="app-back-button"
              type="button"
              onClick={goBack}
            >
              ← <span>Voltar</span>
            </button>
            {canAccessNotifications && (
              <Link className="app-notice-button" to="/notificacoes">
                <span aria-hidden="true">🔔</span>
                <span>Avisos</span>
                {unreadNotifications !== null && unreadNotifications > 0 && (
                  <b className="app-notice-badge" aria-label={`${unreadNotifications} avisos não lidos`}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </b>
                )}
              </Link>
            )}
            <ProfileShortcuts accessContext={accessContext} activePath={activePath} className="app-profile-button" profileLabel={contextName} onContextChange={onRefreshAccessContext} />
          </div>
        </header>

        {accessContext.is_homologation_account && (
          <aside className="app-homologation" aria-label="Conta de homologação">
            <strong>Ambiente de teste e manutenção</strong>
            <span>
              {homologation?.enabled
                ? `Atuação controlada${homologation.role_name ? ` como ${homologation.role_name}` : ''}.`
                : 'Conta identificada para testes controlados.'}
            </span>
          </aside>
        )}

        <main
          ref={mainRef}
          className="app-main"
          tabIndex={-1}
          aria-label="Área de trabalho CAPO"
        >
          <section className="app-welcome-approved" aria-label="Boas-vindas">
            <div className="app-welcome-copy">
              <h1><span className="capo-greeting-time">{greeting.slice(0, greeting.indexOf('!') + 1)}</span><span className="capo-greeting-message">{greeting.slice(greeting.indexOf('!') + 2)}</span></h1>
              <p className="capo-welcome-workday"><span>Tenha um ótimo dia de trabalho!</span><img src="/assets/capo-girassol-natural.svg" alt="" aria-hidden="true" width="32" height="42" /></p>
            </div>
            <span className="app-welcome-heart" aria-hidden="true">♡</span>
            <div className="app-slogan-approved" aria-label="Mensagem institucional">
              <span>Cuidar hoje.</span>
              <strong>Mais possibilidades amanhã.</strong>
            </div>
          </section>
          {children}
        </main>
        <footer className="app-footer">
          <div className="app-footer-center">
            <strong>Sistema CAPO — Gestão Administrativa e Operacional</strong>
            <span>Elaborado e desenvolvido por Daniele Cristina Silva de Carvalho — Auxiliar Administrativo do CAPO</span>
            <span>Secretaria Municipal de Saúde de Pouso Alegre – MG</span>
            <span className="app-security">Ambiente restrito • Dados protegidos • Acesso individual e auditado • Uso exclusivo autorizado</span>
          </div>
          <span className="app-footer-right">Privacidade e Segurança</span>
        </footer>
      </div>
    </div>
  )
}
