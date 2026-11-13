import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  getRpcService,
  loadingState,
  type AgendaAppointment,
  type AgendaScheduleSlot,
  type AvailableAppointmentSlot,
  type AsyncState,
  type ReschedulableAppointment,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { OwnAgendaManager } from './OwnAgendaManager'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import { openCapoWhatsAppTab } from '../../components/contact/whatsapp-tab'
import { movementWhatsAppMessage, type CommunicationContact } from './appointment-communication'
import { prepareAppointmentReminder } from './appointment-confirmation-link'
import { isVisibleOnAgenda } from './agenda-visibility'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getNotificationsService } from '../notifications/notifications-integration'
import { AgendaBlockIndicator } from '../../components/icons/AgendaBlockIndicator'
import { CapoIcon } from '../../components/icons/CapoIcon'
import './agenda-page.css'

type AgendaView = 'day' | 'week' | 'month'

type PsychologyGroupSession = {
  group_id: string
  name: string
  capacity: number
  date: string
  start: string
  end: string
  participants: readonly {
    appointment_id: string
    patient_id: string
    patient_name: string
    attendance_status: string
  }[]
}

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

function previsitIndicator(result?: string) {
  switch (result) {
    case 'confirmou_paciente': return '✅ Confirmada pelo paciente (link)'
    case 'aguardando_paciente': return '◌ Aguardando confirmação pelo link'
    case 'avisado': return '💬 Avisado previamente'
    case 'confirmou': return '💬 Avisado previamente'
    case 'sem_resposta': return '◌ Aviso sem resposta'
    case 'solicitou_cancelamento': return '✕ Solicitou cancelamento'
    case 'solicitou_remarcacao': return '↻ Solicitou remarcação'
    default: return ''
  }
}

function attendanceMarker(status?: string) {
  if (status === 'confirmado') return <span className="agenda-attendance-state is-confirmed">✓ Confirmado</span>
  if (status === 'faltou') return <span className="agenda-attendance-state is-absent">✕ Falta</span>
  return null
}

function formatCAPOMessageDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
  }).format(date)
}

