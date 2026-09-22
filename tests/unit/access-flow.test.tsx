import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccessGate } from '../../src/components/auth/AccessGate'
import { AccessProvider } from '../../src/features/access/access-context'
import type { AccessAuthApi } from '../../src/features/access/auth-api'
import { AccessAuthError } from '../../src/features/access/auth-api'
import type { AccessContext } from '../../src/types/access'

const session = { access_token: 'test-token' } as Session

const context: AccessContext = {
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
    source: 'single_role',
    is_configured: false,
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
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

const acceptedTerm = {
  legal_term_id: 'term-id',
  title: 'Termo de Responsabilidade, Sigilo e Confidencialidade',
  version: '1',
  content: 'Conteúdo integral do termo.',
  effective_at: '2026-09-15T12:00:00Z',
  requires_reacceptance: false,
  accepted: true,
  accepted_at: '2026-09-15T12:01:00Z',
}

function createAuthApi(overrides: Partial<AccessAuthApi> = {}): AccessAuthApi {
  return {
    getSession: vi.fn().mockResolvedValue(null),
    loginByUsername: vi.fn().mockResolvedValue(session),
    getMfaAssuranceLevel: vi.fn().mockResolvedValue({
      currentLevel: 'aal2',
      nextLevel: 'aal2',
    }),
    listMfaTotpFactors: vi.fn().mockResolvedValue([]),
    enrollMfaTotp: vi.fn().mockResolvedValue({
      id: 'new-factor-id',
      qrCode: '<svg></svg>',
      secret: 'CAPO-TOTP-SECRET',
    }),
    challengeAndVerifyMfa: vi.fn().mockResolvedValue(undefined),
    verifyUsernamePassword: vi.fn().mockResolvedValue(undefined),
    resetPasswordForEmail: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    onAuthStateChange: vi.fn().mockReturnValue(() => undefined),
    ...overrides,
  }
}

function createRpcService(overrides: Record<string, unknown> = {}) {
  return {
    getCurrentLegalTerm: vi
      .fn()
      .mockResolvedValue({ status: 'success', data: acceptedTerm }),
    getMyAccessContext: vi
      .fn()
      .mockResolvedValue({ status: 'success', data: context }),
    acceptLegalTerm: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        acceptance_id: 'acceptance-id',
        accepted_at: '2026-09-15T12:01:00Z',
        already_accepted: false,
      },
    }),
    completeFirstAccess: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        professional_id: 'professional-id',
        first_access_completed: true,
        must_change_password: false,
        completed_at: '2026-09-15T12:02:00Z',
      },
    }),
    ...overrides,
  }
}

function renderFlow(authApi: AccessAuthApi, rpcService = createRpcService()) {
  render(
    <AccessProvider authApi={authApi} rpcService={rpcService}>
      <AccessGate>
        <h1>Área protegida</h1>
      </AccessGate>
    </AccessProvider>,
  )
  return rpcService
}

