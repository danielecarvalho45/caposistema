import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccessContext } from '../../src/types/access'
import { FamilyPsychologyReturnAction } from '../../src/features/agenda/FamilyPsychologyReturnAction'

const { rpcMock, slotMock, locationMock, whatsappMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  slotMock: vi.fn(),
  locationMock: vi.fn(),
  whatsappMock: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: rpcMock }),
}))
vi.mock('../../src/lib/supabase/rpc', () => ({
  getRpcService: () => ({
    getAvailableAppointmentSlots: slotMock,
    getProfessionalCareLocation: locationMock,
  }),
}))
vi.mock('../../src/components/contact/whatsapp-tab', () => ({
  openCapoWhatsAppTab: whatsappMock,
}))
vi.mock('../../src/components/inputs/CapoDateInput', () => ({
  CapoDateInput: ({ value, onChange }: {
    value: string; onChange: (event: { target: { value: string } }) => void
  }) => <input aria-label="Nova data" value={value} onChange={onChange} />,
}))

const family = {
  appointment_id: 'family-appt-1',
  professional_id: 'psychologist-1',
  family_name: 'Familiar de teste',
  family_phone: '35987654321',
  professional_name: 'Psicóloga de teste',
  attendance_status: 'confirmado',
}
const accessContext = {
  real_identity: { full_name: 'Administrativo Teste', function_title: 'Operacional' },
  full_name: 'Administrativo Teste',
  username: 'administrativo',
  function_title: 'Operacional',
  primary_context: { name: 'Administrativo Operacional' },
} as unknown as AccessContext

beforeEach(() => {
  slotMock.mockResolvedValue({
    status: 'success',
    data: [{ slot_start: '2026-11-24T13:00:00-03:00', slot_time: '13:00' }],
  })
  rpcMock.mockResolvedValue({
    data: { success: true, appointment_id: 'family-return-1' }, error: null,
  })
  locationMock.mockResolvedValue({
    status: 'success', data: { care_location: 'Unidade CAPO de homologação' },
  })
  whatsappMock.mockReturnValue(true)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('retorno familiar na mesma agenda da psicóloga', () => {
  it('só permite agendar retorno após atendimento confirmado ou realizado', () => {
    const { rerender } = render(<FamilyPsychologyReturnAction
      family={{ ...family, attendance_status: 'agendado' }}
      accessContext={accessContext} onSaved={() => undefined} />)
    expect(screen.queryByRole('button', { name: 'Agendar retorno' })).not.toBeInTheDocument()
    rerender(<FamilyPsychologyReturnAction family={family}
      accessContext={accessContext} onSaved={() => undefined} />)
    expect(screen.getByRole('button', { name: 'Agendar retorno' })).toBeVisible()
  })

  it('usa a vaga canônica e prepara mensagem específica de retorno sem alterar a anterior', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<FamilyPsychologyReturnAction family={family}
      accessContext={accessContext} onSaved={onSaved} />)
    await user.click(screen.getByRole('button', { name: 'Agendar retorno' }))
    await user.type(screen.getByLabelText('Nova data'), '2026-11-24')
    await user.click(screen.getByRole('button', { name: 'Buscar vagas de retorno' }))
    await user.selectOptions(await screen.findByLabelText('Horário'), '2026-11-24T13:00:00-03:00')
    await user.click(screen.getByRole('button', { name: 'Confirmar retorno' }))
    expect(rpcMock).toHaveBeenCalledWith('create_family_psychology_return_for_interface', {
      p_previous_appointment_id: 'family-appt-1',
      p_slot_start: '2026-11-24T13:00:00-03:00',
    })
    expect(onSaved).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /Abrir WhatsApp do retorno/ })).toBeVisible()
    expect(whatsappMock).toHaveBeenCalled()
    const whatsappUrl = String(whatsappMock.mock.calls[0][0])
    expect(decodeURIComponent(whatsappUrl)).toContain('consulta de *retorno*')
    expect(decodeURIComponent(whatsappUrl)).toContain('Unidade CAPO de homologação')
  })
})
