import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AgendaPage } from '../../src/features/agenda/AgendaPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getSchedulingCatalog: vi.fn(), getAvailableAppointmentSlots: vi.fn(),
  getAgendaScheduleGrid: vi.fn(), createAppointment: vi.fn(),
  updateAppointmentAttendance: vi.fn(),
  searchReferralPatients: vi.fn(), addPatientToWaitingList: vi.fn(),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()), getRpcService: () => rpc }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('aproveita paciente e especialidade já selecionados quando não há vaga', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'success', data: [{ specialty_id: 's1', specialty_name: 'Nutrição', professional_id: 'p1', professional_name: 'Profissional autorizado' }] })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'empty' })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [{ patient_id: 'patient-1', full_name: 'Paciente encontrado', patient_number: '1', cms: '87259' }] })
  rpc.addPatientToWaitingList.mockResolvedValue({ status: 'success', data: { success: true } })
  const context = { roles: [{ code: 'administrador' }], primary_context: { code: 'administrador' }, professional_id: null } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter><AgendaPage accessContext={context} loadAgenda={async () => ({ status: 'empty' })} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Agendar' }))
  await user.type(screen.getByPlaceholderText('Nome, Nº CAPO ou CMS'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar paciente' }))
  expect(await screen.findByText('Paciente encontrado')).toBeVisible()
  expect(screen.getByText('Nº CAPO 1 · CMS 87259')).toBeVisible()
  expect(screen.queryByText('Selecionar paciente encontrado')).not.toBeInTheDocument()
  await user.selectOptions(screen.getByLabelText('Especialidade *'), 's1')
  await user.selectOptions(screen.getByLabelText('Profissional *'), 'p1')
  await user.click(await screen.findByRole('button', { name: 'Incluir na fila' }))
  expect(rpc.addPatientToWaitingList).toHaveBeenCalledWith('patient-1', 's1', 3, null)
  expect(await screen.findByText('Paciente incluído na fila de espera desta especialidade.')).toBeVisible()
})


it('abre o agendamento com o paciente da consulta mesmo antes de escolher especialidade', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({
    status: 'success',
    data: [{
      specialty_id: 's1',
      specialty_name: 'Nutrição',
      professional_id: 'p1',
      professional_name: 'Profissional autorizado',
    }],
  })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'empty' })
  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext

  render(
    <MemoryRouter initialEntries={[{
      pathname: '/agenda',
      state: {
        patientId: 'patient-1',
        patientName: 'Paciente selecionado',
        origin: 'patient_record',
      },
    }]}>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    </MemoryRouter>,
  )

  expect(await screen.findByDisplayValue('Paciente selecionado')).toBeVisible()
  expect(screen.getByLabelText('Especialidade *')).toBeVisible()
})


