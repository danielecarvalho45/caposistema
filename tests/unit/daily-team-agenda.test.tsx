import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgendaScheduleSlot } from '../../src/lib/supabase/rpc'
import { DailyTeamAgendaRows } from '../../src/features/home/DailyTeamAgendaRows'

const mocks = vi.hoisted(() => ({
  getAppointmentPrevisitContacts: vi.fn(),
  registerAppointmentPrevisitContact: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({ getSupabaseClient: () => ({ rpc: mocks.rpc }) }))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => ({
    getAppointmentPrevisitContacts: mocks.getAppointmentPrevisitContacts,
    registerAppointmentPrevisitContact: mocks.registerAppointmentPrevisitContact,
  }),
}))
const base: AgendaScheduleSlot = {
  professional_id: 'prof-2', professional_name: 'Zuleica Profissional',
  slot_date: '2026-11-18', weekday: 3,
  slot_start: '2026-11-18T11:10:00-03:00', slot_end: '2026-11-18T12:10:00-03:00',
  duration_minutes: 60, slot_status: 'agendado',
  appointment_id: 'appt-2', patient_id: 'patient-2', patient_name: 'Paciente Tardio',
  appointment_type: 'Retorno', block_type: null,
}
const early: AgendaScheduleSlot = {
  ...base, professional_id: 'prof-1', professional_name: 'Ana Profissional',
  slot_start: '2026-11-18T08:10:00-03:00', slot_end: '2026-11-18T09:10:00-03:00',
  appointment_id: 'appt-1', patient_id: 'patient-1', patient_name: 'Paciente Cedo',
}
function setup(contacts: unknown[] = [], decisions: unknown[] = [], cancelled: unknown[] = [], family: unknown[] = []) {
  mocks.getAppointmentPrevisitContacts.mockResolvedValue({ status: 'success', data: { items: contacts } })
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'get_patient_confirmation_states_for_interface') return { data: decisions, error: null }
    if (name === 'get_family_psychology_agenda_cards_for_interface') return { data: family, error: null }
    if (name === 'register_family_psychology_previsit_contact_for_interface')
      return { data: { success: true, result: 'confirmou' }, error: null }
    return { data: { items: cancelled }, error: null }
  })
}
function mount(slots: AgendaScheduleSlot[] = [base, early]) {
  return render(<MemoryRouter><DailyTeamAgendaRows slots={slots} /></MemoryRouter>)
}
beforeEach(() => { setup() })
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Home administrativa — agenda compartilhada por horário', () => {
  it('ordena horários de profissionais distintos e mantém paciente na primeira linha', async () => {
    mount()
    const list = await screen.findByLabelText('Agenda do dia em ordem de horário')
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(3))
    const entries = within(list).getAllByText(/Paciente (Cedo|Tardio)/)
    expect(entries.map((e) => e.textContent)).toEqual(['Paciente Cedo', 'Paciente Tardio'])
    expect(screen.getByText('Ana Profissional')).toBeVisible()
    expect(screen.getByText('Zuleica Profissional')).toBeVisible()
  })
  it('permite confirmar manualmente apenas enquanto falta resposta e não grava presença', async () => {
    setup([{ appointment_id: 'appt-1', result: 'avisado' }])
    mocks.registerAppointmentPrevisitContact.mockResolvedValue({
      status: 'success', data: { success: true },
    })
    mount([early])
    const button = await screen.findByRole('button', { name: 'Confirmar manualmente Paciente Cedo' })
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByText('Avisado · Aguardando confirmação')).toBeVisible()
    fireEvent.click(button)
    await waitFor(() => expect(mocks.registerAppointmentPrevisitContact)
      .toHaveBeenCalledWith('appt-1', 'confirmou',
        'Confirmação prévia registrada manualmente pelo Administrativo.'))
    expect(await screen.findByText('Avisado · Confirmado manualmente')).toBeVisible()
    expect(button).toBeDisabled()
  })
  it('não oferece confirmação ou remarcação para quem confirmou pelo link', async () => {
    setup([], [{ appointment_id: 'appt-1', decision: 'comparecera', responded_at: '2026-11-18T10:00:00Z' }])
    mount([early])
    expect(await screen.findByText('Avisado · Confirmado pelo link')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirmar manualmente Paciente Cedo' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: /Remarcar/ })).not.toBeInTheDocument()
  })
  it('mostra consulta cancelada pelo link e mantém remarcação na rota canônica', async () => {
    setup([], [], [{
      appointment_id: 'appt-cancel', patient_id: 'patient-cancel',
      patient_name: 'Paciente Solicitou', professional_id: 'prof-1',
      professional_name: 'Ana Profissional', slot_date: '2026-11-18',
      slot_start: '2026-11-18T07:10:00-03:00', slot_end: '2026-11-18T08:10:00-03:00',
      appointment_kind: 'paciente',
    }])
    mount([early])
    expect(await screen.findByText('Paciente Solicitou')).toBeVisible()
    expect(screen.getByText('Solicitou remarcação pelo link')).toBeVisible()
    const entry = screen.getByText('Paciente Solicitou').closest('.capo-team-day-entry')!
    expect(within(entry as HTMLElement).getByRole('link', { name: /Remarcar/ }))
      .toHaveAttribute('href', '/agenda')
    expect(within(entry as HTMLElement).getByRole('button', { name: /Confirmar manualmente/ }))
      .toBeDisabled()
  })
  it('confirma familiar pela RPC própria e mostra confirmação manual sem alterar presença', async () => {
    const familySlot: AgendaScheduleSlot = {
      ...early, appointment_id: 'family-appointment', patient_id: null,
      patient_name: 'Familiar atendida', professional_name: 'Psicóloga Cadastrada',
    }
    setup([], [], [], [{
      appointment_id: 'family-appointment', family_name: 'Familiar atendida',
      confirmation_decision: null, last_notice_result: 'avisado',
    }])
    mount([familySlot])
    const button = await screen.findByRole('button', { name: 'Confirmar manualmente Familiar atendida' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      'register_family_psychology_previsit_contact_for_interface',
      { p_appointment_id: 'family-appointment', p_result: 'confirmou' },
    ))
    expect(await screen.findByText('Avisado · Confirmado manualmente')).toBeVisible()
    expect(button).toBeDisabled()
    const remarca = screen.getByRole('button', { name: /Remarcar/ })
    expect(remarca).toBeDisabled()
  })

})
