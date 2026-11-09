import { describe, expect, it } from 'vitest'
import { isVisibleOnAgenda } from '../../src/features/agenda/agenda-visibility'

describe('agenda: estados visíveis', () => {
  it('retira os registros cancelados e remarcados sem eliminar o histórico', () => {
    expect(isVisibleOnAgenda('cancelado')).toBe(false)
    expect(isVisibleOnAgenda('remarcado')).toBe(false)
  })

  it('mantém os agendamentos ativos e outros resultados assistenciais', () => {
    expect(isVisibleOnAgenda('agendado')).toBe(true)
    expect(isVisibleOnAgenda('confirmado')).toBe(true)
    expect(isVisibleOnAgenda('faltou')).toBe(true)
  })
})
