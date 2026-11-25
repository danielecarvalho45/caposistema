import { Link, useNavigate } from 'react-router-dom'
import { useBackToPreviousFunction } from '../../lib/navigation/back'
import { useEffect, useState, type ReactNode } from 'react'
import type { AccessContext } from '../../types/access'
import { useCapoGreeting } from '../../components/shell/useCapoGreeting'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { getRpcService } from '../../lib/supabase/rpc'
import { getNotificationsService, NOTIFICATIONS_UPDATED_EVENT } from '../notifications/notifications-integration'
import { ProfileShortcuts } from '../../components/shell/ProfileShortcuts'
import { CommunicationUnreadLink } from '../communication/CommunicationUnreadLink'
import './gestor.css'

type GestorShellProps = Readonly<{
  accessContext: AccessContext
  activePath: string
  children: ReactNode
  onLogout: () => Promise<void>
}>

type NavItem = Readonly<{ path: string; icon: string; label: string; transportView?: 'operacional' | 'gestor' }>

const serviceItems: readonly NavItem[] = [
  { path: '/pacientes', icon: '👥', label: 'Pacientes' },
  { path: '/agenda', icon: '▣', label: 'Agenda Geral' },
  { path: '/fila', icon: '≡', label: 'Filas' },
  { path: '/solicitacoes', icon: '▤', label: 'Solicitações' },
  { path: '/comunicacao', icon: '✉', label: 'Comunicação Interna' },
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
  { path: '/gestor/equipe', icon: '👥', label: 'Equipe e Agendas' },
  { path: '/gestor/timeline', icon: '◷', label: 'Histórico Operacional do Paciente' },
  { path: '/gestor/auditoria', icon: '▥', label: 'Auditoria e Relatórios' },
  { path: '/relatorios', icon: '▥', label: 'Relatórios' },
  { path: '/notificacoes', icon: '●', label: 'Notificações' },
  { path: '/gestor/suporte', icon: '?', label: 'Suporte' },
]

const titularOperationalItems: readonly NavItem[] = [
  { path: '/pacientes', icon: '👥', label: 'Pacientes' },
  { path: '/agenda', icon: '🗓', label: 'Agenda Geral' },
  { path: '/nutricao', icon: '◉', label: 'Nutrição' },
  { path: '/familiar-cuidador', icon: '♧', label: 'Familiar / Cuidador' },
  { path: '/fila', icon: '📋', label: 'Fila' },
  { path: '/faltosos', icon: '⚑', label: 'Faltosos' },
  { path: '/busca-ativa', icon: '⌕', label: 'Busca Ativa' },
  { path: '/solicitacoes', icon: '▤', label: 'Solicitações' },
  { path: '/comunicacao', icon: '✉', label: 'Comunicação Interna' },
  { path: '/transporte', icon: '⇄', label: 'Transporte', transportView: 'operacional' },
  { path: '/receita', icon: '💊', label: 'Renovação de Receita' },
  { path: '/encaminhamentos', icon: '↗', label: 'Encaminhamentos' },
  { path: '/odontologia', icon: '🦷', label: 'Odontologia' },
  { path: '/encerramentos', icon: '✓', label: 'Encerramentos' },
  { path: '/notificacoes', icon: '●', label: 'Notificações' },
  { path: '/suporte', icon: '?', label: 'Suporte' },
  { path: '/relatorios', icon: '▥', label: 'Relatórios' },
]

const titularRetainedItems = serviceItems.filter((item) =>
  !titularOperationalItems.some((operational) => operational.path === item.path),
)

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
          state={item.transportView ? { titularTransportView: item.transportView } : undefined}
          key={item.path}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </div>
  )
}

function TitularIcon({ kind }: { kind: 'inicio' | 'operacional' | 'gestor' | 'ti' | 'sair' }) {
  return (
    <svg width="28" height="28" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {kind === 'inicio' && <path d="M3 15L17 3 31 15 M7 13V30H27V13 M14 30V20H20V30" />}
      {kind === 'operacional' && <><rect x="6" y="6" width="22" height="25" rx="3" /><rect x="12" y="2" width="10" height="7" rx="2" fill="var(--titular-light)" /><path d="M11 15H23 M11 21H23 M11 27H19" /></>}
      {kind === 'gestor' && <><circle cx="12" cy="9" r="6" /><path d="M1 30V26Q1 17 12 17T23 26V30 M24 3Q36 8 25 15 M26 19Q33 21 33 29" /></>}
      {kind === 'ti' && <><rect x="2" y="3" width="30" height="21" rx="3" /><path d="M5 19H29 M17 24V30 M8 31H26 M10 9L14 12L10 15 M18 15H25" /></>}
      {kind === 'sair' && <path d="M15 4H5V30H15 M12 17H31 M24 10L31 17 24 24" />}
    </svg>
  )
}

