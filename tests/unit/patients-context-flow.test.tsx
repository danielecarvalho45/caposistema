import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { PatientsPage } from '../../src/features/patients/PatientsPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  searchReferralPatients: vi.fn(),
  getPatientForEdit: vi.fn(),
  updatePatient: vi.fn(),
  createPatient: vi.fn(),
  getInitialActiveSearches: vi.fn(),
  registerInitialActiveSearchAttempt: vi.fn(),
  registerPatientDeath: vi.fn(),
}))

vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => rpc,
}))

const context = {
  username: 'gestor',
  full_name: 'Gestor CAPO',
  is_active: true,
  roles: [{ code: 'administrador', name: 'Administrador' }],
  capabilities: [],
  professional_id: null,
  primary_context: {
    role_id: 'role-admin',
    code: 'administrador',
    name: 'Administrador',
    source: 'configured',
    is_configured: true,
    requires_configuration: false,
  },
} as unknown as AccessContext

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('abre o cadastro completo e mantém as ações no paciente consultado', async () => {
  rpc.searchReferralPatients.mockResolvedValue({
    status: 'success',
    data: [{
      patient_id: 'patient-1',
      full_name: 'Eliana Teles Machado',
      patient_number: '1',
      cms: '87259',
    }],
  })
  rpc.getPatientForEdit.mockResolvedValue({
    status: 'success',
    data: [{
      patient_id: 'patient-1',
      patient_number: '1',
      full_name: 'Eliana Teles Machado',
      birth_date: '1956-10-21',
      cms: '87259',
      sex: 'feminino',
      phone: '35999999999',
      phone_secondary: null,
      address: 'Endereço real',
      capo_start_date: '2026-09-29',
      operational_notes: null,
      origin: 'CAPO',
      status: 'ativo',
      deceased: false,
    }],
  })

  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <PatientsPage accessContext={context} />
    </MemoryRouter>,
  )

  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  await user.type(screen.getByPlaceholderText('Nome, CMS ou Nº CAPO exato'), '1')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))

  expect(await screen.findByRole('heading', { name: 'Eliana Teles Machado' })).toBeVisible()
  expect(screen.getByDisplayValue('1')).toBeVisible()
  expect(screen.getByDisplayValue('87259')).toBeVisible()
  expect(screen.getByDisplayValue('69')).toBeVisible()

  const whatsapp = screen.getByRole('link', { name: /WhatsApp/ })
  expect(whatsapp).toHaveAttribute('href', expect.stringContaining('35999999999'))
  expect(screen.getByRole('link', { name: /Agendamento/ })).toHaveAttribute('href', '/agenda')
  expect(screen.getByRole('link', { name: /Familiar \/ Cuidador/ })).toHaveAttribute('href', '/familiar-cuidador')
  expect(screen.getByRole('link', { name: /fila de espera/i })).toHaveAttribute('href', '/fila')
  expect(screen.getByRole('link', { name: /Encerramentos/ })).toHaveAttribute('href', '/encerramentos')
  expect(screen.getByRole('button', { name: 'Registrar óbito' })).toBeVisible()
})
