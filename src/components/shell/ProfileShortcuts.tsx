import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { getProfileShortcuts } from './profile-shortcuts'
import './profile-shortcuts.css'

type ProfileShortcutsProps = Readonly<{
  accessContext: AccessContext
  activePath: string
  className: string
  profileLabel: string
}>

export function ProfileShortcuts({ accessContext, activePath, className, profileLabel }: ProfileShortcutsProps) {
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shortcuts = getProfileShortcuts(accessContext)
  const open = openedAtPath === activePath

  useEffect(() => {
    if (!open) return
    function closeMenu(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenedAtPath(null)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenedAtPath(null)
        containerRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  if (shortcuts.length === 0) {
    return <span className={`${className} profile-shortcuts-static`} title={profileLabel}>
      <span aria-hidden="true">👤</span><span>Perfil: {profileLabel}</span>
    </span>
  }

  return <div className="profile-shortcuts" ref={containerRef}>
    <button
      className={className}
      type="button"
      aria-expanded={open}
      aria-controls="profile-shortcuts-menu"
      onClick={() => setOpenedAtPath((value) => value === activePath ? null : activePath)}
    >
      <span aria-hidden="true">👤</span><span>Perfil: {profileLabel}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <nav id="profile-shortcuts-menu" className="profile-shortcuts-menu" aria-label="Atalhos das funções autorizadas">
      <Link to="/" onClick={() => setOpenedAtPath(null)}>Início — contexto principal</Link>
      {shortcuts.map(({ path, label }) => <Link key={path} to={path} onClick={() => setOpenedAtPath(null)}>{label}</Link>)}
    </nav>}
  </div>
}
