import { Link } from 'react-router-dom'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import type { AccessContext } from '../../types/access'

type DashboardLink = Readonly<{
  path: AppRoute
  label: string
  description: string
  icon?: string
  tone?: string
}>

const links: Record<string, readonly DashboardLink[]> = {
  administrador: [
    {
      path: '/pacientes',
      label: 'Pacientes',
      description: 'Cadastrar e consultar',
      icon: '👥',
      tone: 'quick-blue',
    },
    {
      path: '/agenda',
      label: 'Agenda',
      description: 'Visualizar agendas',
      icon: '▣',
      tone: 'quick-green',
    },
    {
      path: '/faltosos',
      label: 'Faltosos',
      description: 'Acompanhar e remarcar',
      icon: '◷',
      tone: 'quick-pink',
    },
    {
      path: '/solicitacoes',
      label: 'Solicitações',
      description: 'Analisar e encaminhar',
      icon: '▤',
      tone: 'quick-purple',
    },
    {
      path: '/encaminhamentos',
      label: 'Encaminhamentos',
      description: 'Acompanhar o fluxo',
      icon: '↗',
      tone: 'quick-mint',
    },
    {
      path: '/encerramentos',
      label: 'Encerramentos',
      description: 'Por especialidade',
      icon: '✓',
      tone: 'quick-slate',
    },
    {
      path: '/relatorios',
      label: 'Relatórios',
      description: 'Consultas e indicadores',
      icon: '▥',
      tone: 'quick-violet',
    },
    {
      path: '/transporte',
      label: 'Transporte',
      description: 'Providências e acompanhamento',
      icon: '▰',
      tone: 'quick-yellow',
    },
  ],
  coordenador: [
    {
      path: '/agenda',
      label: 'Agendas da Equipe',
      description: 'Consultar o período autorizado.',
    },
    {
      path: '/faltosos',
      label: 'Faltosos',
      description: 'Acompanhar o fluxo operacional.',
    },
    {
      path: '/solicitacoes',
      label: 'Solicitações',
      description: 'Tratar demandas da coordenação.',
    },
    {
      path: '/encaminhamentos',
      label: 'Encaminhamentos',
      description: 'Acompanhar triagem e destino.',
    },
    {
      path: '/encerramentos',
      label: 'Encerramentos',
      description: 'Acompanhar ciclos autorizados.',
    },
  ],
  administrativo_operacional: [
    { path: '/pacientes', label: 'Pacientes', description: 'Cadastrar / consultar', icon: '👥', tone: 'quick-blue' },
    { path: '/agenda', label: 'Agenda', description: 'Agendar / consultar / remarcar', icon: '▣', tone: 'quick-green' },
    { path: '/solicitacoes', label: 'Solicitações', description: 'Receber / aceitar / concluir', icon: '▤', tone: 'quick-purple' },
    { path: '/faltosos', label: 'Faltosos', description: 'Contato e remarcação', icon: '◷', tone: 'quick-pink' },
    { path: '/busca-ativa', label: 'Busca Ativa', description: 'Reengajamento', icon: '⌕', tone: 'quick-violet' },
    { path: '/transporte', label: 'Transporte', description: 'Providências pendentes', icon: '↗', tone: 'quick-yellow' },
    { path: '/familiar-cuidador', label: 'Familiares', description: 'Vínculo e fila', icon: '♡', tone: 'quick-mint' },
    { path: '/encaminhamentos', label: 'Encaminhamentos', description: 'Recebidos / enviados', icon: '⇢', tone: 'quick-slate' },
  ],
  profissional: [
    {
      path: '/agenda',
      label: 'Minha Agenda',
      description: 'Consultar dia, semana e mês.',
    },
    {
      path: '/atuacao',
      label: 'Minha Atuação',
      description: 'Abrir o contexto assistencial autorizado.',
    },
    {
      path: '/solicitacoes',
      label: 'Solicitações',
      description: 'Acompanhar solicitações profissionais.',
    },
    {
      path: '/encaminhamentos',
      label: 'Encaminhamentos',
      description: 'Enviar e receber encaminhamentos.',
    },
    {
      path: '/relatorios',
      label: 'Relatórios',
      description: 'Consultar resultados autorizados.',
    },
  ],
  nutricao: [
    {
      path: '/nutricao',
      label: 'Minha Agenda',
      description: 'Abrir a rotina da Nutrição.',
    },
    {
      path: '/solicitacoes',
      label: 'Solicitações',
      description: 'Acompanhar demandas da própria atuação.',
    },
    {
      path: '/relatorios',
      label: 'Relatórios da Nutrição',
      description: 'Consultar indicadores autorizados.',
    },
  ],
  administrador_tecnico: [
    {
      path: '/tecnica',
      label: 'Painel Técnico',
      description: 'Estado, integrações, logs e suporte.',
    },
    {
      path: '/notificacoes',
      label: 'Notificações',
      description: 'Abrir avisos do contexto técnico.',
    },
  ],
}

const titles: Record<string, string> = {
  administrador: 'Acessos rápidos',
  coordenador: 'Painel da Coordenação',
  administrativo_operacional: 'Painel Operacional',
  profissional: 'Painel Profissional',
  nutricao: 'Painel de Nutrição',
  administrador_tecnico: 'Painel Técnico',
}

export function ProfileDashboard({
  accessContext,
}: Readonly<{ accessContext: AccessContext }>) {
  const primaryCode = accessContext.primary_context.code ?? ''
  const dashboardKey = primaryCode || 'profissional'
  const availableLinks = (links[dashboardKey] ?? links.profissional ?? []).filter(
    (item) => canAccessAppRoute(accessContext, item.path),
  )

  if (availableLinks.length === 0) return null

  const useApprovedQuickLayout = ['administrador', 'administrativo_operacional', 'coordenador'].includes(primaryCode)

  return (
    <section
      className={`home-profile${useApprovedQuickLayout ? ' home-profile-gestor' : ''}`}
      aria-labelledby="profile-panel-title"
      aria-label={primaryCode === 'administrador' ? 'Painel do Gestor / Titular do Sistema' : undefined}
    >
      <div>
        {!useApprovedQuickLayout && <p className="eyebrow">Contexto principal</p>}
        <h2 id="profile-panel-title">
          {titles[primaryCode] ?? 'Áreas autorizadas'}
        </h2>
      </div>
      <div className="home-profile-grid">
        {availableLinks.map((item) => (
          <Link
            className={`home-profile-card${
              useApprovedQuickLayout ? ` ${item.tone ?? 'quick-blue'}` : ''
            }`}
            to={item.path}
            key={item.path}
          >
            {useApprovedQuickLayout && item.icon && (
              <span className="home-profile-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}
