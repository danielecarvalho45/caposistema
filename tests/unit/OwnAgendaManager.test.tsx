import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OwnAgendaManager } from '../../src/features/agenda/OwnAgendaManager'

const rpc = vi.hoisted(() => ({
  getAgendaConfiguration: vi.fn(),
  saveAgendaConfiguration: vi.fn(),
  saveAgendaRecurringInterval: vi.fn(),
  setAgendaRecurringIntervalStatus: vi.fn(),
  createAgendaBlock: vi.fn(),
  createAgendaException: vi.fn(),
}))

vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => rpc,
}))

const mondayTuesday = {
  config_id: 'config-mon-tue',
  start_date: '2026-10-01',
  end_date: null,
  start_time: '08:00:00',
  end_time: '11:00:00',
  appointment_duration_minutes: 30,
  weekdays: [1, 2],
  is_active: true,
  updated_at: '2026-09-29T04:00:00Z',
  notes: null,
  blocks: [],
}

const wednesdayFriday = {
  config_id: 'config-wed-fri',
  start_date: '2026-10-01',
  end_date: null,
  start_time: '08:00:00',
  end_time: '17:00:00',
  appointment_duration_minutes: 60,
  weekdays: [3, 4, 5],
  is_active: true,
  updated_at: '2026-09-29T04:05:00Z',
  notes: null,
  blocks: [],
}

describe('OwnAgendaManager — padrões semanais flexíveis', () => {
  beforeEach(() => {
    rpc.getAgendaConfiguration
      .mockResolvedValueOnce({
        status: 'success',
        data: { configurations: [mondayTuesday] },
      })
      .mockResolvedValue({
        status: 'success',
        data: { configurations: [mondayTuesday, wednesdayFriday] },
      })
    rpc.saveAgendaConfiguration.mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        config_id: 'config-wed-fri',
        updated_at: '2026-09-29T04:05:00Z',
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('adiciona outro grupo de dias sem editar o padrão já existente', async () => {
    const user = userEvent.setup()

    render(
      <OwnAgendaManager
        professionalId="professional-id"
        allowStructuralEdit
      />,
    )

    expect(
      await screen.findByRole('option', { name: /Seg, Ter · 08:00–11:00 · Ativo/ }),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Novo padrão semanal' }))

    await user.clear(screen.getByLabelText('Início da vigência'))
    await user.type(screen.getByLabelText('Início da vigência'), '2026-10-01')
    await user.type(screen.getByLabelText('Horário inicial'), '08:00')
    await user.type(screen.getByLabelText('Horário final'), '17:00')
    await user.clear(screen.getByLabelText('Duração da consulta (minutos)'))
    await user.type(screen.getByLabelText('Duração da consulta (minutos)'), '60')

    await user.click(screen.getByLabelText('Quarta'))
    await user.click(screen.getByLabelText('Quinta'))
    await user.click(screen.getByLabelText('Sexta'))

    await user.click(screen.getByRole('button', { name: 'Salvar configuração-base' }))

    await waitFor(() =>
      expect(rpc.saveAgendaConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          configId: null,
          professionalId: 'professional-id',
          startDate: '2026-10-01',
          startTime: '08:00',
          endTime: '17:00',
          durationMinutes: 60,
          weekdays: [3, 4, 5],
        }),
      ),
    )

    expect(
      await screen.findByText(
        'Novo padrão semanal adicionado sem alterar os padrões já existentes.',
      ),
    ).toBeVisible()

    expect(
      screen.getByRole('option', { name: /Seg, Ter · 08:00–11:00 · Ativo/ }),
    ).toBeVisible()
    expect(
      screen.getByRole('option', { name: /Qua, Qui, Sex · 08:00–17:00 · Ativo/ }),
    ).toBeVisible()
  })
})