it('permite iniciar e concluir agendamento clicando no horário livre de paciente já cadastrado', async () => {
  const slotStart = '2026-10-01T12:00:00.000Z'
  rpc.getSchedulingCatalog.mockResolvedValue({
    status: 'success',
    data: [{
      specialty_id: 's1',
      specialty_name: 'Clínica Geral',
      professional_id: 'p1',
      professional_name: 'Profissional autorizado',
    }],
  })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({
    status: 'success',
    data: [{
      professional_id: 'p1',
      slot_date: '2026-10-01',
      slot_time: '09:00:00',
      slot_start: slotStart,
      slot_end: '2026-10-01T12:30:00.000Z',
      duration_minutes: 30,
    }],
  })
  rpc.getAgendaScheduleGrid.mockResolvedValue({
    status: 'success',
    data: [{
      professional_id: 'p1',
      professional_name: 'Profissional autorizado',
      slot_date: '2026-10-01',
      weekday: 4,
      slot_start: slotStart,
      slot_end: '2026-10-01T12:30:00.000Z',
      duration_minutes: 30,
      slot_status: 'livre',
      appointment_id: null,
      patient_id: null,
      patient_name: null,
      appointment_type: null,
      block_type: null,
    }],
  })
  rpc.createAppointment.mockResolvedValue({
    status: 'success',
    data: {
      appointment_id: 'appointment-1',
      patient_id: 'patient-1',
      professional_id: 'p1',
      appointment_date: slotStart,
    },
  })

  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext
  const user = userEvent.setup()

  render(
    <MemoryRouter initialEntries={[{
      pathname: '/agenda',
      state: {
        patientId: 'patient-1',
        patientName: 'Paciente já cadastrado',
        specialtyId: 's1',
        professionalId: 'p1',
        origin: 'patient_record',
      },
    }]}>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    </MemoryRouter>,
  )

  expect(await screen.findByDisplayValue('Paciente já cadastrado')).toBeVisible()
  const scheduleTable = await screen.findByRole('table')
  expect(within(scheduleTable).getByRole('columnheader', { name: 'Horário' })).toBeVisible()
  expect(within(scheduleTable).getByRole('columnheader', { name: 'Paciente' })).toBeVisible()
  expect(within(scheduleTable).getByRole('columnheader', { name: 'Especialidades' })).toBeVisible()
  expect(within(scheduleTable).getByRole('columnheader', { name: 'Ações' })).toBeVisible()
  const freeSlotButton = await within(scheduleTable).findByRole('button', { name: 'Agendar' })
  await user.click(freeSlotButton)

  await user.selectOptions(screen.getByLabelText('Tipo *'), 'Primeiro atendimento na especialidade')
  const confirm = screen.getByRole('button', { name: 'Confirmar agendamento' })
  expect(confirm).toBeEnabled()
  await user.click(confirm)

  expect(rpc.createAppointment).toHaveBeenCalledWith({
    patientId: 'patient-1',
    professionalId: 'p1',
    slotStart,
    appointmentType: 'Primeiro atendimento na especialidade',
    generalNotes: null,
    operationalOrigin: 'cadastro_paciente',
  })
})


it('abre Novo Agendamento a partir de uma vaga livre da Home sem exigir paciente pré-selecionado', async () => {
  const slotStart = '2026-10-01T12:00:00.000Z'
  rpc.getSchedulingCatalog.mockResolvedValue({
    status: 'success',
    data: [{
      specialty_id: 's1',
      specialty_name: 'Clínica Geral',
      professional_id: 'p1',
      professional_name: 'Profissional autorizado',
    }],
  })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({
    status: 'success',
    data: [{
      professional_id: 'p1',
      slot_date: '2026-10-01',
      slot_time: '09:00:00',
      slot_start: slotStart,
      slot_end: '2026-10-01T12:30:00.000Z',
      duration_minutes: 30,
    }],
  })

  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext

  render(
    <MemoryRouter initialEntries={[{
      pathname: '/agenda',
      state: {
        origin: 'home_free_slot',
        professionalId: 'p1',
        slotDate: '2026-10-01',
        slotStart,
      },
    }]}>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    </MemoryRouter>,
  )

  expect(await screen.findByPlaceholderText('Nome, Nº CAPO ou CMS')).toBeVisible()
  expect(screen.getByLabelText('Especialidade *')).toHaveValue('s1')
  expect(screen.getByLabelText('Profissional *')).toHaveValue('p1')
  expect(await screen.findByRole('option', { name: /09:00/ })).toBeVisible()
})


it('mostra resultados homônimos com Nome, Nº CAPO e CMS para escolha explícita', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({
    status: 'success',
    data: [{
      specialty_id: 's1',
      specialty_name: 'Clínica Geral',
      professional_id: 'p1',
      professional_name: 'Profissional autorizado',
    }],
  })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'empty' })
  rpc.searchReferralPatients.mockResolvedValue({
    status: 'success',
    data: [
      { patient_id: 'patient-1', full_name: 'Maria Silva', patient_number: '2', cms: '11111' },
      { patient_id: 'patient-2', full_name: 'Maria Silva', patient_number: '3', cms: '22222' },
    ],
  })

  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext
  const user = userEvent.setup()

  render(
    <MemoryRouter>
      <AgendaPage accessContext={context} loadAgenda={async () => ({ status: 'empty' })} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: 'Agendar' }))
  await user.type(screen.getByPlaceholderText('Nome, Nº CAPO ou CMS'), 'Maria')
  await user.click(screen.getByRole('button', { name: 'Buscar paciente' }))

  const results = await screen.findByLabelText('Pacientes encontrados')
  expect(within(results).getByText('Nº CAPO 2 · CMS 11111')).toBeVisible()
  expect(within(results).getByText('Nº CAPO 3 · CMS 22222')).toBeVisible()
  const options = within(results).getAllByRole('button')
  await user.click(options[1])
  expect(options[1]).toHaveAttribute('aria-pressed', 'true')
})


