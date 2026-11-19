import { describe, expect, it } from 'vitest'
import { getCancellationSummary, type DailyCancellation } from '../../src/features/agenda/ProfessionalDailyCancellations'

const row = (id: string, when: string): DailyCancellation => ({
  appointment_id: id, appointment_date: when, patient_name: 'Paciente de teste',
  cancellation_reason: 'Cancelamento registrado', cancelled_at: when, cancelled_by: 'administrativo',
})
describe('Cancelamentos do Dia na Home profissional', () => {
  it('apresenta em ordem do horário original sem alterar os registros', () => {
    const original = [row('tarde', '2026-11-19T15:10:00Z'), row('manha', '2026-11-19T12:10:00Z')]
    expect(getCancellationSummary(original).map(item => item.appointment_id)).toEqual(['manha','tarde'])
    expect(original[0].appointment_id).toBe('tarde')
  })
  it('não gera dados fictícios para lista vazia', () => {
    expect(getCancellationSummary([])).toEqual([])
  })
})
