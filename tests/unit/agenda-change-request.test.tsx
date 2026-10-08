import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AgendaChangeRequestPage } from '../../src/features/agenda/AgendaChangeRequestPage'
import type { AccessContext } from '../../src/types/access'

const context = {
  is_active: true, professional_id: 'professional-id', roles: [{ code: 'profissional', name: 'Profissional' }],
} as unknown as AccessContext

afterEach(cleanup)
describe('Solicitação ao Coordenador', () => {
  it('envia dia, horário e padrão semanal completos para decisão da Coordenação', async () => {
    const user = userEvent.setup()
    const service = {
      getAgendaConfiguration: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          configurations: [{
            config_id: 'config-id',
            start_date: '2026-09-24',
            end_date: '2026-12-31',
            start_time: '08:00:00',
            end_time: '12:00:00',
            appointment_duration_minutes: 40,
            weekdays: [1, 2, 3],
            notes: 'Agenda atual',
          }],
        },
      }),
      getAgendaChangeRequests: vi.fn().mockResolvedValueOnce({ status: 'empty' }).mockResolvedValue({
        status: 'success',
        data: { requests: [{ request_id: 'request-id', status: 'pendente', request_type: 'configuracao' }] },
      }),
      createAgendaChangeRequest: vi.fn().mockResolvedValue({ status: 'success', data: { request_id: 'request-id' } }),
    }
    render(<AgendaChangeRequestPage accessContext={context} service={service} />)
    await user.selectOptions(await screen.findByLabelText('Configuração atual'), 'config-id')
    await user.clear(screen.getByLabelText('Horário inicial'))
    await user.type(screen.getByLabelText('Horário inicial'), '09:00')
    await user.clear(screen.getByLabelText('Horário final'))
    await user.type(screen.getByLabelText('Horário final'), '13:00')
    await user.type(screen.getByLabelText('Justificativa da solicitação'), 'Alteração necessária para o serviço')
    await user.click(screen.getByRole('button', { name: 'Enviar à Coordenação' }))
    expect(service.createAgendaChangeRequest).toHaveBeenCalledWith(
      'config-id',
      'configuracao',
      {
        start_date: '2026-09-24',
        end_date: '2026-12-31',
        start_time: '09:00',
        end_time: '13:00',
        duration_minutes: 40,
        weekdays: [1, 2, 3],
        notes: 'Agenda atual',
      },
      'Alteração necessária para o serviço',
    )
    expect(await screen.findByText('Solicitação registrada e lista recarregada do banco.')).toBeVisible()
    expect(service.getAgendaChangeRequests).toHaveBeenCalledTimes(2)
  })
})
