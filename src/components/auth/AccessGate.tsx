import { useState, type FormEvent, type ReactNode } from 'react'
import {
  useAccessFlow,
  type AccessFeedback,
} from '../../features/access/access-context'
import { ConstructionScreen } from '../layout/ConstructionScreen'
import './access-gate.css'

const demoGestorUsername =
  (import.meta.env.VITE_CAPO_DEMO_USERNAME ?? 'gestor').trim()
const demoGestorPassword =
  (import.meta.env.VITE_CAPO_DEMO_PASSWORD ?? '').trim()
const canUseDemoGestorAccount =
  import.meta.env.DEV || import.meta.env.MODE === 'development'

function Feedback({ feedback }: { feedback: AccessFeedback | null }) {
  if (!feedback) return null
  return (
    <div
      className={`auth-alert ${feedback.type}`}
      role={feedback.type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      {feedback.message}
    </div>
  )
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  numeric = false,
  autoFocus = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  placeholder: string
  numeric?: boolean
  autoFocus?: boolean
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <span className="auth-password-row">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          inputMode={numeric ? 'numeric' : undefined}
          maxLength={numeric ? 6 : undefined}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoFocus={autoFocus}
        />
        <button
          className="auth-secondary"
          type="button"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? '🙈' : '👁'}
        </button>
      </span>
    </div>
  )
}

function LoginStep() {
  const { busy, feedback, login, showRecovery } = useAccessFlow()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    void login(username, password)
  }

  return (
    <section
      className="auth-step auth-login"
      aria-labelledby="auth-login-title"
    >
      <img className="auth-logo" src="/assets/capo-logo.jpg" alt="CAPO" />
      <h1 id="auth-login-title">Bem-vindo ao Sistema CAPO</h1>
      <p className="auth-subtitle">Acesse com seu nome de usuário e senha.</p>
      <Feedback feedback={feedback} />
      <form onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="username">Usuário</label>
          <input
            id="username"
            autoCapitalize="none"
            autoComplete="username"
            spellCheck={false}
            placeholder="Nome de usuário"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoFocus
          />
        </div>
        <PasswordInput
          id="password"
          label="Senha"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="Digite sua senha"
        />
        {canUseDemoGestorAccount && (
          <button
            className="auth-link"
            type="button"
            onClick={() => {
              setUsername(demoGestorUsername)
              setPassword(demoGestorPassword)
              if (demoGestorUsername && demoGestorPassword) {
                void login(demoGestorUsername, demoGestorPassword)
              } else {
                document.getElementById('password')?.focus()
              }
            }}
          >
            {demoGestorPassword
              ? 'Entrar como Daniele — Gestor titular'
              : 'Preencher usuário do gestor titular'}
          </button>
        )}
        <button className="auth-link" type="button" onClick={showRecovery}>
          Esqueceu sua senha?
        </button>
        <button
          className="auth-primary auth-full"
          type="submit"
          disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Entrando…' : 'Entrar no CAPO'}
        </button>
      </form>
      <div className="auth-note">
        <strong>🔒 Acesso individual</strong>
        <br />
        Use somente sua própria conta.
      </div>
    </section>
  )
}

function RecoveryStep() {
  const { busy, feedback, recoverPassword, showLogin } = useAccessFlow()
  const [email, setEmail] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    void recoverPassword(email)
  }

  const limitReached =
    window.sessionStorage.getItem('capoRecoveryBlocked') === '1'

  return (
    <section className="auth-step" aria-labelledby="auth-recover-title">
      <h1 id="auth-recover-title">Recuperar senha</h1>
      <p className="auth-subtitle">Informe o e-mail cadastrado no CAPO.</p>
      <form onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="recoverEmail">E-mail cadastrado</label>
          <input
            id="recoverEmail"
            type="email"
            autoComplete="email"
            placeholder="E-mail cadastrado"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoFocus
          />
        </div>
        <Feedback feedback={feedback} />
        <button
          className="auth-primary auth-full"
          type="submit"
          disabled={busy || limitReached}
          aria-busy={busy}
        >
          {limitReached
            ? 'Limite de 2 solicitações atingido'
            : busy
              ? 'Enviando…'
              : 'Enviar instruções'}
        </button>
      </form>
      <button className="auth-link auth-back" type="button" onClick={showLogin}>
        ← Voltar para o login
      </button>
    </section>
  )
}