it('cancela agendamento pela Agenda com motivo obrigatório e contrato existente', async () => {
  const appointment = {
    appointment_id: 'appointment-1',
    patient_id: 'patient-1',
    patient_name: 'Eliana Teles Machado',
    patient_number: '1',
    professional_id: 'p1',
    professional_name: 'Ilton de Oliveira Filho',
    specialty_name: 'Clínica Geral',
    appointment_date: '2026-10-01T11:10:00.000Z',
    appointment_end: '2026-10-01T12:10:00.000Z',
    appointment_type: 'retorno',
    attendance_status: 'agendado',
    general_notes: null,
    rescheduled_from_id: null,
    reschedule_reason: null,
    reschedule_origin: null,
  }
  const loadAgenda = vi.fn().mockResolvedValue({
    status: 'success',
    data: [appointment],
  })
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.updateAppointmentAttendance.mockResolvedValue({
    status: 'success',
    data: {
      appointment_id: 'appointment-1',
      attendance_status: 'cancelado',
    },
  })

  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext
  const user = userEvent.setup()

  render(
    <MemoryRouter>
      <AgendaPage accessContext={context} loadAgenda={loadAgenda} />
    </MemoryRouter>,
  )

  const cancel = await screen.findByRole('button', { name: 'Cancelar agendamento' })
  await user.click(cancel)
  const reason = screen.getByLabelText('Motivo do cancelamento *')
  await user.type(reason, 'Paciente solicitou cancelamento')
  const confirm = screen.getByRole('button', { name: 'Confirmar cancelamento' })
  expect(confirm).toBeEnabled()
  await user.click(confirm)

  expect(rpc.updateAppointmentAttendance).toHaveBeenCalledWith({
    appointmentId: 'appointment-1',
    action: 'cancelado',
    notes: '',
    reason: 'Paciente solicitou cancelamento',
  })
})

it('abre o cancelamento central ao clicar em Cancelar na Home do Gestor', async () => {
  const appointment = {
    appointment_id: 'appointment-1',
    patient_id: 'patient-1',
    patient_name: 'Paciente agendado',
    patient_number: '1',
    professional_id: 'p1',
    professional_name: 'Profissional autorizado',
    specialty_name: 'Clínica Geral',
    appointment_date: '2026-10-01T11:10:00.000Z',
    appointment_end: '2026-10-01T12:10:00.000Z',
    appointment_type: 'retorno',
    attendance_status: 'agendado',
    general_notes: null,
    rescheduled_from_id: null,
    reschedule_reason: null,
    reschedule_origin: null,
  }
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getAgendaScheduleGrid.mockResolvedValue({ status: 'empty' })

  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext

  render(
    <MemoryRouter initialEntries={[{
      pathname: '/agenda',
      state: {
        origin: 'home_cancel_appointment',
        appointmentId: 'appointment-1',
        professionalId: 'p1',
        slotDate: '2026-10-01',
      },
    }]}>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'success', data: [appointment] })}
      />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Cancelar agendamento' })).toBeVisible()
  expect(screen.getByLabelText('Motivo do cancelamento *')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar cancelamento' })).toBeDisabled()
})



