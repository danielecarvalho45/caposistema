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
  const [patientQueue, setPatientQueue] =
    useState<AsyncState<unknown>>(loadingState)
  const [familyQueue, setFamilyQueue] =
    useState<AsyncState<unknown>>(loadingState)
  const [psychologists, setPsychologists] = useState<readonly Record<string, unknown>[]>([])
  const [familyProfessionalId, setFamilyProfessionalId] = useState('')
  const [familySlotDate, setFamilySlotDate] = useState('')
  const [familySlots, setFamilySlots] = useState<readonly Record<string, unknown>[]>([])
  const [familySlotStart, setFamilySlotStart] = useState('')
  const [familyCandidates, setFamilyCandidates] = useState<readonly Record<string, unknown>[]>([])
  const [familyNotes, setFamilyNotes] = useState('')
  const [familyFeedback, setFamilyFeedback] = useState<string | null>(null)
  const [familyBusy, setFamilyBusy] = useState(false)

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
  const canScheduleFamily = accessContext.roles.some(
    (role) =>
      role.code === 'administrador' ||
      role.code === 'administrativo_operacional',
  )

  const loadFamilyQueue = useCallback(async () => {
    setFamilyQueue(loadingState())
    const result = await getRpcService().getFamilyWaitingList('waiting', 50, 0)
    setFamilyQueue(result)
    return result
  }, [])

  const load = useCallback(async () => {
    if (isProfessionalQueue) {
      setProfessionalQueue(loadingState())
      setProfessionalQueue(await getRpcService().getWaitingList(null, 'waiting', 50, 0))
      return
    }
    setState(loadingState())
    setPatientQueue(loadingState())
    setState(await loadPendingItems())
    setPatientQueue(await getRpcService().getWaitingList(null, 'waiting', 50, 0))
    await loadFamilyQueue()
  }, [isProfessionalQueue, loadFamilyQueue, loadPendingItems])

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
      void getRpcService().getWaitingList(null, 'waiting', 50, 0).then((nextState) => {
        if (active) setPatientQueue(nextState)
      })
      void getRpcService().getFamilyWaitingList('waiting', 50, 0).then((nextState) => {
        if (active) setFamilyQueue(nextState)
      })
      void getRpcService().getSchedulingCatalog().then((catalogState) => {
        if (!active || catalogState.status !== 'success' || !Array.isArray(catalogState.data)) return
        const psychologyRows = catalogState.data.filter((item): item is Record<string, unknown> =>
          Boolean(item) &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          String((item as Record<string, unknown>).specialty_name ?? '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .trim().toLowerCase() === 'psicologia',
        )
        setPsychologists(psychologyRows)
      })
    }
    return () => { active = false }
  }, [isAdministrativeOperational, isProfessionalQueue, loadPendingItems])

  async function loadFamilySlots() {
    if (!familyProfessionalId || !familySlotDate) return
    setFamilyBusy(true)
    setFamilyFeedback(null)
    const result = await getRpcService().getAvailableAppointmentSlots(
      familyProfessionalId,
      familySlotDate,
    )
    if (result.status === 'success') {
      setFamilySlots(result.data as readonly Record<string, unknown>[])
      setFamilyFeedback(result.data.length ? null : 'Nenhuma vaga disponível nesta data.')
    } else {
      setFamilySlots([])
      setFamilyFeedback(result.status === 'error' ? result.error.message : 'Nenhuma vaga disponível nesta data.')
    }
    setFamilyBusy(false)
  }

  async function loadFamilyCandidates() {
    if (!familyProfessionalId || !familySlotStart) return
    setFamilyBusy(true)
    setFamilyFeedback(null)
    const result = await getRpcService().getFamilyQueueCandidatesForSlot(
      familyProfessionalId,
      familySlotStart,
      20,
    )
    if (result.status === 'success' && Array.isArray(result.data)) {
      setFamilyCandidates(result.data as readonly Record<string, unknown>[])
      setFamilyFeedback(result.data.length ? null : 'Nenhum familiar elegível para esta vaga.')
    } else {
      setFamilyCandidates([])
      setFamilyFeedback(result.status === 'error' ? result.error.message : 'Nenhum familiar elegível para esta vaga.')
    }
    setFamilyBusy(false)
  }

  async function scheduleFamily(waitingListId: string) {
    if (!canScheduleFamily || !familyProfessionalId || !familySlotStart || familyBusy) return
    setFamilyBusy(true)
    const result = await getRpcService().createFamilyPsychologyAppointment({
      waitingListId,
      professionalId: familyProfessionalId,
      slotStart: familySlotStart,
      generalNotes: familyNotes.trim() || null,
    })
    if (result.status === 'success') {
      setFamilyFeedback('Atendimento do familiar agendado e retirado da fila ativa.')
      setFamilyCandidates([])
      setFamilySlotStart('')
      setFamilyNotes('')
      await loadFamilyQueue()
    } else {
      setFamilyFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o agendamento.')
    }
    setFamilyBusy(false)
  }

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
            <p className="eyebrow">Fila de Espera</p>
            <h2>Fila de Pacientes</h2>
            <p>Fila visual única. A especialidade permanece identificada na própria linha.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={patientQueue.status === 'loading'}>
            Atualizar
          </button>
        </div>
        {patientQueue.status === 'loading' && <p>Carregando fila de pacientes…</p>}
        {patientQueue.status === 'error' && <p role="alert">{patientQueue.error.message}</p>}
        {(patientQueue.status === 'empty' || (patientQueue.status === 'success' && waitingRows(patientQueue.data).length === 0)) && (
          <p>Nenhum paciente aguardando.</p>
        )}
        {patientQueue.status === 'success' && waitingRows(patientQueue.data).length > 0 && (
          <div className="queue-table-wrap">
            <table className="queue-table">
              <thead><tr><th>Paciente</th><th>Especialidade</th><th>Prioridade</th><th>Entrada</th><th>Ação</th></tr></thead>
              <tbody>
                {waitingRows(patientQueue.data).map((row, index) => (
                  <tr key={rowText(row, 'waiting_list_id') + index}>
                    <td>{rowText(row, 'patient_name')}</td>
                    <td>{rowText(row, 'specialty_name')}</td>
                    <td>{rowText(row, 'priority')}</td>
                    <td>{formatDate(typeof row.entered_at === 'string' ? row.entered_at : null)}</td>
                    <td>
                      {canScheduleFamily ? (
                        <Link
                          to="/agenda"
                          state={{
                            patientId: rowText(row, 'patient_id'),
                            patientName: rowText(row, 'patient_name'),
                            specialtyId: rowText(row, 'specialty_id'),
                            waitingListId: rowText(row, 'waiting_list_id'),
                            origin: 'waiting_list',
                          }}
                        >
                          Agendar
                        </Link>
                      ) : (
                        <span>Supervisão</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="queue-card">
        <div className="queue-heading">
          <div>
            <p className="eyebrow">Fila de Espera</p>
            <h2>Fila de Familiares</h2>
            <p>Fluxo próprio de familiares vinculados a pacientes, com incompatibilidade entre psicólogo do paciente e psicólogo do familiar validada pelo CAPO.</p>
          </div>
          <button type="button" onClick={() => void loadFamilyQueue()} disabled={familyQueue.status === 'loading' || familyBusy}>
            Atualizar
          </button>
        </div>

        {familyQueue.status === 'loading' && <p>Carregando fila de familiares…</p>}
        {familyQueue.status === 'error' && <p role="alert">{familyQueue.error.message}</p>}
        {familyQueue.status === 'empty' && <p>Nenhum familiar aguardando.</p>}
        {familyQueue.status === 'success' && waitingRows(familyQueue.data).length === 0 && <p>Nenhum familiar aguardando.</p>}
        {familyQueue.status === 'success' && waitingRows(familyQueue.data).length > 0 && (
          <div className="queue-table-wrap">
            <table className="queue-table">
              <thead><tr><th>Familiar</th><th>Paciente vinculado</th><th>Relação</th><th>Prioridade</th><th>Entrada</th></tr></thead>
              <tbody>
                {waitingRows(familyQueue.data).map((row, index) => (
                  <tr key={rowText(row, 'waiting_list_id') + index}>
                    <td>{rowText(row, 'family_name')}</td>
                    <td>{rowText(row, 'source_patient_name')}</td>
                    <td>{rowText(row, 'relationship')}</td>
                    <td>{rowText(row, 'priority')}</td>
                    <td>{formatDate(typeof row.entered_at === 'string' ? row.entered_at : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="queue-heading">
          <div>
            <h3>Cruzar vaga com próximo familiar elegível</h3>
            <p>O CAPO exclui automaticamente o psicólogo que acompanha o paciente vinculado e respeita prioridade e ordem da fila.</p>
          </div>
        </div>

        <label>
          Psicólogo
          <select value={familyProfessionalId} onChange={(event) => {
            setFamilyProfessionalId(event.target.value)
            setFamilySlots([])
            setFamilySlotStart('')
            setFamilyCandidates([])
          }}>
            <option value="">Selecionar</option>
            {psychologists.map((row, index) => (
              <option key={rowText(row, 'professional_id') + index} value={rowText(row, 'professional_id')}>
                {rowText(row, 'professional_name')}
              </option>
            ))}
          </select>
        </label>

        <label>
          Data da vaga
          <input type="date" value={familySlotDate} onChange={(event) => {
            setFamilySlotDate(event.target.value)
            setFamilySlots([])
            setFamilySlotStart('')
            setFamilyCandidates([])
          }} />
        </label>
        <button type="button" disabled={familyBusy || !familyProfessionalId || !familySlotDate} onClick={() => void loadFamilySlots()}>
          Buscar vagas
        </button>

        {familySlots.length > 0 && (
          <label>
            Vaga
            <select value={familySlotStart} onChange={(event) => {
              setFamilySlotStart(event.target.value)
              setFamilyCandidates([])
            }}>
              <option value="">Selecionar</option>
              {familySlots.map((slot, index) => (
                <option key={rowText(slot, 'slot_start') + index} value={rowText(slot, 'slot_start')}>
                  {new Date(rowText(slot, 'slot_start')).toLocaleString('pt-BR')}
                </option>
              ))}
            </select>
          </label>
        )}

        <button type="button" disabled={familyBusy || !familyProfessionalId || !familySlotStart} onClick={() => void loadFamilyCandidates()}>
          Identificar próximo familiar elegível
        </button>

        {familyCandidates.length > 0 && (
          <>
            <label>
              Observação do agendamento
              <textarea value={familyNotes} onChange={(event) => setFamilyNotes(event.target.value)} maxLength={500} />
            </label>
            <ul>
              {familyCandidates.map((candidate, index) => (
                <li key={rowText(candidate, 'waiting_list_id') + index}>
                  <strong>{rowText(candidate, 'family_name')}</strong>
                  <span>Paciente vinculado: {rowText(candidate, 'source_patient_name')}</span>
                  <span>Prioridade: {rowText(candidate, 'priority')}</span>
                  {canScheduleFamily && index === 0 && (
                    <button type="button" disabled={familyBusy} onClick={() => void scheduleFamily(rowText(candidate, 'waiting_list_id'))}>
                      Agendar próximo elegível
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {familyFeedback && <p role="status">{familyFeedback}</p>}
        {!canScheduleFamily && <p>Coordenação: consulta e cruzamento disponíveis; a efetivação do agendamento permanece no Administrativo Operacional.</p>}
      </div>

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
