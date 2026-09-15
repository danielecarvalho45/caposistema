import { describe, expect, it, vi } from 'vitest'
import {
  createRpcService,
  loadingState,
  type RpcTransport,
} from '../../src/lib/supabase/rpc'

const accessContext = {
  user_account_id: 'account-id',
  username: 'usuario',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Nome real',
  function_title: null,
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [
    { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
  ],
  capabilities: ['preencher_solicitacao_transporte'],
  primary_context: {
    role_id: 'role-id',
    code: 'administrativo_operacional',
    name: 'Administrativo Operacional',
    source: 'configured',
    is_configured: true,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: 'professional-id',
    full_name: 'Nome real',
    function_title: null,
    roles: [
      {
        code: 'administrativo_operacional',
        name: 'Administrativo Operacional',
      },
    ],
    primary_context: {
      role_id: 'role-id',
      code: 'administrativo_operacional',
      name: 'Administrativo Operacional',
      source: 'configured',
      is_configured: true,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

function transportWith(data: unknown, error: unknown = null): RpcTransport {
  return vi.fn().mockResolvedValue({ data, error })
}

describe('camada de RPCs CAPO', () => {
  it('expõe o estado inicial loading', () => {
    expect(loadingState()).toEqual({ status: 'loading' })
  })

  it('valida e retorna o contexto de acesso', async () => {
    const result = await createRpcService(
      transportWith(accessContext),
    ).getMyAccessContext()

    expect(result).toMatchObject({
      status: 'success',
      data: {
        primary_context: { code: 'administrativo_operacional' },
        capabilities: ['preencher_solicitacao_transporte'],
      },
    })
  })

  it('não converte silenciosamente contrato inesperado', async () => {
    const result = await createRpcService(
      transportWith({ ...accessContext, roles: 'administrador' }),
    ).getMyAccessContext()

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'contract', operation: 'get_my_access_context' },
    })
  })

  it('diferencia resposta vazia de erro', async () => {
    const empty = await createRpcService(
      transportWith([]),
    ).getCurrentLegalTerm()
    const failed = await createRpcService(
      transportWith(null, {
        code: '42501',
        message: 'Usuário não autenticado.',
      }),
    ).getCurrentLegalTerm()

    expect(empty).toEqual({ status: 'empty' })
    expect(failed).toMatchObject({
      status: 'error',
      error: { kind: 'authorization', code: '42501' },
    })
  })

  it('valida o termo vigente retornado pela RPC física', async () => {
    const result = await createRpcService(
      transportWith([
        {
          legal_term_id: 'term-id',
          title: 'Termo vigente',
          version: '1',
          content: 'Conteúdo integral',
          effective_at: '2026-09-15T12:00:00Z',
          requires_reacceptance: true,
          accepted: false,
          accepted_at: null,
        },
      ]),
    ).getCurrentLegalTerm()

    expect(result).toMatchObject({
      status: 'success',
      data: { legal_term_id: 'term-id', accepted: false },
    })
  })

  it('envia somente o argumento físico ao aceitar o termo', async () => {
    const transport = transportWith([
      {
        acceptance_id: 'acceptance-id',
        accepted_at: '2026-09-15T12:00:00Z',
        already_accepted: false,
      },
    ])
    const result = await createRpcService(transport).acceptLegalTerm('term-id')

    expect(transport).toHaveBeenCalledWith('accept_legal_term', {
      p_legal_term_id: 'term-id',
    })
    expect(result).toMatchObject({ status: 'success' })
  })

  it('valida o resultado de conclusão do primeiro acesso', async () => {
    const result = await createRpcService(
      transportWith({
        professional_id: 'professional-id',
        first_access_completed: true,
        must_change_password: false,
        completed_at: '2026-09-15T12:00:00Z',
      }),
    ).completeFirstAccess()

    expect(result).toMatchObject({
      status: 'success',
      data: { first_access_completed: true, must_change_password: false },
    })
  })

  it('preserva falha de rede como erro rastreável', async () => {
    const transport: RpcTransport = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await createRpcService(transport).getMyAccessContext()

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'network', message: 'Failed to fetch' },
    })
  })
})