const titularMenuStyles = `
.gestor-sidebar--titular .titular-menu-button {
  --titular-light: #e1f3ff; --titular-base: #94c7ea; --titular-edge: #6398bf; --titular-ink: #245c88;
  box-sizing: border-box; display: flex; align-items: center; gap: 12px;
  width: calc(100% - 16px); min-height: 54px; margin: 8px 8px 16px; padding: 10px 12px;
  border: 1px solid var(--titular-light); border-radius: 12px;
  background: linear-gradient(170deg, var(--titular-light), var(--titular-base));
  box-shadow: 0 5px 0 var(--titular-edge), 0 8px 9px -3px var(--titular-edge), inset 0 2px 0 rgb(255 255 255 / 68%);
  color: var(--titular-ink); line-height: 1.2; font-family: inherit; font-size: 15px; font-weight: 600;
  text-decoration: none; text-align: left; cursor: pointer; transition: transform 120ms ease, box-shadow 120ms ease;
}
.gestor-sidebar--titular .titular-menu-button[data-tone="operacional"] { --titular-light: #fce9f0; --titular-base: #eca6bf; --titular-edge: #c6809a; --titular-ink: #873c5b; }
.gestor-sidebar--titular .titular-menu-button[data-tone="gestor"] { --titular-light: #fff6d7; --titular-base: #f1d47d; --titular-edge: #c6a550; --titular-ink: #80611e; }
.gestor-sidebar--titular .titular-menu-button[data-tone="ti"] { --titular-light: #eaf7e1; --titular-base: #afd49a; --titular-edge: #7ea96c; --titular-ink: #3b6735; }
.gestor-sidebar--titular .titular-menu-button[data-tone="sair"] { --titular-light: #f3eafb; --titular-base: #cdb8e2; --titular-edge: #a08ab7; --titular-ink: #654c7c; width: auto; min-height: 34px; padding: 5px 18px; margin: 10px auto 8px; border-radius: 999px; gap: 7px; font-size: 12px; box-shadow: 0 3px 0 var(--titular-edge), 0 5px 7px -3px var(--titular-edge), inset 0 1px 0 rgb(255 255 255 / 70%); }
.gestor-sidebar--titular .titular-menu-button[data-tone="sair"] svg { width: 19px; height: 19px; }
.gestor-sidebar--titular .titular-menu-button svg { flex-shrink: 0; }
.gestor-sidebar--titular .titular-menu-button .titular-chevron { margin-left: auto; width: auto; font-size: 13px; }
.gestor-sidebar--titular .titular-menu-button:hover { transform: translateY(-2px); }
.gestor-sidebar--titular .titular-menu-button:active, .gestor-sidebar--titular .titular-menu-button[aria-expanded="true"] { transform: translateY(2px); box-shadow: 0 2px 0 var(--titular-edge), inset 0 1px 0 rgb(255 255 255 / 65%); }
.gestor-sidebar--titular .titular-menu-button:focus-visible { outline: 2px solid var(--titular-ink); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .gestor-sidebar--titular .titular-menu-button { transition: none; } }
`

