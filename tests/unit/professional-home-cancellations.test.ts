import { describe, expect, it } from 'vitest'
import { getCancellationSummary, getCancellationPresentation, type DailyCancellation } from '../../src/features/agenda/ProfessionalDailyCancellations'

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
  it('identifica cancelamento sem remarcação e não inventa nova data', () => {
    const cancelamento = row('original', '2026-11-24T17:00:00Z')
    expect(getCancellationPresentation(cancelamento)).toEqual({
      label: 'Cancelada', nextDate: null,
    })
  })

  it('identifica remarcação somente com sucessor confirmado pelo banco', () => {
    const remarcacao: DailyCancellation = {
      ...row('original', '2026-11-24T17:00:00Z'),
      cancellation_status: 'remarcada',
      new_appointment_date: '2026-11-27T13:00:00Z',
    }
    expect(getCancellationPresentation(remarcacao)).toEqual({
      label: 'Remarcada', nextDate: '2026-11-27T13:00:00Z',
    })
    expect(remarcacao.appointment_id).toBe('original')
  })

  it('não gera dados fictícios para lista vazia', () => {
    expect(getCancellationSummary([])).toEqual([])
  })
})
