import { describe, expect, it } from 'vitest'
import {
  PRIMARY_CONTEXT_BLOCK_MESSAGE,
  validateAccessContext,
  validateSixDigitPassword,
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

  it('preserva a regra existente de senha numérica', () => {
    expect(validateSixDigitPassword('654321')).toBeNull()
    expect(validateSixDigitPassword('123456')).toBe(
      'Escolha uma senha pessoal diferente de 123456.',
    )
    expect(validateSixDigitPassword('abcdef')).toBe(
      'A nova senha deve conter exatamente 6 números.',
    )
  })
})
