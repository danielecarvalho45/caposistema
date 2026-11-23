import { describe, expect, it } from 'vitest'
import { capoGreeting } from '../../src/components/shell/useCapoGreeting'

describe('saudação por horário de Brasília e tratamento validado', () => {
  it('usa manhã, tarde e noite no fuso brasileiro, independentemente do fuso local', () => {
    expect(capoGreeting('feminino', new Date('2026-11-23T11:59:00-03:00')))
      .toBe('Bom dia! Seja bem-vinda ao Sistema de Agendamento do CAPO.')
    expect(capoGreeting('masculino', new Date('2026-11-23T12:00:00-03:00')))
      .toBe('Boa tarde! Seja bem-vindo ao Sistema de Agendamento do CAPO.')
    expect(capoGreeting(null, new Date('2026-11-23T18:00:00-03:00')))
      .toBe('Boa noite! Boas-vindas ao Sistema de Agendamento do CAPO.')
  })

  it('não presume forma de tratamento quando não informada', () => {
    expect(capoGreeting(null, new Date('2026-11-23T09:00:00-03:00')))
      .toBe('Bom dia! Boas-vindas ao Sistema de Agendamento do CAPO.')
  })
})
