import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getRpcService,
  loadingState,
  type AgendaAppointment,
  type AvailableAppointmentSlot,
  type AsyncState,
  type ReschedulableAppointment,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { OwnAgendaManager } from './OwnAgendaManager'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import './agenda-page.css'

type AgendaView = 'day' | 'week' | 'month'

type AgendaLoader = (
  startDate: string,
  endDate: string,
  professionalId: string | null,
) => Promise<AsyncState<readonly AgendaAppointment[]>>

const defaultAgendaLoader: AgendaLoader = (
  startDate,
  endDate,
  professionalId,
) => getRpcService().getAgenda(startDate, endDate, professionalId)

function dateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function agendaBounds(anchor: string, view: AgendaView) {
  const start = localDate(anchor)
  const end = new Date(start)

  if (view === 'week') {
    const weekday = start.getDay() || 7
    start.setDate(start.getDate() - weekday + 1)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  } else if (view === 'month') {
    start.setDate(1)
    end.setMonth(end.getMonth() + 1, 0)
  }

  return { startDate: dateInputValue(start), endDate: dateInputValue(end) }
}

function moveAnchor(anchor: string, view: AgendaView, direction: -1 | 1) {
  const date = localDate(anchor)
  if (view === 'day') date.setDate(date.getDate() + direction)
  if (view === 'week') date.setDate(date.getDate() + 7 * direction)
  if (view === 'month') date.setMonth(date.getMonth() + direction)
  return dateInputValue(date)
}

function formatPeriod(startDate: string, endDate: string, view: AgendaView) {
  const formatter = new Intl.DateTimeFormat(
    'pt-BR',
    view === 'month'
      ? { month: 'long', year: 'numeric' }
      : { day: '2-digit', month: '2-digit', year: 'numeric' },
  )
  if (view === 'month' || startDate === endDate) {
    return formatter.format(localDate(startDate))
  }
  return `${formatter.format(localDate(startDate))} a ${formatter.format(localDate(endDate))}`
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
}

function appointmentDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return dateInputValue(date)
}

function formatTimeRange(appointment: AgendaAppointment) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const start = new Date(appointment.appointment_date)
  if (Number.isNaN(start.getTime())) return appointment.appointment_date

  const startLabel = formatter.format(start)
  if (!appointment.appointment_end) return startLabel

  const end = new Date(appointment.appointment_end)
  return Number.isNaN(end.getTime())
    ? startLabel
    : `${startLabel}–${formatter.format(end)}`
}

