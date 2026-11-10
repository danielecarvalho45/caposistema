import { describe, expect, it } from 'vitest'
import { appointmentReminderMessage } from '../../src/features/agenda/appointment-confirmation-link'

const details = {
  patientName: 'Lavínia Emanuella Exemplo',
  professionalName: 'Profissional de Psicologia',
  appointmentDate: '2026-11-11T18:30:00Z',
  careLocation: 'Endereço informado no agendamento',
  confirmationUrl: 'https://caposistema.pages.dev/confirmar-consulta?t=exemplo',
  senderName: 'Daniele Carvalho',
  senderTitle: 'Auxiliar Administrativo',
}

describe('Lembrete de consulta CAPO resumido', () => {
  it('informa data, endereço, link e cargo do usuário que envia', () => {
    const message = appointmentReminderMessage(details, new Date('2026-11-10T15:00:00Z'))
    expect(message).toContain('Boa tarde, Lavínia!')
    expect(message).toContain('11/11/2026, às 15:30')
    expect(message).toContain(details.careLocation)
    expect(message).toContain(details.confirmationUrl)
    expect(message).toContain('Confirme sua presença para manter o agendamento ou cancele pelo link')
    expect(message).toContain('Daniele — Auxiliar Administrativo — CAPO')
    expect(message).not.toContain('Caso não responda')
  })

  it('adapta a saudação para o horário local', () => {
    expect(appointmentReminderMessage(details, new Date('2026-11-10T11:00:00Z'))).toContain('Bom dia')
    expect(appointmentReminderMessage(details, new Date('2026-11-10T21:00:00Z'))).toContain('Boa noite')
  })
})
