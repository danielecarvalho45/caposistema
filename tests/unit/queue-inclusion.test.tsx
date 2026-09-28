import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { QueuePage } from '../../src/features/queues/QueuePage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getWaitingList: vi.fn(), getFamilyWaitingList: vi.fn(), getSchedulingCatalog: vi.fn(),
  getReferralSpecialties: vi.fn(), searchReferralPatients: vi.fn(), addPatientToWaitingList: vi.fn(),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()), getRpcService: () => rpc }))

const context = (role: string): AccessContext => ({
  roles: [{ code: role, name: role }], primary_context: { code: role }, professional_id: role === 'profissional' ? 'professional-id' : null,
} as unknown as AccessContext)

afterEach(() => { cleanup(); vi.clearAllMocks() })

it.each(['administrador', 'administrativo_operacional'])('%s inclui na fila única com prioridade e especialidade escolhidas', async (role) => {
  rpc.getWaitingList.mockResolvedValue({ status: 'success', data: [] })
  rpc.getFamilyWaitingList.mockResolvedValue({ status: 'empty' })
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getReferralSpecialties.mockResolvedValue({ status: 'success', data: [{ specialty_id: 'specialty-id', specialty_name: 'Nutrição' }] })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [{ patient_id: 'patient-id', full_name: 'Paciente encontrado' }] })
  rpc.addPatientToWaitingList.mockResolvedValue({ status: 'success', data: { success: true } })
  const user = userEvent.setup()
  render(<MemoryRouter><QueuePage accessContext={context(role)} loadPendingItems={async () => ({ status: 'empty' })} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Adicionar paciente à fila' }))
  await user.type(screen.getByPlaceholderText('Nome, CMS ou Nº CAPO'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: 'Paciente encontrado' }))
  await user.selectOptions(await screen.findByLabelText('Especialidade'), 'specialty-id')
  await user.selectOptions(screen.getByLabelText('Prioridade'), '2')
  await user.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))
  expect(rpc.addPatientToWaitingList).toHaveBeenCalledWith('patient-id', 'specialty-id', 2, null)
  expect(await screen.findByText('Paciente incluído na fila de espera.')).toBeVisible()
  expect(rpc.getWaitingList).toHaveBeenCalledWith(null, 'waiting', 50, 0)
})

it('não oferece inclusão ao Coordenador ou profissional', async () => {
  rpc.getWaitingList.mockResolvedValue({ status: 'empty' })
  rpc.getFamilyWaitingList.mockResolvedValue({ status: 'empty' })
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  for (const role of ['coordenador', 'profissional']) {
    render(<MemoryRouter><QueuePage accessContext={context(role)} loadPendingItems={async () => ({ status: 'empty' })} /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Adicionar paciente à fila' })).not.toBeInTheDocument()
    cleanup()
  }
})

it('mostra o erro de duplicidade devolvido pelo contrato sem simular inclusão', async () => {
  rpc.getWaitingList.mockResolvedValue({ status: 'empty' })
  rpc.getFamilyWaitingList.mockResolvedValue({ status: 'empty' })
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'empty' })
  rpc.getReferralSpecialties.mockResolvedValue({ status: 'success', data: [{ specialty_id: 'specialty-id', specialty_name: 'Nutrição' }] })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [{ patient_id: 'patient-id', full_name: 'Paciente encontrado' }] })
  rpc.addPatientToWaitingList.mockResolvedValue({ status: 'error', error: { message: 'O paciente já possui registro ativo nesta fila.' } })
  const user = userEvent.setup()
  render(<MemoryRouter><QueuePage accessContext={context('administrador')} loadPendingItems={async () => ({ status: 'empty' })} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Adicionar paciente à fila' }))
  await user.type(screen.getByPlaceholderText('Nome, CMS ou Nº CAPO'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: 'Paciente encontrado' }))
  await user.selectOptions(await screen.findByLabelText('Especialidade'), 'specialty-id')
  await user.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))
  expect(await screen.findByText('O paciente já possui registro ativo nesta fila.')).toBeVisible()
})
