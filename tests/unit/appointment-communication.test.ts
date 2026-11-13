import { describe, expect, it } from 'vitest'
import { capoGreeting, movementWhatsAppMessage } from '../../src/features/agenda/appointment-communication'

const contact = {
  patientName: 'Paciente Exemplo',
  oldStart: '2026-11-17T11:10:00Z',
  newStart: '2026-11-19T13:30:00Z',
  careLocation: 'Unidade informada no agendamento',
  professionalName: 'Dra. Profissional Exemplo',
  senderName: 'Atendente CAPO',
  senderTitle: 'Auxiliar Administrativo',
}

describe('Comunicações CAPO conforme tipo de movimentação', () => {
  it('seleciona a saudação pelo horário de Brasília', () => {
    expect(capoGreeting(new Date('2026-11-10T11:00:00Z'))).toBe('Bom dia')
    expect(capoGreeting(new Date('2026-11-10T15:00:00Z'))).toBe('Boa tarde')
    expect(capoGreeting(new Date('2026-11-10T21:00:00Z'))).toBe('Boa noite')
  })

  it('destaca a nova consulta e pede desculpas somente no remanejamento pelo serviço', () => {
    const message = movementWhatsAppMessage('remanejamento', contact, new Date('2026-11-10T15:00:00Z'))
    expect(message).toContain('⚠️ *COMUNICADO IMPORTANTE — CAPO*')
    expect(message).not.toContain('*Profissional:*')
    expect(message).toContain('Boa tarde!')
    expect(message).toContain('força maior')
    expect(message).toContain('17/11/2026')
    expect(message).toContain('19/11/2026')
    expect(message).toContain('*SUA NOVA CONSULTA:*')
    expect(message).toContain('Unidade informada no agendamento')
  })

  it('não atribui ao serviço uma remarcação solicitada pelo paciente', () => {
    const message = movementWhatsAppMessage('remarcacao', contact)
    expect(message).toContain('Conforme solicitado')
    expect(message).not.toContain('*Profissional:*')
    expect(message).toContain('Data anterior')
    expect(message).not.toContain('força maior')
  })

  it('trata retorno como nova consulta, sem declarar cancelamento da anterior', () => {
    const message = movementWhatsAppMessage('retorno', contact)
    expect(message).toContain('consulta de *retorno*')
    expect(message).toContain('👩‍⚕️ *Profissional:* Dra. Profissional Exemplo')
    expect(message).toContain('Atendente CAPO'.toLocaleUpperCase('pt-BR'))
    expect(message).toContain('Auxiliar Administrativo'.toLocaleUpperCase('pt-BR'))
    expect(message).not.toContain('Data anterior')
    expect(message).not.toContain('remarcada')
  })
})
