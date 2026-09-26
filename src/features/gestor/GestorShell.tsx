import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { getRpcService } from '../../lib/supabase/rpc'
import { getNotificationsService } from '../notifications/notifications-integration'
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
  { path: '/fila', icon: '≡', label: 'Filas' },
  { path: '/solicitacoes', icon: '▤', label: 'Solicitações' },
  { path: '/transporte', icon: '▰', label: 'Transporte' },
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
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null)

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
    if (!canAccessAppRoute(accessContext, '/notificacoes')) return
    let active = true
    void getNotificationsService().getNotifications(true, 1, 0).then((state) => {
      if (!active) return
      setUnreadNotifications(state.status === 'success' ? (state.data[0]?.total_count ?? 0) : null)
    })
    return () => { active = false }
  }, [accessContext])

  const profileLabel = accessContext.primary_context.name?.trim() || 'Administrador'

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
          <a className="gestor-nav-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">↗</span> IA de Desenvolvimento do CAPO</a>
          <NavGroup label="TI / Manutenção" items={[{ path: '/tecnica', icon: '🛠', label: 'Área Técnica' }]} activePath={activePath} accessContext={accessContext} />
        </nav>
        <button className="gestor-logout" type="button" onClick={() => void onLogout()}>↪ Sair</button>
        <p className="gestor-motto">Juntos<br />pela vida <span>♡</span></p>
        <div className="gestor-connection" data-status={connectionStatus} aria-label={`Conexão — ${connectionLabel}`}>
          <span>Conexão</span>
          <strong><i aria-hidden="true" />{connectionLabel}</strong>
        </div>
      </aside>

      <section className="gestor-workspace">
        <header className="gestor-header">
          <div className="gestor-user">
            <h1>{accessContext.full_name ?? accessContext.username}</h1>
            <p>Administrador do Sistema / Titular</p>
          </div>
          <div className="gestor-header-actions">
            <button type="button" onClick={() => navigate('/')}>← <span>Voltar</span></button>
            {canAccessAppRoute(accessContext, '/notificacoes') && (
              <button className="gestor-notice-button" type="button" onClick={() => navigate('/notificacoes')}>
                <span aria-hidden="true">🔔</span><span>Avisos</span>
                {unreadNotifications !== null && unreadNotifications > 0 && (
                  <b className="gestor-notice-badge" aria-label={`${unreadNotifications} avisos não lidos`}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </b>
                )}
              </button>
            )}
            <button className="gestor-profile-button" type="button" onClick={() => navigate('/perfil')}>
              <span aria-hidden="true">👤</span>
              <span>Perfil: {profileLabel}</span>
              <span aria-hidden="true">⌄</span>
            </button>
          </div>
        </header>
        <section className="gestor-welcome-approved" aria-label="Boas-vindas">
          <div className="gestor-welcome-copy">
            <h2>Olá, seja bem-vinda ao CAPO.</h2>
            <p>Tenha um ótimo dia de trabalho.</p>
          </div>
          <span className="gestor-welcome-heart" aria-hidden="true">♡</span>
          <div className="gestor-slogan-approved" aria-label="Mensagem institucional">
            <span>Cuidar hoje.</span>
            <strong>Mais possibilidades amanhã.</strong>
          </div>
        </section>
        <main className="gestor-main" aria-label="Ambiente do Administrador do Sistema">{children}</main>
        <footer className="gestor-footer">
          <div className="gestor-footer-center">
            <strong>Sistema CAPO — Gestão Administrativa e Operacional</strong>
            <span>Elaborado e desenvolvido por Daniele Cristina Silva de Carvalho — Auxiliar Administrativo do CAPO</span>
            <span>Secretaria Municipal de Saúde de Pouso Alegre – MG</span>
            <span className="gestor-security">Ambiente restrito • Dados protegidos • Acesso individual e auditado • Uso exclusivo autorizado</span>
          </div>
          <span className="gestor-footer-right">Privacidade e Segurança</span>
        </footer>
      </section>
    </div>
  )
}
