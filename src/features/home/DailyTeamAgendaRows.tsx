import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService, type AgendaScheduleSlot } from '../../lib/supabase/rpc'
import { AgendaBlockIndicator } from '../../components/icons/AgendaBlockIndicator'
import { CapoIcon } from '../../components/icons/CapoIcon'
import { ManualConfirmationCorrection } from '../agenda/ManualConfirmationCorrection'
import './daily-team-agenda.css'

type LinkCancellation = AgendaScheduleSlot & { link_cancelled: true; appointment_kind: string }
type Status = { contacts: Record<string, string>; decisions: Record<string, string>; familyIds: Record<string, boolean>; error: string | null }

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
  if (contact === 'correcao_pendente') return 'Confirmação manual corrigida · Aguardando resposta'
  if (contact === 'avisado') return 'Avisado · Aguardando confirmação'
  if (contact === 'sem_resposta') return 'Contato realizado · Sem resposta'
  return 'Confirmação pendente'
}
export function DailyTeamAgendaRows({ slots, day: selectedDay, mode = 'all', summaryLabel = 'Horários disponíveis hoje' }: Readonly<{ slots: readonly AgendaScheduleSlot[]; day?: string; mode?: 'all' | 'today' | 'next'; summaryLabel?: string }>) {
  const [state, setState] = useState<Status>({ contacts: {}, decisions: {}, familyIds: {}, error: null })
  const [busy, setBusy] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [cancelledLinks, setCancelledLinks] = useState<readonly LinkCancellation[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const day = selectedDay ?? slots[0]?.slot_date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const upcoming = new Date().getTime()
  const freeToday = slots.filter((slot) => slot.slot_status === 'livre' && Date.parse(slot.slot_start) > upcoming)
  const professionalsWithAvailability = Array.from(
    new Map<string, { id: string; name: string }>(
      freeToday.map((slot): [string, { id: string; name: string }] => [
        slot.professional_id, { id: slot.professional_id, name: slot.professional_name },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const [groupRows, setGroupRows] = useState<readonly { group_id: string; name: string; capacity: number; date: string; start: string; end: string; blocked?: boolean; professional_id: string; professional_name: string; participants: readonly { appointment_id: string; patient_name: string; attendance_status: string }[] }[]>([])
  const [groupError, setGroupError] = useState(false)
  useEffect(() => {
    let active = true
    setGroupRows([])
    setGroupError(false)
    const professionals = Array.from(new Map(slots.filter((slot) => slot.block_type === 'outro')
      .map((slot) => [slot.professional_id, slot.professional_name] as const)))
    if (professionals.length) {
      void Promise.all(professionals.map(async ([id, name]) => ({
        id, name, result: await getRpcService().getPsychologyGroupSessions(id, day, day),
      }))).then((results) => {
        if (!active) return
        setGroupRows(results.flatMap(({ id, name, result }) => result.status === 'success'
          ? result.data.map((session) => ({ ...session, professional_id: id, professional_name: name })) : []))
        setGroupError(results.some(({ result }) => result.status === 'error'))
      }).catch(() => { if (active) setGroupError(true) })
    }
    return () => { active = false }
  }, [slots, day])
  const visibleSlots = mode === 'today' ? slots.filter((slot) => slot.slot_status === 'agendado') :
    mode === 'next' ? slots.filter((slot) => slot.slot_status !== 'bloqueado') : slots
  // Os estados de confirmação são independentes da presença/falta assistencial.
  useEffect(() => {
    if (!day) return
    let active = true
    setReady(false)
    setCancelledLinks([])
    setState({ contacts: {}, decisions: {}, familyIds: {}, error: null })
    const rpc = getRpcService()
    void Promise.all([
      rpc.getAppointmentPrevisitContacts(day, day, null),
      getSupabaseClient().rpc('get_patient_confirmation_states_for_interface', {
        p_start_date: day, p_end_date: day, p_professional_id: null,
      }),
      getSupabaseClient().rpc('get_home_link_reschedule_for_interface', { p_date: day }),
      getSupabaseClient().rpc('get_family_psychology_agenda_cards_for_interface', {
        p_start_date: day, p_end_date: day, p_professional_id: null,
      }),
    ]).then(([contactsResult, linkResult, cancelledResult, familyResult]) => {
      if (!active) return
      if (contactsResult.status === 'error' || linkResult.error || cancelledResult.error || familyResult.error) {
        setState({ contacts: {}, decisions: {}, familyIds: {}, error: contactsResult.status === 'error'
          ? contactsResult.error.message : linkResult.error?.message ?? cancelledResult.error?.message ?? familyResult.error?.message ?? 'Erro ao consultar confirmações' })
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
      const familyIds: Record<string, boolean> = {}
      for (const row of asRows(familyResult.data)) {
        const id = row.appointment_id
        if (typeof id !== 'string') continue
        familyIds[id] = true
        if (typeof row.last_notice_result === 'string') contacts[id] = row.last_notice_result
        if (typeof row.confirmation_decision === 'string') decisions[id] = row.confirmation_decision
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
      setState({ contacts, decisions, familyIds, error: null })
      setReady(true)
    }).catch((error: unknown) => {
      if (active) {
        setState({ contacts: {}, decisions: {}, familyIds: {}, error: error instanceof Error ? error.message : 'Falha ao consultar confirmações' })
        setCancelledLinks([])
        setReady(true)
      }
    })
    return () => { active = false }
  }, [day])

  async function confirmManual(appointmentId: string, family = false) {
    if (busy || state.error) return
    setBusy(appointmentId)
    setFeedback(null)
    try {
      const success = family
        ? await getSupabaseClient().rpc('register_family_psychology_previsit_contact_for_interface', {
            p_appointment_id: appointmentId, p_result: 'confirmou',
          }).then(({ data, error }) => {
            if (error) throw error
            return Boolean(data && typeof data === 'object' && !Array.isArray(data) && data.success === true)
          })
        : await getRpcService().registerAppointmentPrevisitContact(
            appointmentId, 'confirmou', 'Confirmação prévia registrada manualmente pelo Administrativo.'
          ).then((result) => result.status === 'success' &&
            Boolean(result.data && typeof result.data === 'object' &&
              (result.data as Record<string, unknown>).success === true))
      if (success) {
        setState((current) => ({ ...current, contacts: { ...current.contacts, [appointmentId]: 'confirmou' } }))
        setFeedback('Confirmação prévia manual registrada. Não corresponde à presença no atendimento.')
      } else {
        setFeedback('O banco não confirmou a operação. Nenhum estado foi alterado na agenda.')
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao registrar confirmação manual.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="capo-team-day-list" aria-label="Agenda do dia em ordem de horário">
      {state.error && <p role="alert">Não foi possível verificar as confirmações; confirmação manual indisponível. {state.error}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {groupError && <p role="alert">Não foi possível consultar os atendimentos em grupo.</p>}
      {[
        ...groupRows.filter((group) => group.participants.length > 0).map((group) => ({ time: group.start, professional: group.professional_name, node: (
        <div className="capo-team-day-entry is-agendado" key={`grupo:${group.group_id}:${group.date}`}>
          <div className="capo-team-day-primary">
            <strong className="capo-team-day-time">{clock(group.start)}–{clock(group.end)}</strong>
            <span className="capo-team-day-patient">{group.name} · {group.participants.length}/{group.capacity} vagas{group.blocked ? ' · Grupo bloqueado' : ''}</span>
          </div>
          <div className="capo-team-day-secondary">
            <span className="capo-team-day-professional">{group.professional_name}</span>
            <Link className="capo-team-day-action" to="/agenda" state={{ origin: 'home_professional_schedule', professionalId: group.professional_id, slotDate: group.date }}>Consultar grupo</Link>
          </div>
          {group.participants.map((person) => <div className="capo-team-day-secondary" key={person.appointment_id}><span>{person.patient_name}</span><small>{person.attendance_status}</small></div>)}
        </div>
        ) })),
        ...orderedSlots([...visibleSlots.filter((slot) => !groupRows.some((group) =>
          group.participants.length > 0 && group.professional_id === slot.professional_id &&
          slot.block_type === 'outro' && Date.parse(group.start) === Date.parse(slot.slot_start) &&
          Date.parse(group.end) === Date.parse(slot.slot_end))), ...cancelledLinks]).map((slot) => {
        const id = slot.appointment_id
        const decision = id ? state.decisions[id] : null
        const contact = id ? state.contacts[id] : null
        const isLinkCancellation = 'link_cancelled' in slot && slot.link_cancelled === true
        const isFamily = !!id && state.familyIds[id] === true
        const confirmed = decision === 'comparecera' || contact === 'confirmou'
        const requestedChange = isLinkCancellation || decision === 'nao_comparecera' || contact === 'solicitou_cancelamento' || contact === 'solicitou_remarcacao'
        const canConfirm = slot.slot_status === 'agendado' && !!id && (!!slot.patient_id || isFamily) && !confirmed && !requestedChange && !state.error && ready
        const canReschedule = slot.slot_status === 'agendado' && !!id && (!!slot.patient_id || isFamily)
        // Aviso/confirmação prévia não muda a elegibilidade de remarcação administrativa.
        return { time: slot.slot_start, professional: slot.professional_name, node: (
          <div className={`capo-team-day-entry is-${slot.slot_status}`} key={`${slot.professional_id}:${slot.slot_start}:${id ?? ''}`}>
            <div className="capo-team-day-primary">
              <strong className="capo-team-day-time">{clock(slot.slot_start)}</strong>
              <span className="capo-team-day-patient">
                {slot.slot_status === 'agendado' && id
                  ? <Link to="/agenda" className="capo-team-day-patient-link"
                      state={isLinkCancellation
                        ? ('appointment_kind' in slot && slot.appointment_kind === 'familiar'
                          ? { origin: 'family_link_cancellation', appointmentId: id }
                          : { origin: 'patient_link_cancellation', appointmentId: id, patientId: slot.patient_id })
                        : undefined}>{slot.patient_name ?? 'Horário ocupado'}</Link>
                  : slot.slot_status === 'livre' ? 'Horário livre' :
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
                      onClick={() => void confirmManual(id, isFamily)}><CapoIcon name="check" size={15} /> Confirmar</button>
                    {contact === 'confirmou' && decision !== 'comparecera' && !requestedChange && (
                      <ManualConfirmationCorrection appointmentId={id} kind={isFamily ? 'family' : 'patient'}
                        patientName={slot.patient_name ?? 'paciente'} disabled={busy !== null}
                        onCorrected={(result) => {
                          setState((current) => ({
                            ...current, contacts: { ...current.contacts, [id]: result },
                          }))
                          setFeedback('Confirmação corrigida. Consulta mantida; histórico preservado.')
                        }} />
                    )}
                    {canReschedule ? (
                      <Link className="capo-team-day-action" to="/agenda"
                        state={isLinkCancellation
                          ? ('appointment_kind' in slot && slot.appointment_kind === 'familiar'
                            ? { origin: 'family_link_cancellation', appointmentId: id }
                            : { origin: 'patient_link_cancellation', appointmentId: id, patientId: slot.patient_id })
                          : isFamily
                            ? { origin: 'home_family_reschedule_appointment', appointmentId: id,
                                professionalId: slot.professional_id, slotDate: slot.slot_date }
                            : { origin: 'home_reschedule_appointment', appointmentId: id,
                                patientId: slot.patient_id, patientName: slot.patient_name ?? '',
                                professionalId: slot.professional_id, slotDate: slot.slot_date }}><CapoIcon name="calendar" size={15} /> Remarcar</Link>
                    ) : <button type="button" className="capo-team-day-action" disabled><CapoIcon name="calendar" size={15} /> Remarcar</button>}
                  </>
                )}
                {slot.slot_status === 'agendado' && !!id && !isLinkCancellation && (
                  <Link className="capo-team-day-action capo-team-day-cancel" to="/agenda"
                    state={{ origin: 'home_cancel_appointment', appointmentId: id,
                      professionalId: slot.professional_id, slotDate: slot.slot_date }}>
                    <CapoIcon name="block" size={15} /> Cancelar
                  </Link>
                )}
                {slot.slot_status === 'livre' && (
                  <Link className="capo-team-day-action" to="/agenda"
                    state={{ origin: 'home_free_slot', professionalId: slot.professional_id,
                      slotDate: slot.slot_date, slotStart: slot.slot_start }}>Agendar</Link>
                )}
                {slot.slot_status === 'agendado' && !!id && (!!slot.patient_id || isFamily) && ready && !state.error && !confirmed && !requestedChange && (
                  <Link className="capo-team-day-action" to="/agenda"
                    state={isFamily ? { origin: 'home_family_notice_appointment', appointmentId: id,
                      professionalId: slot.professional_id, slotDate: slot.slot_date } :
                      { origin: 'home_previsit_appointment', appointmentId: id,
                      professionalId: slot.professional_id, slotDate: slot.slot_date }}>Avisar</Link>
                )}
              </div>
            </div>
          </div>
        ) }
      })].sort((a, b) => Date.parse(a.time) - Date.parse(b.time) || a.professional.localeCompare(b.professional, 'pt-BR')).map((entry) => entry.node)}
      {mode === 'today' && (
        <section className="capo-today-free-summary" aria-label="Profissionais com horários disponíveis neste dia">
          <h4>{summaryLabel}</h4>
          {professionalsWithAvailability.length === 0 ? (
            <p>Sem horários livres disponíveis.</p>
          ) : (
            <ul>
              {professionalsWithAvailability.map((professional) => (
                <li key={professional.id}>
                  <span>{professional.name} · horários disponíveis</span>
                  <Link to="/agenda" state={{ origin: 'home_professional_schedule', professionalId: professional.id, slotDate: day }}>
                    Consultar agenda
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