function datesBetween(startDate: string, endDate: string) {
  const dates: string[] = []
  const cursor = localDate(startDate)
  const end = localDate(endDate)
  while (cursor <= end) {
    dates.push(dateInputValue(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function appointmentsForDay(
  appointments: readonly AgendaAppointment[],
  day: string,
) {
  return appointments.filter(
    (appointment) => appointmentDay(appointment.appointment_date) === day,
  )
}

type PatientSpecialtiesState = AsyncState<readonly { specialty_id: string; specialty_name: string }[]>
const defaultPatientSpecialtiesLoader = (patientId: string) => getRpcService().getPatientCareSpecialties(patientId)
function specialtyText(state: PatientSpecialtiesState) {
  if (state.status === 'success') return `Especialidades: ${state.data.map((item) => item.specialty_name).join(', ') || 'nenhuma retornada'}`
  if (state.status === 'loading') return 'Consultando especialidades…'
  if (state.status === 'error') return 'Especialidades indisponíveis'
  return 'Nenhuma especialidade retornada'
}

function AppointmentTable({
  appointments,
  includeDate = true,
  showSpecialty = true,
  onAttendance,
  busyAppointmentId,
  patientSpecialties,
}: Readonly<{
  appointments: readonly AgendaAppointment[]
  includeDate?: boolean
  showSpecialty?: boolean
  onAttendance?: (appointmentId: string, action: string) => void
  busyAppointmentId?: string | null
  patientSpecialties?: Readonly<Record<string, PatientSpecialtiesState>>
}>) {
  return (
    <div className="assistential-table-wrap">
      <table className="assistential-table">
        <caption>{appointments.length} agendamento(s)</caption>
        <thead>
          <tr>
            <th scope="col">{includeDate ? 'Data e hora' : 'Horário'}</th>
            <th scope="col">Paciente</th>
            {onAttendance && <th scope="col">Ações</th>}
            <th scope="col">Profissional</th>
            {showSpecialty && <th scope="col">Especialidade</th>}
            <th scope="col">Tipo</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.appointment_id}>
              <td>
                {includeDate
                  ? formatDateTime(appointment.appointment_date)
                  : formatTimeRange(appointment)}
              </td>
              <td>{appointment.patient_name}{patientSpecialties?.[appointment.patient_id] && <small className="agenda-patient-specialties">{specialtyText(patientSpecialties[appointment.patient_id])}</small>}</td>
              {onAttendance && (
                <td>
                  <button type="button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'confirmado')}>Confirmar</button>
                  <button type="button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'faltou')}>Falta</button>
                </td>
              )}
              <td>{appointment.professional_name}</td>
              {showSpecialty && (
                <td>{appointment.specialty_name ?? 'Não informada'}</td>
              )}
              <td>{appointment.appointment_type}</td>
              <td>{appointment.attendance_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AgendaResults({
  appointments,
  startDate,
  endDate,
  view,
  showSpecialty,
  onAttendance,
  busyAppointmentId,
  patientSpecialties,
}: Readonly<{
  appointments: readonly AgendaAppointment[]
  startDate: string
  endDate: string
  view: AgendaView
  showSpecialty: boolean
  onAttendance?: (appointmentId: string, action: string) => void
  busyAppointmentId?: string | null
  patientSpecialties?: Readonly<Record<string, PatientSpecialtiesState>>
}>) {
  if (view === 'day') {
    return (
      <AppointmentTable
        appointments={appointments}
        showSpecialty={showSpecialty}
        onAttendance={onAttendance}
        busyAppointmentId={busyAppointmentId}
        patientSpecialties={patientSpecialties}
      />
    )
  }

  const days = datesBetween(startDate, endDate)
  if (view === 'week') {
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    })
    return (
      <div className="agenda-week" aria-label="Agenda da semana">
        {days.map((day) => {
          const dayAppointments = appointmentsForDay(appointments, day)
          return (
            <article className="agenda-week-day" key={day}>
              <h3>{dateFormatter.format(localDate(day))}</h3>
              {dayAppointments.length > 0 ? (
                <AppointmentTable
                  appointments={dayAppointments}
                  includeDate={false}
                  showSpecialty={showSpecialty}
                  onAttendance={onAttendance}
                  busyAppointmentId={busyAppointmentId}
                  patientSpecialties={patientSpecialties}
                />
              ) : (
                <p>Nenhum atendimento neste dia.</p>
              )}
            </article>
          )
        })}
      </div>
    )
  }

  const first = localDate(startDate)
  const leadingDays = (first.getDay() + 6) % 7
  const calendarStart = new Date(first)
  calendarStart.setDate(calendarStart.getDate() - leadingDays)
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart)
    date.setDate(date.getDate() + index)
    return dateInputValue(date)
  })

  return (
    <div className="agenda-month" aria-label="Agenda do mês">
      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((weekday) => (
        <strong className="agenda-month-weekday" key={weekday}>
          {weekday}
        </strong>
      ))}
      {calendarDays.map((day) => {
        const dayAppointments = appointmentsForDay(appointments, day)
        const outsideMonth = localDate(day).getMonth() !== first.getMonth()
        return (
          <article
            className={`agenda-month-day${outsideMonth ? ' is-outside' : ''}`}
            key={day}
          >
            <time dateTime={day}>{localDate(day).getDate()}</time>
            {dayAppointments.map((appointment) => (
              <div
                className="agenda-month-appointment"
                key={appointment.appointment_id}
              >
                <strong>{formatTimeRange(appointment)}</strong>
                <span>{appointment.patient_name}</span>
                {patientSpecialties?.[appointment.patient_id] && <small>{specialtyText(patientSpecialties[appointment.patient_id])}</small>}
                <small>
                  {showSpecialty
                    ? appointment.specialty_name ?? appointment.appointment_type
                    : appointment.appointment_type}
                </small>
              </div>
            ))}
          </article>
        )
      })}
    </div>
  )
}

type SchedulingCatalogRow = Readonly<{
  specialty_id: string
  specialty_name: string
  professional_id: string
  professional_name: string
  function_title: string | null
  professional_registration: string | null
  is_primary: boolean
}>

