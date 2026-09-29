import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { resolveProfessionalScreenKind } from '../../features/professional/professional-screen'

export type NavigationItem = Readonly<{
  path: AppRoute
  label: string
  icon: string
  group: 'principal' | 'gestao' | 'tecnica'
}>

export const navigationItems: readonly NavigationItem[] = [
  { path: '/', label: 'Início', icon: '⌂', group: 'principal' },
  { path: '/pacientes', label: 'Pacientes', icon: '👥', group: 'principal' },
  { path: '/agenda', label: 'Agenda Geral', icon: '🗓', group: 'principal' },
  { path: '/minha-agenda/gerenciar', label: 'Gerenciar minha agenda', icon: '⏱', group: 'principal' },
  { path: '/minha-agenda/solicitar-alteracao', label: 'Solicitar ao Coordenador', icon: '▤', group: 'principal' },
  { path: '/nutricao', label: 'Nutrição', icon: '◉', group: 'principal' },
  { path: '/assistencia-social', label: 'Acompanhamento Social', icon: '♡', group: 'principal' },
  { path: '/familiar-cuidador', label: 'Familiar / Cuidador', icon: '♧', group: 'principal' },
  { path: '/luto', label: 'Luto', icon: '◇', group: 'principal' },
  { path: '/fila', label: 'Fila', icon: '📋', group: 'principal' },
  { path: '/faltosos', label: 'Faltosos', icon: '⚑', group: 'principal' },
  { path: '/busca-ativa', label: 'Busca Ativa', icon: '⌕', group: 'principal' },
  { path: '/solicitacoes', label: 'Solicitações', icon: '▤', group: 'principal' },
  { path: '/transporte', label: 'Transporte', icon: '⇄', group: 'principal' },
  { path: '/receita', label: 'Renovação de Receita', icon: '💊', group: 'principal' },
  { path: '/encaminhamentos', label: 'Encaminhamentos', icon: '↗', group: 'principal' },
  { path: '/odontologia', label: 'Odontologia', icon: '🦷', group: 'principal' },
  { path: '/encerramentos', label: 'Encerramentos', icon: '✓', group: 'principal' },
  { path: '/notificacoes', label: 'Notificações', icon: '●', group: 'gestao' },
  { path: '/suporte', label: 'Suporte', icon: '?', group: 'gestao' },
  { path: '/relatorios', label: 'Relatórios', icon: '▥', group: 'gestao' },
  { path: '/tecnica', label: 'Área técnica', icon: '⚙', group: 'tecnica' },
]

export function authorizedNavigationItems(
  accessContext: AccessContext,
  group?: NavigationItem['group'],
) {
  const professionalScreen = resolveProfessionalScreenKind(accessContext)

  return navigationItems.filter(
    (item) => {
      if (group !== undefined && item.group !== group) return false
      if (!canAccessAppRoute(accessContext, item.path)) return false
      if (
        item.path === '/atuacao' &&
        (professionalScreen === 'nutricao' ||
          professionalScreen === 'assistencia_social')
      ) return false
      if (
        item.path === '/encaminhamentos' &&
        accessContext.roles.some((role) => role.code === 'profissional') &&
        !accessContext.roles.some((role) =>
          ['administrador', 'coordenador', 'administrativo_operacional'].includes(role.code),
        ) &&
        !accessContext.capabilities.includes('encaminhamento_interprofissional')
      ) return false
      return true
    },
  ).map((item) =>
    item.path === '/agenda' &&
    accessContext.primary_context.code === 'profissional'
      ? { ...item, label: 'Minha Agenda' }
      : item,
  )
}
