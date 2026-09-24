import type { ReactNode } from 'react'
import type { AsyncState } from '../../lib/supabase/rpc'

type Props<T> = Readonly<{
  state: AsyncState<T>
  loading: string
  empty: string
  children: (data: T) => ReactNode
}>

export function AsyncStateView<T>({
  state,
  loading,
  empty,
  children,
}: Props<T>) {
  if (state.status === 'loading') return <p role="status">{loading}</p>
  if (state.status === 'empty') return <p role="status">{empty}</p>
  if (state.status === 'error') {
    return (
      <p role="alert">
        Não foi possível concluir esta ação. {state.error.message} Retorne ao
        painel inicial e tente novamente.
      </p>
    )
  }
  return <>{children(state.data)}</>
}

type ConfirmDialogProps = Readonly<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}>

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <h2 id="confirm-title">{title}</h2>
      <p>{message}</p>
      <button type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
      <button type="button" disabled={busy} onClick={onConfirm}>
        {busy ? 'Processando...' : confirmLabel}
      </button>
    </div>
  )
}
