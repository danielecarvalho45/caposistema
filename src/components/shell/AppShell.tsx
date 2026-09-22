import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { CapoFooter } from '../layout/CapoFooter'
import { CapoHeader } from '../layout/CapoHeader'
import { getNotificationsService } from '../../features/notifications/notifications-integration'
import { HomologationSelector } from '../../features/access/HomologationSelector'
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

type NavigationItem = readonly [path: AppRoute, icon: string, label: string]

type NavigationGroup = Readonly<{
  label: string
  items: readonly NavigationItem[]
}>

const navigationByProfile: Record<string, readonly NavigationGroup[]> = {
  coordenador: [
    {
      label: 'Coordenação do Serviço',
      items: [
        ['/gestor/equipe', '♟', 'Coordenação'],
        ['/pacientes', '👥', 'Pacientes'],
        ['/agenda', '▣', 'Agendas da equipe'],
        ['/faltosos', '◷', 'Faltosos'],
        ['/gestor/busca-ativa', '⌕', 'Busca Ativa'],
        ['/solicitacoes', '▤', 'Solicitações'],
        ['/encaminhamentos', '↗', 'Encaminhamentos'],
        ['/encerramentos', '✓', 'Encerramentos'],
      ],
    },
    {
      label: 'Gestão e Continuidade',
      items: [
        ['/relatorios', '▥', 'Relatórios'],
        ['/gestor/timeline', '◷', 'Linha do Tempo'],
        ['/gestor/auditoria', '▤', 'Auditoria'],
        ['/gestor/suporte', '?', 'Suporte'],
        ['/notificacoes', '●', 'Avisos'],
      ],
    },
  ],
  administrativo_operacional: [
    {
      label: 'Atendimento e Operação',
      items: [
        ['/pacientes', '👥', 'Pacientes'],
        ['/agenda', '▣', 'Agenda Geral'],
        ['/fila', '≡', 'Fila Operacional'],
        ['/faltosos', '◷', 'Faltosos'],
        ['/solicitacoes', '▤', 'Solicitações'],
      ],
    },
    {
      label: 'Fluxos e Providências',
      items: [
        ['/transporte', '⇄', 'Transporte'],
        ['/familiar-cuidador', '♧', 'Familiar / Cuidador'],
        ['/odontologia', '◌', 'Odontologia'],
        ['/receita', '▣', 'Renovação de Receita'],
        ['/notificacoes', '●', 'Avisos'],
      ],
    },
  ],
  social: [
    {
      label: 'Atendimento',
      items: [
        ['/assistencia-social', '♡', 'Minha Agenda'],
        ['/familiar-cuidador', '♧', 'Familiar / Cuidador'],
        ['/luto', '◌', 'Luto'],
        ['/solicitacoes', '▤', 'Solicitações'],
        ['/encaminhamentos', '↗', 'Encaminhamentos'],
      ],
    },
    {
      label: 'Acompanhamento',
      items: [
        ['/transporte', '⇄', 'Transporte'],
        ['/encerramentos', '✓', 'Encerramento social'],
        ['/relatorios', '▥', 'Relatórios'],
        ['/notificacoes', '●', 'Avisos'],
      ],
    },
  ],
  nutricao: [
    {
      label: 'Nutrição',
      items: [
        ['/nutricao', '▣', 'Minha Agenda'],
        ['/atuacao', '⌕', 'Pacientes vinculados'],
        ['/solicitacoes', '↔', 'Solicitações'],
        ['/encaminhamentos', '↗', 'Encaminhamentos'],
        ['/encerramentos', '✓', 'Encerramento próprio'],
        ['/relatorios', '▥', 'Relatórios da Nutrição'],
      ],
    },
    {
      label: 'Conta',
      items: [['/notificacoes', '●', 'Avisos']],
    },
  ],
  medico_clinico_geral: [
    {
      label: 'Atuação clínica',
      items: [
        ['/agenda', '▣', 'Minha Agenda'],
        ['/atuacao', '⌕', 'Pacientes vinculados'],
        ['/receita', '▣', 'Renovação de Receita'],
        ['/solicitacoes', '↔', 'Solicitar ao Coordenador'],
        ['/encaminhamentos', '↗', 'Encaminhamentos'],
        ['/odontologia', '◌', 'Odontologia externa'],
        ['/encerramentos', '✓', 'Encerramento próprio'],
        ['/relatorios', '▥', 'Relatórios'],
      ],
    },
    {
      label: 'Conta',
      items: [['/notificacoes', '●', 'Avisos']],
    },
  ],
  profissional: [
    {
      label: 'Minha atuação',
      items: [
        ['/agenda', '▣', 'Minha Agenda'],
        ['/atuacao', '⌕', 'Pacientes vinculados'],
        ['/solicitacoes', '↔', 'Solicitar ao Coordenador'],
        ['/encaminhamentos', '↗', 'Encaminhamentos'],
        ['/encerramentos', '✓', 'Encerramento próprio'],
        ['/relatorios', '▥', 'Relatórios'],
      ],
    },
    {
      label: 'Conta',
      items: [['/notificacoes', '●', 'Avisos']],
    },
  ],
  administrador_tecnico: [
    {
      label: 'TI / Manutenção',
      items: [
        ['/tecnica', '🛠', 'Painel Técnico'],
        ['/notificacoes', '●', 'Avisos'],
      ],
    },
  ],
}

