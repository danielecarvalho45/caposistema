import { Link, useNavigate } from 'react-router-dom'
import { useState, type ReactNode } from 'react'
import type { AccessContext } from '../../types/access'
import { CapoFooter } from '../../components/layout/CapoFooter'
import { CapoHeader } from '../../components/layout/CapoHeader'
import { HomologationSelector } from '../access/HomologationSelector'
import './gestor.css'

type GestorShellProps = Readonly<{
  accessContext: AccessContext
  activePath: string
  children: ReactNode
  onLogout: () => Promise<void>
}>

type NavItem = Readonly<{ path: string; icon: string; label: string }>

const serviceItems: readonly NavItem[] = [
  { path: '/pacientes', icon: '👥', label: 'Pacientes' },
  { path: '/agenda', icon: '▣', label: 'Agenda Geral' },
  { path: '/solicitacoes', icon: '▤', label: 'Solicitações' },
  { path: '/gestor/fluxos', icon: '◉', label: 'Fluxos e Acompanhamentos' },
  { path: '/faltosos', icon: '◷', label: 'Faltosos' },
  { path: '/gestor/busca-ativa', icon: '⌕', label: 'Busca Ativa' },
  { path: '/encerramentos', icon: '✓', label: 'Encerramentos' },
]

const managementItems: readonly NavItem[] = [
  { path: '/gestor/equipe', icon: '♟', label: 'Coordenação' },
  { path: '/relatorios', icon: '▥', label: 'Relatórios e Indicadores' },
]

function NavGroup({ label, items, activePath }: Readonly<{
  label: string
  items: readonly NavItem[]
  activePath: string
}>) {
  return (
    <div className="gestor-nav-group">
      <p>{label}</p>
      {items.map((item) => (
        <Link
          className="gestor-nav-link"
          aria-current={activePath === item.path ? 'page' : undefined}
          to={item.path}
          key={item.path}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </div>
  )
}

export function GestorShell({
  accessContext,
  activePath,
  children,
  onLogout,
}: GestorShellProps) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="gestor-shell">
      <aside
        id="gestor-sidebar"
        className={`gestor-sidebar${menuOpen ? ' is-open' : ''}`}
        aria-label="Navegação do Gestor"
      >
        <div className="gestor-brand"><img src="/assets/capo-logo.jpg" alt="CAPO" /></div>
        <nav className="gestor-nav" aria-label="Módulos do Gestor">
          <Link className="gestor-nav-link" to="/" aria-current={activePath === '/' ? 'page' : undefined}>
            <span aria-hidden="true">⌂</span> Início
          </Link>
          <NavGroup label="Atendimento e Acompanhamento" items={serviceItems} activePath={activePath} />
          <NavGroup label="Gestão do Serviço" items={managementItems} activePath={activePath} />
          <NavGroup label="Administração do Sistema" items={[{ path: '/gestor/administracao', icon: '⚙', label: 'Usuários e Contas' }]} activePath={activePath} />
          <NavGroup label="TI / Manutenção" items={[{ path: '/tecnica', icon: '🛠', label: 'Área Técnica' }]} activePath={activePath} />
        </nav>
        <button className="gestor-logout" type="button" onClick={() => void onLogout()}>↪ Sair</button>
        <p className="gestor-motto">Juntos<br />pela vida <span>♡</span></p>
      </aside>
      <button
        className={`gestor-sidebar-backdrop${menuOpen ? ' is-visible' : ''}`}
        type="button"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <section className="gestor-workspace">
        <CapoHeader
          className="gestor-header"
          displayName={accessContext.full_name ?? accessContext.username}
          userCaption=""
          contextName="Administrador"
          currentPath={activePath}
          onBack={() => navigate('/')}
          backLabel="Voltar"
          profileLabel="Administrador do Sistema"
          showBackOnHome
          onMenuOpen={() => setMenuOpen(true)}
          menuId="gestor-sidebar"
          menuOpen={menuOpen}
          showNotifications
        />
        {accessContext.is_homologation_account && (
          <HomologationSelector accessContext={accessContext} />
        )}
        <main className="gestor-main" aria-label="Ambiente do Administrador do Sistema">{children}</main>
        <CapoFooter className="gestor-footer" />
      </section>
    </div>
  )
}
