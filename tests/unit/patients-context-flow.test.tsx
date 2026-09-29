import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { PatientsPage } from '../../src/features/patients/PatientsPage'
import { RegisterPatientDeath } from '../../src/components/patients/RegisterPatientDeath'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  searchReferralPatients: vi.fn(),
  getPatientForEdit: vi.fn(),
  updatePatient: vi.fn(),
  createPatient: vi.fn(),
  getInitialActiveSearches: vi.fn(),
  registerInitialActiveSearchAttempt: vi.fn(),
  getPatientDeathContext: vi.fn(),
  registerPatientDeath: vi.fn(),
  correctPatientDeath: vi.fn(),
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
  rpc.getPatientDeathContext.mockResolvedValue({
    status: 'success',
    data: { deceased: false },
  })
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

it('corrige registro de óbito com motivo e preserva o fluxo compartilhado', async () => {
  rpc.getPatientDeathContext
    .mockResolvedValueOnce({
      status: 'success',
      data: {
        deceased: true,
        death_date: '2026-09-29',
        death_recorded_by_name: 'Gestor CAPO',
      },
    })
    .mockResolvedValueOnce({
      status: 'success',
      data: { deceased: false },
    })
  rpc.correctPatientDeath.mockResolvedValue({
    status: 'success',
    data: {
      success: true,
      patient_id: 'patient-1',
      deceased: false,
      restored_status: 'ativo',
    },
  })

  const user = userEvent.setup()
  render(
    <RegisterPatientDeath
      patientId="patient-1"
      patientName="Paciente Teste"
    />,
  )

  expect(await screen.findByRole('button', { name: 'Corrigir registro de óbito' })).toBeDisabled()
  await user.type(screen.getByLabelText('Motivo da correção *'), 'Registro realizado por engano')
  const correct = screen.getByRole('button', { name: 'Corrigir registro de óbito' })
  expect(correct).toBeEnabled()
  await user.click(correct)

  expect(rpc.correctPatientDeath).toHaveBeenCalledWith(
    'patient-1',
    'Registro realizado por engano',
  )
  expect(await screen.findByText(/status anterior foi restaurado/i)).toBeVisible()
})

it('abre diretamente o paciente recebido pela notificação administrativa', async () => {
  rpc.getPatientForEdit.mockResolvedValue({
    status: 'success',
    data: [{
      patient_id: 'patient-1',
      patient_number: '1',
      full_name: 'Paciente da Notificação',
      birth_date: '1960-01-01',
      cms: 'CMS-1',
      sex: 'feminino',
      phone: '35999999999',
      phone_secondary: null,
      address: null,
      capo_start_date: '2026-09-29',
      operational_notes: null,
      origin: 'CAPO',
      status: 'ativo',
      deceased: true,
    }],
  })
  rpc.getPatientDeathContext.mockResolvedValue({
    status: 'success',
    data: { deceased: true, death_date: '2026-09-29' },
  })

  render(
    <MemoryRouter initialEntries={['/pacientes?patientId=patient-1']}>
      <PatientsPage accessContext={context} />
    </MemoryRouter>,
  )

  expect(await screen.findByRole('heading', { name: 'Paciente da Notificação' })).toBeVisible()
  expect(rpc.getPatientForEdit).toHaveBeenCalledWith('patient-1')
})

