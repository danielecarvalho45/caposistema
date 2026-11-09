import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const token = 'a'.repeat(64)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.history.replaceState({}, '', '/')
})

describe('confirmação pública de consulta CAPO', () => {
  it('mantém consulta intacta na ausência de clique e grava somente resposta expressa', async () => {
    window.history.replaceState({}, '', `/confirmar-consulta?t=${token}`)
    vi.resetModules()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        valid: true, available: true, decision: null, patient_first_name: 'Maria',
        appointment_date: '2026-11-20T14:00:00-03:00',
        professional_name: 'Equipe CAPO', care_location: 'Unidade de atendimento',
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, decision: 'comparecera' }) })
    vi.stubGlobal('fetch', fetchMock)
    const { PublicAppointmentConfirmation } = await import('../../src/features/agenda/PublicAppointmentConfirmation')
    render(<PublicAppointmentConfirmation />)
    await screen.findByRole('button', { name: /Vou comparecer/ })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Se não responder, sua consulta continuará agendada/)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: /Vou comparecer/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const response = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as Record<string, string>
    expect(response.action).toBe('respond')
    expect(response.decision).toBe('comparecera')
    expect(screen.getByText(/Sua presença foi confirmada antecipadamente/)).toBeVisible()
  })

  it('nunca modifica agendamento ao abrir um token inválido', async () => {
    window.history.replaceState({}, '', '/confirmar-consulta?t=invalid')
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { PublicAppointmentConfirmation } = await import('../../src/features/agenda/PublicAppointmentConfirmation')
    render(<PublicAppointmentConfirmation />)
    expect(await screen.findByText(/link é inválido ou expirou/)).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('encaminha a recusa expressa para o serviço, sem cancelar no navegador', async () => {
    window.history.replaceState({}, '', `/confirmar-consulta?t=${token}`)
    vi.resetModules()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        valid: true, available: true, decision: null,
        appointment_date: '2026-11-20T14:00:00-03:00',
        patient_first_name: 'Maria', professional_name: 'CAPO',
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, decision: 'nao_comparecera' }) })
    vi.stubGlobal('fetch', fetchMock)
    const { PublicAppointmentConfirmation } = await import('../../src/features/agenda/PublicAppointmentConfirmation')
    render(<PublicAppointmentConfirmation />)
    await userEvent.click(await screen.findByRole('button', { name: /Não poderei comparecer/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const response = JSON.parse(String(fetchMock.mock.calls[1][1].body)) as Record<string, string>
    expect(response.decision).toBe('nao_comparecera')
    expect(screen.getByText(/O horário foi liberado/)).toBeVisible()
  })
})