function EmailSentStep() {
  const { sentStatus, showLogin } = useAccessFlow()
  return (
    <section className="auth-step" aria-labelledby="auth-sent-title">
      <h1 id="auth-sent-title">✉ Instruções enviadas</h1>
      <p className="auth-subtitle">{sentStatus}</p>
      <button
        className="auth-primary auth-full"
        type="button"
        onClick={showLogin}
      >
        Voltar para o login
      </button>
    </section>
  )
}

function mfaQrSource(qrCode: string) {
  const value = qrCode.trim()
  return value.startsWith('<svg')
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`
    : value
}

function MfaEnrollmentStep() {
  const { busy, feedback, mfaEnrollment, verifyMfaEnrollment, logout } =
    useAccessFlow()
  const [code, setCode] = useState('')
  if (!mfaEnrollment) return null

  function submit(event: FormEvent) {
    event.preventDefault()
    void verifyMfaEnrollment(code)
  }

  return (
    <section className="auth-step" aria-labelledby="auth-mfa-enroll-title">
      <h1 id="auth-mfa-enroll-title">Proteção em duas etapas</h1>
      <p className="auth-subtitle">
        Configure seu autenticador para concluir o acesso seguro ao CAPO.
      </p>
      <div className="mfa-qr-wrap">
        <img
          className="mfa-qr"
          src={mfaQrSource(mfaEnrollment.qrCode)}
          alt="QR Code para configurar autenticação em duas etapas"
        />
        <div>
          <strong>Leia o QR Code no seu aplicativo autenticador.</strong>
          <code className="mfa-secret">{mfaEnrollment.secret}</code>
        </div>
      </div>
      <form onSubmit={submit} noValidate>
        <div className="auth-field">
          <label htmlFor="mfaEnrollCode">Código de 6 números</label>
          <input
            id="mfaEnrollCode"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
          />
        </div>
        <Feedback feedback={feedback} />
        <button
          className="auth-primary auth-full"
          type="submit"
          disabled={busy}
          aria-busy={busy}
        >
          Validar e continuar
        </button>
      </form>
      <button
        className="auth-link auth-back"
        type="button"
        onClick={() => void logout()}
      >
        Sair
      </button>
    </section>
  )
}

function MfaChallengeStep() {
  const { busy, feedback, mfaFactors, verifyExistingMfa, logout } =
    useAccessFlow()
  const [factorId, setFactorId] = useState(mfaFactors[0]?.id ?? '')
  const [code, setCode] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    void verifyExistingMfa(factorId, code)
  }

  return (
    <section className="auth-step" aria-labelledby="auth-mfa-challenge-title">
      <h1 id="auth-mfa-challenge-title">Verificação em duas etapas</h1>
      <p className="auth-subtitle">
        Digite o código do seu aplicativo autenticador.
      </p>
      <form onSubmit={submit} noValidate>
        {mfaFactors.length > 1 && (
          <div className="auth-field">
            <label htmlFor="mfaFactorSelect">Autenticador</label>
            <select
              id="mfaFactorSelect"
              value={factorId}
              onChange={(event) => setFactorId(event.target.value)}
            >
              {mfaFactors.map((factor, index) => (
                <option key={factor.id} value={factor.id}>
                  {factor.friendlyName ?? `Autenticador ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="mfaChallengeCode">Código de 6 números</label>
          <input
            id="mfaChallengeCode"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoFocus
          />
        </div>
        <Feedback feedback={feedback} />
        <button
          className="auth-primary auth-full"
          type="submit"
          disabled={busy}
          aria-busy={busy}
        >
          Verificar
        </button>
      </form>
      <button
        className="auth-link auth-back"
        type="button"
        onClick={() => void logout()}
      >
        Sair
      </button>
    </section>
  )
}

function NewPasswordStep() {
  const { busy, feedback, updateRecoveredPassword, cancelPasswordRecovery } =
    useAccessFlow()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    void updateRecoveredPassword(password, confirmation)
  }

  return (
    <section className="auth-step" aria-labelledby="auth-new-password-title">
      <h1 id="auth-new-password-title">Definir nova senha</h1>
      <p className="auth-subtitle">Digite e confirme sua nova senha.</p>
      <form onSubmit={submit} noValidate>
        <PasswordInput
          id="newPassword1"
          label="Nova senha"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          autoFocus
        />
        <PasswordInput
          id="newPassword2"
          label="Confirmar nova senha"
          value={confirmation}
          onChange={setConfirmation}
          autoComplete="new-password"
          placeholder="Digite novamente"
        />
        <p className="auth-subtitle">
          Use pelo menos 8 caracteres, com uma letra maiúscula, uma minúscula e um número.
        </p>
        <Feedback feedback={feedback} />
        <button
          className="auth-primary auth-full"
          type="submit"
          disabled={busy}
          aria-busy={busy}
        >
          Redefinir senha
        </button>
      </form>
      <button
        className="auth-link auth-back"
        type="button"
        onClick={() => void cancelPasswordRecovery()}
      >
        ← Cancelar e voltar para o login
      </button>
    </section>
  )
}

