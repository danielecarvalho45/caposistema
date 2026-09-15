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
  session?: unknown
}) {
  return {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: options.functionData,
        error: options.functionError ?? null,
      }),
    },
    auth: {
      setSession: vi.fn().mockResolvedValue({
        data: { session: options.session },
        error: null,
      }),
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
})
