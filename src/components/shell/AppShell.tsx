import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { authorizedNavigationItems } from '../navigation/navigation-config'
import { getNotificationsService } from '../../features/notifications/notifications-integration'
import './app-shell.css'

type AppShellProps = Readonly<{
  accessContext: AccessContext
  children: ReactNode
  onLogout: () => Promise<void>
  activePath?: string
}>

function normalized(value: string | null | undefined) {
  const cleanValue = value?.trim()
  return cleanValue || null
}

export function AppShell({
  accessContext,
  children,
  onLogout,
  activePath = '/',
}: AppShellProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpenedAtPath, setMenuOpenedAtPath] = useState<string | null>(null)
  const menuOpen = menuOpenedAtPath === activePath
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(
    null,
  )
  const mainRef = useRef<HTMLElement>(null)
  const currentPath = activePath || '/'
  const displayName =
    normalized(accessContext.full_name) ?? accessContext.username
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const userCaption =
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
    if (!canAccessNotifications) return

    let active = true
    void getNotificationsService()
      .getNotifications(true, 1, 0)
      .then((state) => {
        if (!active) return
        setUnreadNotifications(
          state.status === 'success' ? (state.data[0]?.total_count ?? 0) : null,
        )
      })

    return () => {
      active = false
    }
  }, [canAccessNotifications])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    await onLogout()
  }

  return (
    <div className="app-shell">
      <aside
        id="app-sidebar"
        className={`app-sidebar${menuOpen ? ' is-open' : ''}`}
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

        <nav className="app-nav" aria-label="Navegação principal">
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
            <p className="app-nav-pending">
              Consulte as áreas disponíveis conforme suas permissões vigentes.
            </p>
          </div>
        </nav>

        <button
          className="app-logout"
          type="button"
          disabled={loggingOut}
          aria-busy={loggingOut}
          onClick={() => void logout()}
        >
          <span aria-hidden="true">↪</span>
          <span>{loggingOut ? 'Saindo…' : 'Sair'}</span>
        </button>

        <p className="app-motto">
          Juntos
          <br />
          pela vida <span aria-hidden="true">♡</span>
        </p>
        <div className="app-connection" aria-label="Status de conexão">
          <span>Conexão</span>
          <strong>Estado não verificado</strong>
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
            <p className="app-user-caption">{userCaption}</p>
          </div>
          <div className="app-header-actions">
            {currentPath !== '/' && (
              <button
                className="app-back-button"
                type="button"
                onClick={() => window.location.assign('/')}
              >
                ← Voltar
              </button>
            )}
            <p className="app-context-label" title={contextName}>
              {contextName}
            </p>
            <span className="app-session-indicator">Sessão individual</span>
          </div>
        </header>

        {accessContext.is_homologation_account && (
          <aside className="app-homologation" aria-label="Conta de homologação">
            <strong>Ambiente de homologação</strong>
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
