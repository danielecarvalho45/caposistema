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

export function validateSixDigitPassword(password: string): string | null {
  if (!/^\d{6}$/.test(password)) {
    return 'A nova senha deve conter exatamente 6 números.'
  }
  if (password === '123456') {
    return 'Escolha uma senha pessoal diferente de 123456.'
  }
  return null
}
