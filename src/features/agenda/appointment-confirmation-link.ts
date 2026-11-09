import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService } from '../../lib/supabase/rpc'

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
  const start = new Date(input.appointmentDate)
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('pt-BR', { ...options, timeZone: 'America/Sao_Paulo' }).format(start)
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23',
  }).format(new Date()))
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  return [
    `${greeting}, ${input.patientName}!`, '',
    '*Lembrete de consulta — CAPO*',
    'Centro de Apoio ao Paciente Oncológico', '',
    `📅 *Data:* ${format({ dateStyle: 'short' })}`,
    `🕒 *Horário:* ${format({ hour: '2-digit', minute: '2-digit' })}`,
    `👩‍⚕️ *Profissional:* ${input.professionalName}`,
    `🏥 *Especialidade:* ${input.specialtyName}`,
    `📍 *Local:* ${careLocation}`, '',
    'Por favor, informe se poderá comparecer:',
    `🔗 *Confirme sua consulta aqui:* ${confirmationUrl}`, '',
    'Na página, escolha *Vou comparecer* ou *Não poderei comparecer*.',
    'Caso não responda, seu agendamento continuará reservado.', '',
    '⚠️ *Importante:* Se não puder comparecer, sua resposta libera o horário e nossa equipe entrará em contato para remarcar.',
    '', 'Obrigado(a)!', '',
    input.senderName.toLocaleUpperCase('pt-BR'),
    input.senderTitle.toLocaleUpperCase('pt-BR'),
  ].join('\n')
}
