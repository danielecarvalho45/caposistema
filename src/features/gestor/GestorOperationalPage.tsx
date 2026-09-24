import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PatientSearch } from '../../components/forms/PatientSearch'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type FamilyQueueCandidate,
  type FamilyWaitingListItem,
  type NutritionAdminDelivery,
  type PendingItem,
  type ReferralPatient,
} from '../../lib/supabase/rpc'
import {
  createClosuresIntegration,
  type CareClosure,
} from '../closures/closures-integration'

type RowsState<T> = AsyncState<readonly T[]>
type DeathSource =
  | 'family_caregiver'
  | 'health_service'
  | 'official_document'
  | 'other_authorized_institution'

const closuresIntegration = createClosuresIntegration()

function text(record: Readonly<Record<string, unknown>>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return '—'
}

function id(record: Readonly<Record<string, unknown>>, ...keys: string[]) {
  const value = text(record, ...keys)
  return value === '—' ? '' : value
}

function flag(record: Readonly<Record<string, unknown>>, key: string) {
  return record[key] === true
}

function errorMessage<T>(result: AsyncState<T>) {
  return result.status === 'error' ? result.error.message : 'A operação não retornou confirmação do backend.'
}

function contextPath(contextModule: string) {
  const paths: Record<string, string> = {
    agenda: '/agenda',
    faltosos: '/faltosos',
    solicitacoes: '/solicitacoes',
    encaminhamentos: '/encaminhamentos',
    transporte: '/transporte',
    receita: '/receita',
    nutriciao: '/nutricao',
    nutricao: '/nutricao',
    encerramentos: '/encerramentos',
    familiares: '/gestor/operacional',
  }
  return paths[contextModule] ?? '/gestor/operacional'
}

