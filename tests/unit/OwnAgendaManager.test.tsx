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
  getAgendaBlockAffected: vi.fn(),
  getAvailableAppointmentSlots: vi.fn(),
  rescheduleAppointment: vi.fn(),
  rescheduleFamilyPsychologyAppointment: vi.fn(),
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

  it('exibe ajustes pontuais depois da configuração permanente e mantém as nove ações acessíveis', async () => {
    const user = userEvent.setup()
    render(<OwnAgendaManager professionalId="professional-id" allowStructuralEdit allowEmergencySlot />)
    await screen.findByRole('option', { name: /Seg, Ter · 08:00–11:00 · Ativo/ })
    const structural = screen.getByRole('region', { name: 'Configuração semanal permanente' })
    const pointual = screen.getByRole('region', { name: 'Ajustes pontuais de uma data' })
    expect(structural.compareDocumentPosition(pointual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const choices = within(pointual).getAllByRole('button')
    expect(choices).toHaveLength(9)
    await user.click(within(pointual).getByRole('button', { name: 'Café / Intervalo' }))
    expect(within(pointual).getByRole('button', { name: 'Café / Intervalo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Ação selecionada')).toHaveValue('Café / Intervalo')
    expect(rpc.createAgendaBlock).not.toHaveBeenCalled()
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

    await user.click(screen.getByRole('button', { name: 'Salvar novo padrão semanal' }))

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

describe('OwnAgendaManager — bloqueio médico condicionado ao remanejamento', () => {
  const affected = [{
    appointment_id: 'appointment-1',
    appointment_kind: 'paciente',
    person_id: 'patient-1',
    person_name: 'Paciente agendado',
    professional_id: 'doctor-id',
    appointment_date: '2026-11-11T13:00:00Z',
    appointment_end: '2026-11-11T13:30:00Z',
  }]

  beforeEach(() => {
    rpc.getAgendaConfiguration.mockResolvedValue({
      status: 'success', data: { configurations: [{ ...mondayTuesday, config_id: 'doctor-config' }] },
    })
    rpc.createAgendaBlock.mockResolvedValue({
      status: 'success',
      data: { success: false, requires_remanejamento: true, affected_appointments: 1 },
    })
    rpc.getAgendaBlockAffected.mockResolvedValue({ status: 'success', data: affected })
  })

  afterEach(() => { cleanup(); vi.clearAllMocks() })

  async function requestBlock() {
    await screen.findByLabelText('Configuração')
    await waitFor(() => expect(within(screen.getByLabelText('Configuração')).getByRole('option', { name: /Seg, Ter · 08:00–11:00/ })).toBeVisible())
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear período' }))
    fireEvent.change(screen.getByLabelText('Configuração'), { target: { value: 'doctor-config' } })
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-11-11' } })
    fireEvent.change(screen.getAllByLabelText('Início').at(-1)!, { target: { value: '08:00' } })
    fireEvent.change(screen.getAllByLabelText('Fim').at(-1)!, { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Justificativa operacional'), { target: { value: 'Compromisso médico' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alteração temporária' }))
    await screen.findByText(/Paciente agendado/)
  }

  it('recusa o bloqueio e mostra ao médico a pendência sem permitir remarcação administrativa', async () => {
    render(<OwnAgendaManager professionalId="doctor-id" />)
    await requestBlock()
    expect(rpc.createAgendaBlock).toHaveBeenCalledTimes(1)
    expect(rpc.getAgendaBlockAffected).toHaveBeenCalledWith('doctor-config', '2026-11-11', '08:00', '09:00')
    expect(screen.getByText(/Solicite ao Administrativo/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Remanejar esta consulta' })).not.toBeInTheDocument()
  })

  it('exige uma remarcação confirmada antes de permitir nova tentativa de bloqueio', async () => {
    rpc.getAvailableAppointmentSlots.mockResolvedValue({
      status: 'success', data: [{ slot_start: '2026-11-12T13:00:00Z', slot_time: '10:00' }],
    })
    rpc.rescheduleAppointment.mockResolvedValue({ status: 'success', data: { new_appointment_id: 'appointment-2' } })
    rpc.getAgendaBlockAffected
      .mockResolvedValueOnce({ status: 'success', data: affected })
      .mockResolvedValue({ status: 'success', data: [] })
    rpc.createAgendaBlock
      .mockResolvedValueOnce({ status: 'success', data: { success: false, requires_remanejamento: true } })
      .mockResolvedValue({ status: 'success', data: { success: true, block_id: 'block-1' } })

    render(<OwnAgendaManager professionalId="doctor-id" allowStructuralEdit />)
    await requestBlock()
    expect(rpc.createAgendaBlock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Remanejar esta consulta' }))
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-11-12' } })
    await screen.findByRole('option', { name: '10:00' })
    fireEvent.change(screen.getByLabelText('Horário livre'), { target: { value: '2026-11-12T13:00:00Z' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar remarcação' }))
    await waitFor(() => expect(rpc.rescheduleAppointment).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: 'appointment-1', origin: 'bloqueio_agenda',
    })))
    expect(rpc.createAgendaBlock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alteração temporária' }))
    await waitFor(() => expect(rpc.createAgendaBlock).toHaveBeenCalledTimes(2))
  })
})
