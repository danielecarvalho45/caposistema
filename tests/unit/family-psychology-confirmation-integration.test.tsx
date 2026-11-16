import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { rpcMock, locationMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  locationMock: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: rpcMock }),
}))
vi.mock('../../src/lib/supabase/rpc', () => ({
  getRpcService: () => ({ getProfessionalCareLocation: locationMock }),
}))

const token = 'b'.repeat(64)

beforeEach(() => {
  rpcMock.mockResolvedValue({ data: { token }, error: null })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('Familiar/Cuidador: link sem modificar o contrato do paciente comum', () => {
  it('emite token próprio e utiliza a mesma mensagem de lembrete com link', async () => {
    const { prepareFamilyPsychologyReminder } = await import(
      '../../src/features/agenda/appointment-confirmation-link'
    )
    const message = await prepareFamilyPsychologyReminder({
      appointmentId: 'consulta-familiar',
      patientName: 'Familiar de homologação',
      professionalName: 'Psicóloga de homologação',
      appointmentDate: '2026-11-20T14:00:00-03:00',
      careLocation: 'Local cadastrado no CAPO',
      senderName: 'Administrativo',
      senderTitle: 'Administrativo Operacional',
    })
    expect(rpcMock).toHaveBeenCalledWith(
      'issue_family_psychology_confirmation_link_for_interface',
      { p_appointment_id: 'consulta-familiar' },
    )
    expect(message).toContain('/confirmar-consulta?f=1&t=' + token)
    expect(message).toContain('Vou comparecer' === 'Nao usado' ? '' : 'Confirme sua presença')
    expect(message).toContain('Local cadastrado no CAPO')
  })

  it('não emite token sem endereço real do atendimento', async () => {
    const { prepareFamilyPsychologyReminder } = await import(
      '../../src/features/agenda/appointment-confirmation-link'
    )
    await expect(prepareFamilyPsychologyReminder({
      appointmentId: 'consulta-familiar',
      patientName: 'Familiar de homologação',
      professionalName: 'Psicologia',
      appointmentDate: '2026-11-20T14:00:00-03:00',
      careLocation: '',
      senderName: 'Administrativo',
      senderTitle: 'Equipe CAPO',
    })).rejects.toThrow('Local da Psicologia')
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('utiliza função pública familiar somente quando o link sinaliza familiar', async () => {
    window.history.replaceState({}, '', '/confirmar-consulta?f=1&t=' + token)
    vi.resetModules()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true, available: true, decision: null,
        patient_first_name: 'Familiar', professional_name: 'Psicologia',
        appointment_date: '2026-11-20T14:00:00-03:00',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const { PublicAppointmentConfirmation } = await import(
      '../../src/features/agenda/PublicAppointmentConfirmation'
    )
    render(<PublicAppointmentConfirmation />)
    await screen.findByRole('button', { name: /Vou comparecer/ })
    expect(fetchMock.mock.calls[0][0]).toContain('/functions/v1/family-appointment-confirmation')
    await userEvent.click(screen.getByRole('button', { name: /Vou comparecer/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const request = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as {
      action: string; token: string; decision: string
    }
    expect(request).toEqual({ action: 'respond', token, decision: 'comparecera' })
  })

  it('mantém endpoint original para links de pacientes comuns', async () => {
    window.history.replaceState({}, '', '/confirmar-consulta?t=' + token)
    vi.resetModules()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ valid: false }) })
    vi.stubGlobal('fetch', fetchMock)
    const { PublicAppointmentConfirmation } = await import(
      '../../src/features/agenda/PublicAppointmentConfirmation'
    )
    render(<PublicAppointmentConfirmation />)
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0][0]).toContain('/functions/v1/appointment-confirmation')
    expect(fetchMock.mock.calls[0][0]).not.toContain('/family-appointment-confirmation')
  })
})