it('carrega especialidades e profissionais no Administrativo Operacional simulado da homologação', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({
    status: 'success',
    data: [
      {
        specialty_id: 'clinical-id',
        specialty_name: 'Clínica Geral',
        professional_id: 'clinical-professional-id',
        professional_name: 'Homologação — Médico Clínico Geral',
      },
      {
        specialty_id: 'nutrition-id',
        specialty_name: 'Nutrição',
        professional_id: 'nutrition-professional-id',
        professional_name: 'Homologação — Nutrição',
      },
    ],
  })

  const context = {
    roles: [{ code: 'administrador_tecnico', name: 'Administrador Técnico' }],
    primary_context: {
      code: 'administrativo_operacional',
      name: 'Administrativo Operacional',
    },
    professional_id: null,
    is_homologation_account: true,
    homologation_context: {
      enabled: true,
      role_code: 'administrativo_operacional',
      role_name: 'Administrativo Operacional',
      test_patient_id: 'test-patient-id',
    },
  } as unknown as AccessContext

  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: 'Agendar' }))

  expect(await screen.findByRole('option', { name: 'Clínica Geral' })).toBeVisible()
  expect(screen.getByRole('option', { name: 'Nutrição' })).toBeVisible()

  await user.selectOptions(screen.getByLabelText('Especialidade *'), 'nutrition-id')
  expect(
    screen.getByRole('option', { name: 'Homologação — Nutrição' }),
  ).toBeVisible()
})


it('confirma pela grade e abre o fluxo do paciente mesmo quando a lista paralela está vazia', async () => {
  const onConfirmed = vi.fn()
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getAgendaScheduleGrid.mockResolvedValue({
    status: 'success',
    data: [{
      professional_id: 'social-professional-id',
      professional_name: 'Homologação — Assistência Social',
      slot_date: '2026-09-30',
      weekday: 3,
      slot_start: '2026-09-30T13:30:00.000Z',
      slot_end: '2026-09-30T14:00:00.000Z',
      duration_minutes: 30,
      slot_status: 'agendado',
      appointment_id: 'appointment-visible',
      patient_id: 'patient-visible',
      patient_name: 'Paciente teste visível',
      appointment_type: 'primeiro_capo',
      block_type: null,
    }],
  })
  rpc.updateAppointmentAttendance.mockResolvedValue({
    status: 'success',
    data: {
      appointment_id: 'appointment-visible',
      attendance_status: 'confirmado',
    },
  })

  const context = {
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { code: 'profissional', name: 'Profissional' },
    professional_id: 'social-professional-id',
  } as unknown as AccessContext

  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
        onConfirmed={onConfirmed}
        embeddedHome
      />
    </MemoryRouter>,
  )

  const patientCell = (await screen.findByText('Paciente teste visível')).closest('td')
  expect(patientCell).not.toBeNull()
  const confirm = within(patientCell as HTMLElement).getByRole('button', {
    name: 'Confirmar consulta de Paciente teste visível',
  })
  const absence = within(patientCell as HTMLElement).getByRole('button', {
    name: 'Marcar falta de Paciente teste visível',
  })
  expect(confirm).toHaveClass('agenda-attendance-confirm')
  expect(confirm).toHaveTextContent('Confirmar')
  expect(absence).toHaveClass('agenda-attendance-absence')
  expect(absence).toHaveTextContent('Falta')
  await user.click(confirm)

  expect(rpc.updateAppointmentAttendance).toHaveBeenCalledWith({
    appointmentId: 'appointment-visible',
    action: 'confirmado',
    notes: '',
    reason: '',
  })
  expect(onConfirmed).toHaveBeenCalledWith(
    expect.objectContaining({
      appointment_id: 'appointment-visible',
      patient_id: 'patient-visible',
      patient_name: 'Paciente teste visível',
      attendance_status: 'confirmado',
    }),
  )
  expect(await screen.findByText('✓ Confirmado')).toBeVisible()
  await waitFor(() => {
    expect(screen.queryByRole('button', { name: 'Confirmar consulta de Paciente teste visível' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marcar falta de Paciente teste visível' })).not.toBeInTheDocument()
  })
})

it('mantém Confirmar e Falta junto ao paciente também fora da Home', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getAgendaScheduleGrid.mockResolvedValue({
    status: 'success',
    data: [{
      professional_id: 'clinical-professional-id',
      professional_name: 'Profissional autorizado',
      slot_date: '2026-09-30',
      weekday: 3,
      slot_start: '2026-09-30T14:00:00.000Z',
      slot_end: '2026-09-30T14:30:00.000Z',
      duration_minutes: 30,
      slot_status: 'agendado',
      appointment_id: 'appointment-visible-full',
      patient_id: 'patient-visible-full',
      patient_name: 'Paciente visível agenda completa',
      appointment_type: 'retorno',
      block_type: null,
    }],
  })

  const context = {
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { code: 'profissional', name: 'Profissional' },
    professional_id: 'clinical-professional-id',
  } as unknown as AccessContext

  render(
    <MemoryRouter>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    </MemoryRouter>,
  )

  const patientCell = (await screen.findByText('Paciente visível agenda completa')).closest('td')
  expect(patientCell).not.toBeNull()
  expect(
    within(patientCell as HTMLElement).getByRole('button', {
      name: 'Confirmar consulta de Paciente visível agenda completa',
    }),
  ).toBeVisible()
  expect(
    within(patientCell as HTMLElement).getByRole('button', {
      name: 'Marcar falta de Paciente visível agenda completa',
    }),
  ).toBeVisible()
})

it('não oferece Confirmar ou Falta para horário ocupado por paciente fora do contexto visível', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getAgendaScheduleGrid.mockResolvedValue({
    status: 'success',
    data: [{
      professional_id: 'social-professional-id',
      professional_name: 'Homologação — Assistência Social',
      slot_date: '2026-09-30',
      weekday: 3,
      slot_start: '2026-09-30T13:00:00.000Z',
      slot_end: '2026-09-30T13:30:00.000Z',
      duration_minutes: 30,
      slot_status: 'agendado',
      appointment_id: 'appointment-hidden',
      patient_id: 'patient-hidden',
      patient_name: null,
      appointment_type: 'outro',
      block_type: null,
    }],
  })

  const context = {
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { code: 'profissional', name: 'Profissional' },
    professional_id: 'social-professional-id',
  } as unknown as AccessContext

  render(
    <MemoryRouter>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
        embeddedHome
      />
    </MemoryRouter>,
  )

  expect(await screen.findByText('Horário ocupado')).toBeVisible()
  expect(screen.queryByRole('button', { name: /Confirmar consulta/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Marcar falta/ })).not.toBeInTheDocument()
})

