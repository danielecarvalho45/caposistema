import { useCallback, useEffect, useRef, useState } from 'react'
import './automatic-version-update.css'

declare const __CAPO_BUILD_VERSION__: string

const CHECK_INTERVAL_MS = 60_000
const IDLE_FOR_AUTO_RELOAD_MS = 120_000

export function isSafeCapoAutoReload(input: {
  path: string
  visible: boolean
  online: boolean
  idleMs: number
  edited: boolean
  activeEditor: boolean
  blockingOverlay: boolean
}): boolean {
  // Para não interromper atendimentos, a atualização automática ocorre somente na Home,
  // sem edição pendente, sem diálogo aberto e após um período sem interação.
  return input.path === '/'
    && input.visible
    && input.online
    && input.idleMs >= IDLE_FOR_AUTO_RELOAD_MS
    && !input.edited
    && !input.activeEditor
    && !input.blockingOverlay
}

export function CapoAutomaticVersionUpdate() {
  const [newVersion, setNewVersion] = useState(false)
  const [edited, setEdited] = useState(false)
  const lastActivity = useRef(Date.now())
  const updating = useRef(false)
  const mounted = useRef(true)

  const reloadIfSafe = useCallback(() => {
    if (!newVersion || updating.current) return
    const active = document.activeElement
    const activeEditor = Boolean(active && active.matches(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]',
    ))
    const blockingOverlay = Boolean(document.querySelector(
      'dialog[open], [role="dialog"], [aria-modal="true"]',
    ))
    if (!isSafeCapoAutoReload({
      path: window.location.pathname,
      visible: document.visibilityState === 'visible',
      online: navigator.onLine,
      idleMs: Date.now() - lastActivity.current,
      edited,
      activeEditor,
      blockingOverlay,
    })) return
    updating.current = true
    window.location.reload()
  }, [newVersion, edited])

  useEffect(() => {
    mounted.current = true
    const onActivity = () => { lastActivity.current = Date.now() }
    const onChange = (event: Event) => {
      const target = event.target
      if (target instanceof Element && target.matches('input, textarea, select, [contenteditable], [role="textbox"]')) {
        setEdited(true)
      }
      onActivity()
    }
    const onFocus = () => { lastActivity.current = Date.now() }
    document.addEventListener('pointerdown', onActivity, true)
    document.addEventListener('keydown', onActivity, true)
    document.addEventListener('input', onChange, true)
    document.addEventListener('change', onChange, true)
    window.addEventListener('focus', onFocus)

    let busy = false
    const check = async () => {
      if (busy || updating.current || document.visibilityState !== 'visible' || !navigator.onLine) return
      busy = true
      try {
        const response = await fetch('/capo-version.json', { cache: 'no-store' })
        if (!response.ok) return
        const data: unknown = await response.json()
        if (data && typeof data === 'object' && 'version' in data
          && typeof data.version === 'string' && /^(?:\d{10,}|[a-f0-9]{24})$/.test(data.version)
          && data.version !== __CAPO_BUILD_VERSION__ && mounted.current) {
          setNewVersion(true)
        }
      } catch {
        // Rede indisponível ou publicação em andamento: manter a versão atual sem interromper o usuário.
      } finally {
        busy = false
      }
    }
    void check()
    const checkTimer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
    const autoTimer = window.setInterval(() => reloadIfSafe(), 10_000)
    const onVisible = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      mounted.current = false
      window.clearInterval(checkTimer)
      window.clearInterval(autoTimer)
      document.removeEventListener('visibilitychange', onVisible)
      document.removeEventListener('pointerdown', onActivity, true)
      document.removeEventListener('keydown', onActivity, true)
      document.removeEventListener('input', onChange, true)
      document.removeEventListener('change', onChange, true)
      window.removeEventListener('focus', onFocus)
    }
  }, [reloadIfSafe])

  if (!newVersion) return null

  return (
    <aside className="capo-new-version" role="status" aria-live="polite">
      <strong>Nova versão do CAPO disponível</strong>
      <span>
        {edited
          ? 'Há informações editadas nesta sessão. A atualização não será automática para evitar perdas.'
          : 'O sistema atualizará sozinho quando estiver na Home e sem atividade em andamento.'}
      </span>
      <button type="button" onClick={() => {
        if (edited && !window.confirm('Uma atualização pode descartar informações ainda não salvas. Deseja atualizar agora?')) return
        updating.current = true
        window.location.reload()
      }}>Atualizar agora</button>
    </aside>
  )
}
