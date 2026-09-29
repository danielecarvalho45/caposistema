import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OwnAgendaManager } from '../../src/features/agenda/OwnAgendaManager'

const rpc = vi.hoisted(() => ({
  getAgendaConfiguration: vi.fn(),
  saveAgendaConfiguration: vi.fn(),
  saveAgendaRecurringInterval: vi.fn(),
  setAgendaRecurringIntervalStatus: vi.fn(),
  setAgendaConfigurationStatus: vi.fn(),
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

    expect(screen.getByLabelText('Duração do atendimento (minutos)')).toHaveValue(null)
    expect(screen.getByRole('button', { name: 'Alterar horário do dia' })).toBeVisible()

    fireEvent.change(screen.getByLabelText('Início da vigência'), {
      target: { value: '2026-10-01' },
    })
    fireEvent.change(screen.getByLabelText('Horário inicial'), {
      target: { value: '08:00' },
    })
    fireEvent.change(screen.getByLabelText('Horário final'), {
      target: { value: '17:00' },
    })
    fireEvent.change(screen.getByLabelText('Duração do atendimento (minutos)'), {
      target: { value: '60' },
    })

    const weekdays = within(screen.getByRole('group', { name: 'Dias da semana' }))
    await user.click(weekdays.getByLabelText('Quarta'))
    await user.click(weekdays.getByLabelText('Quinta'))
    await user.click(weekdays.getByLabelText('Sexta'))

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
