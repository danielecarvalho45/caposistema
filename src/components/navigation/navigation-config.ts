import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'

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
  { path: '/atuacao', label: 'Minha atuação', icon: '+', group: 'principal' },
  { path: '/nutricao', label: 'Nutrição', icon: '🥗', group: 'principal' },
  { path: '/assistencia-social', label: 'Assistência Social', icon: '♡', group: 'principal' },
  { path: '/familiar-cuidador', label: 'Familiar / Cuidador', icon: '♧', group: 'principal' },
  { path: '/fila', label: 'Fila', icon: '📋', group: 'principal' },
  { path: '/faltosos', label: 'Faltosos', icon: '⚑', group: 'principal' },
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
  return navigationItems.filter(
    (item) =>
      (group === undefined || item.group === group) &&
      canAccessAppRoute(accessContext, item.path),
  )
}