it('mantém Falta em vermelho e não reabre os botões após registrar ausência na grade profissional', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getAgendaScheduleGrid.mockResolvedValue({ status: 'success', data: [{
    professional_id: 'professional-id', professional_name: 'Profissional CAPO',
    slot_date: '2026-09-30', weekday: 3,
    slot_start: '2026-09-30T13:30:00.000Z', slot_end: '2026-09-30T14:00:00.000Z',
    duration_minutes: 30, slot_status: 'agendado', appointment_id: 'appointment-falta',
    patient_id: 'patient-falta', patient_name: 'Paciente em falta',
    appointment_type: 'retorno', block_type: null,
  }] })
  rpc.updateAppointmentAttendance.mockResolvedValue({ status: 'success', data: {
    appointment_id: 'appointment-falta', attendance_status: 'faltou',
  } })
  const context = {
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { code: 'profissional', name: 'Profissional' },
    professional_id: 'professional-id',
  } as unknown as AccessContext
  const onConfirmed = vi.fn()
  const user = userEvent.setup()
  render(<MemoryRouter><AgendaPage accessContext={context}
    loadAgenda={async () => ({ status: 'empty' })} onConfirmed={onConfirmed} embeddedHome /></MemoryRouter>)
  await user.click(await screen.findByRole('button', { name: 'Marcar falta de Paciente em falta' }))
  expect(rpc.updateAppointmentAttendance).toHaveBeenCalledWith({
    appointmentId: 'appointment-falta', action: 'faltou', notes: '', reason: '',
  })
  expect(await screen.findByText('✕ Falta')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Confirmar consulta de Paciente em falta' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Marcar falta de Paciente em falta' })).not.toBeInTheDocument()
  expect(onConfirmed).not.toHaveBeenCalled()
})


