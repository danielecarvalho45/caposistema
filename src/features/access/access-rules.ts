import type { AccessContext } from '../../types/access'

export const PRIMARY_CONTEXT_BLOCK_MESSAGE =
  'O contexto principal desta conta está ausente, inválido ou ambíguo. Solicite ao administrador a configuração do contexto principal.'

export function validateAccessContext(
  context: Pick<AccessContext, 'is_active' | 'roles' | 'primary_context'>,
): string | null {
  if (!context.is_active) return 'A conta CAPO está inativa.'
  if (context.roles.length === 0) {
    return 'Nenhum perfil de acesso ativo foi localizado para esta conta.'
  }

  const primary = context.primary_context
  if (
    primary.requires_configuration ||
    !primary.code ||
    !primary.role_id ||
    !context.roles.some((role) => role.code === primary.code)
  ) {
    return PRIMARY_CONTEXT_BLOCK_MESSAGE
  }

  return null
}

export function validateSupabasePassword(password: string): string | null {
  if (password.length < 8) {
    return 'A senha deve ter pelo menos 8 caracteres.'
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'A senha deve conter pelo menos uma letra minúscula, uma letra maiúscula e um número.'
  }
  return null
}