function appointmentNoticeMessage(contact: {
  patientName: string
  specialtyName: string
  slotStart: string
  careLocation: string
  senderName: string
  senderTitle: string
}) {
  const start = new Date(contact.slotStart)
  const valid = !Number.isNaN(start.getTime())
  const date = valid
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(start)
    : contact.slotStart
  const time = valid
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(start)
    : 'Consultar agendamento'

  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()))
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return [
    `${greeting}, ${contact.patientName}!`,
    '',
    'Seu atendimento no CAPO — Centro de Apoio ao Paciente Oncológico foi agendado.',
    '',
    `📅 Data: ${date}`,
    `🕒 Horário: ${time}`,
    `👩‍⚕️ Especialidade: ${contact.specialtyName}`,
    `📍 Local: ${contact.careLocation}`,
    '',
    'Pedimos que compareça no horário agendado.',
    '',
    '⚠️ Importante:',
    'Qualquer dúvida ou necessidade de reagendamento, estamos à disposição por aqui.',
    '',
    'Obrigado(a)!',
    '',
    contact.senderName.toLocaleUpperCase('pt-BR'),
    contact.senderTitle.toLocaleUpperCase('pt-BR'),
  ].join('\n')
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
    (appointment) => appointmentDay(appointment.appointment_date) === day &&
      isVisibleOnAgenda(appointment.attendance_status),
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
  onReturn,
  onCancel,
  busyAppointmentId,
  patientSpecialties,
  previsitContacts,
  embeddedHome,
}: Readonly<{
  appointments: readonly AgendaAppointment[]
  includeDate?: boolean
  showSpecialty?: boolean
  onAttendance?: (appointmentId: string, action: string) => void
  onReturn?: (appointment: AgendaAppointment) => void
  onCancel?: (appointmentId: string) => void
  busyAppointmentId?: string | null
  patientSpecialties?: Readonly<Record<string, PatientSpecialtiesState>>
  previsitContacts?: Readonly<Record<string, { result: string }>>
  embeddedHome?: boolean
}>) {
  return (
    <div className="assistential-table-wrap">
      <table className="assistential-table">
        <caption>{appointments.length} agendamento(s)</caption>
        <thead>
          <tr>
            <th scope="col">{includeDate ? 'Data e hora' : 'Horário'}</th>
            <th scope="col">Paciente</th>
            {(onAttendance || onCancel) && <th scope="col">Ações</th>}
            <th scope="col">Profissional</th>
            {showSpecialty && <th scope="col">Especialidade</th>}
            <th scope="col">Tipo</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.appointment_id}>
              <td data-label={includeDate ? 'Data e hora' : 'Horário'}>
                {includeDate
                  ? formatDateTime(appointment.appointment_date)
                  : formatTimeRange(appointment)}
              </td>
              <td data-label="Paciente">{appointment.patient_name}{attendanceMarker(appointment.attendance_status)}{previsitContacts?.[appointment.appointment_id] && <small title="Aviso administrativo prévio; não representa presença">{previsitIndicator(previsitContacts[appointment.appointment_id].result)}</small>}{patientSpecialties?.[appointment.patient_id] && <small className="agenda-patient-specialties">{specialtyText(patientSpecialties[appointment.patient_id])}</small>}</td>
              {(onAttendance || onCancel) && (
                <td data-label="Ações" className="agenda-attendance-actions">
                  {onAttendance && appointment.attendance_status === 'agendado' && (
                    <>
                      <button type="button" className="agenda-attendance-confirm" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'confirmado')}><span aria-hidden="true">✓</span> Iniciar atendimento</button>
                      <button type="button" className="agenda-attendance-absence" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'faltou')}><span aria-hidden="true">✕</span> Falta</button>
                    </>
                  )}
                  {onReturn && appointment.attendance_status === 'confirmado' && (
                    <button type="button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onReturn(appointment)}>Agendar retorno</button>
                  )}
                  {onCancel && ['agendado', 'confirmado'].includes(appointment.attendance_status) && (
                    <button type="button" className="agenda-cancel-button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onCancel(appointment.appointment_id)}>Cancelar agendamento</button>
                  )}
                </td>
              )}
              <td data-label="Profissional">{appointment.professional_name}</td>
              {showSpecialty && (
                <td data-label="Especialidade">{appointment.specialty_name ?? 'Não informada'}</td>
              )}
              <td data-label="Tipo">{appointment.appointment_type}</td>
              <td data-label="Situação">{appointment.attendance_status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


function slotClock(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
}

function HomeScheduleGrid({
  slots,
  startDate,
  endDate,
  view,
  appointments,
  onAttendance,
  onReturn,
  onCancel,
  onSchedule,
  busyAppointmentId,
  patientSpecialties,
  previsitContacts,
  attendanceOverrides,
  groupSessions,
  renderAdministrativeActions,
}: Readonly<{
  slots: readonly AgendaScheduleSlot[]
  startDate: string
  endDate: string
  view: AgendaView
  appointments: readonly AgendaAppointment[]
  onAttendance?: (appointmentId: string, action: string) => void
  onReturn?: (appointment: AgendaAppointment) => void
  onCancel?: (appointmentId: string) => void
  onSchedule?: (slot: AgendaScheduleSlot) => void
  busyAppointmentId?: string | null
  patientSpecialties?: Readonly<Record<string, PatientSpecialtiesState>>
  previsitContacts?: Readonly<Record<string, { result: string }>>
  attendanceOverrides?: Readonly<Record<string, string>>
  groupSessions?: readonly PsychologyGroupSession[]
  renderAdministrativeActions?: (appointmentId: string) => ReactNode
}>) {
  const appointmentById = new Map(
    appointments.map((appointment) => [appointment.appointment_id, appointment] as const),
  )
  const periodDays = datesBetween(startDate, endDate)
  const days = view === 'month'
    ? (() => {
        const first = localDate(startDate)
        first.setDate(first.getDate() - ((first.getDay() + 6) % 7))
        return Array.from({ length: 42 }, (_, index) => {
          const day = new Date(first)
          day.setDate(day.getDate() + index)
          return dateInputValue(day)
        })
      })()
    : periodDays
  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  })

  if (slots.length === 0 && view === 'day') {
    return <p className="agenda-schedule-no-hours">Nenhum horário configurado neste período.</p>
  }

  if (view === 'day') {
    const daySlots = slots.filter((slot) => slot.slot_date === days[0])
    return (
      <div className="assistential-table-wrap agenda-day-table-wrap">
        <table className="assistential-table agenda-day-table">
          <thead>
            <tr>
              <th scope="col">Horário</th>
              <th scope="col">Paciente</th>
              <th scope="col">Especialidades</th>
              <th scope="col">Tipo</th>
              <th scope="col">Situação</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {daySlots.map((slot) => {
              const group = groupSessions?.find((item) => item.date === slot.slot_date
                && Date.parse(item.start) === Date.parse(slot.slot_start)
                && Date.parse(item.end) === Date.parse(slot.slot_end))
              const appointment = slot.appointment_id
                ? appointmentById.get(slot.appointment_id)
                : undefined
              const visiblePatientId = appointment?.patient_id ?? slot.patient_id
              const visiblePatientName = appointment?.patient_name ?? slot.patient_name
              const patientIsVisible = Boolean(visiblePatientId && visiblePatientName)
              const patientName =
                visiblePatientName ??
                (appointment?.patient_number
                  ? `Paciente Nº CAPO ${appointment.patient_number}`
                  : slot.slot_status === 'agendado'
                    ? 'Horário ocupado'
                    : '—')
              const attendanceStatus = (slot.appointment_id ? attendanceOverrides?.[slot.appointment_id] : undefined) ?? appointment?.attendance_status ?? 'agendado'
              const statusLabel = group ? `${group.participants.length}/${group.capacity} vagas` :
                slot.slot_status === 'livre'
                  ? 'Livre'
                  : slot.slot_status === 'bloqueado'
                    ? 'Bloqueado'
                    : attendanceStatus === 'confirmado'
                      ? 'Confirmado'
                      : attendanceStatus === 'faltou'
                        ? 'Falta'
                        : 'Agendado'
              const typeLabel = group ? 'Terapia em grupo' :
                slot.slot_status === 'bloqueado' && slot.block_type
                  ? <AgendaBlockIndicator type={slot.block_type} />
                  : slot.appointment_type ?? '—'
              return (
                <tr key={`${slot.professional_id}:${slot.slot_start}`} className={`is-${slot.slot_status}`}>
                  <td data-label="Horário"><strong>{slotClock(slot.slot_start)}–{slotClock(slot.slot_end)}</strong></td>
                  <td data-label="Paciente">
                    <div className="agenda-home-patient-line">
                      <strong>{group ? group.name : patientName}</strong>
                      {attendanceMarker(attendanceStatus)}
                      {slot.appointment_id && previsitContacts?.[slot.appointment_id] && <small title="Aviso administrativo prévio; não representa presença">{previsitIndicator(previsitContacts[slot.appointment_id].result)}</small>}
                      {slot.slot_status === 'agendado' &&
                        patientIsVisible &&
                        slot.appointment_id &&
                        onAttendance &&
                        attendanceStatus === 'agendado' && (
                          <span className="agenda-home-patient-actions">
                            <button
                              type="button"
                              className="agenda-attendance-confirm"
                              disabled={busyAppointmentId === slot.appointment_id}
                              onClick={() => onAttendance(slot.appointment_id!, 'confirmado')}
                              aria-label={`Iniciar atendimento de ${patientName}`}
                            >
                              Iniciar atendimento
                            </button>
                            <button
                              type="button"
                              className="agenda-attendance-absence"
                              disabled={busyAppointmentId === slot.appointment_id}
                              onClick={() => onAttendance(slot.appointment_id!, 'faltou')}
                              aria-label={`Marcar falta de ${patientName}`}
                            >
                              Falta
                            </button>
                          </span>
                        )}
                    </div>
                  </td>
                  <td data-label="Especialidades">
                    {patientIsVisible && visiblePatientId && patientSpecialties?.[visiblePatientId]
                      ? <small className="agenda-patient-specialties">{specialtyText(patientSpecialties[visiblePatientId])}</small>
                      : '—'}
                  </td>
                  <td data-label="Tipo">{typeLabel}</td>
                  <td data-label="Situação">{statusLabel}</td>
                  <td data-label="Ações" className="agenda-attendance-actions">
                    {group && <a href={`#grupo-${group.group_id}-${group.date}`}>Ver participantes e ações administrativas</a>}
                    {!group && slot.slot_status === 'agendado' && slot.appointment_id && renderAdministrativeActions?.(slot.appointment_id)}
                    {slot.slot_status === 'livre' && onSchedule && (
                      <button type="button" className="agenda-slot-schedule-button" onClick={() => onSchedule(slot)}>
                        Agendar
                      </button>
                    )}
                    {appointment && onReturn && appointment.attendance_status === 'confirmado' && (
                      <button type="button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onReturn(appointment)}>
                        Agendar retorno
                      </button>
                    )}
                    {slot.slot_status === 'agendado' &&
                      patientIsVisible &&
                      slot.appointment_id &&
                      onCancel &&
                      (!appointment || ['agendado', 'confirmado'].includes(appointment.attendance_status)) && (
                        <button
                          type="button"
                          className="agenda-cancel-button"
                          disabled={busyAppointmentId === slot.appointment_id}
                          onClick={() => onCancel(slot.appointment_id!)}
                        >
                          Cancelar
                        </button>
                      )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      className={[
        'agenda-schedule-grid',
        view === 'week' ? 'agenda-schedule-grid--week' : '',
        view === 'month' ? 'agenda-schedule-grid--month' : '',
      ].filter(Boolean).join(' ')}
      aria-label="Grade efetiva da agenda"
    >
      {days.map((day) => {
        const daySlots = slots.filter((slot) => slot.slot_date === day)
        return (
          <article className={`agenda-schedule-day${view === 'month' && localDate(day).getMonth() !== localDate(startDate).getMonth() ? ' is-outside' : ''}`} key={day}>
            <h3>{dateFormatter.format(localDate(day))}</h3>
            <div className="agenda-schedule-slots">
                {daySlots.length === 0 && <small className="agenda-schedule-no-hours">Sem horários</small>}
                {daySlots.map((slot) => {
                  const group = groupSessions?.find((item) => item.date === slot.slot_date
                    && Date.parse(item.start) === Date.parse(slot.slot_start)
                    && Date.parse(item.end) === Date.parse(slot.slot_end))
                  const appointment = slot.appointment_id
                    ? appointmentById.get(slot.appointment_id)
                    : undefined
                  const visiblePatientId = appointment?.patient_id ?? slot.patient_id
                  const visiblePatientName = appointment?.patient_name ?? slot.patient_name
                  const patientIsVisible = Boolean(visiblePatientId && visiblePatientName)
                  const attendanceStatus = (slot.appointment_id ? attendanceOverrides?.[slot.appointment_id] : undefined) ?? appointment?.attendance_status ?? 'agendado'
                  const patientName =
                    visiblePatientName ??
                    (appointment?.patient_number
                      ? `Paciente Nº CAPO ${appointment.patient_number}`
                      : 'Horário ocupado')
                  return (
                    <div
                      className={`agenda-schedule-slot is-${slot.slot_status}`}
                      key={`${slot.professional_id}:${slot.slot_start}`}
                    >
                      <strong>{slotClock(slot.slot_start)}–{slotClock(slot.slot_end)}</strong>
                      <span className="agenda-schedule-status">
                        {group ? `${group.name} · ${group.participants.length}/${group.capacity} vagas` :
                        slot.slot_status === 'livre'
                          ? 'Livre'
                          : slot.slot_status === 'bloqueado'
                            ? 'Bloqueado'
                            : patientName}
                      </span>
                      {slot.slot_status === 'livre' && onSchedule && (
                        <button
                          type="button"
                          className="agenda-slot-schedule-button"
                          onClick={() => onSchedule(slot)}
                        >
                          Agendar
                        </button>
                      )}
                      {slot.slot_status === 'agendado' && (slot.appointment_type || attendanceStatus !== 'agendado' || (slot.appointment_id && previsitContacts?.[slot.appointment_id])) && (
                        <small className="agenda-schedule-details">
                          {slot.appointment_type && <span>{slot.appointment_type}</span>}
                          {attendanceMarker(attendanceStatus)}
                          {slot.appointment_id && previsitContacts?.[slot.appointment_id] && (
                            <span className="agenda-previsit-indicator" title="Aviso administrativo prévio; não representa presença">
                              {previsitIndicator(previsitContacts[slot.appointment_id].result)}
                            </span>
                          )}
                        </small>
                      )}
                      {slot.slot_status === 'bloqueado' && slot.block_type && (
                        <small>{group ? <a href={`#grupo-${group.group_id}-${group.date}`}>Ver participantes</a> : <AgendaBlockIndicator type={slot.block_type} />}</small>
                      )}
                      {slot.slot_status === 'agendado' &&
                        patientIsVisible &&
                        slot.appointment_id &&
                        onAttendance &&
                        attendanceStatus === 'agendado' && (
                        <div className="agenda-week-home-actions">
                          <button
                            type="button"
                            className="agenda-attendance-confirm"
                            disabled={busyAppointmentId === slot.appointment_id}
                            onClick={() => onAttendance(slot.appointment_id!, 'confirmado')}
                            aria-label={`Iniciar atendimento de ${patientName}`}
                          >
                            Iniciar atendimento
                          </button>
                          <button
                            type="button"
                            className="agenda-attendance-absence"
                            disabled={busyAppointmentId === slot.appointment_id}
                            onClick={() => onAttendance(slot.appointment_id!, 'faltou')}
                            aria-label={`Marcar falta de ${patientName}`}
                          >
                            Falta
                          </button>
                        </div>
                      )}
                      {appointment && onReturn && attendanceStatus === 'confirmado' && (
                        <button type="button" className="agenda-slot-schedule-button agenda-slot-return-button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onReturn(appointment)} aria-label={`Agendar retorno de ${patientName}`}>Agendar retorno</button>
                      )}
                      {!group && slot.slot_status === 'agendado' && slot.appointment_id && renderAdministrativeActions?.(slot.appointment_id)}
                      {slot.slot_status === 'agendado' && patientIsVisible && slot.appointment_id && onCancel && (!appointment || ['agendado', 'confirmado'].includes(appointment.attendance_status)) && (
                        <button
                          type="button"
                          className="agenda-cancel-button"
                          disabled={busyAppointmentId === slot.appointment_id}
                          onClick={() => onCancel(slot.appointment_id!)}
                        >
                          Cancelar agendamento
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
          </article>
        )
      })}
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
  onReturn,
  onCancel,
  busyAppointmentId,
  patientSpecialties,
  previsitContacts,
  embeddedHome = false,
}: Readonly<{
  appointments: readonly AgendaAppointment[]
  startDate: string
  endDate: string
  view: AgendaView
  showSpecialty: boolean
  onAttendance?: (appointmentId: string, action: string) => void
  onReturn?: (appointment: AgendaAppointment) => void
  onCancel?: (appointmentId: string) => void
  busyAppointmentId?: string | null
  patientSpecialties?: Readonly<Record<string, PatientSpecialtiesState>>
  previsitContacts?: Readonly<Record<string, { result: string }>>
  embeddedHome?: boolean
}>) {
  if (view === 'day') {
    return (
      <AppointmentTable
        appointments={appointments}
        showSpecialty={showSpecialty}
        onAttendance={onAttendance}
        onReturn={onReturn}
        onCancel={onCancel}
        busyAppointmentId={busyAppointmentId}
        patientSpecialties={patientSpecialties}
        previsitContacts={previsitContacts}
      />
    )
  }

  const days = datesBetween(startDate, endDate)
  if (view === 'week') {
    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
    })
    return (
      <div className={embeddedHome ? 'agenda-week agenda-week--home' : 'agenda-week'} aria-label="Agenda da semana">
        {days.map((day) => {
          const dayAppointments = appointmentsForDay(appointments, day)
          return (
            <article className="agenda-week-day" key={day}>
              <h3>{dateFormatter.format(localDate(day))}</h3>
              {embeddedHome ? (
                dayAppointments.length > 0 ? (
                  <div className="agenda-week-home-list">
                    {dayAppointments.map((appointment) => (
                      <div className="agenda-week-home-item" key={appointment.appointment_id}>
                        <strong>{formatTimeRange(appointment)}</strong>
                        <span>{appointment.patient_name}</span>
                        {previsitContacts?.[appointment.appointment_id] && <small title="Aviso administrativo prévio; não representa presença">{previsitIndicator(previsitContacts[appointment.appointment_id].result)}</small>}
                        <small>{appointment.appointment_type}</small>
                        {attendanceMarker(appointment.attendance_status)}
                        {onAttendance && appointment.attendance_status === 'agendado' && (
                          <div className="agenda-week-home-actions">
                            <button type="button" className="agenda-attendance-confirm" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'confirmado')} aria-label={`Iniciar atendimento de ${appointment.patient_name}`}>Iniciar atendimento</button>
                            <button type="button" className="agenda-attendance-absence" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'faltou')} aria-label={`Marcar falta de ${appointment.patient_name}`}>Falta</button>
                          </div>
                        )}
                        {onReturn && appointment.attendance_status === 'confirmado' && (
                          <button type="button" className="agenda-slot-schedule-button agenda-slot-return-button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onReturn(appointment)} aria-label={`Agendar retorno de ${appointment.patient_name}`}>Agendar retorno</button>
                        )}
                        {onCancel && ['agendado', 'confirmado'].includes(appointment.attendance_status) && (
                          <button type="button" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onCancel(appointment.appointment_id)} aria-label={`Cancelar agendamento de ${appointment.patient_name}`}>Cancelar</button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="agenda-week-empty">Sem atendimento</p>
                )
              ) : dayAppointments.length > 0 ? (
                <div className="agenda-week-home-list">
                  {dayAppointments.map((appointment) => (
                    <div className="agenda-week-home-item" key={appointment.appointment_id}>
                      <strong>{formatTimeRange(appointment)}</strong>
                      <span>{appointment.patient_name}</span>
                      <small>{showSpecialty ? appointment.specialty_name ?? appointment.appointment_type : appointment.appointment_type}</small>
                      {attendanceMarker(appointment.attendance_status)}
                      {onAttendance && appointment.attendance_status === 'agendado' && (
                        <div className="agenda-week-home-actions">
                          <button type="button" className="agenda-attendance-confirm" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'confirmado')}>Iniciar atendimento</button>
                          <button type="button" className="agenda-attendance-absence" disabled={busyAppointmentId === appointment.appointment_id} onClick={() => onAttendance(appointment.appointment_id, 'faltou')}>Falta</button>
                        </div>
                      )}
                      {onCancel && ['agendado', 'confirmado'].includes(appointment.attendance_status) && <button type="button" onClick={() => onCancel(appointment.appointment_id)}>Cancelar</button>}
                    </div>
                  ))}
                </div>
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
                {attendanceMarker(appointment.attendance_status)}
                {previsitContacts?.[appointment.appointment_id] && <small title="Aviso administrativo prévio; não representa presença">{previsitIndicator(previsitContacts[appointment.appointment_id].result)}</small>}
                {patientSpecialties?.[appointment.patient_id] && <small>{specialtyText(patientSpecialties[appointment.patient_id])}</small>}
                <small>
                  {showSpecialty
                    ? appointment.specialty_name ?? appointment.appointment_type
                    : appointment.appointment_type}
                </small>
                {onCancel && ['agendado', 'confirmado'].includes(appointment.attendance_status) && (
                  <button
                    type="button"
                    className="agenda-cancel-button agenda-cancel-button--month"
                    disabled={busyAppointmentId === appointment.appointment_id}
                    onClick={() => onCancel(appointment.appointment_id)}
                  >
                    Cancelar
                  </button>
                )}
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
  initialManageOpen = false,
  embeddedHome = false,
}: Readonly<{
  accessContext: AccessContext
  loadAgenda?: AgendaLoader
  showSpecialty?: boolean
  onConfirmed?: (appointment: AgendaAppointment) => void
  loadPatientSpecialties?: (patientId: string) => Promise<AsyncState<unknown>>
  initialManageOpen?: boolean
  embeddedHome?: boolean
}>) {
  const location = useLocation()
  const [view, setView] = useState<AgendaView>('day')
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [selectedProfessionalId, setSelectedProfessionalId] = useState('')
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('')
  const [schedulingCatalog, setSchedulingCatalog] = useState<AsyncState<unknown>>(loadingState)
  const [selectedSlotStart, setSelectedSlotStart] = useState('')
  const [slotResult, setSlotResult] = useState<{ key: string; rows: readonly AvailableAppointmentSlot[]; status: 'success' | 'empty' | 'error' } | null>(null)
  const [returnScheduleGrid, setReturnScheduleGrid] = useState<{
    key: string
    state: AsyncState<readonly AgendaScheduleSlot[]>
  } | null>(null)
  const [appointmentPatientQuery, setAppointmentPatientQuery] = useState('')
  const [appointmentPatientId, setAppointmentPatientId] = useState('')
  const [appointmentPatients, setAppointmentPatients] = useState<readonly { patient_id: string; full_name: string; patient_number: string | null; cms: string | null }[]>([])
  const [appointmentType, setAppointmentType] = useState('')
  const [appointmentOrigin, setAppointmentOrigin] = useState('')
  const [appointmentNotes, setAppointmentNotes] = useState('')
  const [appointmentFeedback, setAppointmentFeedback] = useState<string | null>(null)
  const [awaitingNextAppointmentChoice, setAwaitingNextAppointmentChoice] = useState(false)
  const [queueInclusionBusy, setQueueInclusionBusy] = useState(false)
  const [lastScheduledContact, setLastScheduledContact] = useState<Readonly<{
    patientId: string
    patientName: string
    professionalName: string
    specialtyName: string
    careLocation: string
    slotStart: string
    isReturn: boolean
  }> | null>(null)
  const [lastRescheduledContact, setLastRescheduledContact] = useState<Readonly<{
    patientId: string
    kind: 'remarcacao' | 'remanejamento'
    contact: Omit<CommunicationContact, 'senderName' | 'senderTitle'>
  }> | null>(null)
  const [prefillWaitingListId, setPrefillWaitingListId] = useState('')
  const [prefillRenewalId, setPrefillRenewalId] = useState('')
  const [attendanceNotes, setAttendanceNotes] = useState('')
  const [attendanceReason, setAttendanceReason] = useState('')
  const [cancelAppointmentId, setCancelAppointmentId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [busyAppointmentId, setBusyAppointmentId] = useState<string | null>(null)
  const [showRescheduleForm, setShowRescheduleForm] = useState(false)
  const [movementKind, setMovementKind] = useState<'' | 'remarcacao' | 'remanejamento' | 'retorno'>('')
  const [reschedulableResult, setReschedulableResult] = useState<{ key: string; rows: readonly ReschedulableAppointment[] } | null>(null)
  const [selectedReschedulableId, setSelectedReschedulableId] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleOrigin, setRescheduleOrigin] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState(() => dateInputValue(new Date()))
  const [rescheduleSlotResult, setRescheduleSlotResult] = useState<{
    key: string
    rows: readonly AvailableAppointmentSlot[]
  } | null>(null)
  const [selectedRescheduleSlotStart, setSelectedRescheduleSlotStart] = useState('')
  const [anchorDate, setAnchorDate] = useState(() => dateInputValue(new Date()))
  const [consultationStartDate, setConsultationStartDate] = useState(() => dateInputValue(new Date()))
  const [consultationEndDate, setConsultationEndDate] = useState(() => dateInputValue(new Date()))
  const [state, setState] =
    useState<AsyncState<readonly AgendaAppointment[]>>(loadingState)
  const [scheduleGrid, setScheduleGrid] =
    useState<AsyncState<readonly AgendaScheduleSlot[]>>(loadingState)
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null)
  const [attendanceOverrides, setAttendanceOverrides] = useState<Readonly<Record<string, string>>>({})
  const [previsitContacts, setPrevisitContacts] = useState<Readonly<Record<string, { result: string; recorded_at: string }>>>({})
  const [previsitFeedback, setPrevisitFeedback] = useState<string | null>(null)
  const [previsitBusyId, setPrevisitBusyId] = useState<string | null>(null)
  const [previsitOutcomes, setPrevisitOutcomes] = useState<Readonly<Record<string, string>>>({})
  const [previsitLoadError, setPrevisitLoadError] = useState<string | null>(null)
  const [familyPsychologyCards, setFamilyPsychologyCards] = useState<readonly Record<string, unknown>[]>([])
  const [psychologyGroupSessions, setPsychologyGroupSessions] = useState<readonly PsychologyGroupSession[]>([])
  const [psychologyGroupError, setPsychologyGroupError] = useState('')
  const [groupBookingId, setGroupBookingId] = useState('')
  const [groupBookingDate, setGroupBookingDate] = useState('')
  const [groupPatientQuery, setGroupPatientQuery] = useState('')
  const [groupPatientId, setGroupPatientId] = useState('')
  const [groupPatients, setGroupPatients] = useState<readonly {
    patient_id: string; full_name: string; patient_number: string | null; cms: string | null
  }[]>([])
  const [groupBookingBusy, setGroupBookingBusy] = useState(false)
  const [groupBookingFeedback, setGroupBookingFeedback] = useState('')
  const [groupRescheduleAppointmentId, setGroupRescheduleAppointmentId] = useState('')
  const [groupRescheduleDate, setGroupRescheduleDate] = useState('')
  const [groupRescheduleReason, setGroupRescheduleReason] = useState('')
  const [groupRescheduleBusy, setGroupRescheduleBusy] = useState(false)
  const [groupRescheduleFeedback, setGroupRescheduleFeedback] = useState('')
  const [familyRescheduleId, setFamilyRescheduleId] = useState('')
  const [familyRescheduleDate, setFamilyRescheduleDate] = useState('')
  const [familyRescheduleStart, setFamilyRescheduleStart] = useState('')
  const [familyRescheduleReason, setFamilyRescheduleReason] = useState('')
  const [familyRescheduleSlots, setFamilyRescheduleSlots] = useState<readonly AvailableAppointmentSlot[]>([])
  const [familyRescheduleBusy, setFamilyRescheduleBusy] = useState(false)
  const [specialtyResult, setSpecialtyResult] = useState<{ agenda: AsyncState<readonly AgendaAppointment[]>; byPatient: Record<string, AsyncState<readonly { specialty_id: string; specialty_name: string }[]>> } | null>(null)
  const requestSequence = useRef(0)
  const automaticBounds = agendaBounds(anchorDate, view)
  const startDate = embeddedHome ? automaticBounds.startDate : consultationStartDate
  const endDate = embeddedHome ? automaticBounds.endDate : consultationEndDate
  const roleCodes = [
    ...new Set([
      ...accessContext.roles.map((role) => role.code),
      ...(accessContext.is_homologation_account &&
      accessContext.homologation_context?.enabled &&
      accessContext.primary_context.code
        ? [accessContext.primary_context.code]
        : []),
    ]),
  ]
  const isProfessional =
    Boolean(accessContext.professional_id) &&
    roleCodes.includes('profissional') &&
    accessContext.primary_context.code === 'profissional'
  // Presença/Falta inicia o fluxo assistencial: somente no contexto profissional ativo.
  const canRegisterAttendance = isProfessional
  const canAccess = roleCodes.some((role) =>
    ['administrador', 'administrativo_operacional', 'coordenador', 'profissional'].includes(role),
  )
  const professionalId = isProfessional
    ? accessContext.professional_id
    : selectedProfessionalId || null
  const navigationState = location.state && typeof location.state === 'object'
    ? location.state as Record<string, unknown>
    : null
  const appointmentFromHistoryId = navigationState?.origin === 'patient_appointment_history' && typeof navigationState.appointmentId === 'string'
    ? navigationState.appointmentId
    : ''
  const visibleAppointments = state.status === 'success'
    ? state.data.map((appointment) => attendanceOverrides[appointment.appointment_id]
      ? { ...appointment, attendance_status: attendanceOverrides[appointment.appointment_id] }
      : appointment)
    : []
  // Histórico e auditoria conservam os registros; a agenda mostra só horários ativos.
  const calendarAppointments = visibleAppointments.filter(
    (appointment) => isVisibleOnAgenda(appointment.attendance_status),
  )
  const appointmentFromHistory = appointmentFromHistoryId
    ? visibleAppointments.find((appointment) => appointment.appointment_id === appointmentFromHistoryId)
    : undefined

  // Resolver o profissional a partir do agendamento que a própria agenda autorizada retornou.
  useEffect(() => {
    if (!appointmentFromHistoryId || isProfessional || selectedProfessionalId || state.status !== 'success') return
    const selected = state.data.find((appointment) => appointment.appointment_id === appointmentFromHistoryId)
    if (selected) setSelectedProfessionalId(selected.professional_id)
  }, [appointmentFromHistoryId, isProfessional, selectedProfessionalId, state])

  const periodScheduled =
    state.status === 'success'
      ? visibleAppointments.filter((appointment) => appointment.attendance_status === 'agendado').length
      : state.status === 'empty'
        ? 0
        : null
  const periodConfirmed =
    state.status === 'success'
      ? visibleAppointments.filter((appointment) => appointment.attendance_status === 'confirmado').length
      : state.status === 'empty'
        ? 0
        : null
  const periodNoShows =
    state.status === 'success'
      ? visibleAppointments.filter((appointment) => appointment.attendance_status === 'faltou').length
      : state.status === 'empty'
        ? 0
        : null

  useEffect(() => {
    if (!embeddedHome || !isProfessional) {
      setUnreadNotifications(null)
      return
    }
    let active = true
    void getNotificationsService().getNotifications(true, 1, 0).then((nextState) => {
      if (!active) return
      setUnreadNotifications(
        nextState.status === 'success'
          ? (nextState.data[0]?.total_count ?? 0)
          : nextState.status === 'empty'
            ? 0
            : null,
      )
    })
    return () => {
      active = false
    }
  }, [embeddedHome, isProfessional])

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
    ? `own:${rescheduleProfessionalId}`
    : `${appointmentPatientId}:${selectedProfessionalId}`
  const reschedulableAppointments =
    showRescheduleForm &&
    rescheduleProfessionalId &&
    reschedulableResult?.key === reschedulableKey
      ? reschedulableResult.rows
      : []
  const validSlotStart = availableSlots.some((slot) => slot.slot_start === selectedSlotStart) ? selectedSlotStart : ''
  const rescheduleSlotKey = `${rescheduleProfessionalId}:${rescheduleTargetDate}`
  const rescheduleSlots =
    showRescheduleForm &&
    rescheduleProfessionalId &&
    rescheduleSlotResult?.key === rescheduleSlotKey
      ? rescheduleSlotResult.rows
      : []
  const validRescheduleSlotStart = rescheduleSlots.some(
    (slot) => slot.slot_start === selectedRescheduleSlotStart,
  )
    ? selectedRescheduleSlotStart
    : ''
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

  const loadPrevisitContacts = useCallback(async () => {
    const rpc = getRpcService()
    if (typeof rpc.getAppointmentPrevisitContacts !== 'function') return
    const result = await rpc.getAppointmentPrevisitContacts(startDate, endDate, professionalId)
    if (result.status === 'error') {
      setPrevisitLoadError(result.error.message)
      return
    }
    const data = result.status === 'success' && result.data && typeof result.data === 'object' && !Array.isArray(result.data)
      ? result.data as Record<string, unknown>
      : null
    const items = Array.isArray(data?.items) ? data.items : []
    const next: Record<string, { result: string; recorded_at: string }> = {}
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue
      const row = item as Record<string, unknown>
      if (typeof row.appointment_id !== 'string' || typeof row.result !== 'string') continue
      next[row.appointment_id] = {
        result: row.result,
        recorded_at: typeof row.recorded_at === 'string' ? row.recorded_at : '',
      }
    }
    const confirmationClient = getSupabaseClient() as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    }
    const confirmation = await confirmationClient.rpc('get_patient_confirmation_states_for_interface', {
      p_start_date: startDate, p_end_date: endDate, p_professional_id: professionalId || null,
    })
    if (!confirmation.error && Array.isArray(confirmation.data)) {
      for (const item of confirmation.data) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue
        const row = item as Record<string, unknown>
        if (typeof row.appointment_id !== 'string') continue
        if (row.decision === 'comparecera') next[row.appointment_id] = {
          result: 'confirmou_paciente', recorded_at: String(row.responded_at ?? ''),
        }
        else if (row.decision === null && !next[row.appointment_id]) next[row.appointment_id] = {
          result: 'aguardando_paciente', recorded_at: '',
        }
      }
    }
    setPrevisitContacts(next)
    setPrevisitLoadError(null)
  }, [startDate, endDate, professionalId])

  useEffect(() => {
    if (!canAccess || state.status !== 'success') return
    void loadPrevisitContacts()
  }, [canAccess, state, loadPrevisitContacts])

  // O familiar possui cadastro próprio; nunca abrimos a ficha do paciente de
  // origem como se fosse o atendimento psicológico do familiar.
  useEffect(() => {
    if (!canAccess || (state.status !== 'success' && state.status !== 'empty')) return
    let active = true
    const rpcClient = getSupabaseClient() as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
    }
    void rpcClient.rpc('get_family_psychology_agenda_cards_for_interface', {
      p_start_date: startDate, p_end_date: endDate, p_professional_id: professionalId || null,
    }).then(({ data, error }) => {
      if (!active) return
      setFamilyPsychologyCards(!error && Array.isArray(data)
        ? data.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && !Array.isArray(item))
        : [])
    }).catch(() => { if (active) setFamilyPsychologyCards([]) })
    return () => { active = false }
  }, [canAccess, state, startDate, endDate, professionalId])

  useEffect(() => {
    if (!canAccess || !professionalId) {
      setPsychologyGroupSessions([])
      setPsychologyGroupError('')
      return
    }
    let active = true
    void getRpcService().getPsychologyGroupSessions(professionalId, startDate, endDate)
      .then((result) => {
        if (!active) return
        if (result.status === 'success') {
          setPsychologyGroupSessions(result.data)
          setPsychologyGroupError('')
        } else {
          setPsychologyGroupSessions([])
          setPsychologyGroupError(result.status === 'error' ? result.error.message : '')
        }
      })
    return () => { active = false }
  }, [canAccess, professionalId, startDate, endDate, state])

  async function searchGroupPatients() {
    if (groupPatientQuery.trim().length < 2) {
      setGroupBookingFeedback('Digite pelo menos dois caracteres do nome ou Nº CAPO.')
      return
    }
    setGroupBookingBusy(true)
    const result = await getRpcService().searchReferralPatients(groupPatientQuery.trim(), 20, 0)
    const found = result.status === 'success' ? result.data : []
    setGroupPatients(found)
    setGroupPatientId(found.length === 1 ? found[0].patient_id : '')
    setGroupBookingFeedback(result.status === 'error' ? result.error.message :
      found.length === 0 ? 'Nenhum paciente localizado.' : '')
    setGroupBookingBusy(false)
  }

  async function bookGroupPatient() {
    if (!groupPatientId || !groupBookingId || !groupBookingDate || groupBookingBusy) return
    setGroupBookingBusy(true)
    const result = await getRpcService().bookPsychologyGroupParticipant(
      groupBookingId, groupBookingDate, groupPatientId,
    )
    if (result.status === 'success' && result.data.success) {
      setGroupBookingFeedback('Paciente agendado no grupo. Confirme o aviso da consulta pelo fluxo administrativo.')
      setGroupBookingId('')
      setGroupPatientId('')
      setGroupPatientQuery('')
      setGroupPatients([])
      await load()
    } else {
      setGroupBookingFeedback(result.status === 'error'
        ? result.error.message : 'Não foi possível confirmar o agendamento coletivo.')
    }
    setGroupBookingBusy(false)
  }

  async function prepareGroupNotice(
    session: PsychologyGroupSession,
    participant: PsychologyGroupSession['participants'][number],
  ) {
    const result = await getRpcService().getAppointmentCareLocation(participant.appointment_id)
    const location = result.status === 'success' && result.data &&
      typeof result.data === 'object' && !Array.isArray(result.data)
      ? result.data as Record<string, unknown> : null
    const careLocation = typeof location?.care_location === 'string' ? location.care_location.trim() : ''
    if (!careLocation) throw new Error('Local do agendamento não confirmado. Confira antes de avisar.')
    return appointmentNoticeMessage({
      patientName: participant.patient_name,
      specialtyName: 'Psicologia — ' + session.name,
      slotStart: session.start, careLocation,
      senderName: accessContext.real_identity.full_name?.trim() || accessContext.full_name?.trim() || accessContext.username,
      senderTitle: accessContext.function_title?.trim() || accessContext.real_identity.function_title?.trim() ||
        accessContext.primary_context.name?.trim() || 'Equipe CAPO',
    })
  }

  async function rescheduleGroupParticipant(
    session: PsychologyGroupSession,
    participant: PsychologyGroupSession['participants'][number],
  ) {
    if (groupRescheduleBusy || !groupRescheduleDate) return
    if (groupRescheduleDate === session.date) {
      setGroupRescheduleFeedback('Escolha uma data diferente da sessão original.')
      return
    }
    setGroupRescheduleBusy(true)
    setGroupRescheduleFeedback('')
    setLastRescheduledContact(null)
    try {
      const result = await getRpcService().reschedulePsychologyGroupParticipant(
        participant.appointment_id, groupRescheduleDate, groupRescheduleReason.trim(),
      )
      if (result.status !== 'success' || !result.data.success) {
        setGroupRescheduleFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a remarcação.')
        return
      }
      const locationResult = await getRpcService().getAppointmentCareLocation(result.data.new_appointment_id)
      const location = locationResult.status === 'success' && locationResult.data &&
        typeof locationResult.data === 'object' && !Array.isArray(locationResult.data)
        ? locationResult.data as Record<string, unknown> : null
      const careLocation = typeof location?.care_location === 'string' ? location.care_location.trim() : ''
      if (careLocation) {
        setLastRescheduledContact({
          patientId: participant.patient_id,
          kind: 'remarcacao',
          contact: {
            patientName: participant.patient_name,
            oldStart: session.start,
            newStart: result.data.new_appointment_start,
            careLocation,
          },
        })
      }
      setGroupRescheduleFeedback(careLocation
        ? 'Participante remarcado. Confira o WhatsApp de remarcação acima antes de enviar.'
        : 'Participante remarcado. Confirme o endereço do novo atendimento antes de avisar.')
      setGroupRescheduleAppointmentId('')
      setGroupRescheduleReason('')
      await loadProfessionalConsultation()
    } finally {
      setGroupRescheduleBusy(false)
    }
  }

  async function registerPrevisitContact(appointmentId: string) {
    const outcome = previsitOutcomes[appointmentId]
    if (!outcome || previsitBusyId) return
    setPrevisitBusyId(appointmentId)
    setPrevisitFeedback(null)
    const result = await getRpcService().registerAppointmentPrevisitContact(appointmentId, outcome)
    if (result.status === 'success') {
      // O contato administrativo não altera a situação da consulta.
      setPrevisitContacts((current) => ({
        ...current,
        [appointmentId]: { result: outcome, recorded_at: new Date().toISOString() },
      }))
      setPrevisitOutcomes((current) => ({ ...current, [appointmentId]: outcome }))
      setPrevisitFeedback('Contato prévio registrado. Isso não registra presença nem inicia atendimento.')
      await loadPrevisitContacts()
    } else {
      setPrevisitFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o contato prévio.')
    }
    setPrevisitBusyId(null)
  }

  function preparePrevisitReschedule(appointment: AgendaAppointment) {
    setShowScheduleForm(false)
    setShowRescheduleForm(true)
    setAppointmentPatientId(appointment.patient_id)
    setAppointmentPatientQuery(appointment.patient_name)
    setSelectedProfessionalId(appointment.professional_id)
    setSelectedReschedulableId(appointment.appointment_id)
    setMovementKind('')
    setLastRescheduledContact(null)
    setRescheduleOrigin('manual')
    setRescheduleReason('')
    setRescheduleTargetDate(dateInputValue(new Date()))
    setAppointmentFeedback(null)
  }

  function prepareAdministrativeReturn(appointment: AgendaAppointment) {
    if (isProfessional) return
    const matching = catalogRows.filter((row) => row.professional_id === appointment.professional_id)
    const specialty = matching.find((row) => row.specialty_name === appointment.specialty_name)
      ?? (matching.length === 1 ? matching[0] : null)
    setShowRescheduleForm(false)
    setShowScheduleForm(true)
    setMovementKind('retorno')
    setAppointmentPatientId(appointment.patient_id)
    setAppointmentPatientQuery(appointment.patient_name)
    setSelectedProfessionalId(appointment.professional_id)
    setSelectedSpecialtyId(specialty?.specialty_id ?? '')
    setAppointmentType('Retorno')
    setAppointmentOrigin('retorno_administrativo')
    setSelectedSlotStart('')
    setLastScheduledContact(null)
    setAppointmentFeedback(null)
  }

  const loadScheduleGrid = useCallback(async () => {
    if (!professionalId) {
      setScheduleGrid({ status: 'empty' })
      return { status: 'empty' } as AsyncState<readonly AgendaScheduleSlot[]>
    }
    setScheduleGrid(loadingState())
    const nextState = await getRpcService().getAgendaScheduleGrid(
      startDate,
      endDate,
      professionalId,
    )
    setScheduleGrid(nextState)
    return nextState
  }, [endDate, professionalId, startDate])

  const loadProfessionalConsultation = useCallback(async () => {
    await Promise.all([load(), loadScheduleGrid()])
  }, [load, loadScheduleGrid])

  function setConsultationRangeForView(anchor: string, nextView: AgendaView) {
    const bounds = agendaBounds(anchor, nextView)
    setConsultationStartDate(bounds.startDate)
    setConsultationEndDate(bounds.endDate)
  }

  function moveConsultationRange(direction: -1 | 1) {
    const nextAnchor = moveAnchor(consultationStartDate, view, direction)
    setConsultationRangeForView(nextAnchor, view)
  }

  async function searchAppointmentPatients() {
    const query = appointmentPatientQuery.trim()
    if (query.length < 2 && !/^\d$/.test(query)) {
      setAppointmentFeedback('Informe ao menos dois caracteres ou o Nº CAPO exato.')
      return
    }

    const result = await getRpcService().searchReferralPatients(query, 20, 0)
    const patients = result.status === 'success' ? result.data : []
    setAppointmentPatients(patients)

    if (patients.length === 1) {
      setAppointmentPatientId(patients[0].patient_id)
      setAppointmentPatientQuery(patients[0].full_name)
      setAppointmentFeedback(null)
      return
    }

    setAppointmentPatientId('')
    if (patients.length === 0) {
      setAppointmentFeedback(
        result.status === 'error' ? result.error.message : 'Nenhum paciente encontrado.',
      )
    } else {
      setAppointmentFeedback('Selecione o paciente correto entre os resultados encontrados.')
    }
  }

  function selectAppointmentPatient(patient: {
    patient_id: string
    full_name: string
    patient_number: string | null
    cms: string | null
  }) {
    setAppointmentPatientId(patient.patient_id)
    setAppointmentPatientQuery(patient.full_name)
    setAppointmentFeedback(null)
  }

  async function addSelectedPatientToQueue() {
    if (!appointmentPatientId || !selectedSpecialtyId || queueInclusionBusy || isProfessional || !roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role))) return
    setQueueInclusionBusy(true)
    setAppointmentFeedback(null)
    const result = await getRpcService().addPatientToWaitingList(appointmentPatientId, selectedSpecialtyId, 3, null)
    setAppointmentFeedback(result.status === 'success' ? 'Paciente incluído na fila de espera desta especialidade.' : result.status === 'error' ? result.error.message : 'A inclusão na fila não foi confirmada.')
    setQueueInclusionBusy(false)
  }

  function prepareSlotScheduling(slot: AgendaScheduleSlot) {
    if (isProfessional) return
    const catalogRow = catalogRows.find(
      (item) => item.professional_id === slot.professional_id,
    )

    setShowRescheduleForm(false)
    setMovementKind('')
    setShowScheduleForm(true)
    setSelectedProfessionalId(slot.professional_id)
    if (catalogRow) setSelectedSpecialtyId(catalogRow.specialty_id)
    setAnchorDate(slot.slot_date)
    setSelectedSlotStart(slot.slot_start)
    setAppointmentFeedback(null)
  }

  async function createAppointment() {
    if (awaitingNextAppointmentChoice) return
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
      let locationWarning = false
      const resultRecord =
        result.data && typeof result.data === 'object' && !Array.isArray(result.data)
          ? result.data as Record<string, unknown>
          : null
      const appointmentId =
        typeof resultRecord?.appointment_id === 'string'
          ? resultRecord.appointment_id
          : ''
      if (appointmentId && !isProfessional) {
        const professionalName =
          professionalOptions.find(([id]) => id === selectedProfessionalId)?.[1] ??
          'Profissional CAPO'
        const locationResult = await getRpcService().getAppointmentCareLocation(appointmentId)
        const locationData = locationResult.status === 'success' && locationResult.data &&
          typeof locationResult.data === 'object' && !Array.isArray(locationResult.data)
          ? locationResult.data as Record<string, unknown> : null
        const careLocation = typeof locationData?.care_location === 'string'
          ? locationData.care_location.trim() : ''
        setLastScheduledContact(careLocation ? {
          patientId: appointmentPatientId,
          patientName: appointmentPatientQuery,
          professionalName,
          specialtyName: specialtyOptions.find(([id]) => id === selectedSpecialtyId)?.[1] ?? 'Especialidade não informada',
          careLocation,
          slotStart: validSlotStart,
          isReturn: appointmentType === 'Retorno',
        } : null)
        if (!careLocation) locationWarning = true
      }
      if (prefillWaitingListId && appointmentId) {
        const completed = await getRpcService().completeWaitingListScheduling(
          prefillWaitingListId,
          appointmentId,
        )
        if (completed.status === 'error') {
          setAppointmentFeedback(
            'Agendamento criado, mas a baixa da fila não foi confirmada: ' +
              completed.error.message,
          )
          await load()
          return
        }
        setPrefillWaitingListId('')
      }
      if (prefillRenewalId && appointmentId) {
        const linked =
          await getRpcService().linkPrescriptionRenewalConsultAppointment(
            prefillRenewalId,
            appointmentId,
          )
        if (linked.status === 'error') {
          setAppointmentFeedback(
            'Agendamento criado, mas o vínculo com a Renovação de Receita não foi confirmado: ' +
              linked.error.message,
          )
          await load()
          return
        }
        setPrefillRenewalId('')
      }
      setAppointmentFeedback(locationWarning
        ? 'Agendamento criado, mas o local de atendimento não foi confirmado. Cadastre o endereço do profissional antes de enviar o WhatsApp.'
        : 'Agendamento criado. Agenda recarregada do banco.')
      setAwaitingNextAppointmentChoice(!isProfessional)
      if (isProfessional) {
        setAppointmentPatientId('')
        setAppointmentPatientQuery('')
        setAppointmentPatients([])
        setSelectedSpecialtyId('')
        setSelectedSlotStart('')
        setAppointmentType('')
        setMovementKind('')
        setAppointmentNotes('')
      }
      await load()
    } else if (result.status === 'error') {
      setAppointmentFeedback(result.error.message)
    }
  }

  useEffect(() => {
    if (!isProfessional || !showScheduleForm || appointmentOrigin !== 'retorno_profissional') return
    document.getElementById('schedule-title')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [isProfessional, showScheduleForm, appointmentOrigin])

  function prepareProfessionalReturn(appointment: AgendaAppointment) {
    if (!isProfessional || !accessContext.professional_id) return
    const ownSpecialty =
      effectiveSpecialties.find((item) => item.is_primary) ??
      effectiveSpecialties[0]
    if (!ownSpecialty) {
      setAppointmentFeedback('Nenhuma especialidade ativa foi encontrada para o retorno.')
      return
    }
    setShowRescheduleForm(false)
    setMovementKind('retorno')
    setShowScheduleForm(true)
    setAppointmentPatientId(appointment.patient_id)
    setAppointmentPatientQuery(appointment.patient_name)
    setSelectedSpecialtyId(ownSpecialty.specialty_id)
    setSelectedProfessionalId(accessContext.professional_id)
    setAppointmentType('Retorno')
    setAppointmentOrigin('retorno_profissional')
    setSelectedSlotStart('')
    setAppointmentFeedback(null)
  }

  async function rescheduleAppointment() {
    if (isProfessional) {
      setAppointmentFeedback('Remarcações de consultas pertencem ao fluxo Administrativo.')
      return
    }
    if (!['remarcacao', 'remanejamento'].includes(movementKind) || !validReschedulableId || !rescheduleProfessionalId || !validRescheduleSlotStart) {
      setAppointmentFeedback('Selecione o tipo de movimentação, o agendamento e o novo horário.')
      return
    }
    const previous = reschedulableAppointments.find((item) => item.appointment_id === validReschedulableId)
    const patientId = appointmentPatientId
    const newSlotStart = validRescheduleSlotStart
    setLastRescheduledContact(null)
    setAppointmentFeedback('Remarcando agendamento no banco…')
    const result = await getRpcService().rescheduleAppointment({
      appointmentId: validReschedulableId,
      newProfessionalId: rescheduleProfessionalId,
      newSlotStart: validRescheduleSlotStart,
      reason: rescheduleReason.trim(),
      origin: movementKind === 'remanejamento' ? 'alteracao_agenda'
        : rescheduleOrigin === 'faltoso' ? 'faltoso' : 'manual',
      newNotes: rescheduleNotes.trim(),
    })
    if (result.status === 'success') {
      const response = result.data && typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data as Record<string, unknown> : null
      const newAppointmentId = typeof response?.new_appointment_id === 'string' ? response.new_appointment_id : ''
      const locationResult = newAppointmentId ? await getRpcService().getAppointmentCareLocation(newAppointmentId) : null
      const locationData = locationResult?.status === 'success' && locationResult.data &&
        typeof locationResult.data === 'object' && !Array.isArray(locationResult.data)
        ? locationResult.data as Record<string, unknown> : null
      const careLocation = typeof locationData?.care_location === 'string' ? locationData.care_location.trim() : ''
      if (previous && careLocation) {
        setLastRescheduledContact({
          patientId,
          kind: movementKind === 'remanejamento' ? 'remanejamento' : 'remarcacao',
          contact: { patientName: previous.patient_name, oldStart: previous.appointment_date,
            newStart: newSlotStart, careLocation },
        })
      }
      setAppointmentFeedback(careLocation
        ? 'Movimentação registrada. Confira a mensagem de WhatsApp antes de enviar.'
        : 'Movimentação registrada, mas o endereço da nova consulta não foi confirmado. Corrija o endereço antes de avisar.')
      setShowRescheduleForm(false)
      setSelectedReschedulableId('')
      setRescheduleReason('')
      setRescheduleOrigin('')
      setRescheduleNotes('')
      setSelectedRescheduleSlotStart('')
      await load()
    } else if (result.status === 'error') setAppointmentFeedback(result.error.message)
  }

  async function selectFamilyRescheduleDate(professional: string, targetDate: string) {
    setFamilyRescheduleDate(targetDate)
    setFamilyRescheduleStart('')
    setFamilyRescheduleSlots([])
    if (!targetDate) return
    const result = await getRpcService().getAvailableAppointmentSlots(professional, targetDate)
    if (result.status === 'success') setFamilyRescheduleSlots(result.data)
    else if (result.status === 'error') setAppointmentFeedback(result.error.message)
  }

  function openFamilyNotice(item: Record<string, unknown>) {
    const clean = String(item.family_phone ?? '').replace(/\D/g, '')
    if (clean.length < 10) {
      setAppointmentFeedback('Cadastre um telefone válido para este familiar.')
      return
    }
    const phone = clean.startsWith('55') ? clean : `55${clean}`
    const sender = accessContext.real_identity.full_name?.trim() || accessContext.full_name?.trim() || accessContext.username
    const title = accessContext.function_title?.trim() || accessContext.real_identity.function_title?.trim() || accessContext.primary_context.name?.trim() || 'Equipe CAPO'
    const message = `Olá, ${String(item.family_name ?? 'Familiar')}! Lembramos seu atendimento de Psicologia com ${String(item.professional_name ?? 'profissional CAPO')} em ${formatDateTime(String(item.appointment_date))}. Por favor, confirme o recebimento.\n\n${sender} — ${title} — CAPO`
    if (!openCapoWhatsAppTab(`https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`))
      setAppointmentFeedback('O navegador bloqueou a abertura do WhatsApp.')
  }

  async function registerFamilyPrevisitContact(item: Record<string, unknown>) {
    const appointmentId = String(item.appointment_id)
    const outcome = previsitOutcomes[appointmentId]
    if (!outcome || previsitBusyId) return
    setPrevisitBusyId(appointmentId)
    const client = getSupabaseClient() as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
    }
    try {
      const { data, error } = await client.rpc('register_family_psychology_previsit_contact_for_interface', {
        p_appointment_id: appointmentId, p_result: outcome,
      })
      if (error || !(data && typeof data === 'object' && (data as { success?: boolean }).success)) {
        setPrevisitFeedback(error?.message ?? 'O banco não confirmou o aviso familiar.')
      } else {
        setPrevisitFeedback('Aviso registrado sem modificar a presença.')
        setFamilyPsychologyCards((current) => current.map((row) =>
          String(row.appointment_id) === appointmentId ? { ...row, last_notice_result: outcome } : row))
      }
    } catch {
      setPrevisitFeedback('Não foi possível registrar o aviso familiar.')
    } finally {
      setPrevisitBusyId(null)
    }
  }

  function prepareFamilyReschedule(appointmentId: string) {
    setFamilyRescheduleId(appointmentId)
    setFamilyRescheduleDate('')
    setFamilyRescheduleSlots([])
    setFamilyRescheduleStart('')
    setFamilyRescheduleReason('')
  }

  async function applyFamilyReschedule(professional: string) {
    if (!familyRescheduleId || !familyRescheduleStart || familyRescheduleBusy || isProfessional) return
    setFamilyRescheduleBusy(true)
    const result = await getRpcService().rescheduleFamilyPsychologyAppointment(
      familyRescheduleId, professional, familyRescheduleStart, familyRescheduleReason,
    )
    if (result.status === 'success') {
      setAppointmentFeedback('Consulta do familiar remarcada; histórico anterior preservado.')
      setFamilyRescheduleId('')
      setFamilyRescheduleSlots([])
      setFamilyRescheduleStart('')
      await load()
    } else if (result.status === 'error') setAppointmentFeedback(result.error.message)
    setFamilyRescheduleBusy(false)
  }

  function prepareCancellation(appointmentId: string) {
    setCancelAppointmentId(appointmentId)
    setCancelReason('')
    setAppointmentFeedback(null)
  }

  async function cancelAppointment() {
    if (!cancelAppointmentId || busyAppointmentId) return
    const reason = cancelReason.trim()
    if (reason.length < 5) {
      setAppointmentFeedback('Informe o motivo do cancelamento com pelo menos 5 caracteres.')
      return
    }

    setBusyAppointmentId(cancelAppointmentId)
    setAppointmentFeedback('Cancelando agendamento no banco...')
    let cancelled = false
    let cancellationError = ''
    if (familyPsychologyCards.some((item) => String(item.appointment_id) === cancelAppointmentId)) {
      const client = getSupabaseClient() as unknown as {
        rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
      }
      try {
        const { data, error } = await client.rpc('update_family_psychology_attendance_for_interface', {
          p_appointment_id: cancelAppointmentId, p_action: 'cancelado', p_reason: reason, p_notes: null,
        })
        cancelled = !error && !!data && typeof data === 'object' && (data as { success?: boolean }).success === true
        cancellationError = error?.message ?? 'O banco não confirmou o cancelamento familiar.'
      } catch {
        cancellationError = 'Falha ao cancelar atendimento familiar.'
      }
    } else {
      const result = await getRpcService().updateAppointmentAttendance({
        appointmentId: cancelAppointmentId, action: 'cancelado', notes: '', reason,
      })
      cancelled = result.status === 'success'
      cancellationError = result.status === 'error' ? result.error.message : 'Cancelamento não confirmado.'
    }

    if (cancelled) {
      setCancelAppointmentId('')
      setCancelReason('')
      setAppointmentFeedback('Agendamento cancelado. Agenda recarregada do banco.')
      if (professionalId) await loadProfessionalConsultation()
      else await load()
    } else {
      setAppointmentFeedback(
        cancellationError || 'O cancelamento não retornou confirmação.',
      )
    }
    setBusyAppointmentId(null)
  }

    async function updateAttendance(appointmentId: string, action: string) {
    if (busyAppointmentId) return
    setBusyAppointmentId(appointmentId)
    setAppointmentFeedback('Atualizando atendimento no banco...')
    const result = await getRpcService().updateAppointmentAttendance({
      appointmentId,
      action,
      notes: attendanceNotes.trim(),
      reason: attendanceReason.trim(),
    })
    if (result.status === 'success') {
      setAttendanceOverrides((current) => ({ ...current, [appointmentId]: action }))
      setAttendanceNotes('')
      setAttendanceReason('')
      const reloaded = await load()
      if (reloaded.status === 'error') {
        setAppointmentFeedback('Atendimento registrado, mas a recarga da agenda falhou: ' + reloaded.error.message)
      } else {
        setAppointmentFeedback('Atendimento atualizado. Agenda recarregada do banco.')
        if (action === 'confirmado' && onConfirmed) {
          const confirmedAppointment =
            (reloaded.status === 'success'
              ? reloaded.data.find((appointment) => appointment.appointment_id === appointmentId)
              : undefined) ??
            (state.status === 'success'
              ? state.data.find((appointment) => appointment.appointment_id === appointmentId)
              : undefined)

          if (confirmedAppointment) {
            onConfirmed(confirmedAppointment)
          } else if (scheduleGrid.status === 'success') {
            const slot = scheduleGrid.data.find(
              (item) => item.appointment_id === appointmentId,
            )
            if (slot?.patient_id && slot.patient_name) {
              onConfirmed({
                appointment_id: appointmentId,
                patient_id: slot.patient_id,
                patient_name: slot.patient_name,
                patient_number: null,
                professional_id: slot.professional_id,
                professional_name: slot.professional_name,
                specialty_name: null,
                appointment_date: slot.slot_start,
                appointment_end: slot.slot_end,
                appointment_type: slot.appointment_type ?? 'atendimento',
                attendance_status: 'confirmado',
                general_notes: null,
                rescheduled_from_id: null,
                reschedule_reason: null,
                reschedule_origin: null,
              })
            }
          }
        }
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
    if (!canAccess || !professionalId) {
      setScheduleGrid({ status: 'empty' })
      return
    }
    let active = true
    setScheduleGrid(loadingState())
    void getRpcService()
      .getAgendaScheduleGrid(startDate, endDate, professionalId)
      .then((nextState) => {
        if (active) setScheduleGrid(nextState)
      })
    return () => {
      active = false
    }
  }, [canAccess, endDate, professionalId, startDate])

  useEffect(() => {
    const stateValue = location.state && typeof location.state === 'object'
      ? location.state as Record<string, unknown> : null
    if (isProfessional || stateValue?.origin !== 'patient_link_cancellation' ||
      schedulingCatalog.status !== 'success') return
    const patientId = typeof stateValue.patientId === 'string' ? stateValue.patientId : ''
    const appointmentId = typeof stateValue.appointmentId === 'string' ? stateValue.appointmentId : ''
    if (!patientId || !appointmentId) return
    let active = true
    setShowScheduleForm(true)
    setShowRescheduleForm(false)
    setAwaitingNextAppointmentChoice(false)
    setAppointmentPatientId(patientId)
    setAppointmentPatientQuery('')
    setAppointmentPatients([])
    setSelectedSpecialtyId('')
    setSelectedProfessionalId('')
    setSelectedSlotStart('')
    setAppointmentOrigin('cancelamento_link_paciente')
    setAppointmentFeedback('Consultando os dados da consulta cancelada para preparar um novo agendamento…')
    void (async () => {
      const rpc = getRpcService()
      const [patient, history] = await Promise.all([
        rpc.getPatientForEdit(patientId),
        rpc.getPatientAppointmentHistory(patientId, 100, 0),
      ])
      if (!active) return
      const patientRow = patient.status === 'success'
        ? Array.isArray(patient.data) ? patient.data[0] : patient.data : null
      const patientName = patientRow && typeof patientRow === 'object' &&
        typeof (patientRow as Record<string, unknown>).full_name === 'string'
        ? (patientRow as Record<string, string>).full_name : ''
      if (!patientName || history.status !== 'success') {
        setAppointmentPatientId('')
        setAppointmentFeedback('Não foi possível validar o paciente e a consulta cancelada. Consulte o cadastro antes de agendar.')
        return
      }
      const original = history.data.find((item) => item.appointment_id === appointmentId && item.attendance_status === 'cancelado')
      if (!original) {
        setAppointmentPatientId('')
        setAppointmentFeedback('Consulta cancelada não localizada no histórico autorizado. Nenhum novo agendamento foi iniciado.')
        return
      }
      const candidates = schedulingCatalogRows(schedulingCatalog.data).filter((row) =>
        row.professional_name === original.professional_name &&
        row.specialty_name === original.specialty_name)
      setAppointmentPatientQuery(patientName)
      if (candidates.length === 1) {
        setSelectedSpecialtyId(candidates[0].specialty_id)
        setSelectedProfessionalId(candidates[0].professional_id)
      }
      setAppointmentFeedback(candidates.length === 1
        ? `Consulta anterior cancelada preservada no histórico. Escolha a nova data e o horário de ${original.specialty_name}.`
        : 'Paciente selecionado. Escolha a especialidade e o profissional; a agenda anterior não está disponível ou não é única no catálogo atual.')
    })().catch(() => {
      if (active) {
        setAppointmentPatientId('')
        setAppointmentFeedback('Falha ao consultar os dados do cancelamento. Tente novamente pela ficha do paciente.')
      }
    })
    return () => { active = false }
  }, [isProfessional, location.state, schedulingCatalog])

  useEffect(() => {
    const stateValue =
      location.state && typeof location.state === 'object'
        ? location.state as Record<string, unknown>
        : null
    const patientId =
      typeof stateValue?.patientId === 'string' ? stateValue.patientId : ''
    const patientName =
      typeof stateValue?.patientName === 'string' ? stateValue.patientName : ''
    let specialtyId =
      typeof stateValue?.specialtyId === 'string' ? stateValue.specialtyId : ''
    const requestedProfessionalId =
      typeof stateValue?.professionalId === 'string'
        ? stateValue.professionalId
        : ''
    const requestedAppointmentId =
      typeof stateValue?.appointmentId === 'string'
        ? stateValue.appointmentId
        : ''
    const waitingListId =
      typeof stateValue?.waitingListId === 'string' ? stateValue.waitingListId : ''
    const renewalId =
      typeof stateValue?.renewalId === 'string' ? stateValue.renewalId : ''
    const origin = typeof stateValue?.origin === 'string' ? stateValue.origin : ''
    if (origin === 'patient_link_cancellation') return
    const requestedSlotDate =
      typeof stateValue?.slotDate === 'string' ? stateValue.slotDate : ''
    const requestedSlotStart =
      typeof stateValue?.slotStart === 'string' ? stateValue.slotStart : ''

    // Histórico do paciente abre o dia da consulta sem iniciar novo agendamento.
    if (origin === 'patient_appointment_history' && requestedAppointmentId && requestedSlotDate) {
      setShowScheduleForm(false)
      setShowRescheduleForm(false)
      setView('day')
      setConsultationStartDate(requestedSlotDate)
      setConsultationEndDate(requestedSlotDate)
      setAnchorDate(requestedSlotDate)
      setAppointmentFeedback(null)
      if (requestedProfessionalId && !isProfessional) setSelectedProfessionalId(requestedProfessionalId)
      return
    }

    if (isProfessional) return

    if (
      origin === 'home_previsit_appointment' &&
      requestedAppointmentId && requestedProfessionalId && requestedSlotDate
    ) {
      setShowScheduleForm(false)
      setShowRescheduleForm(false)
      setSelectedProfessionalId(requestedProfessionalId)
      setConsultationStartDate(requestedSlotDate)
      setConsultationEndDate(requestedSlotDate)
      setAnchorDate(requestedSlotDate)
      setAppointmentFeedback(null)
      return
    }

    if (
      origin === 'home_cancel_appointment' &&
      requestedAppointmentId &&
      requestedProfessionalId &&
      requestedSlotDate
    ) {
      setShowScheduleForm(false)
      setShowRescheduleForm(false)
      setSelectedProfessionalId(requestedProfessionalId)
      setConsultationStartDate(requestedSlotDate)
      setConsultationEndDate(requestedSlotDate)
      setAnchorDate(requestedSlotDate)
      setCancelAppointmentId(requestedAppointmentId)
      setCancelReason('')
      setAppointmentFeedback(null)
      return
    }

    if (
      origin === 'home_reschedule_appointment' &&
      patientId && requestedAppointmentId && requestedProfessionalId
    ) {
      setShowScheduleForm(false)
      setShowRescheduleForm(true)
      setAppointmentPatientId(patientId)
      setAppointmentPatientQuery(patientName)
      setSelectedProfessionalId(requestedProfessionalId)
      setSelectedReschedulableId(requestedAppointmentId)
      setRescheduleOrigin('manual')
      setRescheduleReason('')
      setRescheduleTargetDate(dateInputValue(new Date()))
      setAppointmentFeedback(null)
      if (requestedSlotDate) {
        setConsultationStartDate(requestedSlotDate)
        setConsultationEndDate(requestedSlotDate)
      }
      return
    }

    if (
      origin === 'home_free_slot' &&
      requestedProfessionalId &&
      requestedSlotDate &&
      requestedSlotStart
    ) {
      if (schedulingCatalog.status !== 'success') return
      const professionalRows = schedulingCatalogRows(schedulingCatalog.data).filter(
        (item) => item.professional_id === requestedProfessionalId,
      )
      const specialtyIds = [...new Set(professionalRows.map((item) => item.specialty_id))]

      setShowRescheduleForm(false)
      setShowScheduleForm(true)
      setAppointmentPatientId('')
      setAppointmentPatientQuery('')
      setAppointmentPatients([])
      setSelectedProfessionalId(requestedProfessionalId)
      if (specialtyIds.length === 1) setSelectedSpecialtyId(specialtyIds[0])
      setAnchorDate(requestedSlotDate)
      setSelectedSlotStart(requestedSlotStart)
      setAppointmentOrigin('home_agenda')
      setAppointmentFeedback(null)
      return
    }

    if (!patientId) return

    if (origin === 'no_show_reschedule') {
      const sourceAppointmentId = requestedAppointmentId
      if (!requestedProfessionalId || !sourceAppointmentId) return
      setShowScheduleForm(false)
      setShowRescheduleForm(true)
      setAppointmentPatientId(patientId)
      setAppointmentPatientQuery(patientName)
      setSelectedProfessionalId(requestedProfessionalId)
      setSelectedReschedulableId(sourceAppointmentId)
      setRescheduleOrigin('faltoso')
      setRescheduleReason('')
      setRescheduleTargetDate(dateInputValue(new Date()))
      return
    }

    setShowScheduleForm(true)
    setShowRescheduleForm(false)
    setAwaitingNextAppointmentChoice(false)
    setAppointmentPatientId(patientId)
    setAppointmentPatientQuery(patientName)
    setPrefillWaitingListId(waitingListId)
    setPrefillRenewalId(renewalId)
    setAppointmentOrigin(
      origin === 'waiting_list'
        ? 'fila_de_espera'
        : origin === 'prescription_renewal'
          ? 'renovacao_receita_consulta'
          : origin === 'patient_record'
            ? 'cadastro_paciente'
            : '',
    )

    if (!specialtyId && requestedProfessionalId) {
      if (schedulingCatalog.status !== 'success') return
      const row = schedulingCatalogRows(schedulingCatalog.data).find(
        (item) => item.professional_id === requestedProfessionalId,
      )
      specialtyId = row?.specialty_id ?? ''
    }

    if (specialtyId) setSelectedSpecialtyId(specialtyId)
    if (requestedProfessionalId) setSelectedProfessionalId(requestedProfessionalId)
    if (origin === 'prescription_renewal') setAppointmentType('Retorno')
  }, [isProfessional, location.state, schedulingCatalog])

  useEffect(() => {
    if (!selectedProfessionalId) return
    if (!showScheduleForm) return
    let active = true
    void getRpcService()
      .getAvailableAppointmentSlots(selectedProfessionalId, anchorDate)
      .then((nextState) => {
        if (!active) return
        const rows = nextState.status === 'success' ? nextState.data : []
        setSlotResult({
          key: `${selectedProfessionalId}:${anchorDate}`,
          rows,
          status: nextState.status === 'error' ? 'error' : nextState.status === 'success' ? 'success' : 'empty',
        })
        setSelectedSlotStart((current) =>
          rows.some((slot) => slot.slot_start === current) ? current : '',
        )
      })
    return () => {
      active = false
    }
  }, [anchorDate, selectedProfessionalId, showScheduleForm])

  useEffect(() => {
    if (!isProfessional || !showScheduleForm || !selectedProfessionalId || !anchorDate) return
    let active = true
    const key = `${selectedProfessionalId}:${anchorDate}`
    setReturnScheduleGrid({ key, state: loadingState() })
    void getRpcService()
      .getAgendaScheduleGrid(anchorDate, anchorDate, selectedProfessionalId)
      .then((result) => {
        if (active) setReturnScheduleGrid({ key, state: result })
      })
    return () => { active = false }
  }, [isProfessional, showScheduleForm, selectedProfessionalId, anchorDate])

  useEffect(() => {
    if (!showRescheduleForm || !rescheduleProfessionalId || !rescheduleTargetDate) return
    let active = true
    void getRpcService()
      .getAvailableAppointmentSlots(
        rescheduleProfessionalId,
        rescheduleTargetDate,
      )
      .then((nextState) => {
        if (!active) return
        setRescheduleSlotResult({
          key: `${rescheduleProfessionalId}:${rescheduleTargetDate}`,
          rows: nextState.status === 'success' ? nextState.data : [],
        })
        setSelectedRescheduleSlotStart('')
      })
    return () => {
      active = false
    }
  }, [rescheduleProfessionalId, rescheduleTargetDate, showRescheduleForm])

  useEffect(() => {
    if (!showRescheduleForm || !rescheduleProfessionalId) return
    if (!isProfessional && !appointmentPatientId) return
    let active = true
    void getRpcService()
      .getReschedulableAppointments(
        isProfessional ? null : appointmentPatientId,
        rescheduleProfessionalId,
        null,
        50,
      )
      .then((nextState) => {
        if (!active) return
        setReschedulableResult({
          key: isProfessional
            ? `own:${rescheduleProfessionalId}`
            : `${appointmentPatientId}:${rescheduleProfessionalId}`,
          rows: nextState.status === 'success' ? nextState.data : [],
        })
        setSelectedReschedulableId((current) =>
          nextState.status === 'success' && nextState.data.some((item) => item.appointment_id === current)
            ? current
            : '',
        )
      })
    return () => {
      active = false
    }
  }, [
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

  if (isProfessional && professionalId && initialManageOpen) {
    return (
      <section className="assistential-page" aria-labelledby="manage-own-agenda-title">
        <div className="assistential-card">
          <div className="assistential-heading">
            <div>
              <p className="eyebrow">Disponibilidade profissional</p>
              <h2 id="manage-own-agenda-title">Gerenciar minha agenda</h2>
              <p>
                Ajustes temporários da própria disponibilidade. Esta área não exibe
                pacientes agendados nem substitui Minha Agenda.
              </p>
            </div>
          </div>
          <OwnAgendaManager professionalId={professionalId} />
        </div>
      </section>
    )
  }

  return (
    <section className={embeddedHome ? 'assistential-page agenda-home-embedded' : 'assistential-page'} aria-labelledby="agenda-title">
      <div className={embeddedHome ? 'assistential-card agenda-home-card' : 'assistential-card'}>
        <div className="assistential-heading">
          <div>
            <p className="eyebrow">
              {isProfessional ? 'Operacional assistencial' : 'Operacional geral'}
            </p>
            <h2 id="agenda-title">
              {isProfessional ? 'Minha Agenda' : 'Agenda Geral'}
            </h2>
            {!embeddedHome && (
              <p>
                {isProfessional
                  ? 'Seus atendimentos no período selecionado.'
                  : 'Atendimentos e movimentações autorizados no período selecionado.'}
              </p>
            )}
          </div>
          {!embeddedHome && (
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
                    setScheduleGrid(loadingState())
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
              Data inicial
              <input
                type="date"
                required
                value={consultationStartDate}
                onChange={(event) => {
                  if (event.target.value) {
                    const nextStart = event.target.value
                    setState(loadingState())
                    setScheduleGrid(loadingState())
                    setConsultationStartDate(nextStart)
                    if (!consultationEndDate || consultationEndDate < nextStart) {
                      setConsultationEndDate(nextStart)
                    }
                  }
                }}
              />
            </label>
            <label>
              Data final
              <input
                type="date"
                required
                min={consultationStartDate || undefined}
                value={consultationEndDate}
                onChange={(event) => {
                  if (event.target.value && event.target.value >= consultationStartDate) {
                    setState(loadingState())
                    setScheduleGrid(loadingState())
                    setConsultationEndDate(event.target.value)
                  }
                }}
              />
            </label>
            <button
              type="button"
              disabled={state.status === 'loading' || scheduleGrid.status === 'loading'}
              onClick={() => {
                if (professionalId) void loadProfessionalConsultation()
                else void load()
              }}
            >
              Atualizar
            </button>
          </div>
          )}
        </div>

        {!isProfessional && (
          <>
            <div className="agenda-actions" aria-label="Operações da agenda">
              <button
                type="button"
                className="agenda-action-primary"
                aria-expanded={showScheduleForm}
                onClick={() => {
                  setShowScheduleForm((current) => !current)
                  setShowRescheduleForm(false)
                  setAwaitingNextAppointmentChoice(false)
                  setMovementKind('')
                  setLastScheduledContact(null)
                }}
              >
                Agendar
              </button>
              <button
                type="button"
                disabled={!selectedProfessionalId || scheduleGrid.status === 'loading'}
                onClick={() => void loadProfessionalConsultation()}
              >
                Consultar
              </button>
              <button type="button" aria-expanded={showRescheduleForm} onClick={() => {
                setShowRescheduleForm((current) => !current)
                setShowScheduleForm(false)
                setAwaitingNextAppointmentChoice(false)
                setMovementKind('')
                setLastRescheduledContact(null)
              }}>Remarcar</button>
            </div>
          </>
        )}

        {showScheduleForm && (
          <section className="agenda-schedule-form" aria-labelledby="schedule-title">
            <div className="agenda-section-heading">
              <div>
                <p className="eyebrow">Atendimento e Acompanhamento</p>
                <h3 id="schedule-title">{isProfessional || movementKind === 'retorno' ? 'Agendar retorno' : 'Novo Agendamento'}</h3>
              </div>
            </div>
            {!isProfessional && schedulingCatalog.status === 'error' && <p role="alert">{schedulingCatalog.error.message}</p>}
            {!isProfessional && schedulingCatalog.status === 'empty' && <p>Nenhuma especialidade/profissional com agenda ativa foi encontrada.</p>}
            <div className="agenda-form-grid">
              <label>
                Paciente *
                <input
                  type="search"
                  readOnly={isProfessional || awaitingNextAppointmentChoice}
                  placeholder="Nome, Nº CAPO ou CMS"
                  value={appointmentPatientQuery}
                  onChange={(event) => {
                    setAppointmentPatientQuery(event.target.value)
                    if (!isProfessional) {
                      setAppointmentPatientId('')
                      setAppointmentPatients([])
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!isProfessional && event.key === 'Enter') {
                      event.preventDefault()
                      void searchAppointmentPatients()
                    }
                  }}
                />
                {!isProfessional && (
                  <button
                    type="button"
                    className="agenda-patient-search-button"
                    disabled={awaitingNextAppointmentChoice}
                    onClick={() => void searchAppointmentPatients()}
                  >
                    Buscar paciente
                  </button>
                )}
                {!isProfessional && appointmentPatients.length === 1 && appointmentPatientId && (
                  <div className="agenda-patient-selected" role="status" aria-label="Paciente selecionado">
                    <strong>{appointmentPatients[0].full_name}</strong>
                    <span>
                      Nº CAPO {appointmentPatients[0].patient_number ?? '—'} · CMS {appointmentPatients[0].cms ?? '—'}
                    </span>
                  </div>
                )}
                {!isProfessional && appointmentPatients.length > 1 && (
                  <div className="agenda-patient-results" aria-label="Pacientes encontrados">
                    {appointmentPatients.map((patient) => (
                      <button
                        key={patient.patient_id}
                        type="button"
                        className={appointmentPatientId === patient.patient_id ? 'is-selected' : ''}
                        aria-pressed={appointmentPatientId === patient.patient_id}
                        onClick={() => selectAppointmentPatient(patient)}
                      >
                        <strong>{patient.full_name}</strong>
                        <span>
                          Nº CAPO {patient.patient_number ?? '—'} · CMS {patient.cms ?? '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </label>
              {isProfessional ? (
                <>
                  <label>
                    Especialidade
                    <input readOnly value={effectiveSpecialties.find((item) => item.specialty_id === selectedSpecialtyId)?.specialty_name ?? ''} />
                  </label>
                  <label>
                    Profissional
                    <input readOnly value={accessContext.full_name ?? accessContext.username} />
                  </label>
                </>
              ) : (
                <>
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
                </>
              )}
              <label>
                Data *
                <input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
              </label>
              {isProfessional ? (
                <div className="agenda-form-wide agenda-return-grid" aria-label="Agenda do profissional para retorno">
                  <strong>Agenda do profissional — {formatPeriod(anchorDate, anchorDate, 'day')}</strong>
                  <p>Selecione um horário livre. Os horários agendados ou bloqueados não podem receber retorno.</p>
                  {(!returnScheduleGrid || returnScheduleGrid.key !== `${selectedProfessionalId}:${anchorDate}` ||
                    returnScheduleGrid.state.status === 'loading') && <p role="status">Consultando agenda…</p>}
                  {returnScheduleGrid?.key === `${selectedProfessionalId}:${anchorDate}` &&
                    returnScheduleGrid.state.status === 'error' && (
                      <p role="alert">Não foi possível consultar a agenda: {returnScheduleGrid.state.error.message}</p>
                    )}
                  {returnScheduleGrid?.key === `${selectedProfessionalId}:${anchorDate}` &&
                    returnScheduleGrid.state.status === 'empty' && <p>Nenhum horário configurado para esta data.</p>}
                  {returnScheduleGrid?.key === `${selectedProfessionalId}:${anchorDate}` &&
                    returnScheduleGrid.state.status === 'success' && (
                      <div className="assistential-table-wrap">
                        <table className="assistential-table agenda-return-slots">
                          <thead><tr><th>Horário</th><th>Situação</th><th>Paciente / bloqueio</th><th>Retorno</th></tr></thead>
                          <tbody>
                            {returnScheduleGrid.state.data.map((slot) => {
                              const freeSlot = availableSlots.find((available) => available.slot_start === slot.slot_start)
                              const canSelect = slot.slot_status === 'livre' && Boolean(freeSlot)
                              return (
                                <tr key={`${slot.professional_id}:${slot.slot_start}`}>
                                  <td>{slotClock(slot.slot_start)}–{slotClock(slot.slot_end)}</td>
                                  <td>{slot.slot_status === 'livre' ? (canSelect ? 'Livre' : 'Indisponível') :
                                    slot.slot_status === 'bloqueado' ? 'Bloqueado' : 'Agendado'}</td>
                                  <td>{slot.slot_status === 'bloqueado' ? <AgendaBlockIndicator type={slot.block_type} /> :
                                    slot.slot_status === 'agendado' ? (slot.patient_name ?? 'Horário ocupado') : '—'}</td>
                                  <td>{canSelect ? (
                                    <button
                                      type="button"
                                      className={validSlotStart === freeSlot!.slot_start ? 'agenda-slot-schedule-button is-selected' : 'agenda-slot-schedule-button'}
                                      aria-pressed={validSlotStart === freeSlot!.slot_start}
                                      onClick={() => setSelectedSlotStart(freeSlot!.slot_start)}
                                    >{validSlotStart === freeSlot!.slot_start ? 'Selecionado' : 'Selecionar'}</button>
                                  ) : '—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  {slotResult?.key === `${selectedProfessionalId}:${anchorDate}` && slotResult.status === 'error' &&
                    <p role="alert">Falha ao consultar vagas disponíveis. Tente outra data ou atualize a agenda.</p>}
                </div>
              ) : (
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
                        >{slot.slot_time}</button>
                      ))
                    )}
                  </div>
                </label>
              )}
              {!isProfessional && roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role)) && appointmentPatientId && selectedSpecialtyId && selectedProfessionalId && slotResult?.key === slotKey && slotResult.status !== 'error' && availableSlots.length === 0 && <button type="button" disabled={queueInclusionBusy} onClick={() => void addSelectedPatientToQueue()}>Incluir na fila</button>}
              {isProfessional ? (
                <label>
                  Tipo
                  <input readOnly value="Retorno" />
                </label>
              ) : (
                <label>
                  Tipo *
                  <select value={appointmentType} disabled={movementKind === 'retorno'} onChange={(event) => setAppointmentType(event.target.value)}>
                    <option value="">Selecionar</option>
                    <option>Primeiro atendimento no CAPO</option>
                    <option>Primeiro atendimento na especialidade</option>
                    <option>Retorno</option>
                  </select>
                </label>
              )}
              {!isProfessional && (
                <label>
                  Origem
                  <input type="text" placeholder="Origem da demanda" value={appointmentOrigin} onChange={(event) => setAppointmentOrigin(event.target.value)} />
                </label>
              )}
              <label className="agenda-form-wide">
                Observação administrativa mínima
                <textarea rows={3} value={appointmentNotes} onChange={(event) => setAppointmentNotes(event.target.value)} />
              </label>
            </div>
            <div className="agenda-form-actions">
              <button type="button" disabled={awaitingNextAppointmentChoice || !appointmentPatientId || !selectedProfessionalId || !validSlotStart || !appointmentType} onClick={() => void createAppointment()}>
                Confirmar agendamento
              </button>
              {!isProfessional && awaitingNextAppointmentChoice && (
                <>
                  <button type="button" onClick={() => {
                    setAwaitingNextAppointmentChoice(false)
                    setSelectedSpecialtyId('')
                    setSelectedProfessionalId('')
                    setSelectedSlotStart('')
                    setSlotResult(null)
                    setAppointmentType('')
                    setMovementKind('')
                    setAppointmentNotes('')
                    setLastScheduledContact(null)
                    setAppointmentFeedback('Paciente mantido. Escolha a próxima especialidade, profissional e horário.')
                  }}>Agendar outra especialidade</button>
                  <button type="button" onClick={() => {
                    setAwaitingNextAppointmentChoice(false)
                    setAppointmentPatientId('')
                    setAppointmentPatientQuery('')
                    setAppointmentPatients([])
                    setSelectedSpecialtyId('')
                    setSelectedProfessionalId('')
                    setSelectedSlotStart('')
                    setAppointmentType('')
                    setMovementKind('')
                    setAppointmentNotes('')
                    setLastScheduledContact(null)
                    setAppointmentFeedback(null)
                    setShowScheduleForm(false)
                  }}>Finalizar agendamentos</button>
                </>
              )}
            </div>
            {appointmentFeedback && <p className="agenda-contract-note" role="status">{appointmentFeedback}</p>}
            {!isProfessional && lastScheduledContact && (
              <PatientWhatsAppButton
                patientId={lastScheduledContact.patientId}
                label={lastScheduledContact.isReturn ? '💬 WhatsApp de retorno' : '💬 Avisar paciente pelo WhatsApp'}
                message={lastScheduledContact.isReturn ? movementWhatsAppMessage('retorno', {
                  patientName: lastScheduledContact.patientName,
                  newStart: lastScheduledContact.slotStart,
                  careLocation: lastScheduledContact.careLocation,
                  senderName: accessContext.real_identity.full_name?.trim()
                    || accessContext.full_name?.trim() || accessContext.username,
                  senderTitle: accessContext.function_title?.trim()
                    || accessContext.real_identity.function_title?.trim()
                    || accessContext.primary_context.name?.trim() || 'Equipe CAPO',
                }) : appointmentNoticeMessage({
                  ...lastScheduledContact,
                  senderName: accessContext.real_identity.full_name?.trim()
                    || accessContext.full_name?.trim()
                    || accessContext.username,
                  senderTitle: accessContext.function_title?.trim()
                    || accessContext.real_identity.function_title?.trim()
                    || accessContext.primary_context.name?.trim()
                    || 'Equipe CAPO',
                })}
              />
            )}
            <p className="agenda-contract-note">
              O agendamento é confirmado somente após retorno positivo do banco CAPO.
            </p>
          </section>
        )}

        {showRescheduleForm && !isProfessional && (
          <section className="agenda-schedule-form" aria-labelledby="reschedule-title">
            <div className="agenda-section-heading">
              <p className="eyebrow">Atendimento e Acompanhamento</p>
              <h3 id="reschedule-title">
                {isProfessional ? 'Remarcar meu retorno' : 'Remarcação / Retorno'}
              </h3>
            </div>
            <div className="agenda-form-grid">
              <label>
                Tipo de movimentação *
                <select value={movementKind} onChange={(event) => {
                  const choice = event.target.value as typeof movementKind
                  if (choice === 'retorno') {
                    const original = visibleAppointments.find((item) => item.appointment_id === validReschedulableId)
                    if (original) prepareAdministrativeReturn(original)
                    else setAppointmentFeedback('Selecione o agendamento original antes de marcar um retorno.')
                    return
                  }
                  setMovementKind(choice)
                  setAppointmentFeedback(null)
                }}>
                  <option value="">Selecionar tipo</option>
                  <option value="remarcacao">Remarcação solicitada pelo paciente</option>
                  <option value="remanejamento">Remanejamento pelo CAPO / bloqueio de agenda</option>
                  <option value="retorno">Retorno — nova consulta</option>
                </select>
              </label>
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
                Data do novo atendimento
                <input
                  type="date"
                  value={rescheduleTargetDate}
                  onChange={(event) => setRescheduleTargetDate(event.target.value)}
                />
              </label>
              <label>
                Novo horário
                <select
                  value={validRescheduleSlotStart}
                  onChange={(event) => setSelectedRescheduleSlotStart(event.target.value)}
                  disabled={rescheduleSlots.length === 0}
                >
                  <option value="">Selecionar horário</option>
                  {rescheduleSlots.map((slot) => (
                    <option key={slot.slot_start} value={slot.slot_start}>
                      {slot.slot_time}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Motivo (opcional)
                <input list="agenda-reschedule-reasons" value={rescheduleReason} onChange={(event) => setRescheduleReason(event.target.value)} />
                <datalist id="agenda-reschedule-reasons">
                  <option value="Remanejamento de agenda" />
                </datalist>
              </label>
              {!isProfessional && (
                <label>
                  Origem registrada
                  <input readOnly value={movementKind === 'remanejamento' ? 'alteracao_agenda' : rescheduleOrigin === 'faltoso' ? 'faltoso' : 'manual'} />
                </label>
              )}
              <label className="agenda-form-wide">
                Novas observações
                <textarea rows={3} value={rescheduleNotes} onChange={(event) => setRescheduleNotes(event.target.value)} />
              </label>
            </div>
            <div className="agenda-form-actions">
              <button type="button" disabled={!movementKind || movementKind === 'retorno' || !validReschedulableId || !validRescheduleSlotStart} onClick={() => void rescheduleAppointment()}>
                {movementKind === 'remanejamento' ? 'Aplicar remanejamento' : 'Aplicar remarcação'}
              </button>
            </div>
          </section>
        )}

        {!isProfessional && lastRescheduledContact && (
          <section className="agenda-schedule-form" aria-label="Comunicação após movimentação">
            <p>Consulta atualizada no banco. Confira a mensagem antes de enviar.</p>
            <PatientWhatsAppButton
              patientId={lastRescheduledContact.patientId}
              label={lastRescheduledContact.kind === 'remanejamento' ? '💬 WhatsApp de remanejamento' : '💬 WhatsApp de reagendamento'}
              message={movementWhatsAppMessage(lastRescheduledContact.kind, {
                ...lastRescheduledContact.contact,
                senderName: accessContext.real_identity.full_name?.trim()
                  || accessContext.full_name?.trim() || accessContext.username,
                senderTitle: accessContext.function_title?.trim()
                  || accessContext.real_identity.function_title?.trim()
                  || accessContext.primary_context.name?.trim() || 'Equipe CAPO',
              })}
            />
          </section>
        )}

        {appointmentFromHistoryId && state.status === 'success' && (
          <div className="agenda-history-selection" role="status">
            {appointmentFromHistory ? (
              <p><strong>Consulta localizada na agenda:</strong> {appointmentFromHistory.patient_name} · {formatDateTime(appointmentFromHistory.appointment_date)} · {appointmentFromHistory.professional_name} · {appointmentFromHistory.attendance_status}</p>
            ) : (
              <p>Este agendamento histórico não foi encontrado na agenda atual para a data selecionada. Consulte o histórico do paciente para conferir a situação registrada.</p>
            )}
          </div>
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
                  setScheduleGrid(loadingState())
                  setView(option)
                  if (!embeddedHome) {
                    setConsultationRangeForView(dateInputValue(new Date()), option)
                  }
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
                setScheduleGrid(loadingState())
                if (embeddedHome) {
                  setAnchorDate((date) => moveAnchor(date, view, -1))
                } else {
                  moveConsultationRange(-1)
                }
              }}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => {
                setState(loadingState())
                setScheduleGrid(loadingState())
                if (embeddedHome) {
                  setAnchorDate(dateInputValue(new Date()))
                } else {
                  const today = dateInputValue(new Date())
                  setConsultationRangeForView(today, view)
                }
              }}
            >
              Hoje
            </button>
            <button
              type="button"
              aria-label="Próximo período"
              onClick={() => {
                setState(loadingState())
                setScheduleGrid(loadingState())
                if (embeddedHome) {
                  setAnchorDate((date) => moveAnchor(date, view, 1))
                } else {
                  moveConsultationRange(1)
                }
              }}
            >
              Próximo
            </button>
          </div>
          <strong className="agenda-period" aria-live="polite">
            {formatPeriod(startDate, endDate, view)}
          </strong>
        </div>

        {!isProfessional && roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role)) && view === 'day' && ((state.status === 'success' && state.data.some((item) => item.attendance_status === 'agendado')) || familyPsychologyCards.some((item) => item.attendance_status === 'agendado') || psychologyGroupSessions.some((session) => session.participants.some((person) => person.attendance_status === 'agendado'))) && (
          <section className="agenda-schedule-form" aria-label="Avisos prévios das consultas">
            <h3>Avisos prévios das consultas</h3>
            {previsitLoadError && <p role="alert">{previsitLoadError}</p>}
            {previsitFeedback && <p role="status">{previsitFeedback}</p>}
            <div className="assistential-table-wrap">
              <table className="assistential-table">
                <thead><tr>
                  <th>Consulta</th><th>Paciente</th><th>Contato prévio</th>
                  {!isProfessional && <th>Ações administrativas</th>}
                </tr></thead>
                <tbody>
                  {(state.status === 'success' ? state.data : []).filter((item) => item.attendance_status === 'agendado').map((item) => {
                    const contact = previsitContacts[item.appointment_id]
                    return (
                      <tr key={item.appointment_id}>
                        <td>{formatDateTime(item.appointment_date)} — {item.professional_name}</td>
                        <td>{item.patient_name}</td>
                        <td>
                          {contact
                            ? ({
                                avisado: '✓ Paciente avisado',
                                confirmou: '✓ Paciente avisado',
                                confirmou_paciente: 'Confirmada pelo paciente (link)',
                                aguardando_paciente: 'Aguardando resposta pelo link',
                                sem_resposta: 'Contato sem resposta',
                                solicitou_cancelamento: 'Solicitou cancelamento',
                                solicitou_remarcacao: 'Solicitou remarcação',
                              } as Record<string, string>)[contact.result] ?? 'Contato registrado'
                            : 'Ainda sem registro de contato prévio'}
                        </td>
                        {!isProfessional && (
                          <td className="agenda-attendance-actions">
                            <PatientWhatsAppButton
                              patientId={item.patient_id}
                              label="💬 Lembrar consulta"
                              prepareMessage={() => prepareAppointmentReminder({
                                appointmentId: item.appointment_id,
                                patientName: item.patient_name,
                                professionalName: item.professional_name,
                                specialtyName: item.specialty_name ?? 'Consulta CAPO',
                                appointmentDate: item.appointment_date,
                                senderName: accessContext.real_identity.full_name?.trim()
                                  || accessContext.full_name?.trim() || accessContext.username,
                                senderTitle: accessContext.function_title?.trim()
                                  || accessContext.real_identity.function_title?.trim()
                                  || accessContext.primary_context.name?.trim() || 'Equipe CAPO',
                              })}
                            />
                            <select
                              aria-label={`Resultado do contato com ${item.patient_name}`}
                              value={previsitOutcomes[item.appointment_id] ?? (
                                contact && ['avisado', 'confirmou', 'solicitou_cancelamento'].includes(contact.result)
                                  ? (contact.result === 'confirmou' ? 'avisado' : contact.result)
                                  : ''
                              )}
                              onChange={(event) => setPrevisitOutcomes((current) => ({
                                ...current, [item.appointment_id]: event.target.value,
                              }))}
                            >
                              <option value="">Resultado do contato</option>
                              <option value="avisado">Paciente avisado</option>
                              <option value="solicitou_cancelamento">Solicitou cancelamento</option>
                            </select>
                            <button
                              type="button"
                              disabled={!previsitOutcomes[item.appointment_id] || previsitBusyId !== null}
                              onClick={() => void registerPrevisitContact(item.appointment_id)}
                            >{(contact?.result === 'avisado' || contact?.result === 'confirmou') && !previsitOutcomes[item.appointment_id]
                              ? '✓ Aviso registrado' : '✓ Registrar aviso'}</button>
                            <button type="button" onClick={() => preparePrevisitReschedule(item)}>↻ Remarcar</button>
                            <button type="button" onClick={() => prepareAdministrativeReturn(item)}><CapoIcon name="calendar" /> Retorno</button>
                            <button type="button" onClick={() => prepareCancellation(item.appointment_id)}><CapoIcon name="block" /> Cancelar</button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {familyPsychologyCards.filter((item) => item.attendance_status === 'agendado').map((item) => {
                    const aid = String(item.appointment_id)
                    const notice = String(item.last_notice_result ?? '')
                    return <tr key={aid}>
                      <td>{formatDateTime(String(item.appointment_date))} — {String(item.professional_name ?? 'Psicologia')}</td>
                      <td>{String(item.family_name ?? 'Familiar')} <small>Familiar/Cuidador · CAPO {String(item.family_capo_number ?? '')}</small></td>
                      <td>{notice === 'avisado' ? '✓ Paciente avisado' : notice === 'solicitou_cancelamento' ? 'Solicitou cancelamento' : 'Ainda sem registro de contato prévio'}</td>
                      <td className="agenda-attendance-actions">
                        <button type="button" onClick={() => openFamilyNotice(item)}>💬 Lembrar consulta</button>
                        <select aria-label={`Resultado do contato com ${String(item.family_name ?? 'Familiar')}`}
                          value={previsitOutcomes[aid] ?? (notice === 'avisado' || notice === 'solicitou_cancelamento' ? notice : '')}
                          onChange={(event) => setPrevisitOutcomes((current) => ({ ...current, [aid]: event.target.value }))}>
                          <option value="">Resultado do contato</option>
                          <option value="avisado">Paciente avisado</option>
                          <option value="solicitou_cancelamento">Solicitou cancelamento</option>
                        </select>
                        <button type="button" disabled={!previsitOutcomes[aid] || previsitBusyId !== null}
                          onClick={() => void registerFamilyPrevisitContact(item)}>✓ Registrar aviso</button>
                        <button type="button" onClick={() => prepareFamilyReschedule(aid)}>↻ Remarcar</button>
                        <button type="button" onClick={() => prepareCancellation(aid)}>Cancelar</button>
                        {familyRescheduleId === aid && (
                          <div className="agenda-form-grid" aria-label={`Remarcar consulta de ${String(item.family_name ?? 'familiar')}`}>
                            <label>Nova data
                              <input type="date" value={familyRescheduleDate}
                                onChange={(event) => void selectFamilyRescheduleDate(String(item.professional_id), event.target.value)} />
                            </label>
                            <label>Novo horário
                              <select value={familyRescheduleStart} onChange={(event) => setFamilyRescheduleStart(event.target.value)}>
                                <option value="">Selecionar horário</option>
                                {familyRescheduleSlots.map((slot) => <option key={slot.slot_start} value={slot.slot_start}>{slot.slot_time}</option>)}
                              </select>
                            </label>
                            <label>Motivo (opcional)
                              <input value={familyRescheduleReason} maxLength={500}
                                onChange={(event) => setFamilyRescheduleReason(event.target.value)} />
                            </label>
                            <button type="button" disabled={!familyRescheduleStart || familyRescheduleBusy}
                              onClick={() => void applyFamilyReschedule(String(item.professional_id))}>Confirmar remarcação</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  })}
                  {psychologyGroupSessions.flatMap((session) => session.participants.filter((person) => person.attendance_status === 'agendado').map((person) => (
                    <tr key={person.appointment_id}>
                      <td>{formatDateTime(session.start)} — Psicologia / {session.name}</td>
                      <td>{person.patient_name} <small>Terapia em grupo</small></td>
                      <td>{previsitContacts[person.appointment_id] ? previsitIndicator(previsitContacts[person.appointment_id].result) : 'Ainda sem registro de contato prévio'}</td>
                      <td className="agenda-attendance-actions">
                        <PatientWhatsAppButton patientId={person.patient_id} label="💬 Lembrar consulta"
                          prepareMessage={() => prepareAppointmentReminder({
                            appointmentId: person.appointment_id,
                            patientName: person.patient_name,
                            professionalName: professionalOptions.find(([id]) => id === professionalId)?.[1] ?? 'Profissional CAPO',
                            specialtyName: 'Psicologia — ' + session.name,
                            appointmentDate: session.start,
                            senderName: accessContext.real_identity.full_name?.trim() || accessContext.full_name?.trim() || accessContext.username,
                            senderTitle: accessContext.function_title?.trim() || accessContext.real_identity.function_title?.trim() || accessContext.primary_context.name?.trim() || 'Equipe CAPO',
                          })} />
                        <select aria-label={`Resultado do contato com ${person.patient_name}`}
                          value={previsitOutcomes[person.appointment_id] ?? ''}
                          onChange={(event) => setPrevisitOutcomes((current) => ({ ...current, [person.appointment_id]: event.target.value }))}>
                          <option value="">Resultado do contato</option>
                          <option value="avisado">Paciente avisado</option>
                          <option value="solicitou_cancelamento">Solicitou cancelamento</option>
                        </select>
                        <button type="button" disabled={!previsitOutcomes[person.appointment_id] || previsitBusyId !== null}
                          onClick={() => void registerPrevisitContact(person.appointment_id)}>✓ Registrar aviso</button>
                        <button type="button" onClick={() => {
                          const next = localDate(session.date)
                          next.setDate(next.getDate() + 7)
                          setGroupRescheduleAppointmentId(person.appointment_id)
                          setGroupRescheduleDate(dateInputValue(next))
                          setGroupRescheduleReason('')
                          document.getElementById(`grupo-${session.group_id}-${session.date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}>↻ Remarcar</button>
                        <button type="button" onClick={() => prepareCancellation(person.appointment_id)}>Cancelar</button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isProfessional && !embeddedHome && (
          <div className="agenda-attendance-notes">
            <label>Observação do atendimento<input value={attendanceNotes} onChange={(event) => setAttendanceNotes(event.target.value)} /></label>
            <label>Motivo da falta<input value={attendanceReason} onChange={(event) => setAttendanceReason(event.target.value)} /></label>
          </div>
        )}

        {cancelAppointmentId && (
          <section className="agenda-cancel-panel" aria-labelledby="agenda-cancel-title">
            <div>
              <h3 id="agenda-cancel-title">Cancelar agendamento</h3>
              <p>O cancelamento exige motivo e mantém o registro para auditoria.</p>
            </div>
            <label>
              Motivo do cancelamento *
              <textarea
                rows={2}
                maxLength={500}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
              />
            </label>
            <div className="agenda-cancel-actions">
              <button
                type="button"
                className="agenda-cancel-confirm"
                disabled={busyAppointmentId === cancelAppointmentId || cancelReason.trim().length < 5}
                onClick={() => void cancelAppointment()}
              >
                {busyAppointmentId === cancelAppointmentId ? 'Cancelando…' : 'Confirmar cancelamento'}
              </button>
              <button
                type="button"
                disabled={busyAppointmentId === cancelAppointmentId}
                onClick={() => {
                  setCancelAppointmentId('')
                  setCancelReason('')
                }}
              >
                Manter agendamento
              </button>
            </div>
          </section>
        )}

        <div aria-live="polite">
          {professionalId && scheduleGrid.status === 'loading' && <p>Carregando horários cadastrados…</p>}
          {professionalId && scheduleGrid.status === 'error' && (
            <p className="assistential-error" role="alert">
              Não foi possível carregar a grade da agenda: {scheduleGrid.error.message}
            </p>
          )}
          {professionalId && (scheduleGrid.status === 'empty' || scheduleGrid.status === 'success') && (
            <HomeScheduleGrid
              slots={scheduleGrid.status === 'success' ? scheduleGrid.data : []}
              startDate={startDate}
              endDate={endDate}
              view={view}
              appointments={calendarAppointments}
              attendanceOverrides={attendanceOverrides}
              onAttendance={canRegisterAttendance ? updateAttendance : undefined}
              onReturn={isProfessional ? prepareProfessionalReturn : undefined}
              onCancel={prepareCancellation}
              onSchedule={
                !isProfessional &&
                roleCodes.some((role) =>
                  ['administrador', 'administrativo_operacional'].includes(role),
                )
                  ? prepareSlotScheduling
                  : undefined
              }
              busyAppointmentId={busyAppointmentId}
              patientSpecialties={patientSpecialties}
              previsitContacts={previsitContacts}
              groupSessions={psychologyGroupSessions}
              renderAdministrativeActions={!isProfessional && roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role))
                ? (appointmentId) => {
                    const family = familyPsychologyCards.find((item) => String(item.appointment_id) === appointmentId)
                    if (family) return ['agendado', 'confirmado'].includes(String(family.attendance_status))
                      ? <button type="button" disabled={familyRescheduleBusy} onClick={() => {
                          prepareFamilyReschedule(appointmentId)
                        }}>Remarcar familiar</button> : null
                    const appointment = state.status === 'success' ? state.data.find((item) => item.appointment_id === appointmentId) : undefined
                    if (!appointment || !['agendado', 'confirmado'].includes(appointment.attendance_status)) return null
                    return <>
                      <PatientWhatsAppButton patientId={appointment.patient_id} label="Lembrar consulta"
                        prepareMessage={() => prepareAppointmentReminder({
                          appointmentId: appointment.appointment_id,
                          patientName: appointment.patient_name,
                          professionalName: appointment.professional_name,
                          specialtyName: appointment.specialty_name ?? 'Consulta CAPO',
                          appointmentDate: appointment.appointment_date,
                          senderName: accessContext.real_identity.full_name?.trim() || accessContext.full_name?.trim() || accessContext.username,
                          senderTitle: accessContext.function_title?.trim() || accessContext.real_identity.function_title?.trim() || accessContext.primary_context.name?.trim() || 'Equipe CAPO',
                        })} />
                      <label>Resultado do aviso
                        <select aria-label={`Resultado do aviso para ${appointment.patient_name}`}
                          value={previsitOutcomes[appointmentId] ?? (previsitContacts[appointmentId]?.result === 'confirmou' ? 'avisado' : previsitContacts[appointmentId]?.result ?? '')}
                          onChange={(event) => setPrevisitOutcomes((current) => ({ ...current, [appointmentId]: event.target.value }))}>
                          <option value="">Selecionar resultado</option>
                          <option value="avisado">Paciente avisado</option>
                          <option value="solicitou_cancelamento">Solicitou cancelamento</option>
                        </select>
                      </label>
                      <button type="button" disabled={!previsitOutcomes[appointmentId] || previsitBusyId !== null}
                        onClick={() => void registerPrevisitContact(appointmentId)}>Registrar aviso</button>
                      <button type="button" onClick={() => preparePrevisitReschedule(appointment)}>Remarcar</button>
                      {previsitContacts[appointmentId] && <small>{previsitIndicator(previsitContacts[appointmentId].result)}</small>}
                    </>
                  }
                : undefined}
            />
          )}

          {professionalId && psychologyGroupSessions.length > 0 && (
            <section className="agenda-psychology-sessions" aria-label="Terapia em grupo na agenda oficial">
              <h3>Atendimentos em grupo — Psicologia</h3>
              {psychologyGroupSessions.map((session) => {
                const occupied = session.participants.length
                const canBook = !isProfessional && roleCodes.some((code) =>
                  ['administrador', 'administrativo_operacional'].includes(code))
                const selected = groupBookingId === session.group_id && groupBookingDate === session.date
                return (
                  <article id={`grupo-${session.group_id}-${session.date}`} key={`${session.group_id}:${session.date}`} className="agenda-psychology-session">
                    <div className="agenda-psychology-session-heading">
                      <div>
                        <strong>{session.name}</strong>
                        <span>{session.date.split('-').reverse().join('/')} · {slotClock(session.start)}–{slotClock(session.end)}</span>
                      </div>
                      <strong>{occupied}/{session.capacity} vagas</strong>
                    </div>
                    {session.participants.length === 0 && <p>Nenhum paciente agendado neste grupo.</p>}
                    {session.participants.map((participant) => (
                      <div className="agenda-psychology-participant" key={participant.appointment_id}>
                        <span><strong>{participant.patient_name}</strong> · {participant.attendance_status}</span>
                        {canRegisterAttendance && participant.attendance_status === 'agendado' && (
                          <span className="agenda-home-patient-actions">
                            <button type="button" className="agenda-attendance-confirm"
                              disabled={busyAppointmentId !== null}
                              onClick={() => void updateAttendance(participant.appointment_id, 'confirmado')}>Confirmar</button>
                            <button type="button" className="agenda-attendance-absence"
                              disabled={busyAppointmentId !== null}
                              onClick={() => void updateAttendance(participant.appointment_id, 'faltou')}>Falta</button>
                          </span>
                        )}
                        {canBook && (
                          <div className="agenda-psychology-participant-admin" aria-label={`Ações administrativas de ${participant.patient_name}`}>
                            {['agendado', 'confirmado'].includes(participant.attendance_status) && (
                              <>
                                <PatientWhatsAppButton patientId={participant.patient_id}
                                  label="Avisar agendamento"
                                  prepareMessage={() => prepareGroupNotice(session, participant)} />
                                <PatientWhatsAppButton patientId={participant.patient_id}
                                  label="Lembrar consulta"
                                  prepareMessage={() => prepareAppointmentReminder({
                                    appointmentId: participant.appointment_id,
                                    patientName: participant.patient_name,
                                    professionalName: professionalOptions.find(([id]) => id === professionalId)?.[1] ?? 'Profissional CAPO',
                                    specialtyName: 'Psicologia — ' + session.name,
                                    appointmentDate: session.start,
                                    senderName: accessContext.real_identity.full_name?.trim()
                                      || accessContext.full_name?.trim() || accessContext.username,
                                    senderTitle: accessContext.function_title?.trim()
                                      || accessContext.real_identity.function_title?.trim()
                                      || accessContext.primary_context.name?.trim() || 'Equipe CAPO',
                                  })} />
                                <label>Resultado do aviso
                                  <select aria-label={`Resultado do aviso para ${participant.patient_name}`}
                                    value={previsitOutcomes[participant.appointment_id] ?? ''}
                                    onChange={(event) => setPrevisitOutcomes((current) =>
                                      ({ ...current, [participant.appointment_id]: event.target.value }))}>
                                    <option value="">Selecionar resultado</option>
                                    <option value="avisado">Paciente avisado</option>
                                    <option value="solicitou_cancelamento">Solicitou cancelamento</option>
                                  </select>
                                </label>
                                <button type="button"
                                  disabled={!previsitOutcomes[participant.appointment_id] || previsitBusyId !== null}
                                  onClick={() => void registerPrevisitContact(participant.appointment_id)}>
                                  Registrar aviso
                                </button>
                                {previsitContacts[participant.appointment_id] && (
                                  <small>{previsitIndicator(previsitContacts[participant.appointment_id].result)}</small>
                                )}
                              </>
                            )}
                            {['agendado', 'confirmado', 'faltou'].includes(participant.attendance_status) && (
                              <button type="button" disabled={groupRescheduleBusy}
                                onClick={() => {
                                  const next = localDate(session.date)
                                  next.setDate(next.getDate() + 7)
                                  setGroupRescheduleAppointmentId(participant.appointment_id)
                                  setGroupRescheduleDate(dateInputValue(next))
                                  setGroupRescheduleReason('')
                                  setGroupRescheduleFeedback('')
                                }}>Remarcar</button>
                            )}
                            {['agendado', 'confirmado'].includes(participant.attendance_status) && (
                              <button type="button" disabled={busyAppointmentId !== null}
                                onClick={() => prepareCancellation(participant.appointment_id)}>Cancelar</button>
                            )}
                            {groupRescheduleAppointmentId === participant.appointment_id && (
                              <div className="agenda-psychology-booking">
                                <p>Remarcar somente este participante para outra sessão do mesmo grupo.</p>
                                <label>Nova data
                                  <input type="date" min={dateInputValue(new Date())}
                                    value={groupRescheduleDate} onChange={(event) => setGroupRescheduleDate(event.target.value)} />
                                </label>
                                <label>Motivo (opcional)
                                  <input value={groupRescheduleReason}
                                    onChange={(event) => setGroupRescheduleReason(event.target.value)} />
                                </label>
                                <button type="button" disabled={groupRescheduleBusy || !groupRescheduleDate}
                                  onClick={() => void rescheduleGroupParticipant(session, participant)}>
                                  {groupRescheduleBusy ? 'Salvando…' : 'Confirmar remarcação'}
                                </button>
                                <button type="button" disabled={groupRescheduleBusy}
                                  onClick={() => setGroupRescheduleAppointmentId('')}>Voltar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {canBook && (
                      <button type="button" disabled={occupied >= session.capacity || groupBookingBusy}
                        onClick={() => {
                          setGroupBookingId(session.group_id)
                          setGroupBookingDate(session.date)
                          setGroupPatientQuery('')
                          setGroupPatientId('')
                          setGroupPatients([])
                          setGroupBookingFeedback('')
                        }}>
                        {occupied >= session.capacity ? 'Grupo completo' : `Agendar paciente · ${session.capacity - occupied} vagas`}
                      </button>
                    )}
                    {selected && (
                      <div className="agenda-psychology-booking">
                        <label>Paciente (nome ou Nº CAPO)
                          <input value={groupPatientQuery} onChange={(event) => {
                            setGroupPatientQuery(event.target.value)
                            setGroupPatientId('')
                            setGroupPatients([])
                          }} />
                        </label>
                        <button type="button" disabled={groupBookingBusy} onClick={() => void searchGroupPatients()}>Buscar</button>
                        {groupPatients.length > 0 && (
                          <label>Selecione o cadastro correto
                            <select value={groupPatientId} onChange={(event) => setGroupPatientId(event.target.value)}>
                              <option value="">Selecionar paciente</option>
                              {groupPatients.map((patient) => (
                                <option key={patient.patient_id} value={patient.patient_id}>
                                  {patient.full_name} · CAPO {patient.patient_number ?? '—'} · CMS {patient.cms ?? '—'}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <button type="button" disabled={!groupPatientId || groupBookingBusy}
                          onClick={() => void bookGroupPatient()}>
                          {groupBookingBusy ? 'Salvando…' : 'Confirmar vaga no grupo'}
                        </button>
                        <button type="button" onClick={() => setGroupBookingId('')}>Voltar</button>
                      </div>
                    )}
                  </article>
                )
              })}
              {groupBookingFeedback && <p role="status">{groupBookingFeedback}</p>}
              {groupRescheduleFeedback && <p role="status">{groupRescheduleFeedback}</p>}
              {previsitFeedback && <p role="status">{previsitFeedback}</p>}
            </section>
          )}
          {professionalId && psychologyGroupError && (
            <p role="alert">Não foi possível consultar os grupos: {psychologyGroupError}</p>
          )}

          {!professionalId && state.status === 'loading' && <p>Carregando agenda…</p>}
          {!professionalId && state.status === 'error' && (
            <div className="assistential-error" role="alert">
              <p>Não foi possível carregar a agenda: {state.error.message}</p>
              <button type="button" onClick={() => void load()}>
                Tentar novamente
              </button>
            </div>
          )}
          {!professionalId && (state.status === 'empty' ||
            (state.status === 'success' && calendarAppointments.length === 0)) &&
            view === 'day' && familyPsychologyCards.length === 0 && (
              <p>Nenhum atendimento agendado para este dia.</p>
            )}
          {!professionalId && (state.status === 'empty' || state.status === 'success') &&
            (view !== 'day' || (state.status === 'success' && calendarAppointments.length > 0)) && (
              <AgendaResults
                appointments={calendarAppointments}
                startDate={startDate}
                endDate={endDate}
                view={view}
                showSpecialty={shouldShowSpecialty}
                onAttendance={canRegisterAttendance ? updateAttendance : undefined}
                onCancel={prepareCancellation}
                busyAppointmentId={busyAppointmentId}
                previsitContacts={previsitContacts}
              />
            )}
          {familyPsychologyCards.length > 0 && (isProfessional || (familyRescheduleId && view !== 'day')) && (
            <section id="agenda-familiares-psicologia" aria-label="Atendimentos de familiares na agenda da Psicologia" className="agenda-schedule-form">
              <h3>Atendimentos de familiares — Psicologia</h3>
              <div className="assistential-table-wrap">
                <table className="assistential-table">
                  <thead><tr><th>Data e horário</th><th>Familiar atendido</th><th>Profissional</th><th>Situação</th>{!isProfessional && roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role)) && <th>Remanejamento</th>}</tr></thead>
                  <tbody>
                    {familyPsychologyCards.map((item) => (
                      <tr key={String(item.appointment_id)}>
                        <td>{formatDateTime(String(item.appointment_date))}</td>
                        <td>
                          <strong>{String(item.family_name ?? 'Familiar identificado')}</strong>
                          <small>Nº CAPO: {String(item.family_capo_number ?? 'Pendente')} · CMS: {String(item.family_cms ?? 'Não informado')}</small>
                          {item.source_patient_deceased === true && (
                            <small title="Informação reservada à equipe autorizada">
                              Paciente vinculado: {String(item.source_patient_name ?? 'Não informado')} · óbito em {String(item.source_patient_death_date ?? 'data não registrada').split('-').reverse().join('/')}
                            </small>
                          )}
                        </td>
                        <td>{String(item.professional_name ?? '—')}</td>
                        <td>{String(item.attendance_status ?? '—')}</td>
                        {!isProfessional && roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role)) && (
                          <td>
                            {['agendado', 'confirmado'].includes(String(item.attendance_status)) && (
                              <button type="button" disabled={familyRescheduleBusy} onClick={() => {
                                setFamilyRescheduleId(familyRescheduleId === String(item.appointment_id) ? '' : String(item.appointment_id))
                                setFamilyRescheduleSlots([])
                                setFamilyRescheduleStart('')
                              }}>Remarcar familiar</button>
                            )}
                            {familyRescheduleId === String(item.appointment_id) && (
                              <div className="agenda-form-grid">
                                <label>Nova data
                                  <input type="date" value={familyRescheduleDate} onChange={(event) => void selectFamilyRescheduleDate(String(item.professional_id), event.target.value)} />
                                </label>
                                <label>Novo horário
                                  <select value={familyRescheduleStart} onChange={(event) => setFamilyRescheduleStart(event.target.value)}>
                                    <option value="">Selecionar horário</option>
                                    {familyRescheduleSlots.map((slot) => <option key={slot.slot_start} value={slot.slot_start}>{slot.slot_time}</option>)}
                                  </select>
                                </label>
                                <label>Motivo (opcional)
                                  <input value={familyRescheduleReason} maxLength={500} onChange={(event) => setFamilyRescheduleReason(event.target.value)} />
                                </label>
                                <button type="button" disabled={!familyRescheduleStart || familyRescheduleBusy} onClick={() => void applyFamilyReschedule(String(item.professional_id))}>Confirmar remarcação</button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>
      {embeddedHome && isProfessional && (
        <aside className="agenda-home-side" aria-label="Indicadores da agenda">
          <div className="agenda-home-summary" aria-label="Resumo rápido da agenda">
            <article><span>Agendados</span><strong>{periodScheduled ?? '—'}</strong></article>
            <article><span>Confirmados</span><strong>{periodConfirmed ?? '—'}</strong></article>
            <article><span>Faltosos</span><strong>{periodNoShows ?? '—'}</strong></article>
          </div>
          <Link className="agenda-home-indicator agenda-home-indicator--notifications" to="/notificacoes">
            <span>Notificações</span>
            <strong>{unreadNotifications ?? '—'}</strong>
            <small>Avisos não lidos</small>
          </Link>
          <article className="agenda-home-indicator agenda-home-indicator--no-shows">
            <span>Faltosos</span>
            <strong>{periodNoShows ?? '—'}</strong>
            <small>Encaminhados ao Administrativo</small>
          </article>
        </aside>
      )}
    </section>
  )
}
