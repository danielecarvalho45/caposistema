import { useCallback, useEffect, useState } from 'react'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type PendingItem,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { Link } from 'react-router-dom'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
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

function waitingRows(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is Record<string, unknown> =>
    Boolean(item) && typeof item === 'object' && !Array.isArray(item))
}

function rowText(row: Record<string, unknown>, key: string) {
  const value = row[key]
  return value === null || value === undefined ? '—' : String(value)
}

const pendingRoutes: Readonly<Record<string, AppRoute>> = {
  agenda: '/agenda',
  waiting_list: '/fila',
  faltosos: '/faltosos',
  no_show_followups: '/faltosos',
  administrative_requests: '/solicitacoes',
  solicitacoes: '/solicitacoes',
  referrals: '/encaminhamentos',
  encaminhamentos: '/encaminhamentos',
  transport: '/transporte',
  prescription_renewal: '/receita',
  receita: '/receita',
  nutricao: '/nutricao',
  care_closures: '/encerramentos',
  encerramentos: '/encerramentos',
  familiares: '/familiar-cuidador',
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
  const [professionalQueue, setProfessionalQueue] =
    useState<AsyncState<unknown>>(loadingState)

  const isAdministrativeOperational = accessContext.roles.some(
    (role) =>
      role.code === 'administrador' ||
      role.code === 'administrativo_operacional' ||
      role.code === 'coordenador',
  )
  const isProfessionalQueue =
    !isAdministrativeOperational &&
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some((role) => role.code === 'profissional')

  const load = useCallback(async () => {
    if (isProfessionalQueue) {
      setProfessionalQueue(loadingState())
      setProfessionalQueue(await getRpcService().getWaitingList(null, 'waiting', 50, 0))
      return
    }
    setState(loadingState())
    setState(await loadPendingItems())
  }, [isProfessionalQueue, loadPendingItems])

  useEffect(() => {
    let active = true
    if (isProfessionalQueue) {
      void getRpcService().getWaitingList(null, 'waiting', 50, 0).then((nextState) => {
        if (active) setProfessionalQueue(nextState)
      })
    } else if (isAdministrativeOperational) {
      void loadPendingItems().then((nextState) => {
        if (active) setState(nextState)
      })
    }
    return () => { active = false }
  }, [isAdministrativeOperational, isProfessionalQueue, loadPendingItems])

  if (!isAdministrativeOperational && !isProfessionalQueue) {
    return (
      <section className="home-page" aria-labelledby="queue-blocked-title">
        <p className="eyebrow">Fila</p>
        <h2 id="queue-blocked-title">Fila indisponível</h2>
        <p>Esta visão não está habilitada para o contexto atual.</p>
      </section>
    )
  }

  if (isProfessionalQueue) {
    const rows = professionalQueue.status === 'success'
      ? waitingRows(professionalQueue.data)
      : []
    return (
      <section className="home-page" aria-labelledby="queue-title">
        <div className="queue-card">
          <div className="queue-heading">
            <div>
              <p className="eyebrow">Minha atuação</p>
              <h2 id="queue-title">Fila da própria especialidade</h2>
              <p>Somente pacientes das especialidades vinculadas ao profissional são retornados pelo banco.</p>
            </div>
            <button type="button" onClick={() => void load()} disabled={professionalQueue.status === 'loading'}>
              Atualizar
            </button>
          </div>
          {professionalQueue.status === 'loading' && <p>Carregando fila…</p>}
          {professionalQueue.status === 'error' && <p role="alert">{professionalQueue.error.message}</p>}
          {(professionalQueue.status === 'empty' || (professionalQueue.status === 'success' && rows.length === 0)) && <p>Nenhum paciente aguardando na sua especialidade.</p>}
          {professionalQueue.status === 'success' && rows.length > 0 && (
            <div className="queue-table-wrap">
              <table className="queue-table">
                <thead><tr><th>Paciente</th><th>Especialidade</th><th>Prioridade</th><th>Entrada</th></tr></thead>
                <tbody>{rows.map((row, index) => (
                  <tr key={rowText(row, 'waiting_list_id') + index}>
                    <td>{rowText(row, 'patient_name')}</td>
                    <td>{rowText(row, 'specialty_name')}</td>
                    <td>{rowText(row, 'priority')}</td>
                    <td>{formatDate(typeof row.entered_at === 'string' ? row.entered_at : null)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="home-page" aria-labelledby="queue-title">
      <div className="queue-card">
        <div className="queue-heading">
          <div>
            <p className="eyebrow">Operacional</p>
            <h2 id="queue-title">Filas, pendências e fluxos</h2>
          </div>
          <button type="button" onClick={() => void load()} disabled={state.status === 'loading'}>
            Atualizar
          </button>
        </div>

        <div aria-live="polite">
          {state.status === 'loading' && <p>Carregando pendências…</p>}
          {state.status === 'empty' && <p>Nenhuma pendência operacional encontrada.</p>}
          {state.status === 'error' && (
            <div className="queue-error" role="alert">
              <p>Não foi possível carregar a fila: {state.error.message}</p>
              <button type="button" onClick={() => void load()}>Tentar novamente</button>
            </div>
          )}
          {state.status === 'success' && state.data.length === 0 && <p>Nenhuma pendência operacional encontrada.</p>}
          {state.status === 'success' && state.data.length > 0 && (
            <div className="queue-table-wrap">
              <table className="queue-table">
                <caption>{state.data[0].total_count} pendência(s) encontrada(s)</caption>
                <thead><tr><th scope="col">Pendência</th><th scope="col">Paciente</th><th scope="col">Situação</th><th scope="col">Prazo</th></tr></thead>
                <tbody>
                  {state.data.map((item) => (
                    <tr key={`${item.source_table}:${item.source_id}`}>
                      <td>{pendingRoutes[item.context_module] && canAccessAppRoute(accessContext, pendingRoutes[item.context_module])
                        ? <Link to={pendingRoutes[item.context_module]} state={{ contextId: item.context_id, patientId: item.patient_id }}>{item.title}</Link>
                        : item.title}</td>
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
