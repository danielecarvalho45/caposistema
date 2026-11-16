import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccessContext } from '../../src/types/access'
import { FamilyLinkRebookingAction } from '../../src/features/agenda/FamilyLinkRebookingAction'

const { rpcMock, slotsMock, locationMock, whatsAppMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(), slotsMock: vi.fn(), locationMock: vi.fn(), whatsAppMock: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: rpcMock }),
}))
vi.mock('../../src/lib/supabase/rpc', () => ({
  getRpcService: () => ({
    getAvailableAppointmentSlots: slotsMock,
    getProfessionalCareLocation: locationMock,
  }),
}))
vi.mock('../../src/components/contact/whatsapp-tab', () => ({
  openCapoWhatsAppTab: whatsAppMock,
}))
vi.mock('../../src/components/inputs/CapoDateInput', () => ({
  CapoDateInput: ({ value, onChange }: {
    value: string; onChange: (event: { target: { value: string } }) => void
  }) => <input aria-label="Nova data" value={value} onChange={onChange} />,
}))

const accessContext = {
  real_identity: { full_name: 'Operador de homologação', function_title: 'Administrativo Operacional' },
  full_name: 'Operador de homologação',
  username: 'operador',
  function_title: 'Administrativo Operacional',
  primary_context: { name: 'Administrativo Operacional' },
} as unknown as AccessContext

beforeEach(() => {
  rpcMock.mockImplementation(async (name: string) => ({
    data: name === 'get_family_link_rebooking_context_for_interface' ? {
      appointment_id: 'cancelled-fam-1',
      professional_id: 'psychologist-1',
      professional_name: 'Psicóloga de homologação',
      family_name: 'Familiar de homologação',
      family_phone: '35987654321',
      previous_start: '2026-11-19T12:00:00-03:00',
    } : { success: true, appointment_id: 'rebooked-fam-1' },
    error: null,
  }))
  slotsMock.mockResolvedValue({
    status: 'success',
    data: [{ slot_start: '2026-11-25T12:00:00-03:00', slot_time: '12:00' }],
  })
  locationMock.mockResolvedValue({
    status: 'success',
    data: { care_location: 'Unidade de homologação' },
  })
  whatsAppMock.mockReturnValue(true)
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('solicitação administrativa do Familiar/Cuidador pelo link', () => {
  it('usa a agenda oficial e mantém a consulta anterior no histórico', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<FamilyLinkRebookingAction
      appointmentId="cancelled-fam-1" accessContext={accessContext} onSaved={onSaved} />)
    await screen.findByText(/Familiar de homologação/)
    await user.type(screen.getByLabelText('Nova data'), '2026-11-25')
    await user.click(screen.getByRole('button', { name: 'Buscar vagas' }))
    await user.selectOptions(await screen.findByLabelText('Novo horário'), '2026-11-25T12:00:00-03:00')
    await user.click(screen.getByRole('button', { name: 'Confirmar remarcação do familiar' }))
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith(
      'rebook_family_link_cancellation_for_interface',
      { p_appointment_id: 'cancelled-fam-1', p_new_slot_start: '2026-11-25T12:00:00-03:00' },
    ))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(whatsAppMock).toHaveBeenCalled()
    expect(decodeURIComponent(String(whatsAppMock.mock.calls[0][0]))).toContain('Sua consulta no CAPO foi remarcada')
    expect(screen.getByText(/consulta cancelada permanece no histórico/)).toBeVisible()
  })
})