describe('entrada única CAPO', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => cleanup())

  it('entra com usuário e libera a aplicação pelo primary_context', async () => {
    const authApi = createAuthApi()
    vi.mocked(authApi.getSession)
      .mockResolvedValueOnce(null)
      .mockResolvedValue(session)
    renderFlow(authApi)
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' })
    const usernameInput = screen.getByLabelText('Usuário')
    const passwordInput = screen.getByLabelText('Senha')
    await user.clear(usernameInput)
    await user.clear(passwordInput)
    await user.type(usernameInput, 'usuario')
    await user.type(passwordInput, '654321')
    await user.click(screen.getByRole('button', { name: 'Entrar no CAPO' }))

    expect(
      await screen.findByRole('heading', { name: 'Área protegida' }),
    ).toBeVisible()
    expect(authApi.loginByUsername).toHaveBeenCalledWith('usuario', '654321')
  })

  it('mantém erro de login visível', async () => {
    const authApi = createAuthApi({
      loginByUsername: vi
        .fn()
        .mockRejectedValue(
          new AccessAuthError('Usuário ou senha inválidos.', { status: 401 }),
        ),
    })
    renderFlow(authApi)
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' })
    await user.type(screen.getByLabelText('Usuário'), 'usuario')
    await user.type(screen.getByLabelText('Senha'), '000000')
    await user.click(screen.getByRole('button', { name: 'Entrar no CAPO' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tentativa 1 de 3',
    )
  })

  it('cadastra TOTP e somente consulta Termo e contexto após confirmar aal2', async () => {
    const getMfaAssuranceLevel = vi
      .fn()
      .mockResolvedValueOnce({ currentLevel: 'aal1', nextLevel: 'aal1' })
      .mockResolvedValue({ currentLevel: 'aal2', nextLevel: 'aal2' })
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
      getMfaAssuranceLevel,
    })
    const rpcService = createRpcService()
    renderFlow(authApi, rpcService)
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Proteção em duas etapas' })
    expect(screen.getByRole('img', { name: /QR Code/ })).toBeVisible()
    expect(screen.getByText('CAPO-TOTP-SECRET')).toBeVisible()
    expect(rpcService.getCurrentLegalTerm).not.toHaveBeenCalled()
    expect(rpcService.getMyAccessContext).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Código de 6 números'), '654321')
    await user.click(
      screen.getByRole('button', { name: 'Validar e continuar' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Área protegida' }),
    ).toBeVisible()
    expect(authApi.enrollMfaTotp).toHaveBeenCalledOnce()
    expect(authApi.challengeAndVerifyMfa).toHaveBeenCalledWith(
      'new-factor-id',
      '654321',
    )
    expect(getMfaAssuranceLevel).toHaveBeenCalledTimes(2)
    expect(getMfaAssuranceLevel.mock.invocationCallOrder[1]).toBeLessThan(
      vi.mocked(rpcService.getCurrentLegalTerm).mock.invocationCallOrder[0],
    )
    expect(
      vi.mocked(rpcService.getCurrentLegalTerm).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(rpcService.getMyAccessContext).mock.invocationCallOrder[0],
    )
  })

  it('valida um fator TOTP existente antes de liberar o Termo', async () => {
    const getMfaAssuranceLevel = vi
      .fn()
      .mockResolvedValueOnce({ currentLevel: 'aal1', nextLevel: 'aal2' })
      .mockResolvedValue({ currentLevel: 'aal2', nextLevel: 'aal2' })
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
      getMfaAssuranceLevel,
      listMfaTotpFactors: vi.fn().mockResolvedValue([
        {
          id: 'verified-factor-id',
          friendlyName: 'CAPO',
          status: 'verified',
        },
      ]),
    })
    const rpcService = createRpcService()
    renderFlow(authApi, rpcService)
    const user = userEvent.setup()

    await screen.findByRole('heading', {
      name: 'Verificação em duas etapas',
    })
    expect(rpcService.getCurrentLegalTerm).not.toHaveBeenCalled()
    expect(rpcService.getMyAccessContext).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Código de 6 números'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(
      await screen.findByRole('heading', { name: 'Área protegida' }),
    ).toBeVisible()
    expect(authApi.listMfaTotpFactors).toHaveBeenCalledOnce()
    expect(authApi.enrollMfaTotp).not.toHaveBeenCalled()
    expect(authApi.challengeAndVerifyMfa).toHaveBeenCalledWith(
      'verified-factor-id',
      '123456',
    )
  })

  it('mantém Termo e contexto bloqueados quando o código TOTP é inválido', async () => {
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
      getMfaAssuranceLevel: vi
        .fn()
        .mockResolvedValue({ currentLevel: 'aal1', nextLevel: 'aal2' }),
      listMfaTotpFactors: vi.fn().mockResolvedValue([
        {
          id: 'verified-factor-id',
          friendlyName: 'CAPO',
          status: 'verified',
        },
      ]),
    })
    const rpcService = createRpcService()
    renderFlow(authApi, rpcService)
    const user = userEvent.setup()

    await screen.findByRole('heading', {
      name: 'Verificação em duas etapas',
    })
    await user.type(screen.getByLabelText('Código de 6 números'), '123')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe o código de 6 números',
    )
    expect(authApi.challengeAndVerifyMfa).not.toHaveBeenCalled()
    expect(rpcService.getCurrentLegalTerm).not.toHaveBeenCalled()
    expect(rpcService.getMyAccessContext).not.toHaveBeenCalled()
  })

  it('não avança após o desafio enquanto a sessão continuar em aal1', async () => {
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
      getMfaAssuranceLevel: vi
        .fn()
        .mockResolvedValue({ currentLevel: 'aal1', nextLevel: 'aal2' }),
      listMfaTotpFactors: vi.fn().mockResolvedValue([
        {
          id: 'verified-factor-id',
          friendlyName: 'CAPO',
          status: 'verified',
        },
      ]),
    })
    const rpcService = createRpcService()
    renderFlow(authApi, rpcService)
    const user = userEvent.setup()

    await screen.findByRole('heading', {
      name: 'Verificação em duas etapas',
    })
    await user.type(screen.getByLabelText('Código de 6 números'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    await waitFor(() =>
      expect(authApi.getMfaAssuranceLevel).toHaveBeenCalledTimes(2),
    )
    expect(
      screen.getByRole('heading', { name: 'Verificação em duas etapas' }),
    ).toBeVisible()
    expect(rpcService.getCurrentLegalTerm).not.toHaveBeenCalled()
    expect(rpcService.getMyAccessContext).not.toHaveBeenCalled()
  })

  it('solicita recuperação sem revelar se o e-mail existe', async () => {
    const authApi = createAuthApi()
    renderFlow(authApi)
    const user = userEvent.setup()

    await screen.findByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' })
    await user.click(
      screen.getByRole('button', { name: 'Esqueceu sua senha?' }),
    )
    await user.type(
      screen.getByLabelText('E-mail cadastrado'),
      'conta@capo.org',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar instruções' }))

    expect(
      await screen.findByRole('heading', { name: '✉ Instruções enviadas' }),
    ).toBeVisible()
    expect(screen.getByText(/Solicitação 1 de 2/)).toBeVisible()
    expect(authApi.resetPasswordForEmail).toHaveBeenCalledWith(
      'conta@capo.org',
      expect.stringContaining('capo_recovery=1'),
    )
  })

  it('exige e registra o termo vigente antes do contexto', async () => {
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
    })
    const rpcService = createRpcService({
      getCurrentLegalTerm: vi.fn().mockResolvedValue({
        status: 'success',
        data: { ...acceptedTerm, accepted: false, accepted_at: null },
      }),
    })
    renderFlow(authApi, rpcService)
    const user = userEvent.setup()

    await screen.findByRole('heading', {
      name: 'Termo de Responsabilidade, Sigilo e Confidencialidade',
    })
    const acceptButton = screen.getByRole('button', {
      name: 'Aceitar e acessar o CAPO',
    })
    expect(acceptButton).toBeDisabled()
    await user.click(screen.getByRole('checkbox'))
    await user.click(acceptButton)

    expect(
      await screen.findByRole('heading', { name: 'Área protegida' }),
    ).toBeVisible()
    expect(rpcService.acceptLegalTerm).toHaveBeenCalledWith('term-id')
  })

  it('bloqueia primary_context ambíguo sem escolher roles[0]', async () => {
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
    })
    renderFlow(
      authApi,
      createRpcService({
        getMyAccessContext: vi.fn().mockResolvedValue({
          status: 'success',
          data: {
            ...context,
            roles: [
              ...context.roles,
              { code: 'coordenador', name: 'Coordenador' },
            ],
            primary_context: {
              role_id: null,
              code: null,
              name: null,
              source: 'ambiguous',
              is_configured: false,
              requires_configuration: true,
            },
          },
        }),
      }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Acesso bloqueado' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('contexto principal')
    expect(screen.queryByText('Área protegida')).not.toBeInTheDocument()
  })

  it('descarta sessão expirada e retorna ao login', async () => {
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
    })
    renderFlow(
      authApi,
      createRpcService({
        getCurrentLegalTerm: vi.fn().mockResolvedValue({
          status: 'error',
          error: {
            code: 'PGRST301',
            message: 'JWT expired',
          },
        }),
      }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Bem-vindo ao Sistema CAPO' }),
    ).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Sua sessão expirou')
    expect(authApi.signOut).toHaveBeenCalledWith('local')
  })

  it('conclui primeiro acesso e recarrega o contexto', async () => {
    const firstAccessContext = {
      ...context,
      first_access_completed: false,
      must_change_password: true,
    }
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
    })
    const getMyAccessContext = vi
      .fn()
      .mockResolvedValueOnce({ status: 'success', data: firstAccessContext })
      .mockResolvedValue({ status: 'success', data: context })
    const rpcService = createRpcService({ getMyAccessContext })
    renderFlow(authApi, rpcService)
    const user = userEvent.setup()

    await screen.findByRole('heading', {
      name: 'Alterar senha do primeiro acesso',
    })
    await user.type(screen.getByLabelText('Senha atual'), '111111')
    await user.type(screen.getByLabelText('Nova senha de 6 números'), '654321')
    await user.click(
      screen.getByRole('button', { name: 'Concluir primeiro acesso' }),
    )

    await waitFor(() => expect(getMyAccessContext).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByRole('heading', { name: 'Área protegida' }),
    ).toBeVisible()
    expect(authApi.verifyUsernamePassword).toHaveBeenCalledWith(
      'usuario',
      '111111',
    )
    expect(authApi.updatePassword).toHaveBeenCalledWith('654321')
    expect(rpcService.completeFirstAccess).toHaveBeenCalled()
  })

  it('informa senha atual incorreta no primeiro acesso', async () => {
    const firstAccessContext = {
      ...context,
      first_access_completed: false,
      must_change_password: true,
    }
    const authApi = createAuthApi({
      getSession: vi.fn().mockResolvedValue(session),
      verifyUsernamePassword: vi
        .fn()
        .mockRejectedValue(new AccessAuthError('Usuário ou senha inválidos.')),
    })
    renderFlow(
      authApi,
      createRpcService({
        getMyAccessContext: vi
          .fn()
          .mockResolvedValue({ status: 'success', data: firstAccessContext }),
      }),
    )
    const user = userEvent.setup()

    await screen.findByRole('heading', {
      name: 'Alterar senha do primeiro acesso',
    })
    await user.type(screen.getByLabelText('Senha atual'), '111111')
    await user.type(screen.getByLabelText('Nova senha de 6 números'), '654321')
    await user.click(
      screen.getByRole('button', { name: 'Concluir primeiro acesso' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Senha atual incorreta.',
    )
    expect(authApi.updatePassword).not.toHaveBeenCalled()
  })
})
