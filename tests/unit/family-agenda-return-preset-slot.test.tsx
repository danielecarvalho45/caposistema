import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FamilyPsychologyReturnAction } from '../../src/features/agenda/FamilyPsychologyReturnAction'
import type { AccessContext } from '../../src/types/access'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getAvailableAppointmentSlots: vi.fn(),
  getProfessionalCareLocation: vi.fn(),
  openWhatsApp: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => ({
    getAvailableAppointmentSlots: mocks.getAvailableAppointmentSlots,
    getProfessionalCareLocation: mocks.getProfessionalCareLocation,
  }),
}))
vi.mock('../../src/components/contact/whatsapp-tab', () => ({
  openCapoWhatsAppTab: mocks.openWhatsApp,
}))
const family = {
  appointment_id: 'family-previous-1',
  professional_id: 'psychologist-1',
  attendance_status: 'realizado',
  family_name: 'Familiar de teste',
  family_phone: '',
  professional_name: 'Psicóloga',
}
const accessContext = {
  username: 'gestor', full_name: 'Gestor',
  function_title: 'Gestor', real_identity: { full_name: 'Gestor', function_title: 'Gestor' },
  primary_context: { name: 'Gestor' },
} as AccessContext

beforeEach(() => {
  mocks.rpc.mockResolvedValue({ data: { success: true }, error: null })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Retorno do Familiar/Cuidador pela Agenda canônica', () => {
  it('usa a vaga já escolhida na Agenda e conserva o identificador da consulta familiar anterior', async () => {
    const onSaved = vi.fn()
    render(<FamilyPsychologyReturnAction family={family} accessContext={accessContext}
      presetSlot="2026-12-04T13:10:00-03:00" onSaved={onSaved} />)
    expect(screen.queryByRole('button', { name: 'Buscar vagas de retorno' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      'create_family_psychology_return_for_interface',
      {
        p_previous_appointment_id: 'family-previous-1',
        p_slot_start: '2026-12-04T13:10:00-03:00',
      },
    ))
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce())
  })
  it('mantém disponível a ação de retorno do psicólogo sem vaga pré-selecionada', () => {
    render(<FamilyPsychologyReturnAction family={family} accessContext={accessContext}
      onSaved={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Agendar retorno' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Confirmar agendamento' })).not.toBeInTheDocument()
  })
  it('não permite agendamento sem atendimento familiar realizado ou confirmado', () => {
    render(<FamilyPsychologyReturnAction
      family={{ ...family, attendance_status: 'agendado' }}
      presetSlot="2026-12-04T13:10:00-03:00" accessContext={accessContext}
      onSaved={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Confirmar agendamento' })).not.toBeInTheDocument()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
