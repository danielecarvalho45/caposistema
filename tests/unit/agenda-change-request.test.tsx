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
  it('envia apenas a própria configuração e confirma após recarga da lista', async () => {
    const user = userEvent.setup()
    const service = {
      getAgendaConfiguration: vi.fn().mockResolvedValue({ status: 'success', data: { configurations: [{ config_id: 'config-id', start_date: '2026-09-24', start_time: '08:00', end_time: '12:00' }] } }),
      getAgendaChangeRequests: vi.fn().mockResolvedValueOnce({ status: 'empty' }).mockResolvedValue({ status: 'success', data: [{ request_id: 'request-id', status: 'pendente', request_type: 'status' }] }),
      createAgendaChangeRequest: vi.fn().mockResolvedValue({ status: 'success', data: { request_id: 'request-id' } }),
    }
    render(<AgendaChangeRequestPage accessContext={context} service={service} />)
    await user.selectOptions(await screen.findByLabelText('Configuração'), 'config-id')
    await user.selectOptions(screen.getByLabelText('Situação solicitada'), 'ativa')
    await user.type(screen.getByLabelText('Justificativa'), 'Alteração necessária para o serviço')
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }))
    expect(service.createAgendaChangeRequest).toHaveBeenCalledWith('config-id', { is_active: true, effective_date: expect.any(String) }, 'Alteração necessária para o serviço')
    expect(await screen.findByText('Solicitação registrada e lista recarregada do banco.')).toBeVisible()
    expect(service.getAgendaChangeRequests).toHaveBeenCalledTimes(2)
  })
})