function navigationFor(accessContext: AccessContext) {
  const primary = accessContext.primary_context.code ?? ''
  const social = accessContext.roles.some((role) =>
    ['assistencia_social', 'assistente_social', 'social'].includes(role.code),
  )
  const key = social ? 'social' : primary
  return navigationByProfile[key] ?? navigationByProfile.profissional
}

export function AppShell({
  accessContext,
  children,
  onLogout,
  activePath = '/',
}: AppShellProps) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(
    null,
  )
  const mainRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const currentPath = activePath || '/'
  const displayName =
    normalized(accessContext.full_name) ?? accessContext.username
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const userCaption =
    normalized(accessContext.primary_context.name) ??
    normalized(accessContext.function_title) ??
    contextName
  const canAccessPatients = canAccessAppRoute(accessContext, '/pacientes')
  const canAccessAgenda = canAccessAppRoute(accessContext, '/agenda')
  const canAccessAssistential = canAccessAppRoute(accessContext, '/atuacao')
  const canAccessNutrition = canAccessAppRoute(accessContext, '/nutricao')
  const canAccessSocial = canAccessAppRoute(
    accessContext,
    '/assistencia-social',
  )
  const canAccessFamilyCaregiver = canAccessAppRoute(
    accessContext,
    '/familiar-cuidador',
  )
  const canAccessQueue = canAccessAppRoute(accessContext, '/fila')
  const canAccessNoShows = canAccessAppRoute(accessContext, '/faltosos')
  const canAccessRequests = canAccessAppRoute(accessContext, '/solicitacoes')
  const canAccessTransport = canAccessAppRoute(accessContext, '/transporte')
  const canAccessRenewal = canAccessAppRoute(accessContext, '/receita')
  const canAccessReferrals = canAccessAppRoute(
    accessContext,
    '/encaminhamentos',
  )
  const canAccessDentistry = canAccessAppRoute(accessContext, '/odontologia')
  const canAccessNotifications = canAccessAppRoute(
    accessContext,
    '/notificacoes',
  )
  const canAccessTechnical =
    canAccessAppRoute(accessContext, '/tecnica') ||
    ['administrador', 'administrador_tecnico'].includes(
      accessContext.primary_context.code ?? '',
    )
  const canAccessReports = canAccessAppRoute(accessContext, '/relatorios')
  const canAccessClosures = canAccessAppRoute(accessContext, '/encerramentos')

  useEffect(() => {
    mainRef.current?.focus()
    setMenuOpen(false)
  }, [activePath])

  useEffect(() => {
    if (!menuOpen) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
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
            onClick={() => setMenuOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="app-nav app-nav-profile" aria-label="Navegação do perfil">
          {navigationFor(accessContext).map((group) => (
            <div className="app-nav-group" key={group.label}>
              <p className="app-nav-label">{group.label}</p>
              {group.items
                .filter(([path]) => canAccessAppRoute(accessContext, path))
                .map(([path, icon, label]) => (
                  <Link
                    className="app-nav-link"
                    to={path}
                    aria-current={currentPath === path ? 'page' : undefined}
                    key={path}
                  >
                    <span aria-hidden="true">{icon}</span>
                    <span>{label}</span>
                    {path === '/notificacoes' &&
                      unreadNotifications !== null &&
                      unreadNotifications > 0 && (
                        <span
                          className="app-nav-badge"
                          aria-label={`${unreadNotifications} notificações não lidas`}
                        >
                          {unreadNotifications > 99 ? '99+' : unreadNotifications}
                        </span>
                      )}
                  </Link>
                ))}
            </div>
          ))}
        </nav>

        <nav className="app-nav app-nav-legacy" aria-label="Navegação principal">
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
            {canAccessPatients && (
              <Link
                className="app-nav-link"
                to="/pacientes"
                aria-current={currentPath === '/pacientes' ? 'page' : undefined}
              >
                <span aria-hidden="true">👥</span>
                <span>Pacientes</span>
              </Link>
            )}
            {canAccessAgenda && (
              <Link
                className="app-nav-link"
                to="/agenda"
                aria-current={currentPath === '/agenda' ? 'page' : undefined}
              >
                <span aria-hidden="true">🗓</span>
                <span>Agenda Geral</span>
              </Link>
            )}
            {canAccessAssistential && (
              <Link
                className="app-nav-link"
                to="/atuacao"
                aria-current={currentPath === '/atuacao' ? 'page' : undefined}
              >
                <span aria-hidden="true">+</span>
                <span>Minha atuação</span>
              </Link>
            )}
            {canAccessNutrition && (
              <Link
                className="app-nav-link"
                to="/nutricao"
                aria-current={currentPath === '/nutricao' ? 'page' : undefined}
              >
                <span aria-hidden="true">🥗</span>
                <span>Nutrição</span>
              </Link>
            )}
            {canAccessSocial && (
              <Link
                className="app-nav-link"
                to="/assistencia-social"
                aria-current={
                  currentPath === '/assistencia-social' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">♡</span>
                <span>Assistência Social</span>
              </Link>
            )}
            {canAccessFamilyCaregiver && (
              <Link
                className="app-nav-link"
                to="/familiar-cuidador"
                aria-current={
                  currentPath === '/familiar-cuidador' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">♧</span>
                <span>Familiar / Cuidador</span>
              </Link>
            )}
            {canAccessQueue && (
              <Link
                className="app-nav-link"
                to="/fila"
                aria-current={currentPath === '/fila' ? 'page' : undefined}
              >
                <span aria-hidden="true">📋</span>
                <span>Fila</span>
              </Link>
            )}
            {canAccessNoShows && (
              <Link
                className="app-nav-link"
                to="/faltosos"
                aria-current={currentPath === '/faltosos' ? 'page' : undefined}
              >
                <span aria-hidden="true">⚑</span>
                <span>Faltosos</span>
              </Link>
            )}
            {canAccessRequests && (
              <Link
                className="app-nav-link"
                to="/solicitacoes"
                aria-current={
                  currentPath === '/solicitacoes' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">▤</span>
                <span>Solicitações</span>
              </Link>
            )}
            {canAccessTransport && (
              <Link
                className="app-nav-link"
                to="/transporte"
                aria-current={
                  currentPath === '/transporte' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">⇄</span>
                <span>Transporte</span>
              </Link>
            )}
            {canAccessRenewal && (
              <Link
                className="app-nav-link"
                to="/receita"
                aria-current={currentPath === '/receita' ? 'page' : undefined}
              >
                <span aria-hidden="true">💊</span>
                <span>Renovação de Receita</span>
              </Link>
            )}
            {canAccessReferrals && (
              <Link
                className="app-nav-link"
                to="/encaminhamentos"
                aria-current={
                  currentPath === '/encaminhamentos' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">↗</span>
                <span>Encaminhamentos</span>
              </Link>
            )}
            {canAccessDentistry && (
              <Link
                className="app-nav-link"
                to="/odontologia"
                aria-current={
                  currentPath === '/odontologia' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">🦷</span>
                <span>Odontologia</span>
              </Link>
            )}
            {canAccessClosures && (
              <Link
                className="app-nav-link"
                to="/encerramentos"
                aria-current={
                  currentPath === '/encerramentos' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">✓</span>
                <span>Encerramentos</span>
              </Link>
            )}
            {canAccessNotifications && (
              <Link
                className="app-nav-link"
                to="/notificacoes"
                aria-current={
                  currentPath === '/notificacoes' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">●</span>
                <span>Notificações</span>
                {unreadNotifications !== null && unreadNotifications > 0 && (
                  <span
                    className="app-nav-badge"
                    aria-label={`${unreadNotifications} notificações não lidas`}
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </Link>
            )}
            {canAccessTechnical && (
              <Link
                className="app-nav-link"
                to="/tecnica"
                aria-current={currentPath === '/tecnica' ? 'page' : undefined}
              >
                <span aria-hidden="true">⚙</span>
                <span>Área técnica</span>
              </Link>
            )}
            {canAccessReports && (
              <Link
                className="app-nav-link"
                to="/relatorios"
                aria-current={
                  currentPath === '/relatorios' ? 'page' : undefined
                }
              >
                <span aria-hidden="true">▥</span>
                <span>Relatórios</span>
              </Link>
            )}
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

      <button
        className={`app-sidebar-backdrop${menuOpen ? ' is-visible' : ''}`}
        type="button"
        aria-label="Fechar menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <div className="app-workspace">
        <CapoHeader
          className="app-header"
          displayName={displayName}
          userCaption={userCaption}
          contextName={contextName}
          currentPath={currentPath}
          onBack={() => navigate('/')}
          onMenuOpen={() => setMenuOpen(true)}
          menuId="app-sidebar"
          menuOpen={menuOpen}
          showNotifications={canAccessNotifications}
        />

        {accessContext.is_homologation_account && (
          <HomologationSelector accessContext={accessContext} />
        )}

        <main
          ref={mainRef}
          className="app-main"
          tabIndex={-1}
          aria-label="Área de trabalho CAPO"
        >
          {children}
        </main>
        <CapoFooter className="app-footer" />
      </div>
    </div>
  )
}
