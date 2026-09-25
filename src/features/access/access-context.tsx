import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type LegalTerm } from '../../lib/supabase/rpc'
import {
  getAccessAuthApi,
  type AccessAuthApi,
  type MfaTotpEnrollment,
  type MfaTotpFactor,
} from './auth-api'
import { validateAccessContext, validateSixDigitPassword } from './access-rules'

export type AccessScreen =
  | 'loading'
  | 'login'
  | 'recover'
  | 'email-sent'
  | 'new-password'
  | 'mfa-enroll'
  | 'mfa-challenge'
  | 'legal-term'
  | 'first-access'
  | 'blocked'
  | 'authenticated'

export type AccessFeedback = Readonly<{
  type: 'error' | 'ok'
  message: string
}>

type RpcService = Pick<
  ReturnType<typeof getRpcService>,
  | 'getCurrentLegalTerm'
  | 'getMyAccessContext'
  | 'acceptLegalTerm'
  | 'completeFirstAccess'
>

type AccessFlow = Readonly<{
  screen: AccessScreen
  loadingText: string
  feedback: AccessFeedback | null
  sentStatus: string
  legalTerm: LegalTerm | null
  accessContext: AccessContext | null
  mfaEnrollment: MfaTotpEnrollment | null
  mfaFactors: readonly MfaTotpFactor[]
  busy: boolean
}>

type AccessActions = Readonly<{
  showLogin: () => void
  showRecovery: () => void
  login: (username: string, password: string) => Promise<void>
  recoverPassword: (email: string) => Promise<void>
  updateRecoveredPassword: (
    password: string,
    confirmation: string,
  ) => Promise<void>
  cancelPasswordRecovery: () => Promise<void>
  verifyMfaEnrollment: (code: string) => Promise<void>
  verifyExistingMfa: (factorId: string, code: string) => Promise<void>
  acceptLegalTerm: () => Promise<void>
  completeFirstAccess: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>
  logout: () => Promise<void>
}>

type AccessContextValue = AccessFlow & AccessActions

const initialFlow: AccessFlow = {
  screen: 'loading',
  loadingText: 'Verificando sessão individual…',
  feedback: null,
  sentStatus:
    'Se o e-mail estiver cadastrado e autorizado, as instruções de recuperação serão enviadas.',
  legalTerm: null,
  accessContext: null,
  mfaEnrollment: null,
  mfaFactors: [],
  busy: false,
}

const AccessFlowContext = createContext<AccessContextValue | null>(null)

function isPasswordRecoveryReturn(): boolean {
  const query = new URLSearchParams(window.location.search)
  const hash = window.location.hash.replace(/^#/, '')
  const hashParams = new URLSearchParams(
    hash.includes('#') ? hash.split('#').at(-1) : hash,
  )
  return (
    query.get('capo_recovery') === '1' ||
    query.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    hash.includes('type=recovery') ||
    hash.includes('reset-password')
  )
}

function friendlyAuthError(error: unknown, context = 'auth'): string {
  const shaped =
    typeof error === 'object' && error !== null
      ? (error as { message?: unknown; status?: unknown; code?: unknown })
      : {}
  const message = String(shaped.message ?? error ?? 'Falha de autenticação.')
  const status = Number(shaped.status ?? 0) || 0

  console.error('CAPO · autenticação', {
    context,
    status,
    code: shaped.code ?? null,
    message,
  })

  if (status === 429) {
    return 'Limite de solicitações atingido. Aguarde o tempo indicado para tentar novamente.'
  }
  if (status >= 500) {
    return 'O serviço de acesso está temporariamente indisponível. Tente novamente.'
  }
  if (context === 'login' && status === 401) {
    return 'Nome de usuário e/ou senha incorretos. Verifique os dois campos.'
  }
  if (
    /rate.?limit|too many|exceed|security purposes|over_email_send_rate_limit/i.test(
      message,
    )
  ) {
    return 'Limite de solicitações atingido. Aguarde o tempo indicado para tentar novamente.'
  }
  if (/senha atual incorreta/i.test(message)) return 'Senha atual incorreta.'
  if (
    /invalid login credentials|usu[aá]rio ou senha|invalid.*password|unauthorized/i.test(
      message,
    )
  ) {
    return 'Nome de usuário e/ou senha incorretos. Verifique os dois campos.'
  }
  if (/network|fetch|failed to fetch/i.test(message)) {
    return 'Não foi possível conectar ao serviço de acesso. Verifique a conexão.'
  }
  if (/session|jwt|refresh token/i.test(message)) {
    return 'Sua sessão expirou. Entre novamente no CAPO.'
  }
  if (/password/i.test(message)) {
    return 'Não foi possível atualizar a senha. Verifique os requisitos e tente novamente.'
  }
  return 'Não foi possível concluir esta operação. Tente novamente.'
}

function getStoredCount(key: string): number {
  return Number(window.sessionStorage.getItem(key)) || 0
}

function isExpiredSessionError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const shaped = error as { code?: unknown; message?: unknown }
  return (
    shaped.code === 'PGRST301' ||
    /sess[aã]o|session|jwt|refresh token|n[aã]o autenticado/i.test(
      String(shaped.message ?? ''),
    )
  )
}

