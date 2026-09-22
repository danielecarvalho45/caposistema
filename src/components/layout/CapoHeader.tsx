import { Link } from 'react-router-dom'
import './capo-shell.css'

type CapoHeaderProps = Readonly<{
  displayName: string
  userCaption: string
  contextName: string
  currentPath: string
  onBack: () => void
  onMenuOpen?: () => void
  menuId?: string
  menuOpen?: boolean
  showNotifications?: boolean
  backLabel?: string
  profileLabel?: string
  showBackOnHome?: boolean
  className?: string
}>

export function CapoHeader({
  displayName,
  userCaption,
  contextName,
  currentPath,
  onBack,
  onMenuOpen,
  menuId,
  menuOpen = false,
  showNotifications = false,
  backLabel = '← Voltar',
  profileLabel,
  showBackOnHome = false,
  className = '',
}: CapoHeaderProps) {
  return (
    <header className={`capo-header ${className}`.trim()}>
      {onMenuOpen && menuId && (
        <button
          className="capo-mobile-menu"
          type="button"
          aria-label="Abrir menu"
          aria-controls={menuId}
          aria-expanded={menuOpen}
          onClick={onMenuOpen}
        >
          ☰
        </button>
      )}
      <div className="capo-user">
        <p className="capo-user-name">{displayName}</p>
        {userCaption && <p className="capo-user-caption">{userCaption}</p>}
      </div>
      <div className="capo-header-actions">
        {(currentPath !== '/' || showBackOnHome) && (
          <button className="capo-back-button" type="button" onClick={onBack}>
            {backLabel}
          </button>
        )}
        {showNotifications && (
          <Link className="capo-notifications-link" to="/notificacoes">
            Avisos
          </Link>
        )}
        <p className="capo-context-label" title={profileLabel ?? contextName}>
          {profileLabel ?? contextName}
        </p>
      </div>
    </header>
  )
}