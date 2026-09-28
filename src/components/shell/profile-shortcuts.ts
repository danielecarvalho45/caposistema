import type { AccessContext } from '../../types/access'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import { authorizedNavigationItems } from '../navigation/navigation-config'

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
  if (secondaryRoles.has('profissional') && accessContext.is_active && accessContext.professional_id) {
    const specialties = [
      accessContext.primary_specialty_name,
      ...(accessContext.specialties ?? []).map((specialty) => specialty.specialty_name),
    ].filter((name): name is string => Boolean(name))
      .map((name) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase())
    const hasNutrition = specialties.includes('nutricao')
    const hasSocial = specialties.includes('assistencia social')
    const hasGeneral = specialties.some((name) => name !== 'nutricao' && name !== 'assistencia social')
    const professionalPaths: readonly AppRoute[] = ['/nutricao', '/assistencia-social']
    const professionalItems = authorizedNavigationItems(accessContext, 'principal')
      .filter((item) => professionalPaths.includes(item.path) && (
        item.path === '/nutricao' ? hasNutrition
          : item.path === '/assistencia-social' ? hasSocial
            : false
      ))
    candidates.push(...professionalItems.map(({ path, label }) => ({ path, label })))
    if (hasGeneral || professionalItems.length === 0) {
      candidates.push({ path: '/agenda', label: 'Minha Agenda' })
    }
  }

  return candidates.filter(({ path }) => canAccessAppRoute(accessContext, path))
}
