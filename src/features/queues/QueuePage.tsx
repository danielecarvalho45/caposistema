import { useCallback, useEffect, useState } from 'react'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type PendingItem,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import './queue-page.css'

type PendingItemsLoader = () => Promise<AsyncState<readonly PendingItem[]>>

const defaultPendingItemsLoader: PendingItemsLoader = () =>
  getRpcService().getPendingItems()

function formatDate(value: string | null) {
  if (!value) return 'Sem prazo'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR').format(date)
}

export function QueuePage({
  accessContext,
  loadPendingItems = defaultPendingItemsLoader,
}: Readonly<{
  accessContext: AccessContext
  loadPendingItems?: PendingItemsLoader
}>) {
  const [state, setState] =
    useState<AsyncState<readonly PendingItem[]>>(loadingState)
  const isAdministrativeOperational =
    accessContext.primary_context.code === 'administrativo_operacional' ||
    accessContext.roles.some(
      (role) => role.code === 'administrativo_operacional',
    )

  const load = useCallback(async () => {
    setState(loadingState())
    setState(await loadPendingItems())
  }, [loadPendingItems])

  useEffect(() => {
    if (!isAdministrativeOperational) return

    let active = true
    void loadPendingItems().then((nextState) => {
      if (active) setState(nextState)
    })

    return () => {
      active = false
    }
  }, [isAdministrativeOperational, loadPendingItems])

  if (!isAdministrativeOperational) {
    return (
      <section className="home-page" aria-labelledby="queue-blocked-title">
        <p className="eyebrow">Fila</p>
        <h2 id="queue-blocked-title">Fila indisponível</h2>
        <p>Esta visão operacional não está habilitada para o contexto atual.</p>
      </section>
    )
  }

  return (
    <section className="home-page" aria-labelledby="queue-title">
      <div className="queue-card">
        <div className="queue-heading">
          <div>
            <p className="eyebrow">Operacional</p>
            <h2 id="queue-title">Fila operacional</h2>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={state.status === 'loading'}
          >
            Atualizar
          </button>
        </div>

        <div aria-live="polite">
          {state.status === 'loading' && <p>Carregando pendências…</p>}
          {state.status === 'empty' && (
            <p>Nenhuma pendência operacional encontrada.</p>
          )}
          {state.status === 'error' && (
            <div className="queue-error" role="alert">
              <p>Não foi possível carregar a fila: {state.error.message}</p>
              <button type="button" onClick={() => void load()}>
                Tentar novamente
              </button>
            </div>
          )}
          {state.status === 'success' && state.data.length === 0 && (
            <p>Nenhuma pendência operacional encontrada.</p>
          )}
          {state.status === 'success' && state.data.length > 0 && (
            <div className="queue-table-wrap">
              <table className="queue-table">
                <caption>
                  {state.data[0].total_count} pendência(s) encontrada(s)
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Pendência</th>
                    <th scope="col">Paciente</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((item) => (
                    <tr key={`${item.source_table}:${item.source_id}`}>
                      <td>{item.title}</td>
                      <td>{item.patient_name ?? 'Não se aplica'}</td>
                      <td>{item.status}</td>
                      <td>{formatDate(item.due_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