function LegalTermStep() {
  const { busy, feedback, legalTerm, acceptLegalTerm, logout } = useAccessFlow()
  const [accepted, setAccepted] = useState(false)
  if (!legalTerm) return null

  return (
    <section className="auth-step" aria-labelledby="auth-term-title">
      <h1 id="auth-term-title">{legalTerm.title}</h1>
      <p className="auth-subtitle">Versão {legalTerm.version}</p>
      <div className="legal-term-box" tabIndex={0}>
        {legalTerm.content}
      </div>
      <label className="capo-term-check">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => setAccepted(event.target.checked)}
        />
        <span>
          Li, compreendi e aceito o Termo de Responsabilidade, Sigilo e
          Confidencialidade.
        </span>
      </label>
      <Feedback feedback={feedback} />
      <button
        className="auth-primary auth-full"
        type="button"
        disabled={!accepted || busy}
        aria-busy={busy}
        onClick={() => void acceptLegalTerm()}
      >
        Aceitar e acessar o CAPO
      </button>
      <button
        className="auth-link auth-back"
        type="button"
        onClick={() => void logout()}
      >
        Não aceitar e sair
      </button>
    </section>
  )
}

function FirstAccessStep() {
  const { busy, feedback, completeFirstAccess, logout } = useAccessFlow()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    void completeFirstAccess(currentPassword, newPassword)
  }

  return (
    <section className="auth-step" aria-labelledby="auth-first-access-title">
      <h1 id="auth-first-access-title">Alterar senha do primeiro acesso</h1>
      <p className="auth-subtitle">
        Confirme a senha temporária e escolha uma nova senha conforme a política de segurança.
      </p>
      <form onSubmit={submit} noValidate>
        <PasswordInput
          id="firstAccessCurrentPassword"
          label="Senha atual"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          placeholder="Senha temporária"
          autoFocus
        />
        <PasswordInput
          id="firstAccessPassword1"
          label="Nova senha"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
        <Feedback feedback={feedback} />
        <button
          className="auth-primary auth-full"
          type="submit"
          disabled={busy}
          aria-busy={busy}
        >
          Concluir primeiro acesso
        </button>
      </form>
      <button
        className="auth-link auth-back"
        type="button"
        onClick={() => void logout()}
      >
        Cancelar e sair
      </button>
    </section>
  )
}

function LoadingStep() {
  const { loadingText } = useAccessFlow()
  return (
    <section className="auth-step" aria-labelledby="auth-loading-title">
      <h1 id="auth-loading-title">Validando acesso</h1>
      <p className="auth-subtitle" role="status" aria-live="polite">
        {loadingText}
      </p>
      <div className="auth-spinner" aria-hidden="true" />
    </section>
  )
}

function BlockedStep() {
  const { feedback, logout } = useAccessFlow()
  return (
    <section className="auth-step" aria-labelledby="auth-blocked-title">
      <h1 id="auth-blocked-title">Acesso bloqueado</h1>
      <Feedback feedback={feedback} />
      <button
        className="auth-primary auth-full"
        type="button"
        onClick={() => void logout()}
      >
        Sair
      </button>
    </section>
  )
}

export function AccessGate({ children }: { children: ReactNode }) {
  const { screen } = useAccessFlow()
  if (window.location.pathname === '/em-construcao') {
    return <ConstructionScreen />
  }
  if (screen === 'authenticated') return children

  const step = {
    loading: <LoadingStep />,
    login: <LoginStep />,
    recover: <RecoveryStep />,
    'email-sent': <EmailSentStep />,
    'new-password': <NewPasswordStep />,
    'mfa-enroll': <MfaEnrollmentStep />,
    'mfa-challenge': <MfaChallengeStep />,
    'legal-term': <LegalTermStep />,
    'first-access': <FirstAccessStep />,
    blocked: <BlockedStep />,
  }[screen]

  return (
    <main className="login-wrap">
      <div className="login-card auth-card">{step}</div>
    </main>
  )
}
