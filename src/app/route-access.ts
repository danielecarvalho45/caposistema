import type { AccessContext } from '../types/access'

export const KNOWN_APP_ROUTES = [
  '/',
  '/pacientes',
  '/agenda',
  '/minha-agenda/solicitar-alteracao',
  '/atuacao',
  '/nutricao',
  '/assistencia-social',
  '/luto',
  '/familiar-cuidador',
  '/fila',
  '/faltosos',
  '/solicitacoes',
  '/transporte',
  '/receita',
  '/encaminhamentos',
  '/odontologia',
  '/notificacoes',
  '/suporte',
  '/tecnica',
  '/relatorios',
  '/encerramentos',
  '/coordenacao',
  '/coordenacao/busca-ativa',
  '/gestor/social',
  '/gestor/luto',
  '/coordenacao/timeline',
  '/coordenacao/auditoria',
  '/gestor/equipe',
  '/gestor/administracao',
  '/gestor/timeline',
  '/gestor/auditoria',
  '/gestor/suporte',
  '/gestor/fluxos',
  '/gestor/busca-ativa',
  '/gestor/familiares',
  '/gestor/operacional',
  '/em-construcao',
] as const

export type AppRoute = (typeof KNOWN_APP_ROUTES)[number]

export function isKnownAppRoute(path: string): path is AppRoute {
  return (KNOWN_APP_ROUTES as readonly string[]).includes(path)
}

function isProfessionalAssistentialRole(roleCode: string | null | undefined) {
  return (
    roleCode === 'profissional' ||
    roleCode === 'medico_clinico_geral' ||
    roleCode === 'nutricao' ||
    roleCode === 'assistencia_social' ||
    roleCode === 'assistente_social' ||
    roleCode === 'social'
  )
}

function hasRole(accessContext: AccessContext, roles: readonly string[]) {
  return accessContext.roles.some((role) => roles.includes(role.code))
}

function hasProfessionalAssistentialRole(accessContext: AccessContext) {
  return hasRole(accessContext, [
    'profissional',
    'medico_clinico_geral',
    'nutricao',
    'assistencia_social',
    'assistente_social',
    'social',
  ])
}

function hasActiveProfessionalContext(accessContext: AccessContext) {
  if (!accessContext.is_active || !accessContext.professional_id) return false

  const primary = accessContext.primary_context
  if (
    primary.requires_configuration ||
    !primary.code ||
    !primary.role_id ||
    !(
      hasRole(accessContext, [
        'profissional',
        'medico_clinico_geral',
        'nutricao',
        'assistencia_social',
        'assistente_social',
        'social',
      ]) ||
      isProfessionalAssistentialRole(primary.code)
    )
  ) {
    return false
  }

  return true
}

export function canAccessAppRoute(
  accessContext: AccessContext,
  route: AppRoute,
) {
  switch (route) {
    case '/':
    case '/em-construcao':
    case '/notificacoes':
      return true
    case '/suporte':
      return accessContext.primary_context.code !== 'administrador_tecnico'
    case '/gestor/social':
    case '/gestor/luto':
    case '/gestor/equipe':
    case '/gestor/administracao':
    case '/gestor/timeline':
    case '/gestor/auditoria':
    case '/gestor/suporte':
    case '/gestor/fluxos':
    case '/gestor/busca-ativa':
    case '/gestor/familiares':
    case '/gestor/operacional':
      return hasRole(accessContext, ['administrador'])
    case '/coordenacao':
    case '/coordenacao/timeline':
    case '/coordenacao/auditoria':
    case '/coordenacao/busca-ativa':
      return hasRole(accessContext, ['administrador', 'coordenador'])
    case '/pacientes':
      return hasRole(accessContext, ['administrador', 'coordenador', 'administrativo_operacional'])
    case '/agenda':
      return (
        hasRole(accessContext, [
          'administrador',
          'administrativo_operacional',
          'coordenador',
        ]) ||
        (Boolean(accessContext.professional_id) &&
          hasProfessionalAssistentialRole(accessContext))
      )
    case '/minha-agenda/solicitar-alteracao':
      return accessContext.is_active && Boolean(accessContext.professional_id) &&
        hasRole(accessContext, ['profissional'])
    case '/atuacao':
      return (
        Boolean(accessContext.professional_id) &&
        hasProfessionalAssistentialRole(accessContext)
      )
    case '/nutricao':
      return (
        accessContext.is_active && Boolean(accessContext.professional_id) &&
        hasRole(accessContext, ['profissional'])
      )
    case '/relatorios':
      return (
        hasRole(accessContext, [
          'administrador',
          'profissional',
          'medico_clinico_geral',
          'nutricao',
          'coordenador',
          'assistencia_social',
          'assistente_social',
          'social',
        ]) &&
        (hasRole(accessContext, ['administrador', 'coordenador']) ||
          Boolean(accessContext.professional_id))
      )
    case '/assistencia-social':
    case '/familiar-cuidador':
      return hasActiveProfessionalContext(accessContext)
    case '/luto':
      return accessContext.is_active && Boolean(accessContext.professional_id) &&
        hasRole(accessContext, ['profissional'])
    case '/fila':
      return (
        hasRole(accessContext, [
          'administrador',
          'administrativo_operacional',
          'coordenador',
        ]) ||
        (Boolean(accessContext.professional_id) &&
          hasRole(accessContext, ['profissional']))
      )
    case '/faltosos':
      return hasRole(accessContext, [
        'administrador',
        'coordenador',
        'administrativo_operacional',
      ])
    case '/solicitacoes':
      return (
        (Boolean(accessContext.professional_id) && hasProfessionalAssistentialRole(accessContext)) ||
        hasRole(accessContext, [
          'administrador',
          'coordenador',
          'administrativo_operacional',
        ])
      )
    case '/encaminhamentos':
      return (
        hasRole(accessContext, [
          'administrador',
          'coordenador',
          'administrativo_operacional',
        ]) ||
        (Boolean(accessContext.professional_id) &&
          accessContext.capabilities.includes('encaminhamento_interprofissional'))
      )
    case '/encerramentos':
      return (
        hasRole(accessContext, [
          'administrador',
          'coordenador',
          'administrativo_operacional',
        ]) ||
        (Boolean(accessContext.professional_id) &&
          hasRole(accessContext, [
            'profissional',
            'assistencia_social',
            'assistente_social',
            'assistencia-social',
            'social',
          ]))
      )
    case '/transporte':
      return hasRole(accessContext, ['administrador', 'administrativo_operacional']) ||
        accessContext.capabilities.includes('preencher_solicitacao_transporte')
    case '/receita':
      return hasRole(accessContext, ['administrador', 'administrativo_operacional']) ||
        accessContext.capabilities.includes('renovacao_receita')
    case '/odontologia':
      return hasRole(accessContext, ['administrador', 'administrativo_operacional']) ||
        accessContext.capabilities.includes('emitir_encaminhamento_odontologico_externo')
    case '/tecnica':
      return hasRole(accessContext, ['administrador', 'administrador_tecnico'])
  }
}
