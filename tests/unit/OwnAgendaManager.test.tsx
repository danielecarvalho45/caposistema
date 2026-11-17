import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OwnAgendaManager } from '../../src/features/agenda/OwnAgendaManager'

const backend = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../src/lib/supabase/client', () => ({ getSupabaseClient: () => backend }))

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
    backend.rpc.mockResolvedValue({ data: { success: true, visits: [] }, error: null })
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

  it('mostra bloqueio domiciliar na configuração da profissional alvo selecionada pelo Gestor', async () => {
    render(<OwnAgendaManager professionalId="natalia-id" allowStructuralEdit enableSocialHomeVisits />)
    expect(await screen.findByRole('button', { name: 'Bloquear para Visita Domiciliar' })).toBeVisible()
    const actions = screen.getByRole('region', { name: 'Ajustes por período de datas' })
    expect(within(actions).getAllByRole('button')).toHaveLength(10)
    const button = within(actions).getByRole('button', { name: 'Bloquear para Visita Domiciliar' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(within(actions).getByRole('heading', { name: 'Bloqueio — Visita Domiciliar' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Bloquear período' })).toBeVisible()
  })

  it('não salva um bloqueio comum descrito como visita domiciliar', async () => {
    render(<OwnAgendaManager professionalId="natalia-id" allowStructuralEdit enableSocialHomeVisits />)
    await screen.findByRole('button', { name: 'Bloquear período' })
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear período' }))
    expect(screen.queryByLabelText('Configuração')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-17' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-11-17' } })
    fireEvent.change(screen.getByLabelText('Horário inicial da alteração'), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText('Horário final da alteração'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Justificativa operacional'), { target: { value: 'VISITA DOMICILIAR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alteração temporária' }))
    expect(await screen.findByText(/Bloqueios comuns permanecem separados/)).toBeVisible()
    expect(rpc.createAgendaBlock).not.toHaveBeenCalled()
  })

  it('não inclui bloqueio domiciliar para profissional de outra especialidade', async () => {
    render(<OwnAgendaManager professionalId="psicologia-id" allowStructuralEdit />)
    expect(screen.queryByRole('button', { name: 'Bloquear para Visita Domiciliar' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Ajustes por período de datas' })).getAllByRole('button')).toHaveLength(9)
  })

  it('exibe ajustes pontuais depois da configuração permanente e mantém as nove ações acessíveis', async () => {
    const user = userEvent.setup()
    render(<OwnAgendaManager professionalId="professional-id" allowStructuralEdit allowEmergencySlot />)
    await screen.findByRole('option', { name: /Seg, Ter · 08:00–11:00 · Ativo/ })
    const structural = screen.getByRole('region', { name: 'Configuração semanal permanente' })
    const pointual = screen.getByRole('region', { name: 'Ajustes por período de datas' })
    expect(structural.compareDocumentPosition(pointual) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const choices = within(pointual).getAllByRole('button')
    expect(choices).toHaveLength(9)
    await user.click(within(pointual).getByRole('button', { name: 'Café / Intervalo' }))
    expect(within(pointual).getByRole('button', { name: 'Café / Intervalo' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Café \/ Intervalo — a grade vigente/)).toBeVisible()
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
    backend.rpc.mockResolvedValue({
      data: { success: false, requires_remanejamento: true, affected_appointments: 1,
        affected_dates: [{ date: '2026-11-11', count: 1, config_id: 'doctor-config', start_time: '08:00', end_time: '09:00' }] },
      error: null,
    })
    rpc.getAgendaBlockAffected.mockResolvedValue({ status: 'success', data: affected })
  })

  afterEach(() => { cleanup(); vi.clearAllMocks() })

  async function requestBlock() {
    await screen.findByRole('button', { name: 'Bloquear período' })
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear período' }))
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-11' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-11-11' } })
    fireEvent.change(screen.getByLabelText('Horário inicial da alteração'), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText('Horário final da alteração'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Justificativa operacional'), { target: { value: 'Compromisso médico' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alteração temporária' }))
    await screen.findByText(/Paciente agendado/)
  }

  it('recusa o bloqueio e mostra ao médico a pendência sem permitir remarcação administrativa', async () => {
    render(<OwnAgendaManager professionalId="doctor-id" />)
    await requestBlock()
    expect(backend.rpc).toHaveBeenCalledWith('create_agenda_period_for_interface',
      expect.objectContaining({ p_professional_id: 'doctor-id', p_start_date: '2026-11-11',
        p_end_date: '2026-11-11', p_entry_type: 'bloqueio' }))
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
    backend.rpc.mockResolvedValueOnce({
      data: { success: false, requires_remanejamento: true,
        affected_dates: [{ date: '2026-11-11', count: 1, config_id: 'doctor-config', start_time: '08:00', end_time: '09:00' }] }, error: null,
    }).mockResolvedValue({ data: { success: true, created_count: 1 }, error: null })

    render(<OwnAgendaManager professionalId="doctor-id" allowStructuralEdit />)
    await requestBlock()
    expect(backend.rpc).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Remanejar esta consulta' }))
    fireEvent.change(screen.getByLabelText('Nova data'), { target: { value: '2026-11-12' } })
    await screen.findByRole('option', { name: '10:00' })
    fireEvent.change(screen.getByLabelText('Horário livre'), { target: { value: '2026-11-12T13:00:00Z' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar remarcação' }))
    await waitFor(() => expect(rpc.rescheduleAppointment).toHaveBeenCalledWith(expect.objectContaining({
      appointmentId: 'appointment-1', origin: 'bloqueio_agenda',
    })))
    expect(backend.rpc).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alteração temporária' }))
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledTimes(2))
  })
})

describe('OwnAgendaManager — intervalo de datas sem seletor de configuração', () => {
  beforeEach(() => {
    backend.rpc.mockResolvedValue({ data: { success: true, created_count: 4 }, error: null })
    rpc.getAgendaConfiguration.mockResolvedValue({ status: 'success',
      data: { configurations: [mondayTuesday, wednesdayFriday] } })
  })
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('envia datas e horários à RPC atômica e mantém visita domiciliar independente', async () => {
    render(<OwnAgendaManager professionalId="professional-id" />)
    await screen.findByRole('button', { name: 'Bloquear período' })
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear período' }))
    expect(screen.queryByLabelText('Configuração')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-11-30' } })
    fireEvent.change(screen.getByLabelText('Horário inicial da alteração'), { target: { value: '09:00' } })
    fireEvent.change(screen.getByLabelText('Horário final da alteração'), { target: { value: '12:00' } })
    fireEvent.change(screen.getByLabelText('Justificativa operacional'), { target: { value: 'Bloqueio programado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar alteração temporária' }))
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith('create_agenda_period_for_interface',
      expect.objectContaining({
        p_professional_id: 'professional-id', p_start_date: '2026-11-20',
        p_end_date: '2026-11-30', p_start_time: '09:00',
        p_end_time: '12:00', p_entry_type: 'bloqueio',
      })))
    expect(rpc.createAgendaBlock).not.toHaveBeenCalled()
    expect(await screen.findByText(/4 alteração\(ões\) registrada\(s\)/)).toBeVisible()
  })
})
