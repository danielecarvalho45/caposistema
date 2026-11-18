import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService, type AgendaScheduleSlot } from '../../lib/supabase/rpc'
import { AgendaBlockIndicator } from '../../components/icons/AgendaBlockIndicator'
import { CapoIcon } from '../../components/icons/CapoIcon'
import './daily-team-agenda.css'

type LinkCancellation = AgendaScheduleSlot & { link_cancelled: true; appointment_kind: string }
type Status = { contacts: Record<string, string>; decisions: Record<string, string>; error: string | null }

function asRows(value: unknown, key?: string): Record<string, unknown>[] {
  const rows = key && value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key] : value
  return Array.isArray(rows)
    ? rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    : []
}
function clock(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.slice(11, 16) :
    new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', hourCycle: 'h23' }).format(date)
}
function orderedSlots<T extends AgendaScheduleSlot>(slots: readonly T[]): T[] {
  return [...slots].sort((a, b) =>
    Date.parse(a.slot_start) - Date.parse(b.slot_start) ||
    a.professional_name.localeCompare(b.professional_name, 'pt-BR') ||
    (a.patient_name ?? '').localeCompare(b.patient_name ?? '', 'pt-BR'))
}
function stateLabel(slot: AgendaScheduleSlot | LinkCancellation, status: Status) {
  if ('link_cancelled' in slot && slot.link_cancelled) return 'Solicitou remarcação pelo link'
  if (slot.slot_status !== 'agendado' || !slot.appointment_id) return null
  const decision = status.decisions[slot.appointment_id]
  const contact = status.contacts[slot.appointment_id]
  if (decision === 'comparecera') return 'Avisado · Confirmado pelo link'
  if (decision === 'nao_comparecera' || contact === 'solicitou_cancelamento' || contact === 'solicitou_remarcacao')
    return 'Solicitou remarcação'
  if (contact === 'confirmou') return 'Avisado · Confirmado manualmente'
  if (contact === 'avisado') return 'Avisado · Aguardando confirmação'
  if (contact === 'sem_resposta') return 'Contato realizado · Sem resposta'
  return 'Confirmação pendente'
}
export function DailyTeamAgendaRows({ slots }: Readonly<{ slots: readonly AgendaScheduleSlot[] }>) {
  const [state, setState] = useState<Status>({ contacts: {}, decisions: {}, error: null })
  const [busy, setBusy] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [cancelledLinks, setCancelledLinks] = useState<readonly LinkCancellation[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const day = slots[0]?.slot_date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  // Os estados de confirmação são independentes da presença/falta assistencial.
  useEffect(() => {
    if (!day) return
    let active = true
    setReady(false)
    const rpc = getRpcService()
    void Promise.all([
      rpc.getAppointmentPrevisitContacts(day, day, null),
      getSupabaseClient().rpc('get_patient_confirmation_states_for_interface', {
        p_start_date: day, p_end_date: day, p_professional_id: null,
      }),
      getSupabaseClient().rpc('get_home_link_reschedule_for_interface', { p_date: day }),
    ]).then(([contactsResult, linkResult, cancelledResult]) => {
      if (!active) return
      if (contactsResult.status === 'error' || linkResult.error || cancelledResult.error) {
        setState({ contacts: {}, decisions: {}, error: contactsResult.status === 'error'
          ? contactsResult.error.message : linkResult.error?.message ?? cancelledResult.error?.message ?? 'Erro ao consultar confirmações' })
        setCancelledLinks([])
        setReady(true)
        return
      }
      const contacts: Record<string, string> = {}
      for (const row of asRows(contactsResult.status === 'success' ? contactsResult.data : null, 'items')) {
        if (typeof row.appointment_id === 'string' && typeof row.result === 'string')
          contacts[row.appointment_id] = row.result
      }
      const decisions: Record<string, string> = {}
      for (const row of asRows(linkResult.data)) {
        if (typeof row.appointment_id === 'string' && typeof row.decision === 'string')
          decisions[row.appointment_id] = row.decision
      }
      const cancellations = asRows(cancelledResult.data, 'items')
        .filter((row) => typeof row.appointment_id === 'string' &&
          typeof row.slot_start === 'string' && typeof row.professional_id === 'string' &&
          typeof row.patient_name === 'string' && typeof row.professional_name === 'string')
        .map((row) => ({
          appointment_id: String(row.appointment_id),
          patient_id: typeof row.patient_id === 'string' ? row.patient_id : null,
          patient_name: String(row.patient_name),
          professional_id: String(row.professional_id),
          professional_name: String(row.professional_name),
          slot_date: day, slot_start: String(row.slot_start),
          slot_end: String(row.slot_end ?? row.slot_start),
          weekday: -1, duration_minutes: 0, slot_status: 'agendado' as const,
          appointment_type: 'Solicitação pelo link', block_type: null,
          link_cancelled: true as const,
          appointment_kind: String(row.appointment_kind),
        }))
      setCancelledLinks(cancellations)
      setState({ contacts, decisions, error: null })
      setReady(true)
    }).catch((error: unknown) => {
      if (active) {
        setState({ contacts: {}, decisions: {}, error: error instanceof Error ? error.message : 'Falha ao consultar confirmações' })
        setCancelledLinks([])
        setReady(true)
      }
    })
    return () => { active = false }
  }, [day])

  async function confirmManual(appointmentId: string) {
    if (busy || state.error) return
    setBusy(appointmentId)
    setFeedback(null)
    const result = await getRpcService().registerAppointmentPrevisitContact(
      appointmentId, 'confirmou', 'Confirmação prévia registrada manualmente pelo Administrativo.')
    if (result.status === 'success' && (result.data as Record<string, unknown>)?.success !== false) {
      setState((current) => ({ ...current, contacts: { ...current.contacts, [appointmentId]: 'confirmou' } }))
      setFeedback('Confirmação prévia manual registrada. Não corresponde à presença no atendimento.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a operação.')
    }
    setBusy(null)
  }

  return (
    <div className="capo-team-day-list" aria-label="Agenda do dia em ordem de horário">
      {state.error && <p role="alert">Não foi possível verificar as confirmações; confirmação manual indisponível. {state.error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {orderedSlots([...slots, ...cancelledLinks]).map((slot) => {
        const id = slot.appointment_id
        const decision = id ? state.decisions[id] : null
        const contact = id ? state.contacts[id] : null
        const isLinkCancellation = 'link_cancelled' in slot && slot.link_cancelled === true
        const confirmed = decision === 'comparecera' || contact === 'confirmou'
        const requestedChange = isLinkCancellation || decision === 'nao_comparecera' || contact === 'solicitou_cancelamento' || contact === 'solicitou_remarcacao'
        const canConfirm = slot.slot_status === 'agendado' && !!id && !!slot.patient_id && !confirmed && !requestedChange && !state.error && ready
        const canReschedule = ready && !state.error && slot.slot_status === 'agendado' && !!id && !!slot.patient_id && (!confirmed || requestedChange)
        return (
          <div className={`capo-team-day-entry is-${slot.slot_status}`} key={`${slot.professional_id}:${slot.slot_start}:${id ?? ''}`}>
            <div className="capo-team-day-primary">
              <strong className="capo-team-day-time">{clock(slot.slot_start)}</strong>
              <span className="capo-team-day-patient">
                {slot.slot_status === 'agendado' ? slot.patient_name ?? 'Horário ocupado' :
                  slot.slot_status === 'livre' ? 'Horário livre' :
                  slot.block_type ? <AgendaBlockIndicator type={slot.block_type} /> : 'Horário bloqueado'}
              </span>
              {slot.slot_status === 'agendado' && <small className="capo-team-day-state">{ready ? state.error ? 'Confirmação indisponível' : stateLabel(slot, state) : 'Consultando confirmação…'}</small>}
            </div>
            <div className="capo-team-day-secondary">
              <span className="capo-team-day-professional">{slot.professional_name}</span>
              <div className="capo-team-day-actions">
                {slot.slot_status === 'agendado' && id && (
                  <>
                    <button type="button" className="capo-team-day-action" title="Confirmar resposta por WhatsApp ou telefone"
                      aria-label={`Confirmar manualmente ${slot.patient_name ?? 'paciente'}`}
                      disabled={!canConfirm || busy !== null}
                      onClick={() => void confirmManual(id)}><CapoIcon name="check" size={15} /> Confirmar</button>
                    {canReschedule ? (
                      <Link className="capo-team-day-action" to="/agenda"
                        state={isLinkCancellation
                          ? ('appointment_kind' in slot && slot.appointment_kind === 'familiar'
                            ? { origin: 'family_link_cancellation', appointmentId: id }
                            : { origin: 'patient_link_cancellation', appointmentId: id, patientId: slot.patient_id })
                          : { origin: 'home_reschedule_appointment', appointmentId: id,
                            patientId: slot.patient_id, patientName: slot.patient_name ?? '',
                            professionalId: slot.professional_id, slotDate: slot.slot_date }}><CapoIcon name="calendar" size={15} /> Remarcar</Link>
                    ) : <button type="button" className="capo-team-day-action" disabled><CapoIcon name="calendar" size={15} /> Remarcar</button>}
                  </>
                )}
                {slot.slot_status === 'livre' && (
                  <Link className="capo-team-day-action" to="/agenda"
                    state={{ origin: 'home_free_slot', professionalId: slot.professional_id,
                      slotDate: slot.slot_date, slotStart: slot.slot_start }}>Agendar</Link>
                )}
                {slot.slot_status === 'agendado' && !!id && !!slot.patient_id && ready && !state.error && !confirmed && !requestedChange && (
                  <Link className="capo-team-day-action" to="/agenda"
                    state={{ origin: 'home_previsit_appointment', appointmentId: id,
                      professionalId: slot.professional_id, slotDate: slot.slot_date }}>Avisar</Link>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
