import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
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
  { path: '/gestor/familiares', icon: '♧', label: 'Familiares e Acompanhamentos' },
  { path: '/encaminhamentos', icon: '↗', label: 'Encaminhamentos' },
  { path: '/odontologia', icon: '🦷', label: 'Odontologia' },
  { path: '/receita', icon: '💊', label: 'Renovação de Receita' },
]

const managementItems: readonly NavItem[] = [
  { path: '/gestor/operacional', icon: '●', label: 'Pendências e Notificações' },
  { path: '/gestor/equipe', icon: '♟', label: 'Equipe e Agendas' },
  { path: '/gestor/timeline', icon: '◷', label: 'Linha do Tempo Operacional' },
  { path: '/gestor/auditoria', icon: '▥', label: 'Auditoria e Relatórios' },
  { path: '/relatorios', icon: '▥', label: 'Relatórios' },
  { path: '/notificacoes', icon: '●', label: 'Notificações' },
  { path: '/gestor/suporte', icon: '?', label: 'Suporte' },
]

function NavGroup({ label, items, activePath, accessContext }: Readonly<{
  label: string
  items: readonly NavItem[]
  activePath: string
  accessContext: AccessContext
}>) {
  const authorizedItems = items.filter((item) =>
    canAccessAppRoute(accessContext, item.path as AppRoute),
  )
  if (authorizedItems.length === 0) return null

  return (
    <div className="gestor-nav-group">
      <p>{label}</p>
      {authorizedItems.map((item) => (
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

  return (
    <div className="gestor-shell">
      <aside className="gestor-sidebar" aria-label="Navegação do Gestor">
        <div className="gestor-brand"><img src="/assets/capo-logo.jpg" alt="CAPO" /></div>
        <nav className="gestor-nav" aria-label="Módulos do Gestor">
          <Link className="gestor-nav-link" to="/" aria-current={activePath === '/' ? 'page' : undefined}>
            <span aria-hidden="true">⌂</span> Início
          </Link>
          <NavGroup label="Atendimento e Acompanhamento" items={serviceItems} activePath={activePath} accessContext={accessContext} />
          <NavGroup label="Gestão do Serviço" items={managementItems} activePath={activePath} accessContext={accessContext} />
          <NavGroup label="Administração do Sistema" items={[{ path: '/gestor/administracao', icon: '⚙', label: 'Usuários e Contas' }]} activePath={activePath} accessContext={accessContext} />
          <NavGroup label="TI / Manutenção" items={[{ path: '/tecnica', icon: '🛠', label: 'Área Técnica' }]} activePath={activePath} accessContext={accessContext} />
        </nav>
        <button className="gestor-logout" type="button" onClick={() => void onLogout()}>↪ Sair</button>
        <p className="gestor-motto">Juntos<br />pela vida <span>♡</span></p>
        <div className="gestor-connection" aria-label="Status de conexão">
          <span>Conexão</span>
          <strong>Estado não verificado</strong>
        </div>
      </aside>

      <section className="gestor-workspace">
        <header className="gestor-header">
          <div><h1>{accessContext.full_name ?? accessContext.username}</h1><p>Administrador do Sistema / Titular</p></div>
          <div className="gestor-header-actions">
            {activePath !== '/' && <button type="button" onClick={() => navigate('/')}>Voltar</button>}
            <span>Administrador</span>
            <small>🔒 Sessão individual</small>
          </div>
        </header>
        <main className="gestor-main" aria-label="Ambiente do Administrador do Sistema">{children}</main>
        <footer className="gestor-footer">
          <span>Sistema CAPO — Gestão Administrativa e Operacional</span>
          <span>Elaborado e desenvolvido por Daniele Cristina Silva de Carvalho — Auxiliar Administrativo do CAPO</span>
          <span>Secretaria Municipal de Saúde de Pouso Alegre – MG</span>
          <span>Ambiente restrito • Dados protegidos • Acesso individual e auditado • Uso exclusivo autorizado</span>
          <span>Privacidade e Segurança</span>
        </footer>
      </section>
    </div>
  )
}