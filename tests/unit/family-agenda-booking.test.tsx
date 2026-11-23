import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FamilyAgendaBookingPanel } from '../../src/features/agenda/FamilyAgendaBookingPanel'
import type { AccessContext } from '../../src/types/access'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), getFamilyQueueCandidatesForSlot: vi.fn(),
  createFamilyPsychologyAppointment: vi.fn(), addFamilyToWaitingList: vi.fn(),
  getProfessionalCareLocation: vi.fn(), reserve: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => ({
    getFamilyQueueCandidatesForSlot: mocks.getFamilyQueueCandidatesForSlot,
    createFamilyPsychologyAppointment: mocks.createFamilyPsychologyAppointment,
    addFamilyToWaitingList: mocks.addFamilyToWaitingList,
    getProfessionalCareLocation: mocks.getProfessionalCareLocation,
  }),
}))
vi.mock('../../src/components/contact/whatsapp-tab', () => ({
  reserveCapoWhatsAppTab: () => ({ open: mocks.reserve, cancel: vi.fn() }),
  openCapoWhatsAppTab: vi.fn(),
}))
vi.mock('../../src/features/agenda/FamilyPsychologyReturnAction', () => ({
  FamilyPsychologyReturnAction: ({ presetSlot }: { presetSlot?: string }) =>
    <button type="button">{presetSlot ? 'Confirmar agendamento' : 'Agendar retorno'}</button>,
}))
const family = {
  family_member_id: 'family-1', full_name: 'Familiar Autorizado',
  capo_number: 'CAPO-F', cms: 'CMS-F', source_patient_name: 'Paciente Vinculado',
}
const accessContext = {
  username: 'gestor', full_name: 'Gestor', function_title: 'Gestor',
  real_identity: { full_name: 'Gestor', function_title: 'Gestor' },
  primary_context: { name: 'Gestor' },
} as AccessContext
const context = (appointment: unknown = null, queue: unknown = null) => ({
  family_member_id: family.family_member_id, family_name: family.full_name,
  family_phone: null, family_link_id: 'family-link-1',
  appointment, queue,
})
function mount() {
  return render(<MemoryRouter><FamilyAgendaBookingPanel
    family={family} professionalId="psychologist-1" slotStart="2026-12-04T13:10:00-03:00"
    isPsychology accessContext={accessContext} onBooked={vi.fn()} /></MemoryRouter>)
}
beforeEach(() => {
  mocks.rpc.mockResolvedValue({ data: context(), error: null })
  mocks.getFamilyQueueCandidatesForSlot.mockResolvedValue({ status: 'success', data: [] })
  mocks.createFamilyPsychologyAppointment.mockResolvedValue({ status: 'success', data: { success: true } })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Agendamento familiar pela pesquisa canônica da Agenda', () => {
  it('mostra familiar vinculado, sem criar agendamento comum nem duplicar consulta ativa', async () => {
    mocks.rpc.mockResolvedValue({ data: context({
      appointment_id: 'appointment-1', professional_id: 'psychologist-1',
      attendance_status: 'agendado', appointment_date: '2026-12-04T13:10:00-03:00',
    }), error: null })
    mount()
    expect(await screen.findByText(/Consulta familiar existente:/)).toBeVisible()
    expect(screen.getByText(/Paciente vinculado: Paciente Vinculado/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Confirmar agendamento do familiar' }))
      .not.toBeInTheDocument()
    expect(mocks.createFamilyPsychologyAppointment).not.toHaveBeenCalled()
  })
  it('respeita elegibilidade e prioridade, sem criar consulta quando familiar não é o próximo', async () => {
    mocks.rpc.mockResolvedValue({ data: context(null, { waiting_list_id: 'waiting-1', status: 'waiting' }), error: null })
    mocks.getFamilyQueueCandidatesForSlot.mockResolvedValue({
      status: 'success', data: [{ waiting_list_id: 'another-family' }],
    })
    mount()
    const button = await screen.findByRole('button', { name: 'Confirmar agendamento do familiar' })
    fireEvent.click(button)
    expect(await screen.findByText(/não é o próximo elegível/)).toBeVisible()
    expect(mocks.createFamilyPsychologyAppointment).not.toHaveBeenCalled()
  })
  it('envia o identificador da fila familiar à RPC própria quando é o próximo elegível', async () => {
    mocks.rpc.mockResolvedValue({ data: context(null, { waiting_list_id: 'waiting-1', status: 'waiting' }), error: null })
    mocks.getFamilyQueueCandidatesForSlot.mockResolvedValue({
      status: 'success', data: [{ waiting_list_id: 'waiting-1', professional_name: 'Psicóloga' }],
    })
    mount()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar agendamento do familiar' }))
    await waitFor(() => expect(mocks.createFamilyPsychologyAppointment).toHaveBeenCalledWith({
      waitingListId: 'waiting-1', professionalId: 'psychologist-1',
      slotStart: '2026-12-04T13:10:00-03:00', generalNotes: null,
    }))
    expect(mocks.rpc).toHaveBeenCalledWith('get_family_agenda_booking_context_for_interface', {
      p_family_member_id: 'family-1',
    })
  })
  it('bloqueia o retorno em psicólogo diferente e mantém a regra de vínculo', async () => {
    mocks.rpc.mockResolvedValue({ data: context({
      appointment_id: 'completed-1', professional_id: 'different-psychologist',
      attendance_status: 'realizado', appointment_date: '2026-11-20T13:10:00-03:00',
    }), error: null })
    mount()
    expect(await screen.findByText(/selecione o mesmo psicólogo do atendimento anterior/)).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Confirmar agendamento' })).not.toBeInTheDocument()
  })
  it('oferece retorno pela função existente quando consulta anterior está concluída', async () => {
    mocks.rpc.mockResolvedValue({ data: context({
      appointment_id: 'completed-1', professional_id: 'psychologist-1',
      attendance_status: 'realizado', appointment_date: '2026-11-20T13:10:00-03:00',
    }), error: null })
    mount()
    expect(await screen.findByRole('button', { name: 'Confirmar agendamento' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Confirmar agendamento do familiar' })).not.toBeInTheDocument()
  })
  it('permite ao Administrativo confirmar explicitamente atendimento familiar passado antes do retorno', async () => {
    let confirmed = false
    mocks.rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'update_family_psychology_attendance_for_interface') {
        expect(args).toEqual({
          p_appointment_id: 'past-1', p_action: 'confirmado', p_reason: null, p_notes: null,
        })
        confirmed = true
        return { data: { success: true }, error: null }
      }
      return { data: context({
        appointment_id: 'past-1', professional_id: 'psychologist-1',
        attendance_status: confirmed ? 'confirmado' : 'agendado',
        appointment_date: '2026-11-10T13:00:00-03:00',
      }), error: null }
    })
    mount()
    const confirm = await screen.findByRole('button', { name: 'Confirmar presença da consulta anterior' })
    expect(screen.getByText(/continua registrada como agendada/)).toBeVisible()
    expect(screen.queryByText(/Consulta familiar existente:/)).not.toBeInTheDocument()
    fireEvent.click(confirm)
    expect(await screen.findByRole('button', { name: 'Confirmar agendamento' })).toBeVisible()
    expect(mocks.createFamilyPsychologyAppointment).not.toHaveBeenCalled()
  })
})
