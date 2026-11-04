import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { ActiveSearchPage } from '../../src/features/gestor/ActiveSearchPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getActiveSearches: vi.fn(),
  getInitialActiveSearches: vi.fn(),
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
  expect(screen.getByRole('link', { name: 'Continuar oferta / registrar resposta' }))
    .toHaveAttribute('href', '/pacientes?patientId=initial-patient')
  expect(rpc.getInitialActiveSearches).toHaveBeenCalledWith('ativo', 100, 0)
  await user.click(screen.getByRole('button', { name: 'Perda de Seguimento' }))
  await waitFor(() => expect(screen.getByText('Paciente em seguimento')).toBeVisible())
})
