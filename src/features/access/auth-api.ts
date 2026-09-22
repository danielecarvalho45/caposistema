import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from '@supabase/supabase-js'
import type { Database } from '../../types/database'
import { getSupabaseClient } from '../../lib/supabase/client'

type LoginResponse = {
  access_token?: unknown
  refresh_token?: unknown
  error?: unknown
  message?: unknown
  code?: unknown
}

const AUTH_REQUEST_TIMEOUT_MS = 30_000

export class AccessAuthError extends Error {
  readonly status: number
  readonly code?: string

  constructor(
    message: string,
    options: { status?: number; code?: string; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'AccessAuthError'
    this.status = options.status ?? 0
    this.code = options.code
  }
}

export type MfaAssuranceLevel = Readonly<{
  currentLevel: string | null
  nextLevel: string | null
}>

export type MfaTotpFactor = Readonly<{
  id: string
  friendlyName: string | null
  status: string
}>

export type MfaTotpEnrollment = Readonly<{
  id: string
  qrCode: string
  secret: string
}>

async function functionError(
  error: unknown,
  data: unknown,
): Promise<AccessAuthError> {
  const errorRecord =
    typeof error === 'object' && error !== null
      ? (error as Record<string, unknown>)
      : {}
  const context = errorRecord.context
  let payload =
    typeof data === 'object' && data !== null
      ? (data as Record<string, unknown>)
      : undefined

  if (
    !payload &&
    typeof context === 'object' &&
    context !== null &&
    'clone' in context &&
    typeof context.clone === 'function'
  ) {
    try {
      const cloned = context.clone() as Response
      payload = (await cloned.json()) as Record<string, unknown>
    } catch {
      // A resposta HTTP original ainda será representada pelo erro do SDK.
    }
  }

  const contextStatus =
    typeof context === 'object' && context !== null && 'status' in context
      ? Number(context.status)
      : 0
  const status =
    contextStatus || Number(errorRecord.status ?? payload?.status ?? 0) || 0
  const message = String(
    payload?.error ??
      payload?.message ??
      errorRecord.message ??
      'Falha na autenticação.',
  )
  const code = payload?.code ?? errorRecord.code

  return new AccessAuthError(message, {
    status,
    code: typeof code === 'string' ? code : undefined,
    cause: error,
  })
}

function parseLoginResponse(value: unknown): {
  access_token: string
  refresh_token: string
} {
  const response =
    typeof value === 'object' && value !== null
      ? (value as LoginResponse)
      : undefined

  if (response?.error) {
    throw new AccessAuthError(String(response.error), {
      code: typeof response.code === 'string' ? response.code : undefined,
    })
  }
  if (
    typeof response?.access_token !== 'string' ||
    typeof response.refresh_token !== 'string'
  ) {
    throw new AccessAuthError(
      typeof response?.message === 'string'
        ? response.message
        : 'Usuário ou senha inválidos.',
    )
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
  }
}

async function withAuthTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new AccessAuthError(
              'Tempo limite do serviço de autenticação excedido.',
              { status: 504, code: 'auth_timeout' },
            ),
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}

export type AccessAuthApi = Readonly<{
  getSession: () => Promise<Session | null>
  loginByUsername: (username: string, password: string) => Promise<Session>
  getMfaAssuranceLevel: () => Promise<MfaAssuranceLevel>
  listMfaTotpFactors: () => Promise<readonly MfaTotpFactor[]>
  enrollMfaTotp: () => Promise<MfaTotpEnrollment>
  challengeAndVerifyMfa: (factorId: string, code: string) => Promise<void>
  verifyUsernamePassword: (username: string, password: string) => Promise<void>
  resetPasswordForEmail: (email: string, redirectTo: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  signOut: (scope?: 'local' | 'global') => Promise<void>
  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ) => () => void
}>

export function createAccessAuthApi(
  client: SupabaseClient<Database>,
  requestTimeoutMs = AUTH_REQUEST_TIMEOUT_MS,
): AccessAuthApi {
  async function requestLogin(username: string, password: string) {
    const { data, error } = await withAuthTimeout(
      client.functions.invoke('login-by-username', {
        body: { username, password },
      }),
      requestTimeoutMs,
    )
    if (error) throw await functionError(error, data)
    return parseLoginResponse(data)
  }

  return {
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      return data.session
    },
    async loginByUsername(username, password) {
      const tokens = await requestLogin(username, password)
      const { data, error } = await client.auth.setSession(tokens)
      if (error) throw error
      if (!data.session) throw new AccessAuthError('Sessão não iniciada.')
      return data.session
    },
    async getMfaAssuranceLevel() {
      const { data, error } =
        await client.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) throw error
      return {
        currentLevel: data.currentLevel,
        nextLevel: data.nextLevel,
      }
    },
    async listMfaTotpFactors() {
      const { data, error } = await client.auth.mfa.listFactors()
      if (error) throw error
      return data.totp.map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name ?? null,
        status: factor.status,
      }))
    },
    async enrollMfaTotp() {
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'CAPO',
      })
      if (error) throw error
      return {
        id: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      }
    },
    async challengeAndVerifyMfa(factorId, code) {
      const { error } = await client.auth.mfa.challengeAndVerify({
        factorId,
        code,
      })
      if (error) throw error
    },
    async verifyUsernamePassword(username, password) {
      await requestLogin(username, password)
    },
    async resetPasswordForEmail(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (error) throw error
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw error
    },
    async signOut(scope = 'global') {
      const { error } = await client.auth.signOut({ scope })
      if (error) throw error
    },
    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange(callback)
      return () => data.subscription.unsubscribe()
    },
  }
}

let authApi: AccessAuthApi | undefined

export function getAccessAuthApi(): AccessAuthApi {
  authApi ??= createAccessAuthApi(getSupabaseClient())
  return authApi
}
