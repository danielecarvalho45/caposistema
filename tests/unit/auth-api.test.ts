import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  AccessAuthError,
  createAccessAuthApi,
} from '../../src/features/access/auth-api'
import type { Database } from '../../src/types/database'

function createClientMock(options: {
  functionData?: unknown
  functionError?: unknown
  functionPromise?: Promise<{ data: unknown; error: unknown }>
  session?: unknown
}) {
  return {
    functions: {
      invoke: options.functionPromise
        ? vi.fn().mockReturnValue(options.functionPromise)
        : vi.fn().mockResolvedValue({
            data: options.functionData,
            error: options.functionError ?? null,
          }),
    },
    auth: {
      setSession: vi.fn().mockResolvedValue({
        data: { session: options.session },
        error: null,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: { currentLevel: 'aal1', nextLevel: 'aal2' },
          error: null,
        }),
        listFactors: vi.fn().mockResolvedValue({
          data: {
            totp: [
              {
                id: 'factor-id',
                friendly_name: 'CAPO',
                status: 'verified',
              },
            ],
          },
          error: null,
        }),
        enroll: vi.fn().mockResolvedValue({
          data: {
            id: 'new-factor-id',
            totp: {
              qr_code: '<svg></svg>',
              secret: 'CAPO-TOTP-SECRET',
            },
          },
          error: null,
        }),
        challengeAndVerify: vi.fn().mockResolvedValue({
          data: {},
          error: null,
        }),
      },
    },
  } as unknown as SupabaseClient<Database>
}

describe('adaptador de autenticação CAPO', () => {
  it('troca os tokens da Edge Function por uma sessão Supabase', async () => {
    const session = { access_token: 'session-token' }
    const client = createClientMock({
      functionData: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
      session,
    })

    const result = await createAccessAuthApi(client).loginByUsername(
      'usuario',
      '654321',
    )

    expect(client.functions.invoke).toHaveBeenCalledWith('login-by-username', {
      body: { username: 'usuario', password: '654321' },
    })
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    })
    expect(result).toBe(session)
  })

  it('rejeita resposta sem tokens em vez de simular sessão', async () => {
    const client = createClientMock({
      functionData: { error: 'Usuário ou senha inválidos.' },
    })

    await expect(
      createAccessAuthApi(client).loginByUsername('usuario', '000000'),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AccessAuthError>>({
        name: 'AccessAuthError',
        message: 'Usuário ou senha inválidos.',
      }),
    )
    expect(client.auth.setSession).not.toHaveBeenCalled()
  })

  it('encerra a tentativa quando o serviço de autenticação não responde', async () => {
    const client = createClientMock({
      functionPromise: new Promise(() => undefined),
    })

    await expect(
      createAccessAuthApi(client, 1).loginByUsername('usuario', '654321'),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AccessAuthError>>({
        name: 'AccessAuthError',
        status: 504,
        code: 'auth_timeout',
      }),
    )
    expect(client.auth.setSession).not.toHaveBeenCalled()
  })

  it('encapsula fielmente as operações MFA/TOTP homologadas', async () => {
    const client = createClientMock({})
    const authApi = createAccessAuthApi(client)

    await expect(authApi.getMfaAssuranceLevel()).resolves.toEqual({
      currentLevel: 'aal1',
      nextLevel: 'aal2',
    })
    await expect(authApi.listMfaTotpFactors()).resolves.toEqual([
      {
        id: 'factor-id',
        friendlyName: 'CAPO',
        status: 'verified',
      },
    ])
    await expect(authApi.enrollMfaTotp()).resolves.toEqual({
      id: 'new-factor-id',
      qrCode: '<svg></svg>',
      secret: 'CAPO-TOTP-SECRET',
    })
    await expect(
      authApi.challengeAndVerifyMfa('factor-id', '123456'),
    ).resolves.toBeUndefined()

    expect(client.auth.mfa.enroll).toHaveBeenCalledWith({
      factorType: 'totp',
      friendlyName: 'CAPO',
    })
    expect(client.auth.mfa.challengeAndVerify).toHaveBeenCalledWith({
      factorId: 'factor-id',
      code: '123456',
    })
  })
})
