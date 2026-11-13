import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ActiveSearchPage } from '../../src/features/gestor/ActiveSearchPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getActiveSearches: vi.fn(),
  getInitialActiveSearches: vi.fn(),
  getOfferRescueSearches: vi.fn(),
  registerInitialActiveSearchAttempt: vi.fn(),
  registerOfferRescueContact: vi.fn(),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => rpc,
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('separa Oferta Inicial de Perda de Seguimento sem encaminhar para Faltosos', async () => {
  rpc.getActiveSearches.mockResolvedValue({ status: 'success', data: { items: [{
    patient_id: 'previous-patient', patient_name: 'Paciente em seguimento',
    flow_status: 'ativo', contact_result: 'Perda de seguimento',
  }] } })
  rpc.getInitialActiveSearches.mockResolvedValue({ status: 'success', data: { items: [{
    patient_id: 'initial-patient', patient_name: 'Paciente aguardando oferta',
    patient_number: '12', flow_status: 'ativo', contact_result: 'Sem resposta',
    contact_date: '2026-11-04T12:00:00.000Z',
    history: [{ contact_date: '2026-11-04T12:00:00.000Z', contact_result: 'Oferta aberta' }],
    next_contact_at: '2026-11-05T12:00:00.000Z', next_action: 'Realizar novo contato',
  }] } })
  const context = { roles: [{ code: 'administrativo_operacional' }],
    primary_context: { code: 'administrativo_operacional' } } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/busca-ativa']}><ActiveSearchPage accessContext={context} /></MemoryRouter>)
  expect(await screen.findByText('Paciente em seguimento')).toBeVisible()
  expect(screen.queryByText('Paciente aguardando oferta')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Oferta Inicial' }))
  expect(await screen.findByText('Paciente aguardando oferta')).toBeVisible()
  expect(screen.queryByText('Paciente em seguimento')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Oferta CAPO' }))
  expect(screen.getByRole('link', { name: 'Abrir Oferta CAPO e mensagem do WhatsApp' }))
    .toHaveAttribute('href', '/pacientes?patientId=initial-patient')
  expect(rpc.getInitialActiveSearches).toHaveBeenCalledWith('ativo', 100, 0)
  await user.click(screen.getByRole('button', { name: 'Perda de Seguimento' }))
  await waitFor(() => expect(screen.getByText('Paciente em seguimento')).toBeVisible())
})


it('após 72 horas, salvar Sem resposta transfere para Resgate sem criar nova tentativa inicial', async () => {
  rpc.getInitialActiveSearches.mockResolvedValue({ status: 'success', data: { items: [{
    patient_id: 'initial-patient', patient_name: 'Paciente aguardando oferta',
    patient_number: '12', flow_status: 'ativo',
    contact_date: '2026-11-04T12:00:00.000Z',
    history: [
      { contact_date: '2026-11-04T12:00:00.000Z', contact_result: 'Oferta aberta' },
      { contact_date: '2026-11-05T12:00:00.000Z', contact_result: 'Lembrete' },
    ],
    next_contact_at: '2026-11-07T12:00:00.000Z',
  }] } })
  rpc.getOfferRescueSearches.mockResolvedValue({ status: 'success', data: { items: [] } })
  rpc.registerOfferRescueContact.mockResolvedValue({
    status: 'success', data: { success: true, attempt_id: 'rescue-1' },
  })
  const context = { roles: [{ code: 'administrativo_operacional' }],
    primary_context: { code: 'administrativo_operacional' } } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/busca-ativa?tipo=oferta']}>
    <ActiveSearchPage accessContext={context} />
  </MemoryRouter>)
  await user.click(await screen.findByRole('button', { name: 'Oferta CAPO' }))
  await user.click(screen.getByRole('button', { name: 'Registrar resposta / observação' }))
  await user.selectOptions(screen.getByLabelText('Desfecho do contato'), 'sem_resposta')
  await user.click(screen.getByRole('button', { name: 'Salvar resposta' }))

  await waitFor(() => expect(rpc.registerOfferRescueContact).toHaveBeenCalledWith({
    patientId: 'initial-patient',
    contactMethod: 'whatsapp',
    contactResult: 'Sem resposta / contato não conseguido',
    outcome: 'sem_resposta',
  }))
  expect(rpc.registerInitialActiveSearchAttempt).not.toHaveBeenCalled()
  expect(await screen.findByRole('button', { name: 'Resgate da Oferta CAPO' }))
    .toHaveAttribute('aria-pressed', 'true')
})

it('não antecipa Resgate antes das 72 horas da primeira Oferta', async () => {
  const future = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  rpc.getInitialActiveSearches.mockResolvedValue({ status: 'success', data: { items: [{
    patient_id: 'recent-patient', patient_name: 'Paciente recente',
    patient_number: '13', flow_status: 'ativo', contact_date: future,
    history: [{ contact_date: future, contact_result: 'Oferta aberta' }],
    next_contact_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  }] } })
  rpc.registerInitialActiveSearchAttempt.mockResolvedValue({
    status: 'success', data: { success: true, attempt_id: 'initial-2' },
  })
  const context = { roles: [{ code: 'administrativo_operacional' }],
    primary_context: { code: 'administrativo_operacional' } } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter initialEntries={['/busca-ativa?tipo=oferta']}>
    <ActiveSearchPage accessContext={context} />
  </MemoryRouter>)
  await user.click(await screen.findByRole('button', { name: 'Oferta CAPO' }))
  await user.click(screen.getByRole('button', { name: 'Registrar resposta / observação' }))
  await user.selectOptions(screen.getByLabelText('Desfecho do contato'), 'sem_resposta')
  await user.click(screen.getByRole('button', { name: 'Salvar resposta' }))
  await waitFor(() => expect(rpc.registerInitialActiveSearchAttempt).toHaveBeenCalled())
  expect(rpc.registerOfferRescueContact).not.toHaveBeenCalled()
})