export function AccessProvider({
  children,
  authApi = getAccessAuthApi(),
  rpcService = getRpcService(),
}: {
  children: ReactNode
  authApi?: AccessAuthApi
  rpcService?: RpcService
}) {
  const [flow, setFlow] = useState<AccessFlow>(initialFlow)

  const setLoading = useCallback((loadingText: string) => {
    setFlow((current) => ({
      ...current,
      screen: 'loading',
      loadingText,
      feedback: null,
      busy: true,
    }))
  }, [])

  const loadAccessContext = useCallback(async () => {
    setLoading('Identificando sua conta e permissões…')
    const result = await rpcService.getMyAccessContext()
    if (result.status !== 'success') {
      if (result.status === 'error' && isExpiredSessionError(result.error)) {
        try {
          await authApi.signOut('local')
        } catch {
          // A interface ainda deve descartar o acesso local.
        }
        setFlow({
          ...initialFlow,
          screen: 'login',
          feedback: {
            type: 'error',
            message: 'Sua sessão expirou. Entre novamente no CAPO.',
          },
        })
        return
      }
      const message =
        result.status === 'error'
          ? friendlyAuthError(result.error, 'access-context')
          : 'Não foi possível carregar seu contexto de acesso.'
      setFlow((current) => ({
        ...current,
        screen: 'blocked',
        feedback: { type: 'error', message },
        busy: false,
      }))
      return
    }

    const contextError = validateAccessContext(result.data)
    if (contextError) {
      setFlow((current) => ({
        ...current,
        screen: 'blocked',
        accessContext: result.data,
        feedback: { type: 'error', message: contextError },
        busy: false,
      }))
      return
    }

    if (
      result.data.must_change_password === true ||
      result.data.first_access_completed === false
    ) {
      setFlow((current) => ({
        ...current,
        screen: 'first-access',
        accessContext: result.data,
        feedback: null,
        busy: false,
      }))
      return
    }

    setFlow((current) => ({
      ...current,
      screen: 'authenticated',
      accessContext: result.data,
      feedback: null,
      busy: false,
    }))
  }, [authApi, rpcService, setLoading])

  const runPostPasswordAccessGate = useCallback(async () => {
    setLoading('Verificando o Termo vigente…')
    const result = await rpcService.getCurrentLegalTerm()
    if (result.status !== 'success') {
      if (result.status === 'error' && isExpiredSessionError(result.error)) {
        try {
          await authApi.signOut('local')
        } catch {
          // A interface ainda deve descartar o acesso local.
        }
        setFlow({
          ...initialFlow,
          screen: 'login',
          feedback: {
            type: 'error',
            message: 'Sua sessão expirou. Entre novamente no CAPO.',
          },
        })
        return
      }
      const message =
        result.status === 'error'
          ? friendlyAuthError(result.error, 'term')
          : 'Não foi possível carregar o Termo vigente. Tente novamente.'
      setFlow((current) => ({
        ...current,
        screen: 'blocked',
        feedback: { type: 'error', message },
        busy: false,
      }))
      return
    }

    if (!result.data.accepted) {
      setFlow((current) => ({
        ...current,
        screen: 'legal-term',
        legalTerm: result.data,
        feedback: null,
        busy: false,
      }))
      return
    }
    await loadAccessContext()
  }, [authApi, loadAccessContext, rpcService, setLoading])

  const runProtectedAccessGate = useCallback(async () => {
    setLoading('Verificando segurança da sessão…')
    try {
      const session = await authApi.getSession()
      if (!session) {
        setFlow({ ...initialFlow, screen: 'login' })
        return
      }

      await runPostPasswordAccessGate()
    } catch (error) {
      setFlow({
        ...initialFlow,
        screen: 'login',
        feedback: { type: 'error', message: friendlyAuthError(error, 'boot') },
      })
    }
  }, [authApi, runPostPasswordAccessGate, setLoading])

  useEffect(() => {
    let active = true
    const recoveryReturn = isPasswordRecoveryReturn()
    const unsubscribe = authApi.onAuthStateChange((event, session) => {
      if (!active) return
      if (
        event === 'PASSWORD_RECOVERY' ||
        (recoveryReturn &&
          session &&
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))
      ) {
        setFlow((current) => ({
          ...current,
          screen: 'new-password',
          feedback: null,
          busy: false,
        }))
      } else if (event === 'SIGNED_OUT') {
        setFlow({ ...initialFlow, screen: 'login' })
      }
    })

    void (async () => {
      try {
        const session = await authApi.getSession()
        if (!active) return
        if (recoveryReturn) {
          setFlow((current) => ({
            ...current,
            screen: session ? 'new-password' : 'recover',
            feedback: session
              ? null
              : {
                  type: 'error',
                  message:
                    'Este link é inválido ou expirou. Solicite um novo link de recuperação.',
                },
            busy: false,
          }))
        } else if (session) {
          await runProtectedAccessGate()
        } else {
          setFlow({ ...initialFlow, screen: 'login' })
        }
      } catch (error) {
        if (!active) return
        setFlow({
          ...initialFlow,
          screen: 'login',
          feedback: {
            type: 'error',
            message: friendlyAuthError(error, 'boot'),
          },
        })
      }
    })()

    return () => {
      active = false
      unsubscribe()
    }
  }, [authApi, runProtectedAccessGate])

  const actions = useMemo<AccessActions>(
    () => ({
      showLogin() {
        setFlow((current) => ({
          ...current,
          screen: 'login',
          feedback: null,
          busy: false,
        }))
      },
      showRecovery() {
        const blocked =
          window.sessionStorage.getItem('capoRecoveryBlocked') === '1' ||
          getStoredCount('capoRecoveryRequests') >= 2
        setFlow((current) => ({
          ...current,
          screen: 'recover',
          feedback: blocked
            ? {
                type: 'error',
                message:
                  'As duas solicitações de recuperação foram utilizadas. Se não conseguir redefinir sua senha, solicite ao TI a redefinição da senha ou a alteração do e-mail cadastrado.',
              }
            : null,
          busy: false,
        }))
      },
      async login(username, password) {
        const cleanUsername = username.trim()
        if (!cleanUsername && !password) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Informe o nome de usuário e a senha.',
            },
          }))
          return
        }
        if (!cleanUsername || !password) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: !cleanUsername
                ? 'Informe o nome de usuário.'
                : 'Informe a senha.',
            },
          }))
          return
        }

        setFlow((current) => ({
          ...current,
          busy: true,
          feedback: null,
        }))
        try {
          await authApi.loginByUsername(cleanUsername, password)
          window.sessionStorage.removeItem('capoLoginFailures')
          await runProtectedAccessGate()
        } catch (error) {
          const message = friendlyAuthError(error, 'login')
          if (
            message ===
            'Nome de usuário e/ou senha incorretos. Verifique os dois campos.'
          ) {
            const failures = getStoredCount('capoLoginFailures') + 1
            if (failures >= 3) {
              window.sessionStorage.removeItem('capoLoginFailures')
              setFlow((current) => ({
                ...current,
                screen: 'recover',
                feedback: {
                  type: 'error',
                  message:
                    'Após três tentativas incorretas, recupere sua senha usando o e-mail cadastrado.',
                },
                busy: false,
              }))
              return
            }
            window.sessionStorage.setItem('capoLoginFailures', String(failures))
            setFlow((current) => ({
              ...current,
              screen: 'login',
              feedback: {
                type: 'error',
                message: `${message} Tentativa ${failures} de 3.`,
              },
              busy: false,
            }))
          } else {
            setFlow((current) => ({
              ...current,
              screen: 'login',
              feedback: { type: 'error', message },
              busy: false,
            }))
          }
        }
      },
      async verifyMfaEnrollment(code) {
        const factorId = flow.mfaEnrollment?.id
        if (!/^\d{6}$/.test(code)) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Informe o código de 6 números do autenticador.',
            },
          }))
          return
        }
        if (!factorId) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message:
                'Configuração do segundo fator indisponível. Tente entrar novamente.',
            },
          }))
          return
        }
        try {
          setLoading('Ativando autenticação em duas etapas…')
          await authApi.challengeAndVerifyMfa(factorId, code)
          await runProtectedAccessGate()
        } catch (error) {
          setFlow((current) => ({
            ...current,
            screen: 'mfa-enroll',
            feedback: {
              type: 'error',
              message: friendlyAuthError(error, 'mfa'),
            },
            busy: false,
          }))
        }
      },
      async verifyExistingMfa(factorId, code) {
        if (!/^\d{6}$/.test(code)) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Informe o código de 6 números do autenticador.',
            },
          }))
          return
        }
        if (
          !factorId ||
          !flow.mfaFactors.some((factor) => factor.id === factorId)
        ) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Fator de autenticação indisponível. Tente novamente.',
            },
          }))
          return
        }
        try {
          setLoading('Validando autenticação em duas etapas…')
          await authApi.challengeAndVerifyMfa(factorId, code)
          await runProtectedAccessGate()
        } catch (error) {
          setFlow((current) => ({
            ...current,
            screen: 'mfa-challenge',
            feedback: {
              type: 'error',
              message: friendlyAuthError(error, 'mfa'),
            },
            busy: false,
          }))
        }
      },
      async recoverPassword(email) {
        const cleanEmail = email.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Informe um e-mail válido cadastrado no CAPO.',
            },
          }))
          return
        }
        if (
          getStoredCount('capoRecoveryRequests') >= 2 ||
          window.sessionStorage.getItem('capoRecoveryBlocked') === '1'
        ) {
          setFlow((current) => ({
            ...current,
            screen: 'recover',
            feedback: {
              type: 'error',
              message:
                'As duas solicitações de recuperação foram utilizadas. Se não conseguir redefinir sua senha, solicite ao TI a redefinição da senha ou a alteração do e-mail cadastrado.',
            },
            busy: false,
          }))
          return
        }

        setFlow((current) => ({ ...current, busy: true, feedback: null }))
        try {
          const recoveryUrl = new URL(
            window.location.origin + window.location.pathname,
          )
          recoveryUrl.searchParams.set('capo_recovery', '1')
          await authApi.resetPasswordForEmail(
            cleanEmail,
            recoveryUrl.toString(),
          )
          const requests = getStoredCount('capoRecoveryRequests') + 1
          window.sessionStorage.setItem(
            'capoRecoveryRequests',
            String(requests),
          )
          if (requests >= 2) {
            window.sessionStorage.setItem('capoRecoveryBlocked', '1')
          }
          setFlow((current) => ({
            ...current,
            screen: 'email-sent',
            sentStatus: `Solicitação ${requests} de 2. Se o e-mail estiver cadastrado e autorizado, as instruções serão enviadas.`,
            feedback: null,
            busy: false,
          }))
        } catch (error) {
          const message = friendlyAuthError(error, 'recovery')
          if (message.startsWith('Limite de solicitações')) {
            window.sessionStorage.setItem('capoRecoveryBlocked', '1')
          }
          setFlow((current) => ({
            ...current,
            feedback: { type: 'error', message },
            busy: false,
          }))
        }
      },
      async updateRecoveredPassword(password, confirmation) {
        const passwordError = validateSixDigitPassword(password)
        const message =
          passwordError ??
          (password !== confirmation ? 'As senhas não coincidem.' : null)
        if (message) {
          setFlow((current) => ({
            ...current,
            feedback: { type: 'error', message },
          }))
          return
        }

        setFlow((current) => ({ ...current, busy: true, feedback: null }))
        try {
          const session = await authApi.getSession()
          if (!session) {
            throw new Error('Sessão de recuperação ausente ou expirada.')
          }
          await authApi.updatePassword(password)
          await authApi.signOut('local')
          window.sessionStorage.removeItem('capoRecoveryRequests')
          window.sessionStorage.removeItem('capoRecoveryBlocked')
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          )
          setFlow({
            ...initialFlow,
            screen: 'login',
            feedback: {
              type: 'ok',
              message:
                'Senha redefinida. Entre com seu usuário e a nova senha.',
            },
          })
        } catch (error) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: friendlyAuthError(error, 'password'),
            },
            busy: false,
          }))
        }
      },
      async cancelPasswordRecovery() {
        try {
          await authApi.signOut('local')
        } catch {
          // A interface local ainda deve ser bloqueada.
        }
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        )
        setFlow({ ...initialFlow, screen: 'login' })
      },
      async acceptLegalTerm() {
        if (!flow.legalTerm) return
        setLoading('Registrando aceite do Termo vigente…')
        const result = await rpcService.acceptLegalTerm(
          flow.legalTerm.legal_term_id,
        )
        if (result.status !== 'success') {
          setFlow((current) => ({
            ...current,
            screen: 'legal-term',
            feedback: {
              type: 'error',
              message:
                result.status === 'error'
                  ? friendlyAuthError(result.error, 'term')
                  : 'Não foi possível registrar o aceite do Termo vigente.',
            },
            busy: false,
          }))
          return
        }
        await loadAccessContext()
      },
      async completeFirstAccess(currentPassword, newPassword) {
        if (!/^\d{6}$/.test(currentPassword)) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Informe a senha atual de 6 números.',
            },
          }))
          return
        }
        const passwordError = validateSixDigitPassword(newPassword)
        const message =
          passwordError ??
          (newPassword === currentPassword
            ? 'A nova senha deve ser diferente da senha atual.'
            : null)
        if (message) {
          setFlow((current) => ({
            ...current,
            feedback: { type: 'error', message },
          }))
          return
        }

        const username = flow.accessContext?.username
        if (!username) {
          setFlow((current) => ({
            ...current,
            feedback: {
              type: 'error',
              message: 'Não foi possível identificar a conta autenticada.',
            },
          }))
          return
        }

        setFlow((current) => ({ ...current, busy: true, feedback: null }))
        try {
          try {
            await authApi.verifyUsernamePassword(username, currentPassword)
          } catch (error) {
            throw new Error('Senha atual incorreta.', { cause: error })
          }
          await authApi.updatePassword(newPassword)
          setLoading(
            'Senha atualizada. Finalizando o primeiro acesso com segurança…',
          )
          const result = await rpcService.completeFirstAccess()
          if (result.status !== 'success') {
            throw result.status === 'error'
              ? result.error
              : new Error('Resposta vazia ao concluir o primeiro acesso.')
          }
          await loadAccessContext()
        } catch (error) {
          setFlow((current) => ({
            ...current,
            screen: 'first-access',
            feedback: {
              type: 'error',
              message: friendlyAuthError(error, 'first-access'),
            },
            busy: false,
          }))
        }
      },
      async logout() {
        try {
          await authApi.signOut()
        } catch {
          // A sessão local e a interface continuam sendo limpas.
        }
        setFlow({ ...initialFlow, screen: 'login' })
      },
    }),
    [
      authApi,
      flow.accessContext?.username,
      flow.legalTerm,
      flow.mfaEnrollment?.id,
      flow.mfaFactors,
      loadAccessContext,
      rpcService,
      runProtectedAccessGate,
      setLoading,
    ],
  )

  const value = useMemo(() => ({ ...flow, ...actions }), [actions, flow])

  return (
    <AccessFlowContext.Provider value={value}>
      {children}
    </AccessFlowContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAccessFlow(): AccessContextValue {
  const value = useContext(AccessFlowContext)
  if (!value) {
    throw new Error('useAccessFlow deve ser usado dentro de AccessProvider.')
  }
  return value
}
