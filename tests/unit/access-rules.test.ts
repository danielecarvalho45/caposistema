import { describe, expect, it } from 'vitest'
import {
  PRIMARY_CONTEXT_BLOCK_MESSAGE,
  validateAccessContext,
  validateSupabasePassword,
} from '../../src/features/access/access-rules'

const validContext = {
  is_active: true,
  roles: [{ code: 'coordenador', name: 'Coordenador' }],
  primary_context: {
    role_id: 'role-id',
    code: 'coordenador',
    name: 'Coordenador',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
}

describe('regras de acesso', () => {
  it('aceita o contexto principal devolvido pelo backend', () => {
    expect(validateAccessContext(validContext)).toBeNull()
  })

  it('bloqueia contexto ausente, ambíguo ou fora dos papéis ativos', () => {
    expect(
      validateAccessContext({
        ...validContext,
        primary_context: {
          ...validContext.primary_context,
          role_id: null,
          code: null,
          source: 'ambiguous',
          requires_configuration: true,
        },
      }),
    ).toBe(PRIMARY_CONTEXT_BLOCK_MESSAGE)

    expect(
      validateAccessContext({
        ...validContext,
        primary_context: {
          ...validContext.primary_context,
          code: 'administrador',
        },
      }),
    ).toBe(PRIMARY_CONTEXT_BLOCK_MESSAGE)
  })

  it('bloqueia conta inativa e conta sem papel', () => {
    expect(validateAccessContext({ ...validContext, is_active: false })).toBe(
      'A conta CAPO está inativa.',
    )
    expect(validateAccessContext({ ...validContext, roles: [] })).toBe(
      'Nenhum perfil de acesso ativo foi localizado para esta conta.',
    )
  })

  it('valida a política de senha exigida pelo Supabase', () => {
    expect(validateSupabasePassword('Capo2026')).toBeNull()
    expect(validateSupabasePassword('Capo26')).toBe(
      'A senha deve ter pelo menos 8 caracteres.',
    )
    expect(validateSupabasePassword('capo2026')).toBe(
      'A senha deve conter pelo menos uma letra minúscula, uma letra maiúscula e um número.',
    )
  })
})