it('abre o formulário de retorno para consulta confirmada na semana profissional sem reabrir presença/falta', async () => {
  const now = new Date()
  const day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
  const slotStart = new Date(`${day}T09:00:00`).toISOString()
  const slotEnd = new Date(`${day}T09:30:00`).toISOString()
  const appointment = {
    appointment_id: 'appointment-return', patient_id: 'patient-return',
    patient_name: 'Paciente com atendimento confirmado', patient_number: '101',
    professional_id: 'professional-return', professional_name: 'Profissional autorizado',
    specialty_name: 'Clínica Geral', appointment_date: slotStart, appointment_end: slotEnd,
    appointment_type: 'primeiro_capo', attendance_status: 'confirmado', general_notes: null,
    rescheduled_from_id: null, reschedule_reason: null, reschedule_origin: null,
  }
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  const freeStart = new Date(`${day}T10:00:00`).toISOString()
  const freeEnd = new Date(`${day}T10:30:00`).toISOString()
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'success', data: [{
    professional_id: 'professional-return', slot_date: day, slot_time: '10:00:00',
    slot_start: freeStart, slot_end: freeEnd, duration_minutes: 30,
  }] })
  rpc.getAgendaScheduleGrid.mockResolvedValue({ status: 'success', data: [{
    professional_id: 'professional-return', professional_name: 'Profissional autorizado',
    slot_date: day, weekday: now.getDay(), slot_start: slotStart, slot_end: slotEnd,
    duration_minutes: 30, slot_status: 'agendado', appointment_id: appointment.appointment_id,
    patient_id: appointment.patient_id, patient_name: appointment.patient_name,
    appointment_type: appointment.appointment_type, block_type: null,
  }, {
    professional_id: 'professional-return', professional_name: 'Profissional autorizado',
    slot_date: day, weekday: now.getDay(), slot_start: freeStart, slot_end: freeEnd,
    duration_minutes: 30, slot_status: 'livre', appointment_id: null,
    patient_id: null, patient_name: null, appointment_type: null, block_type: null,
  }] })
  const context = {
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { code: 'profissional', name: 'Profissional' },
    professional_id: 'professional-return',
    specialties: [{ specialty_id: 'specialty-return', specialty_name: 'Clínica Geral', is_primary: true }],
  } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter><AgendaPage accessContext={context}
    loadAgenda={async () => ({ status: 'success', data: [appointment] })} embeddedHome /></MemoryRouter>)
  await user.click(screen.getByRole('tab', { name: 'Semana' }))
  const openReturn = await screen.findByRole('button', { name: 'Agendar retorno de Paciente com atendimento confirmado' })
  expect(openReturn).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Confirmar consulta de Paciente com atendimento confirmado' })).not.toBeInTheDocument()
  await user.click(openReturn)
  expect(await screen.findByRole('heading', { name: 'Agendar retorno' })).toBeVisible()
  expect(screen.getByDisplayValue('Paciente com atendimento confirmado')).toBeVisible()
  expect(screen.getByDisplayValue('Clínica Geral')).toBeVisible()
  await waitFor(() => expect(rpc.getAvailableAppointmentSlots).toHaveBeenCalledWith(
    'professional-return', expect.any(String),
  ))
  const returnGrid = screen.getByLabelText('Agenda do profissional para retorno')
  expect(await within(returnGrid).findByText('Horário ocupado')).toBeVisible()
  expect(within(returnGrid).getByText('Livre')).toBeVisible()
  const selectFree = within(returnGrid).getByRole('button', { name: 'Selecionar' })
  await user.click(selectFree)
  expect(within(returnGrid).getByRole('button', { name: 'Selecionado' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Confirmar agendamento' })).toBeEnabled()
})
