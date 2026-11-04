import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { PatientWhatsAppButton } from '../../src/components/contact/PatientWhatsAppButton'

const getPatientContact = vi.hoisted(() => vi.fn())
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => ({ getPatientContact }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('reutiliza a mesma aba WhatsApp para contatos consecutivos sem enviar mensagens automaticamente', async () => {
  getPatientContact
    .mockResolvedValueOnce({ status: 'success', data: { phone: '35999990001' } })
    .mockResolvedValueOnce({ status: 'success', data: { phone: '35999990002' } })

  const navigate = vi.fn()
  const focus = vi.fn()
  const whatsappTab = {
    closed: false,
    opener: {},
    location: { replace: navigate },
    focus,
  }
  const open = vi.fn(() => whatsappTab)
  vi.stubGlobal('open', open)

  const user = userEvent.setup()
  render(<>
    <PatientWhatsAppButton patientId="patient-1" label="Primeiro WhatsApp" message="Consulta agendada" />
    <PatientWhatsAppButton patientId="patient-2" label="Segundo WhatsApp" message="Lembrar consulta" />
  </>)

  await user.click(screen.getByRole('button', { name: 'Primeiro WhatsApp' }))
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
  await user.click(screen.getByRole('button', { name: 'Segundo WhatsApp' }))
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(2))

  expect(open).toHaveBeenCalledTimes(1)
  expect(open).toHaveBeenCalledWith('', 'capo_whatsapp_web')
  expect(navigate.mock.calls[0][0]).toContain('phone=5535999990001')
  expect(navigate.mock.calls[1][0]).toContain('phone=5535999990002')
  expect(navigate.mock.calls[0][0]).toContain('text=Consulta%20agendada')
  expect(navigate.mock.calls[1][0]).toContain('text=Lembrar%20consulta')
  expect(whatsappTab.opener).toBeNull()
  expect(focus).toHaveBeenCalledTimes(2)
})
