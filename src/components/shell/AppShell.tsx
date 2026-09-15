import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AccessContext } from '../../types/access'
import './app-shell.css'

type AppShellProps = Readonly<{
  accessContext: AccessContext
  children: ReactNode
  onLogout: () => Promise<void>
}>

function normalized(value: string | null | undefined) {
  const cleanValue = value?.trim()
  return cleanValue || null
}

export function AppShell({ accessContext, children, onLogout }: AppShellProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const displayName =
    normalized(accessContext.full_name) ?? accessContext.username
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const userCaption = normalized(accessContext.function_title) ?? contextName
  const homologation = accessContext.homologation_context

  useEffect(() => {
    mainRef.current?.focus()
  }, [])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    await onLogout()
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar" aria-label="Navegação do CAPO">
        <div className="app-brand">
          <img src="/assets/capo-logo.jpg" alt="CAPO" />
        </div>

        <nav className="app-nav" aria-label="Navegação principal">
          <div className="app-nav-group">
            <p className="app-nav-label">Principal</p>
            <a className="app-nav-link" href="/" aria-current="page">
              <span aria-hidden="true">⌂</span>
              <span>Início</span>
            </a>
          </div>

          <div className="app-nav-group app-nav-authorized">
            <p className="app-nav-label">Áreas autorizadas</p>
            <p className="app-nav-pending">
              Os módulos funcionais serão incorporados nas próximas etapas,
              conforme as permissões vigentes.
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
      </aside>

      <div className="app-workspace">
        <header className="app-header">
          <div className="app-user">
            <p className="app-user-name">{displayName}</p>
            <p className="app-user-caption">{userCaption}</p>
          </div>
          <p className="app-context-label" title={contextName}>
            {contextName}
          </p>
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
      </div>
    </div>
  )
}
