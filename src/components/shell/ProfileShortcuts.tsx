import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { authorizedNavigationItems } from '../navigation/navigation-config'
import './profile-shortcuts.css'

type Shortcut = Readonly<{ path: AppRoute; label: string }>

export function getProfileShortcuts(accessContext: AccessContext): Shortcut[] {
  const secondaryRoles = new Set(accessContext.roles
    .map((role) => role.code)
    .filter((code) => code !== accessContext.primary_context.code))
  const candidates: Shortcut[] = []

  if (secondaryRoles.has('administrador')) {
    candidates.push({ path: '/gestor/administracao', label: 'Administração do Sistema' })
  }
  if (secondaryRoles.has('coordenador')) {
    candidates.push({ path: '/coordenacao', label: 'Coordenação' })
  }
  if (secondaryRoles.has('administrativo_operacional')) {
    candidates.push({ path: '/fila', label: 'Administrativo Operacional' })
  }
  if (secondaryRoles.has('administrador_tecnico')) {
    candidates.push({ path: '/tecnica', label: 'Área Técnica' })
  }
  if (secondaryRoles.has('profissional')) {
    const professionalPaths: readonly AppRoute[] = ['/nutricao', '/assistencia-social', '/atuacao']
    const professionalItems = authorizedNavigationItems(accessContext, 'principal')
      .filter((item) => professionalPaths.includes(item.path))
    candidates.push(...professionalItems.map(({ path, label }) => ({ path, label })))
    if (professionalItems.length === 0 && accessContext.professional_id) {
      candidates.push({ path: '/agenda', label: 'Minha Agenda' })
    }
  }

  return candidates.filter(({ path }) => canAccessAppRoute(accessContext, path))
}

type ProfileShortcutsProps = Readonly<{
  accessContext: AccessContext
  activePath: string
  className: string
  profileLabel: string
}>

export function ProfileShortcuts({ accessContext, activePath, className, profileLabel }: ProfileShortcutsProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const shortcuts = getProfileShortcuts(accessContext)

  useEffect(() => { setOpen(false) }, [activePath])

  useEffect(() => {
    if (!open) return
    function closeMenu(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
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
      onClick={() => setOpen((value) => !value)}
    >
      <span aria-hidden="true">👤</span><span>Perfil: {profileLabel}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <nav id="profile-shortcuts-menu" className="profile-shortcuts-menu" aria-label="Atalhos das funções autorizadas">
      <Link to="/" onClick={() => setOpen(false)}>Início — contexto principal</Link>
      {shortcuts.map(({ path, label }) => <Link key={path} to={path} onClick={() => setOpen(false)}>{label}</Link>)}
    </nav>}
  </div>
}