export function GestorOperationalPage() {
  const navigate = useNavigate()
  const rpc = getRpcService()
  const [familyQueue, setFamilyQueue] = useState<RowsState<FamilyWaitingListItem>>(loadingState)
  const [candidates, setCandidates] = useState<RowsState<FamilyQueueCandidate>>({ status: 'empty' })
  const [closures, setClosures] = useState<RowsState<CareClosure>>(loadingState)
  const [pending, setPending] = useState<RowsState<PendingItem>>(loadingState)
  const [deliveries, setDeliveries] = useState<RowsState<NutritionAdminDelivery>>(loadingState)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [professionalId, setProfessionalId] = useState('')
  const [slotStart, setSlotStart] = useState('')
  const [familyNotes, setFamilyNotes] = useState('')
  const [reason, setReason] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<ReferralPatient | null>(null)
  const [deathDate, setDeathDate] = useState('')
  const [deathTime, setDeathTime] = useState('')
  const [deathSource, setDeathSource] = useState<DeathSource>('family_caregiver')
  const [deathNotes, setDeathNotes] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('')

  async function reloadAll() {
    setFamilyQueue(loadingState())
    setClosures(loadingState())
    setPending(loadingState())
    setDeliveries(loadingState())
    const [familyResult, closureResult, pendingResult, deliveryResult] = await Promise.all([
      rpc.getFamilyWaitingList(null, 50, 0),
      closuresIntegration.loadClosures(null),
      rpc.getPendingItems(50, 0),
      rpc.getNutritionAdminDeliveries(deliveryStatus || null, 50, 0),
    ])
    setFamilyQueue(familyResult)
    setClosures(closureResult)
    setPending(pendingResult)
    setDeliveries(deliveryResult)
    return [familyResult, closureResult, pendingResult, deliveryResult].every(
      (result) => result.status !== 'error',
    )
  }

  useEffect(() => {
    void reloadAll()
    // A recarga é acionada novamente quando o filtro de entrega é alterado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryStatus])

  async function runMutation(
    key: string,
    action: () => Promise<AsyncState<unknown>>,
    success: string,
    afterReload?: () => Promise<boolean>,
  ) {
    if (busy) return
    setBusy(key)
    setFeedback(null)
    const result = await action()
    if (result.status !== 'success') {
      setFeedback(errorMessage(result))
      setBusy(null)
      return
    }
    const reloaded = afterReload ? await afterReload() : await reloadAll()
    setFeedback(reloaded ? success : 'Operação confirmada pelo backend, mas a recarga da lista canônica falhou.')
    setBusy(null)
  }

  async function loadCandidates() {
    if (!professionalId.trim() || !slotStart) {
      setFeedback('Informe o profissional e o horário da vaga para consultar a elegibilidade real.')
      return
    }
    setCandidates(loadingState())
    setFeedback(null)
    setCandidates(await rpc.getFamilyQueueCandidatesForSlot(professionalId.trim(), slotStart, 50))
  }

  async function reloadPatientContext() {
    if (!selectedPatient) return false
    const result = await rpc.searchReferralPatients(selectedPatient.full_name, 20, 0)
    if (result.status !== 'success') return false
    const current = result.data.find((patient) => patient.patient_id === selectedPatient.patient_id)
    if (!current) return false
    setSelectedPatient(current)
    return reloadAll()
  }

  const reopenReasonIsValid = reason.trim().length >= 5 && reason.trim().length <= 500
  const deathDateIsValid = Boolean(deathDate) && deathDate <= new Date().toISOString().slice(0, 10)

  return (
    <section className="gestor-route" aria-labelledby="gestor-operational-title">
      <header>
        <span>Painel Geral</span>
        <h2 id="gestor-operational-title">Pendências e Notificações</h2>
        <p>Central operacional do Gestor para providências administrativas confirmadas pelo backend.</p>
      </header>
      {feedback && <p className="gestor-feedback" role="status">{feedback}</p>}

      <section className="gestor-management-grid">
        <article className="gestor-panel">
          <h3>Central operacional</h3>
          {pending.status === 'loading' && <p>Carregando pendências...</p>}
          {pending.status === 'error' && <p role="alert">{pending.error.message}</p>}
          {pending.status === 'empty' && <p>Nenhuma pendência operacional encontrada.</p>}
          {pending.status === 'success' && <ul className="gestor-result-list">{pending.data.map((item) => (
            <li key={`${item.source_table}:${item.source_id}`}><button type="button" disabled={Boolean(busy)} onClick={() => navigate(contextPath(item.context_module), { state: { contextId: item.context_id, patientId: item.patient_id } })}>
              {item.title}<small>{item.patient_name ?? 'Sem paciente'} · {item.status} · {item.due_at ?? 'Sem prazo'}</small>
            </button></li>
          ))}</ul>}
        </article>

        <article className="gestor-panel">
          <h3>Fila de Familiares</h3>
          <div className="gestor-team-form"><label>ID do profissional de Psicologia<input value={professionalId} onChange={(event) => setProfessionalId(event.target.value)} /></label><label>Início da vaga<input type="datetime-local" value={slotStart} onChange={(event) => setSlotStart(event.target.value)} /></label><button type="button" disabled={Boolean(busy)} onClick={() => void loadCandidates()}>Consultar elegibilidade</button></div>
          {familyQueue.status === 'loading' && <p>Carregando fila de familiares...</p>}
          {familyQueue.status === 'error' && <p role="alert">{familyQueue.error.message}</p>}
          {familyQueue.status === 'success' && <ul className="gestor-result-list">{familyQueue.data.map((item, index) => {
            const waitingListId = id(item, 'waiting_list_id', 'id')
            return <li key={waitingListId || index}><strong>{text(item, 'family_member_name', 'family_name', 'patient_name')}</strong><small>{text(item, 'status', 'created_at')}</small><div><button type="button" disabled={Boolean(busy) || !waitingListId} onClick={() => void runMutation(`family-call-${waitingListId}`, () => rpc.updateFamilyWaitingListStatus(waitingListId, 'call', familyNotes.trim() || null), 'Fila de familiares recarregada após confirmação do backend.')}>Chamar</button><button type="button" disabled={Boolean(busy) || !waitingListId} onClick={() => void runMutation(`family-pause-${waitingListId}`, () => rpc.updateFamilyWaitingListStatus(waitingListId, 'pause', familyNotes.trim() || null), 'Fila de familiares recarregada após confirmação do backend.')}>Pausar</button></div></li>
          })}</ul>}
          <label>Observação administrativa<textarea value={familyNotes} onChange={(event) => setFamilyNotes(event.target.value)} /></label>
          {candidates.status === 'loading' && <p>Consultando candidatos elegíveis...</p>}
          {candidates.status === 'error' && <p role="alert">{candidates.error.message}</p>}
          {candidates.status === 'success' && <ul className="gestor-result-list">{candidates.data.map((candidate, index) => {
            const waitingListId = id(candidate, 'waiting_list_id')
            return <li key={waitingListId || index}><strong>{text(candidate, 'family_member_name', 'family_name', 'patient_name')}</strong><button type="button" disabled={Boolean(busy) || !waitingListId} onClick={() => void runMutation(`family-appointment-${waitingListId}`, () => rpc.createFamilyPsychologyAppointment({ waitingListId, professionalId: professionalId.trim(), slotStart, generalNotes: familyNotes.trim() || null }), 'Agendamento familiar confirmado e fila canônica recarregada.')}>Agendar</button></li>
          })}</ul>}
        </article>

        <article className="gestor-panel">
          <h3>Encerramentos e Reaberturas</h3>
          <label>Motivo administrativo<textarea value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} /></label>
          {closures.status === 'loading' && <p>Carregando encerramentos...</p>}
          {closures.status === 'error' && <p role="alert">{closures.error.message}</p>}
          {closures.status === 'success' && <ul className="gestor-result-list">{closures.data.map((closure, index) => {
            const closureId = id(closure, 'closure_id', 'id')
            const patientId = id(closure, 'patient_id')
            const canReopen = flag(closure, 'can_reopen')
            const cycleClosed = ['closed', 'encerrado'].includes(text(closure, 'care_cycle_status', 'cycle_status').toLowerCase())
            return <li key={closureId || index}><strong>{text(closure, 'patient_name', 'full_name')}</strong><small>{text(closure, 'specialty_name', 'status', 'closed_at')}</small>{canReopen ? <button type="button" disabled={Boolean(busy) || !reopenReasonIsValid || !closureId} onClick={() => void runMutation(`reopen-${closureId}`, () => closuresIntegration.reopenClosure(closureId, reason.trim()), 'Encerramento reaberto e lista canônica recarregada.')}>Reabrir</button> : cycleClosed ? <button type="button" disabled={Boolean(busy) || !reopenReasonIsValid || !patientId} onClick={() => void runMutation(`return-${patientId}`, () => closuresIntegration.openReturnCycle(patientId, reason.trim()), 'Novo ciclo de retorno confirmado e lista canônica recarregada.')}>Abrir retorno</button> : <small>Reabertura não autorizada pelo backend.</small>}</li>
          })}</ul>}
        </article>

        <article className="gestor-panel">
          <h3>Registrar óbito administrativo</h3>
          <PatientSearch loadPatients={(query, limit, offset) => rpc.searchReferralPatients(query, limit, offset)} onSelect={setSelectedPatient} />
          {selectedPatient && <p>Paciente selecionado: {selectedPatient.full_name} {selectedPatient.patient_number ? `· Nº CAPO ${selectedPatient.patient_number}` : ''}</p>}
          <div className="gestor-team-form"><label>Data<input type="date" max={new Date().toISOString().slice(0, 10)} value={deathDate} onChange={(event) => setDeathDate(event.target.value)} /></label><label>Horário, quando conhecido<input type="time" value={deathTime} onChange={(event) => setDeathTime(event.target.value)} /></label><label>Origem<select value={deathSource} onChange={(event) => setDeathSource(event.target.value as DeathSource)}><option value="family_caregiver">Familiar / cuidador</option><option value="health_service">Serviço de saúde</option><option value="official_document">Documento oficial</option><option value="other_authorized_institution">Outra instituição autorizada</option></select></label><label>Observação administrativa<textarea value={deathNotes} maxLength={500} onChange={(event) => setDeathNotes(event.target.value)} /></label><button type="button" disabled={Boolean(busy) || !selectedPatient || !deathDateIsValid} onClick={() => void runMutation('death', () => rpc.registerPatientDeath({ patientId: selectedPatient!.patient_id, deathDate, deathTime: deathTime || null, source: deathSource, notes: deathNotes.trim() || null }), 'Óbito administrativo confirmado e contexto real do paciente recarregado.', reloadPatientContext)}>Registrar óbito</button></div>
        </article>

        <article className="gestor-panel">
          <h3>Entregas nutricionais</h3>
          <label>Situação<select value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)}><option value="">Todas</option><option value="pending">Pendente</option><option value="in_progress">Em andamento</option><option value="completed">Concluída</option><option value="cancelled">Cancelada</option></select></label>
          {deliveries.status === 'loading' && <p>Carregando providências administrativas...</p>}
          {deliveries.status === 'error' && <p role="alert">{deliveries.error.message}</p>}
          {deliveries.status === 'empty' && <p>Nenhuma providência nutricional encontrada.</p>}
          {deliveries.status === 'success' && <ul className="gestor-result-list">{deliveries.data.map((delivery, index) => {
            const deliveryId = id(delivery, 'delivery_id', 'id')
            return <li key={deliveryId || index}><strong>{text(delivery, 'patient_name')}</strong><small>{text(delivery, 'status', 'document_author', 'revision')}</small><button type="button" disabled={Boolean(busy) || !deliveryId} onClick={() => void runMutation(`delivery-${deliveryId}`, () => rpc.manageNutritionAdminDelivery(deliveryId, 'confirm', null), 'Entrega nutricional confirmada e lista canônica recarregada.')}>Confirmar entrega</button></li>
          })}</ul>}
        </article>
      </section>
    </section>
  )
}