function schedulingCatalogRows(value: unknown): readonly SchedulingCatalogRow[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is SchedulingCatalogRow => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false
    const row = item as Record<string, unknown>
    return typeof row.specialty_id === 'string' &&
      typeof row.specialty_name === 'string' &&
      typeof row.professional_id === 'string' &&
      typeof row.professional_name === 'string'
  })
}

export function AgendaPage({
  accessContext,
  loadAgenda = defaultAgendaLoader,
  showSpecialty = true,
  onConfirmed,
  loadPatientSpecialties = defaultPatientSpecialtiesLoader,
}: Readonly<{
  accessContext: AccessContext
  loadAgenda?: AgendaLoader
  showSpecialty?: boolean
  onConfirmed?: (appointment: AgendaAppointment) => void
  loadPatientSpecialties?: (patientId: string) => Promise<AsyncState<unknown>>
}>) {
  const [view, setView] = useState<AgendaView>('day')
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('')
  const [schedulingCatalog, setSchedulingCatalog] = useState<AsyncState<unknown>>(loadingState)
  const [selectedSlotStart, setSelectedSlotStart] = useState('')
  const [slotResult, setSlotResult] = useState<{ key: string; rows: readonly AvailableAppointmentSlot[] } | null>(null)
  const [appointmentPatientQuery, setAppointmentPatientQuery] = useState('')
  const [appointmentPatientId, setAppointmentPatientId] = useState('')
  const [appointmentPatients, setAppointmentPatients] = useState<readonly { patient_id: string; full_name: string; patient_number: string | null; cms: string | null }[]>([])
  const [appointmentType, setAppointmentType] = useState('')
  const [appointmentOrigin, setAppointmentOrigin] = useState('')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [appointmentFeedback, setAppointmentFeedback] = useState<string | null>(null)
  const [lastScheduledContact, setLastScheduledContact] = useState<Readonly<{
    patientId: string
    patientName: string
    professionalName: string
    slotStart: string
  }> | null>(null)
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [attendanceReason, setAttendanceReason] = useState('')
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null)
  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [showOwnAgendaManager, setShowOwnAgendaManager] = useState(false)
  const [reschedulableResult, setReschedulableResult] = useState<{ key: string; rows: readonly ReschedulableAppointment[] } | null>(null)
  const [selectedReschedulableId, setSelectedReschedulableId] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleOrigin, setRescheduleOrigin] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [anchorDate, setAnchorDate] = useState(() => dateInputValue(new Date()))
  const [state, setState] =
    useState<AsyncState<readonly AgendaAppointment[]>>(loadingState)
  const [specialtyResult, setSpecialtyResult] = useState<{ agenda: AsyncState<readonly AgendaAppointment[]>; byPatient: Record<string, AsyncState<readonly { specialty_id: string; specialty_name: string }[]>> } | null>(null)
  const requestSequence = useRef(0)
  const { startDate, endDate } = agendaBounds(anchorDate, view)
  const roleCodes = accessContext.roles.map((role) => role.code)
  const isProfessional =
    Boolean(accessContext.professional_id) &&
    roleCodes.includes('profissional')
  const canAccess = roleCodes.some((role) =>
    ['administrador', 'administrativo_operacional', 'coordenador', 'profissional'].includes(role),
  )
  const professionalId = isProfessional
    ? accessContext.professional_id
    : selectedProfessionalId || null
  const effectiveSpecialties = accessContext.specialties ?? []
  const contextHasSingleSpecialty = effectiveSpecialties.length === 1
  const shouldShowSpecialty = showSpecialty && !contextHasSingleSpecialty
  const pendingSpecialties: PatientSpecialtiesState = { status: 'loading' }
  const rescheduleProfessionalId = isProfessional
    ? accessContext.professional_id ?? ''
    : selectedProfessionalId
  const slotKey = `${rescheduleProfessionalId}:${anchorDate}`
  const availableSlots =
    rescheduleProfessionalId && slotResult?.key === slotKey ? slotResult.rows : []
  const reschedulableKey = isProfessional
    ? `own:${rescheduleProfessionalId}:${anchorDate}`
    : `${appointmentPatientId}:${selectedProfessionalId}:${anchorDate}`
  const reschedulableAppointments =
    showRescheduleForm &&
    rescheduleProfessionalId &&
    reschedulableResult?.key === reschedulableKey
      ? reschedulableResult.rows
      : []
  const validSlotStart = availableSlots.some((slot) => slot.slot_start === selectedSlotStart) ? selectedSlotStart : ''
  const validReschedulableId = reschedulableAppointments.some((item) => item.appointment_id === selectedReschedulableId) ? selectedReschedulableId : ''
  const patientSpecialties: Record<string, PatientSpecialtiesState> = state.status === 'success' && isProfessional
    ? Object.fromEntries([...new Set(state.data.map((item) => item.patient_id))].map((id) => [id, specialtyResult?.agenda === state ? specialtyResult.byPatient[id] ?? pendingSpecialties : pendingSpecialties]))
    : {}
  useEffect(() => {
    if (!isProfessional || !roleCodes.includes('profissional') || state.status !== 'success') {
      return
    }
    let active = true
    const ids = [...new Set(state.data.map((item) => item.patient_id))]
    void (async () => {
      for (let offset = 0; offset < ids.length && active; offset += 4) {
        const batch = await Promise.all(ids.slice(offset, offset + 4).map(async (id) => [id, await loadPatientSpecialties(id)] as const))
        if (!active) break
        setSpecialtyResult((current) => {
          const updated = current?.agenda === state ? { ...current.byPatient } : {}
          for (const [id, result] of batch) {
            if (result.status === 'success') {
              const list = Array.isArray(result.data) ? result.data : []
              updated[id] = { status: 'success', data: list.filter((item): item is { specialty_id: string; specialty_name: string } =>
                !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).specialty_id === 'string' && typeof (item as Record<string, unknown>).specialty_name === 'string') }
            } else updated[id] = result
          }
          return { agenda: state, byPatient: updated }
        })
      }
    })()
    return () => { active = false }
    // A lista de IDs muda somente depois da consulta real da agenda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isProfessional, loadPatientSpecialties])
  const catalogRows = schedulingCatalog.status === 'success'
    ? schedulingCatalogRows(schedulingCatalog.data)
    : []
  const specialtyOptions = Array.from(
    new Map(catalogRows.map((row) => [row.specialty_id, row.specialty_name])),
  )
  const professionalOptions = Array.from(
    new Map(
      catalogRows
        .filter((row) => !selectedSpecialtyId || row.specialty_id === selectedSpecialtyId)
        .map((row) => [row.professional_id, row.professional_name]),
    ),
  )

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current
    setState(loadingState())
    const nextState = await loadAgenda(startDate, endDate, professionalId)
    if (requestId === requestSequence.current) setState(nextState)
    return nextState
  }, [endDate, loadAgenda, professionalId, startDate])

  async function searchAppointmentPatients() {
    const query = appointmentPatientQuery.trim()
    if (query.length < 2) return
    const result = await getRpcService().searchReferralPatients(query, 20, 0)
    setAppointmentPatients(result.status === 'success' ? result.data : [])
  }

  async function createAppointment() {
    if (!appointmentPatientId || !selectedSpecialtyId || !selectedProfessionalId || !validSlotStart || !appointmentType) {
      setAppointmentFeedback('Selecione paciente, especialidade, profissional, horário e tipo de atendimento.')
      return
    }
    setAppointmentFeedback('Criando agendamento no banco…')
    const result = await getRpcService().createAppointment({
      patientId: appointmentPatientId,
      professionalId: selectedProfessionalId,
      slotStart: validSlotStart,
      appointmentType,
      generalNotes: appointmentNotes.trim() || null,
      operationalOrigin: appointmentOrigin.trim() || null,
    })
    if (result.status === 'success') {
      const professionalName =
        professionalOptions.find(([id]) => id === selectedProfessionalId)?.[1] ??
        'Profissional CAPO'
      setLastScheduledContact({
        patientId: appointmentPatientId,
        patientName: appointmentPatientQuery,
        professionalName,
        slotStart: validSlotStart,
      })
      setAppointmentFeedback('Agendamento criado. Agenda recarregada do banco.')
      setAppointmentPatientId('')
      setAppointmentPatientQuery('')
      setAppointmentPatients([])
      setSelectedSpecialtyId('')
      setSelectedSlotStart('')
      setAppointmentType('')
      setAppointmentNotes('')
      await load()
    } else if (result.status === 'error') {
      setAppointmentFeedback(result.error.message)
    }
  }

  async function rescheduleAppointment() {
    if (!validReschedulableId || !rescheduleProfessionalId || !validSlotStart || rescheduleReason.trim().length < 3) {
      setAppointmentFeedback('Selecione agendamento, novo horário e informe o motivo da remarcação.')
      return
    }
    setAppointmentFeedback('Remarcando agendamento no banco…')
    const result = await getRpcService().rescheduleAppointment({
      appointmentId: validReschedulableId,
      newProfessionalId: rescheduleProfessionalId,
      newSlotStart: validSlotStart,
      reason: rescheduleReason.trim(),
      origin: isProfessional ? 'manual' : rescheduleOrigin.trim() || 'manual',
      newNotes: rescheduleNotes.trim(),
    })
    if (result.status === 'success') {
      setAppointmentFeedback('Agendamento remarcado. Agenda recarregada do banco.')
      setShowRescheduleForm(false)
      setSelectedReschedulableId('')
      setRescheduleReason('')
      setRescheduleOrigin('')
      setRescheduleNotes('')
      await load()
    } else if (result.status === 'error') setAppointmentFeedback(result.error.message)
  }

  async function updateAttendance(appointmentId: string, action: string) {
    if (busyAppointmentId) return
    if (action === 'faltou' && attendanceReason.trim().length < 3) {
      setAppointmentFeedback('Informe o motivo da falta antes de registrar.')
      return
    }
    setBusyAppointmentId(appointmentId)
    setAppointmentFeedback('Atualizando atendimento no banco...')
    const result = await getRpcService().updateAppointmentAttendance({
      appointmentId,
      action,
      notes: attendanceNotes.trim(),
      reason: attendanceReason.trim(),
    })
    if (result.status === 'success') {
      const confirmedAppointment = action === 'confirmado' && state.status === 'success'
        ? state.data.find((appointment) => appointment.appointment_id === appointmentId)
        : undefined
      setAttendanceNotes('')
      setAttendanceReason('')
      const reloaded = await load()
      if (reloaded.status === 'error') {
        setAppointmentFeedback('Atendimento registrado, mas a recarga da agenda falhou: ' + reloaded.error.message)
      } else {
        setAppointmentFeedback('Atendimento atualizado. Agenda recarregada do banco.')
        if (confirmedAppointment) onConfirmed?.(confirmedAppointment)
      }
    } else {
      setAppointmentFeedback(result.status === 'error' ? result.error.message : 'A atualização não retornou confirmação.')
    }
    setBusyAppointmentId(null)
  }

  useEffect(() => {
    if (isProfessional || !canAccess) return
    let active = true
    setSchedulingCatalog(loadingState())
    void getRpcService().getSchedulingCatalog().then((result) => {
      if (active) setSchedulingCatalog(result)
    })
    return () => { active = false }
  }, [canAccess, isProfessional])

  useEffect(() => {
    if (!canAccess || (isProfessional && !professionalId)) return
    const requestId = ++requestSequence.current
    void loadAgenda(startDate, endDate, professionalId).then((nextState) => {
      if (requestId === requestSequence.current) setState(nextState)
    })
    return () => {
      requestSequence.current += 1
    }
  }, [
    canAccess,
    endDate,
    isProfessional,
    loadAgenda,
    professionalId,
    startDate,
  ])

  useEffect(() => {
    if (!rescheduleProfessionalId) return
    if (isProfessional && !showRescheduleForm) return
    let active = true
    void getRpcService()
      .getAvailableAppointmentSlots(rescheduleProfessionalId, anchorDate)
      .then((nextState) => {
        if (!active) return
        setSlotResult({
          key: `${rescheduleProfessionalId}:${anchorDate}`,
          rows: nextState.status === 'success' ? nextState.data : [],
        })
        setSelectedSlotStart('')
      })
    return () => {
      active = false
    }
  }, [anchorDate, isProfessional, rescheduleProfessionalId, showRescheduleForm])

  useEffect(() => {
    if (!showRescheduleForm || !rescheduleProfessionalId) return
    if (!isProfessional && !appointmentPatientId) return
    let active = true
    void getRpcService()
      .getReschedulableAppointments(
        isProfessional ? null : appointmentPatientId,
        rescheduleProfessionalId,
        anchorDate,
        50,
      )
      .then((nextState) => {
        if (!active) return
        setReschedulableResult({
          key: isProfessional
            ? `own:${rescheduleProfessionalId}:${anchorDate}`
            : `${appointmentPatientId}:${rescheduleProfessionalId}:${anchorDate}`,
          rows: nextState.status === 'success' ? nextState.data : [],
        })
        setSelectedReschedulableId('')
      })
    return () => {
      active = false
    }
  }, [
    anchorDate,
    appointmentPatientId,
    isProfessional,
    rescheduleProfessionalId,
    showRescheduleForm,
  ])

  if (!canAccess || (isProfessional && !professionalId)) {
    return (
      <section
        className="assistential-page"
        aria-labelledby="agenda-blocked-title"
      >
        <div className="assistential-card">
          <p className="eyebrow">Agenda</p>
          <h2 id="agenda-blocked-title">Agenda indisponível</h2>
          <p>
            Esta conta não possui um contexto autorizado para consultar a
            agenda.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="assistential-page" aria-labelledby="agenda-title">
      <div className="assistential-card">
        <div className="assistential-heading">
          <div>
            <p className="eyebrow">
              {isProfessional ? 'Operacional assistencial' : 'Operacional geral'}
            </p>
            <h2 id="agenda-title">
              {isProfessional ? 'Agenda' : 'Agenda Geral'}
            </h2>
            <p>
              {isProfessional
                ? 'Seus atendimentos no período selecionado.'
                : 'Atendimentos e movimentações autorizados no período selecionado.'}
            </p>
          </div>
          <div className="assistential-filters">
            {!isProfessional && (
              <label>
                Profissional
                <select
                  value={selectedProfessionalId}
                  disabled={professionalOptions.length === 0}
                  onChange={(event) => {
                    setSelectedProfessionalId(event.target.value)
                    setState(loadingState())
                  }}
                >
                  <option value="">
                    {professionalOptions.length === 0
                      ? 'Nenhum profissional no período'
                      : 'Todos os profissionais'}
                  </option>
                  {professionalOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name ?? 'Profissional sem nome'}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Data de referência
              <input
                type="date"
                required
                value={anchorDate}
                onChange={(event) => {
                  if (event.target.value) {
                    setState(loadingState())
                    setAnchorDate(event.target.value)
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={state.status === 'loading'}
              onClick={() => void load()}
            >
              Atualizar
            </button>
          </div>
        </div>

        {isProfessional && professionalId && (
          <div className="agenda-actions" aria-label="Operações da própria agenda">
            <button
              type="button"
              aria-expanded={showOwnAgendaManager}
              onClick={() => setShowOwnAgendaManager((current) => !current)}
            >
              Gerenciar minha agenda
            </button>
            <button
              type="button"
              aria-expanded={showRescheduleForm}
              onClick={() => setShowRescheduleForm((current) => !current)}
            >
              Remarcar retorno
            </button>
          </div>
        )}

        {isProfessional && professionalId && showOwnAgendaManager && (
          <OwnAgendaManager professionalId={professionalId} />
        )}

        {!isProfessional && (
          <>
            <div className="agenda-actions" aria-label="Operações da agenda">
              <button
                type="button"
                className="agenda-action-primary"
                aria-expanded={showScheduleForm}
                onClick={() => setShowScheduleForm((current) => !current)}
              >
                Agendar
              </button>
              <button type="button">Consultar</button>
              <button type="button" aria-expanded={showRescheduleForm} onClick={() => setShowRescheduleForm((current) => !current)}>Remarcar</button>
            </div>
          </>
        )}

        {showScheduleForm && !isProfessional && (
          <section className="agenda-schedule-form" aria-labelledby="schedule-title">
            <div className="agenda-section-heading">
              <div>
                <p className="eyebrow">Atendimento e Acompanhamento</p>
                <h3 id="schedule-title">Novo Agendamento</h3>
              </div>
            </div>
            {schedulingCatalog.status === 'error' && <p role="alert">{schedulingCatalog.error.message}</p>}
            {schedulingCatalog.status === 'empty' && <p>Nenhuma especialidade/profissional com agenda ativa foi encontrada.</p>}
            <div className="agenda-form-grid">
              <label>
                Paciente *
                <input
                  type="search"
                  placeholder="Nome, Nº CAPO ou CMS"
                  value={appointmentPatientQuery}
                  onChange={(event) => setAppointmentPatientQuery(event.target.value)}
                  onBlur={() => void searchAppointmentPatients()}
                />
                {appointmentPatients.length > 0 && (
                  <select
                    value={appointmentPatientId}
                    onChange={(event) => {
                      setAppointmentPatientId(event.target.value)
                      const patient = appointmentPatients.find((item) => item.patient_id === event.target.value)
                      if (patient) setAppointmentPatientQuery(patient.full_name)
                    }}
                  >
                    <option value="">Selecionar paciente encontrado</option>
                    {appointmentPatients.map((patient) => (
                      <option key={patient.patient_id} value={patient.patient_id}>
                        {patient.full_name} · {patient.patient_number ?? patient.cms ?? 'Identificação disponível'}
                      </option>
                    ))}
                  </select>
                )}
              </label>
              <label>
                Especialidade *
                <select
                  value={selectedSpecialtyId}
                  disabled={schedulingCatalog.status !== 'success' || specialtyOptions.length === 0}
                  onChange={(event) => {
                    setSelectedSpecialtyId(event.target.value)
                    setSelectedProfessionalId('')
                    setSelectedSlotStart('')
                  }}
                >
                  <option value="">Selecionar especialidade</option>
                  {specialtyOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </label>
              <label>
                Profissional *
                <select
                  value={selectedProfessionalId}
                  disabled={professionalOptions.length === 0}
                  onChange={(event) => {
                    const professionalId = event.target.value
                    setSelectedProfessionalId(professionalId)
                    if (professionalId && !selectedSpecialtyId) {
                      const row = catalogRows.find((item) => item.professional_id === professionalId)
                      if (row) setSelectedSpecialtyId(row.specialty_id)
                    }
                    setSelectedSlotStart('')
                  }}
                >
                  <option value="">Selecionar profissional</option>
                  {professionalOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name ?? 'Profissional sem nome'}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Data *
                <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
              </label>
              <label className="agenda-form-wide">
                Horários disponíveis *
                <div className="agenda-slot-picker" aria-live="polite">
                  {availableSlots.length === 0 ? (
                    <span className="agenda-empty-slot">Selecione profissional e data.</span>
                  ) : (
                    availableSlots.map((slot) => (
                      <button
                        type="button"
                        className={validSlotStart === slot.slot_start ? 'is-selected' : undefined}
                        key={slot.slot_start}
                        onClick={() => setSelectedSlotStart(slot.slot_start)}
                      >
                        {slot.slot_time}
                      </button>
                    ))
                  )}
                </div>
              </label>
              <label>
                Tipo *
                <select value={appointmentType} onChange={(event) => setAppointmentType(event.target.value)}>
                  <option value="">Selecionar</option>
                  <option>Primeiro atendimento no CAPO</option>
                  <option>Primeiro atendimento na especialidade</option>
                  <option>Retorno</option>
                  <option>Remarcação</option>
                </select>
              </label>
              <label>
                Origem
                <input type="text" placeholder="Origem da demanda" value={appointmentOrigin} onChange={(event) => setAppointmentOrigin(event.target.value)} />
              </label>
              <label className="agenda-form-wide">
                Observação administrativa mínima
                <textarea rows={3} value={appointmentNotes} onChange={(event) => setAppointmentNotes(event.target.value)} />
              </label>
            </div>
            <div className="agenda-form-actions">
              <button type="button" disabled={!appointmentPatientId || !selectedProfessionalId || !validSlotStart || !appointmentType} onClick={() => void createAppointment()}>
                Confirmar agendamento
              </button>
            </div>
            {appointmentFeedback && <p className="agenda-contract-note" role="status">{appointmentFeedback}</p>}
            {lastScheduledContact && (
              <PatientWhatsAppButton
                patientId={lastScheduledContact.patientId}
                label="WhatsApp — confirmar agendamento"
                message={`Olá, ${lastScheduledContact.patientName}. Seu atendimento no CAPO está agendado para ${new Date(lastScheduledContact.slotStart).toLocaleString('pt-BR')} com ${lastScheduledContact.professionalName}.`}
              />
            )}
            <p className="agenda-contract-note">
              O agendamento é confirmado somente após retorno positivo do banco CAPO.
            </p>
          </section>
        )}

        {showRescheduleForm && (
          <section className="agenda-schedule-form" aria-labelledby="reschedule-title">
            <div className="agenda-section-heading">
              <p className="eyebrow">Atendimento e Acompanhamento</p>
              <h3 id="reschedule-title">
                {isProfessional ? 'Remarcar meu retorno' : 'Remarcação / Retorno'}
              </h3>
            </div>
            <div className="agenda-form-grid">
              <label>
                Agendamento
                <select value={validReschedulableId} onChange={(event) => setSelectedReschedulableId(event.target.value)} disabled={reschedulableAppointments.length === 0}>
                  <option value="">
                    {reschedulableAppointments.length
                      ? 'Selecionar agendamento'
                      : isProfessional
                        ? 'Nenhum retorno elegível nesta data'
                        : 'Selecione paciente e profissional'}
                  </option>
                  {reschedulableAppointments.map((item) => <option key={item.appointment_id} value={item.appointment_id}>{item.patient_name} · {new Date(item.appointment_date).toLocaleString('pt-BR')}</option>)}
                </select>
              </label>
              <label>
                Novo horário
                <select value={validSlotStart} onChange={(event) => setSelectedSlotStart(event.target.value)} disabled={availableSlots.length === 0}>
                  <option value="">Selecionar horário</option>
                  {availableSlots.map((slot) => <option key={slot.slot_start} value={slot.slot_start}>{slot.slot_time}</option>)}
                </select>
              </label>
              <label>
                Motivo *
                <input value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} />
              </label>
              {!isProfessional && (
                <label>
                  Origem
                  <input value={rescheduleOrigin} onChange={(event) => setRescheduleOrigin(event.target.value)} />
                </label>
              )}
              <label className="agenda-form-wide">
                Novas observações
                <textarea rows={3} value={rescheduleNotes} onChange={(event) => setRescheduleNotes(event.target.value)} />
              </label>
            </div>
            <div className="agenda-form-actions">
              <button type="button" disabled={!validReschedulableId || !validSlotStart || rescheduleReason.trim().length < 3} onClick={() => void rescheduleAppointment()}>Aplicar remarcação</button>
            </div>
          </section>
        )}

        <div className="agenda-toolbar">
          <div
            className="agenda-tabs"
            role="tablist"
            aria-label="Visualização da agenda"
          >
            {(['day', 'week', 'month'] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={view === option}
                onClick={() => {
                  setState(loadingState())
                  setView(option)
                }}
              >
                {{ day: 'Dia', week: 'Semana', month: 'Mês' }[option]}
              </button>
            ))}
          </div>
          <div className="agenda-navigation" aria-label="Navegar pelo período">
            <button
              type="button"
              aria-label="Período anterior"
              onClick={() => {
                setState(loadingState())
                setAnchorDate((date) => moveAnchor(date, view, -1))
              }}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => {
                setState(loadingState())
                setAnchorDate(dateInputValue(new Date()))
              }}
            >
              Hoje
            </button>
            <button
              type="button"
              aria-label="Próximo período"
              onClick={() => {
                setState(loadingState())
                setAnchorDate((date) => moveAnchor(date, view, 1))
              }}
            >
              Próximo
            </button>
          </div>
          <strong className="agenda-period" aria-live="polite">
            {formatPeriod(startDate, endDate, view)}
          </strong>
        </div>

        {isProfessional && (
          <div className="agenda-attendance-notes">
            <label>Observação do atendimento<input value={attendanceNotes} onChange={(event) => setAttendanceNotes(event.target.value)} /></label>
            <label>Motivo da falta<input value={attendanceReason} onChange={(event) => setAttendanceReason(event.target.value)} /></label>
          </div>
        )}

        <div aria-live="polite">
          {state.status === 'loading' && <p>Carregando agenda…</p>}
          {(state.status === 'empty' ||
            (state.status === 'success' && state.data.length === 0)) && (
            <p>Nenhum agendamento encontrado no período.</p>
          )}
          {state.status === 'error' && (
            <div className="assistential-error" role="alert">
              <p>Não foi possível carregar a agenda: {state.error.message}</p>
              <button type="button" onClick={() => void load()}>
                Tentar novamente
              </button>
            </div>
          )}
          {state.status === 'success' && state.data.length > 0 && (
            <AgendaResults
              appointments={state.data}
              startDate={startDate}
              endDate={endDate}
              view={view}
              showSpecialty={shouldShowSpecialty}
              onAttendance={isProfessional ? updateAttendance : undefined}
              busyAppointmentId={busyAppointmentId}
              patientSpecialties={isProfessional ? patientSpecialties : undefined}
            />
          )}
        </div>
      </div>
    </section>
  )
}
