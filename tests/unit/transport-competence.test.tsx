import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { TransportPage } from '../../src/features/transport/TransportPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({ searchReferralPatients: vi.fn(), getTransportContext: vi.fn() }))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()), getRpcService: () => rpc }))

const access = (role: string, social = false) => ({
  roles: [{ code: role, name: role }], professional_id: social ? 'professional-id' : null,
  specialties: social ? [{ specialty_name: 'Assistência Social' }] : [],
  capabilities: social ? ['preencher_solicitacao_transporte'] : [],
} as unknown as AccessContext)

afterEach(() => { cleanup(); vi.clearAllMocks() })

it('permite ao Gestor criar e concluir a continuidade externa do Transporte', async () => {
  const user = userEvent.setup()
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [{ patient_id: 'p1', full_name: 'Paciente encontrado' }] })
  rpc.getTransportContext.mockResolvedValue({ status: 'success', data: {
    patient: { cms: 'CMS' }, active_need: { status: 'ativo' }, appointments: [{ appointment_id: 'a1', appointment_date: '2026-09-28T10:00:00Z' }],
    requests: [{ request_id: 'r1', status: 'confirmado', pdf_prepared_at: '2026-09-28T11:00:00Z' }],
  } })
  render(<TransportPage accessContext={access('administrador')} />)
  expect(screen.getByRole('list', { name: '' })).toHaveTextContent('Localizar paciente')
  expect(screen.getByText('Gerar PDF com o Gestor.')).toBeVisible()
  await user.type(screen.getByLabelText('Nome, Nº CAPO ou CMS'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: /Paciente encontrado/ }))
  expect(await screen.findByRole('button', { name: 'Gerar PDF' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Registrar encaminhamento' })).toBeVisible()
  cleanup()
  render(<TransportPage accessContext={access('administrativo_operacional')} />)
  expect(screen.queryByRole('heading', { name: 'Como solicitar transporte' })).not.toBeInTheDocument()
  await user.type(screen.getByLabelText('Nome, Nº CAPO ou CMS'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: /Paciente encontrado/ }))
  expect(await screen.findByRole('button', { name: 'Registrar encaminhamento' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Gerar PDF' })).not.toBeInTheDocument()
})

it('mostra o fluxo de preenchimento para Assistência Social autorizada sem assinatura administrativa', () => {
  render(<TransportPage accessContext={access('profissional', true)} />)
  expect(screen.getByRole('heading', { name: 'Como solicitar transporte' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Assinar PDF' })).not.toBeInTheDocument()
})
