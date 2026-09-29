import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AgendaPage } from '../../src/features/agenda/AgendaPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getSchedulingCatalog: vi.fn(), getAvailableAppointmentSlots: vi.fn(),
  getAgendaScheduleGrid: vi.fn(), createAppointment: vi.fn(),
  searchReferralPatients: vi.fn(), addPatientToWaitingList: vi.fn(),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()), getRpcService: () => rpc }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('aproveita paciente e especialidade já selecionados quando não há vaga', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'success', data: [{ specialty_id: 's1', specialty_name: 'Nutrição', professional_id: 'p1', professional_name: 'Profissional autorizado' }] })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'empty' })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [{ patient_id: 'patient-1', full_name: 'Paciente encontrado', patient_number: null, cms: null }] })
  rpc.addPatientToWaitingList.mockResolvedValue({ status: 'success', data: { success: true } })
  const context = { roles: [{ code: 'administrador' }], primary_context: { code: 'administrador' }, professional_id: null } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter><AgendaPage accessContext={context} loadAgenda={async () => ({ status: 'empty' })} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Agendar' }))
  await user.type(screen.getByPlaceholderText('Nome, Nº CAPO ou CMS'), 'Paciente')
  await user.tab()
  await user.selectOptions((await screen.findByRole('option', { name: /Paciente encontrado/ })).closest('select')!, 'patient-1')
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
  const scheduleGrid = await screen.findByLabelText('Grade efetiva da agenda')
  const freeSlotButton = await within(scheduleGrid).findByRole('button', { name: 'Agendar' })
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
