import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService } from '../../lib/supabase/rpc'
import { capoGreeting } from './appointment-communication'

type ReminderDetails = Readonly<{
  patientName: string
  professionalName: string
  appointmentDate: string
  careLocation: string
  confirmationUrl: string
  senderName: string
  senderTitle: string
}>

export function appointmentReminderMessage(input: ReminderDetails, now = new Date()): string {
  const start = new Date(input.appointmentDate)
  if (Number.isNaN(start.getTime())) throw new Error('Data da consulta inválida.')
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'America/Sao_Paulo' }).format(start)
  const firstName = input.patientName.trim().split(/\s+/)[0] || 'Paciente'
  const senderName = input.senderName.trim().split(/\s+/)[0] || input.senderName.trim()
  const senderTitle = input.senderTitle.trim()
  return [
    '⚠️ *Lembrete de Consulta — CAPO*', '',
    `${capoGreeting(now)}, ${firstName}! 🌷`, '',
    `📅 *${format({ dateStyle: 'short' })}, às ${format({ hour: '2-digit', minute: '2-digit' })}*`,
    `👩‍⚕️ *Profissional:* ${input.professionalName}`,
    `📍 *Local:* ${input.careLocation}`, '',
    '🔗 *Confirme sua presença para manter o agendamento ou cancele pelo link:*',
    input.confirmationUrl, '',
    `*${senderName} — ${senderTitle} — CAPO*`,
  ].join('\n')
}

export async function issueAppointmentConfirmationUrl(appointmentId: string): Promise<string> {
  const client = getSupabaseClient() as unknown as {
    rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message?: string } | null }>
  }
  const { data, error } = await client.rpc('issue_appointment_confirmation_link_for_interface', {
    p_appointment_id: appointmentId,
  })
  if (error) throw new Error(error.message ?? 'Não foi possível preparar o link de confirmação.')
  const value = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : null
  if (typeof value?.token !== 'string' || !/^[0-9a-f]{64}$/.test(value.token)) {
    throw new Error('O CAPO não retornou um link válido. Nenhum lembrete foi preparado.')
  }
  return `${window.location.origin}/confirmar-consulta?t=${encodeURIComponent(value.token)}`
}

export async function prepareAppointmentReminder(input: {
  appointmentId: string
  patientName: string
  professionalName: string
  specialtyName: string
  appointmentDate: string
  senderName: string
  senderTitle: string
}): Promise<string> {
  const locationResult = await getRpcService().getAppointmentCareLocation(input.appointmentId)
  const locationData = locationResult.status === 'success' && locationResult.data &&
    typeof locationResult.data === 'object' && !Array.isArray(locationResult.data)
    ? locationResult.data as Record<string, unknown> : null
  const careLocation = typeof locationData?.care_location === 'string'
    ? locationData.care_location.trim() : ''
  if (!careLocation) throw new Error('Local da consulta não cadastrado. Corrija-o antes de enviar o lembrete.')

  const confirmationUrl = await issueAppointmentConfirmationUrl(input.appointmentId)
  return appointmentReminderMessage({ ...input, careLocation, confirmationUrl })
}
