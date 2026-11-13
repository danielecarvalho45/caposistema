const zone = 'America/Sao_Paulo'

export function capoGreeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, hour: '2-digit', hourCycle: 'h23',
  }).format(now))
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
}

function datePart(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', {
    timeZone: zone, day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date)
}

function timePart(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Horário não informado' : new Intl.DateTimeFormat('pt-BR', {
    timeZone: zone, hour: '2-digit', minute: '2-digit',
  }).format(date)
}

export type CommunicationContact = Readonly<{
  patientName: string
  oldStart?: string
  newStart: string
  careLocation: string
  professionalName?: string
  senderName: string
  senderTitle: string
}>

export function movementWhatsAppMessage(
  kind: 'retorno' | 'remarcacao' | 'remanejamento',
  contact: CommunicationContact,
  now = new Date(),
) {
  const greeting = capoGreeting(now)
  const sender = [contact.senderName.toLocaleUpperCase('pt-BR'), contact.senderTitle.toLocaleUpperCase('pt-BR')].join('\n')
  if (kind === 'remanejamento') {
    if (!contact.oldStart) throw new Error('A data anterior é necessária para o remanejamento.')
    return [
      '⚠️ *COMUNICADO IMPORTANTE — CAPO*', '',
      `${greeting}! 💙`, '', `Olá, ${contact.patientName}!`, '',
      `Por motivo de força maior, precisamos realizar um ajuste na agenda do nosso serviço no dia *${datePart(contact.oldStart)}* e, por isso, sua consulta precisou ser remarcada.`,
      '', 'Pedimos sinceras desculpas pelo transtorno e agradecemos sua compreensão! 💙', '',
      '✅ *SUA NOVA CONSULTA:*', '',
      `📅 *Data:* ${datePart(contact.newStart)}`,
      `🕒 *Horário:* ${timePart(contact.newStart)}`,
      `📍 *Local:* ${contact.careLocation}`, '',
      'Estamos à disposição para ajudar no que precisar!', '', sender,
    ].join('\n')
  }
  if (kind === 'remarcacao') {
    if (!contact.oldStart) throw new Error('A data anterior é necessária para a remarcação.')
    return [
      `${greeting}, ${contact.patientName}! 💙`, '',
      'Conforme solicitado, sua consulta no CAPO foi remarcada.', '',
      `📅 *Data anterior:* ${datePart(contact.oldStart)} às ${timePart(contact.oldStart)}`,
      '✅ *NOVO AGENDAMENTO:*',
      `📅 *Data:* ${datePart(contact.newStart)}`,
      `🕒 *Horário:* ${timePart(contact.newStart)}`,
      `📍 *Local:* ${contact.careLocation}`, '',
      'Considere a nova data e horário. Estamos à disposição! 💙', '', sender,
    ].join('\n')
  }
  return [
    `${greeting}, ${contact.patientName}! 💙`, '',
    'Sua consulta de *retorno* no CAPO foi agendada.', '',
    `📅 *Data:* ${datePart(contact.newStart)}`,
    `🕒 *Horário:* ${timePart(contact.newStart)}`,
    ...(contact.professionalName?.trim() ? [`👩‍⚕️ *Profissional:* ${contact.professionalName.trim()}`] : []),
    `📍 *Local:* ${contact.careLocation}`, '',
    'Estamos à disposição para ajudar no que precisar!', '', sender,
  ].join('\n')
}
