import type { AccessContext } from '../../types/access'

export type ProfessionalScreenKind =
  | 'clinico_geral'
  | 'nutricao'
  | 'assistencia_social'
  | 'assistencial_padrao'

export function normalizeProfessionalSpecialty(value: string | null | undefined) {
  return value
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase() ?? ''
}

export function effectiveProfessionalSpecialtyName(accessContext: AccessContext) {
  if (
    accessContext.is_homologation_account &&
    accessContext.homologation_context?.enabled &&
    accessContext.homologation_context.role_code === 'profissional' &&
    accessContext.homologation_context.specialty_name
  ) {
    return accessContext.homologation_context.specialty_name
  }

  if (accessContext.primary_specialty_name) {
    return accessContext.primary_specialty_name
  }

  const primary = (accessContext.specialties ?? []).find(
    (specialty) => specialty.is_primary,
  )
  return primary?.specialty_name ?? accessContext.specialties?.[0]?.specialty_name ?? null
}

export function resolveProfessionalScreenKind(
  accessContext: AccessContext,
): ProfessionalScreenKind {
  const specialty = normalizeProfessionalSpecialty(
    effectiveProfessionalSpecialtyName(accessContext),
  )

  if (specialty === 'clinica geral') return 'clinico_geral'
  if (specialty === 'nutricao') return 'nutricao'
  if (specialty === 'assistencia social') return 'assistencia_social'
  return 'assistencial_padrao'
}
