import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PatientSearch } from '../../components/forms/PatientSearch'
import {
  getRpcService,
  loadingState,
  type AsyncState,
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
  const [closures, setClosures] = useState<RowsState<CareClosure>>(loadingState)
  const [pending, setPending] = useState<RowsState<PendingItem>>(loadingState)
  const [deliveries, setDeliveries] = useState<RowsState<NutritionAdminDelivery>>(loadingState)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<ReferralPatient | null>(null)
  const [deathDate, setDeathDate] = useState('')
  const [deathTime, setDeathTime] = useState('')
  const [deathSource, setDeathSource] = useState<DeathSource>('family_caregiver')
  const [deathNotes, setDeathNotes] = useState('')
  const [deliveryStatus, setDeliveryStatus] = useState('')
  const [deliveryReason, setDeliveryReason] = useState('')

  async function reloadAll() {
    setClosures(loadingState())
    setPending(loadingState())
    setDeliveries(loadingState())
    const [closureResult, pendingResult, deliveryResult] = await Promise.all([
      closuresIntegration.loadClosures(null),
      rpc.getPendingItems(50, 0),
      rpc.getNutritionAdminDeliveries(deliveryStatus || null, 50, 0),
    ])
    setClosures(closureResult)
    setPending(pendingResult)
    setDeliveries(deliveryResult)
    return [closureResult, pendingResult, deliveryResult].every(
      (result) => result.status !== 'error',
    )
  }

  useEffect(() => {
    let active = true
    void Promise.all([
      closuresIntegration.loadClosures(null),
      rpc.getPendingItems(50, 0),
      rpc.getNutritionAdminDeliveries(deliveryStatus || null, 50, 0),
    ]).then(([closureResult, pendingResult, deliveryResult]) => {
      if (!active) return
      setClosures(closureResult)
      setPending(pendingResult)
      setDeliveries(deliveryResult)
    })
    return () => { active = false }
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
          <h3>Filas de Pacientes e Familiares</h3>
          <p>
            A operação usa a fila visual única do CAPO, com especialidade na linha
            do paciente e fila própria de familiares.
          </p>
          <Link to="/fila">Abrir filas operacionais</Link>
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
          <label>Motivo administrativo para cancelar ou reabrir<textarea value={deliveryReason} minLength={5} maxLength={500} onChange={(event) => setDeliveryReason(event.target.value)} /></label>
          {deliveries.status === 'loading' && <p>Carregando providências administrativas...</p>}
          {deliveries.status === 'error' && <p role="alert">{deliveries.error.message}</p>}
          {deliveries.status === 'empty' && <p>Nenhuma providência nutricional encontrada.</p>}
          {deliveries.status === 'success' && <ul className="gestor-result-list">{deliveries.data.map((delivery, index) => {
            const deliveryId = id(delivery, 'delivery_id', 'id')
            const status = text(delivery, 'status').toLowerCase()
            const requiresReason = ['cancel', 'reopen'] as const
            const canUseReason = deliveryReason.trim().length >= 5
            const actionButton = (action: typeof requiresReason[number] | 'start' | 'complete', label: string) => <button type="button" disabled={Boolean(busy) || !deliveryId || (requiresReason.includes(action as typeof requiresReason[number]) && !canUseReason)} onClick={() => void runMutation(`delivery-${action}-${deliveryId}`, () => rpc.manageNutritionAdminDelivery(deliveryId, action, requiresReason.includes(action as typeof requiresReason[number]) ? deliveryReason.trim() : null), 'Entrega nutricional atualizada e lista canônica recarregada.')}>{label}</button>
            return <li key={deliveryId || index}><strong>{text(delivery, 'patient_name')}</strong><small>{text(delivery, 'status', 'document_author', 'revision')}</small><div>{status === 'pending' && <>{actionButton('start', 'Iniciar')}{actionButton('complete', 'Concluir')}{actionButton('cancel', 'Cancelar')}</>}{status === 'in_progress' && <>{actionButton('complete', 'Concluir')}{actionButton('cancel', 'Cancelar')}</>}{['completed', 'cancelled'].includes(status) && actionButton('reopen', 'Reabrir')}</div></li>
          })}</ul>}
        </article>
      </section>
    </section>
  )
}