export function GestorShell({
  accessContext,
  activePath,
  children,
  onLogout,
}: GestorShellProps) {
  const navigate = useNavigate()
  const greeting = useCapoGreeting(accessContext)
  const goBack = useBackToPreviousFunction()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [titularArea, setTitularArea] = useState<'operacional' | 'gestor' | 'ti' | null>(null)

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
    const refreshUnread = () => {
      void getNotificationsService().getNotifications(true, 1, 0).then((state) => {
        if (!active) return
        setUnreadNotifications(state.status === 'success' ? (state.data[0]?.total_count ?? 0) : 0)
      })
    }
    refreshUnread()
    globalThis.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshUnread)
    return () => {
      active = false
      globalThis.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshUnread)
    }
  }, [accessContext, activePath])

  const profileLabel = accessContext.primary_context.name?.trim() || 'Administrador'
  const isDanieleTitular = accessContext.user_account_id === '7a077538-471f-4f3a-9033-e30fec74dd9b'
    && accessContext.primary_context.code === 'administrador'

  return (
    <div className="gestor-shell">
      <button
        className={`gestor-sidebar-backdrop${menuOpen ? ' is-visible' : ''}`}
        type="button"
        aria-label="Fechar menu"
        onClick={() => setMenuOpen(false)}
      />
      <aside
        className={`gestor-sidebar${menuOpen ? ' is-open' : ''}${isDanieleTitular ? ' gestor-sidebar--titular' : ''}`}
        id="gestor-sidebar"
        aria-label="Navegação do Gestor"
      >
        <div className="gestor-brand">
          <img src="/assets/capo-logo.jpg" alt="CAPO" />
          <button className="gestor-sidebar-close" type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>×</button>
        </div>
        {isDanieleTitular && <style>{titularMenuStyles}</style>}
        <nav className="gestor-nav" aria-label="Módulos do Gestor">
          {isDanieleTitular ? (
            <>
              <Link className="titular-menu-button" data-tone="inicio" to="/" aria-current={activePath === '/' ? 'page' : undefined} onClick={() => setTitularArea(null)}>
                <TitularIcon kind="inicio" /> Início
              </Link>
              {([
                { id: 'operacional', label: 'Operacional' },
                { id: 'gestor', label: 'Gestor' },
                { id: 'ti', label: 'TI' },
              ] as const).map((area) => (
                <div key={area.id}>
                  <button type="button" className="titular-menu-button" data-tone={area.id}
                    aria-expanded={titularArea === area.id} aria-controls={`titular-menu-${area.id}`}
                    onClick={() => setTitularArea((current) => current === area.id ? null : area.id)}>
                    <TitularIcon kind={area.id} /> {area.label}
                    <span className="titular-chevron" aria-hidden="true">{titularArea === area.id ? '▴' : '▾'}</span>
                  </button>
                  <div id={`titular-menu-${area.id}`} hidden={titularArea !== area.id}>
                    {area.id === 'operacional' && <>
                      <NavGroup label="Rotinas operacionais" items={titularOperationalItems} activePath={activePath} accessContext={accessContext} />
                      <NavGroup label="Acessos existentes — separação pendente" items={titularRetainedItems} activePath={activePath} accessContext={accessContext} />
                    </>}
                    {area.id === 'gestor' && <>
                      <NavGroup label="Gestão do Serviço" items={[...managementItems.filter((item) => item.path !== '/gestor/suporte'), { path: '/transporte', icon: '⇄', label: 'Transporte — Contatos', transportView: 'gestor' }]} activePath={activePath} accessContext={accessContext} />
                      <NavGroup label="Administração do Sistema" items={[{ path: '/gestor/administracao', icon: '⚙', label: 'Usuários e Contas' }]} activePath={activePath} accessContext={accessContext} />
                    </>}
                    {area.id === 'ti' && <>
                      <a className="gestor-nav-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">↗</span> IA de Desenvolvimento do CAPO</a>
                      <NavGroup label="TI / Manutenção" items={[{ path: '/tecnica', icon: '🛠', label: 'Área Técnica' }]} activePath={activePath} accessContext={accessContext} />
                    </>}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
          <Link className="gestor-nav-link" to="/" aria-current={activePath === '/' ? 'page' : undefined}>
            <span aria-hidden="true">⌂</span> Início
          </Link>
          <NavGroup label="Atendimento e Acompanhamento" items={serviceItems} activePath={activePath} accessContext={accessContext} />
          <NavGroup label="Gestão do Serviço" items={managementItems.filter((item) => item.path !== '/gestor/suporte')} activePath={activePath} accessContext={accessContext} />
          <NavGroup label="Administração do Sistema" items={[{ path: '/gestor/administracao', icon: '⚙', label: 'Usuários e Contas' }]} activePath={activePath} accessContext={accessContext} />
          <a className="gestor-nav-link" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">↗</span> IA de Desenvolvimento do CAPO</a>
          <NavGroup label="TI / Manutenção" items={[{ path: '/tecnica', icon: '🛠', label: 'Área Técnica' }]} activePath={activePath} accessContext={accessContext} />
            </>
          )}
        </nav>
        <button className={isDanieleTitular ? "titular-menu-button" : "gestor-logout"} data-tone={isDanieleTitular ? "sair" : undefined} type="button" onClick={() => void onLogout()}>{isDanieleTitular ? <><TitularIcon kind="sair" /> Sair</> : "↪ Sair"}</button>
        <p className="gestor-motto">Juntos<br />pela vida <span>♡</span></p>
        <div className="gestor-connection" data-status={connectionStatus} aria-label={`Conexão — ${connectionLabel}`}>
          <span>Conexão</span>
          <strong><i aria-hidden="true" />{connectionLabel}</strong>
        </div>
      </aside>

      <section className="gestor-workspace">
        <header className="gestor-header">
          <button
            className="gestor-mobile-menu"
            type="button"
            aria-label="Abrir menu"
            aria-controls="gestor-sidebar"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <div className="gestor-user">
            <h1>{accessContext.full_name ?? accessContext.username}</h1>
            <p>Administrador do Sistema / Titular</p>
          </div>
          <div className="gestor-header-actions">
            {isDanieleTitular && (
              <button type="button" onClick={() => navigate('/')} aria-label="Ir para Início">
                ⌂ <span>Início</span>
              </button>
            )}
            <CommunicationUnreadLink accessContext={accessContext} />
            <button type="button" onClick={goBack}>← <span>Voltar</span></button>
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
            <ProfileShortcuts accessContext={accessContext} activePath={activePath} className="gestor-profile-button" profileLabel={profileLabel} />
          </div>
        </header>
        <section className="gestor-welcome-approved" aria-label="Boas-vindas">
          <div className="gestor-welcome-copy">
            <h2><span className="capo-greeting-time">{greeting.slice(0, greeting.indexOf('!') + 1)}</span><span className="capo-greeting-message">{greeting.slice(greeting.indexOf('!') + 2)}</span></h2>
            <p className="capo-welcome-workday"><span>Tenha um ótimo dia de trabalho!</span><img src="/assets/capo-girassol-natural.svg" alt="" aria-hidden="true" width="32" height="42" /></p>
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
