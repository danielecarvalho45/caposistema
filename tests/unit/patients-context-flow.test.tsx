import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { PatientsPage } from '../../src/features/patients/PatientsPage'
import { PatientWhatsAppButton } from '../../src/components/contact/PatientWhatsAppButton'
import { RegisterPatientDeath } from '../../src/components/patients/RegisterPatientDeath'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  searchReferralPatients: vi.fn(),
  getPatientForEdit: vi.fn(),
  updatePatient: vi.fn(),
  createPatient: vi.fn(),
  createClassifiedPatient: vi.fn(),
  checkPatientDuplicates: vi.fn(),
  getInitialActiveSearches: vi.fn(),
  registerInitialActiveSearchAttempt: vi.fn(),
  getPatientContact: vi.fn(),
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

beforeEach(() => {
  rpc.getInitialActiveSearches.mockResolvedValue({ status: 'success', data: { items: [] } })
  rpc.checkPatientDuplicates.mockResolvedValue({ status: 'success', data: [] })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('exige escolher novo ou preexistente e valida a data histórica antes do cadastro', async () => {
  const user = userEvent.setup()
  render(<MemoryRouter><PatientsPage accessContext={context} /></MemoryRouter>)

  expect(screen.queryByPlaceholderText('Nome completo do paciente')).not.toBeInTheDocument()
  await user.click(screen.getByLabelText('Paciente preexistente — já utiliza o CAPO'))
  await user.type(screen.getByPlaceholderText('Nome completo do paciente'), 'Paciente de teste unitário')
  const birth = screen.getByLabelText('Data de nascimento *')
  fireEvent.change(birth, { target: { value: '1980-01-01' } })
  expect(screen.getByRole('button', { name: 'Cadastrar paciente' })).toBeDisabled()
  expect(rpc.createClassifiedPatient).not.toHaveBeenCalled()
})

it('cadastra paciente novo pela operação classificada e só então mostra a Oferta CAPO', async () => {
  rpc.createClassifiedPatient.mockResolvedValue({ status: 'success', data: {
    patient_id: 'unit-patient', patient_number: '102', status: 'ativo',
    created_at: '2026-11-04T14:00:00.000Z',
  } })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [] })
  const user = userEvent.setup()
  render(<MemoryRouter><PatientsPage accessContext={context} /></MemoryRouter>)
  await user.click(screen.getByLabelText('Paciente novo'))
  expect(screen.queryByRole('heading', { name: 'Oferta CAPO — primeiro contato' })).not.toBeInTheDocument()
  await user.type(screen.getByPlaceholderText('Nome completo do paciente'), 'Paciente de teste unitário')
  fireEvent.change(screen.getByLabelText('Data de nascimento *'), { target: { value: '1980-01-01' } })
  await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
  expect(rpc.createClassifiedPatient).toHaveBeenCalledWith(expect.objectContaining({
    registrationKind: 'novo', historicalCapoStartDate: null,
  }))
  expect(await screen.findByRole('heading', { name: 'Oferta CAPO — primeiro contato' })).toBeVisible()
})

it('bloqueia cadastro com nome e nascimento idênticos e permite consultar o cadastro encontrado', async () => {
  rpc.checkPatientDuplicates.mockResolvedValue({ status: 'success', data: [{
    patient_id: 'already-exists', full_name: 'Nome repetido', birth_date: '1980-01-01',
    patient_number: '42', match_type: 'exato',
  }] })
  const user = userEvent.setup()
  render(<MemoryRouter><PatientsPage accessContext={context} /></MemoryRouter>)
  await user.click(screen.getByLabelText('Paciente novo'))
  await user.type(screen.getByPlaceholderText('Nome completo do paciente'), 'Nome repetido')
  fireEvent.change(screen.getByLabelText('Data de nascimento *'), { target: { value: '1980-01-01' } })
  await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
  expect(await screen.findByText(/Cadastro idêntico/)).toBeVisible()
  expect(screen.getByRole('button', { name: 'Consultar cadastro existente' })).toBeVisible()
  expect(rpc.createClassifiedPatient).not.toHaveBeenCalled()
})

it('exige conferência explícita antes de cadastrar nome semelhante com mesma data', async () => {
  rpc.checkPatientDuplicates.mockResolvedValue({ status: 'success', data: [{
    patient_id: 'similar', full_name: 'Maria do Carmo Silva', birth_date: '1980-01-01',
    patient_number: '52', match_type: 'semelhante',
  }] })
  rpc.createClassifiedPatient.mockResolvedValue({ status: 'success', data: {
    patient_id: 'new', patient_number: '53', status: 'ativo',
    created_at: '2026-11-04T14:00:00.000Z',
  } })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [] })
  const user = userEvent.setup()
  render(<MemoryRouter><PatientsPage accessContext={context} /></MemoryRouter>)
  await user.click(screen.getByLabelText('Paciente novo'))
  await user.type(screen.getByPlaceholderText('Nome completo do paciente'), 'Maria Aparecida Silva')
  fireEvent.change(screen.getByLabelText('Data de nascimento *'), { target: { value: '1980-01-01' } })
  await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
  expect(rpc.createClassifiedPatient).not.toHaveBeenCalled()
  await user.click(screen.getByLabelText('Conferi os cadastros: são pessoas diferentes.'))
  await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
  expect(rpc.createClassifiedPatient).toHaveBeenCalledTimes(1)
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



it('permite registrar a Oferta CAPO de paciente já cadastrado sem novo cadastro', async () => {
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [
    { patient_id: 'patient-existing', full_name: 'Paciente existente', patient_number: 'TESTE-CAPO', cms: null },
  ] })
  rpc.getPatientForEdit.mockResolvedValue({ status: 'success', data: [
    { patient_id: 'patient-existing', patient_number: 'TESTE-CAPO', full_name: 'Paciente existente', birth_date: '1980-01-01', phone: '35999999999', status: 'ativo' },
  ] })
  rpc.registerInitialActiveSearchAttempt.mockResolvedValue({ status: 'success', data: {
    success: true, care_cycle_id: 'cycle-real', cycle_created: true,
  } })

  const user = userEvent.setup()
  render(<MemoryRouter><PatientsPage accessContext={context} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Consultar' }))
  await user.type(screen.getByPlaceholderText('Nome, CMS ou Nº CAPO exato'), 'TESTE-CAPO')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(await screen.findByRole('heading', { name: 'Paciente existente' })).toBeVisible()
  expect(screen.getByRole('heading', { name: 'Oferta CAPO — primeiro contato' })).toBeVisible()
  await user.click(screen.getByLabelText('Aceitou'))
  await user.click(screen.getByRole('button', { name: 'Registrar contato da Oferta' }))
  expect(rpc.registerInitialActiveSearchAttempt).toHaveBeenCalledWith(expect.objectContaining({
    patientId: 'patient-existing', acceptedService: true, closeFlow: true,
  }))
  expect(rpc.createPatient).not.toHaveBeenCalled()
  expect(await screen.findByText('Oferta CAPO aceita e ciclo de acompanhamento confirmado pelo banco. Agora é possível agendar.')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Agendar consulta — ciclo CAPO confirmado' })).toHaveAttribute('href', '/agenda')
})

it('abre WhatsApp com comunicação de consulta pré-preenchida e envio manual', async () => {
  rpc.getPatientContact.mockResolvedValue({
    status: 'success',
    data: { phone: '(35) 99999-9999' },
  })
  const open = vi.fn()
  vi.stubGlobal('open', open)
  try {
    const user = userEvent.setup()
    const message = 'Olá, paciente. Consulta CAPO: 04/11/2026 às 09:00 com profissional.'
    render(<PatientWhatsAppButton patientId="patient-existing" message={message} />)
    await user.click(screen.getByRole('button', { name: 'WhatsApp' }))
    expect(rpc.getPatientContact).toHaveBeenCalledWith('patient-existing')
    expect(open).toHaveBeenCalledOnce()
    const [url, target, features] = open.mock.calls[0]
    expect(target).toBe('_blank')
    expect(features).toBe('noopener,noreferrer')
    const targetUrl = new URL(url)
    expect(targetUrl.origin).toBe('https://web.whatsapp.com')
    expect(targetUrl.searchParams.get('phone')).toBe('5535999999999')
    expect(targetUrl.searchParams.get('text')).toBe(message)
    expect(await screen.findByText(/Confira os dados e envie manualmente/)).toBeVisible()
  } finally {
    vi.unstubAllGlobals()
  }
})


it('oferece Agendar agora ou Finalizar cadastro após salvar preexistente, sem abrir consulta', async () => {
  rpc.createClassifiedPatient.mockResolvedValue({ status: 'success', data: {
    patient_id: 'preexisting-unit', patient_number: '351', status: 'ativo',
    created_at: '2026-11-13T14:00:00.000Z',
  } })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [] })
  const user = userEvent.setup()
  render(<MemoryRouter><PatientsPage accessContext={context} /></MemoryRouter>)
  await user.click(screen.getByLabelText('Paciente preexistente — já utiliza o CAPO'))
  await user.type(screen.getByPlaceholderText('Nome completo do paciente'), 'Paciente Prévio CAPO')
  fireEvent.change(screen.getByLabelText('Data de nascimento *'), { target: { value: '01/01/1980' } })
  fireEvent.change(screen.getByLabelText('Data em que começou a utilizar o CAPO *'), {
    target: { value: '01/09/2026' },
  })
  await user.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
  expect(rpc.createClassifiedPatient).toHaveBeenCalledWith(expect.objectContaining({
    registrationKind: 'preexistente', historicalCapoStartDate: '2026-09-01',
  }))
  expect(await screen.findByRole('button', { name: 'Agendar agora' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Finalizar cadastro' })).toBeVisible()
  expect(screen.queryByPlaceholderText('Nome, CMS ou Nº CAPO exato')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cadastrar paciente' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Finalizar cadastro' }))
  expect(screen.getByPlaceholderText('Nome completo do paciente')).toHaveValue('')
  expect(screen.getByLabelText('Paciente preexistente — já utiliza o CAPO')).toBeChecked()
  expect(screen.getByRole('button', { name: 'Cadastrar paciente' })).toBeDisabled()
  expect(rpc.createClassifiedPatient).toHaveBeenCalledTimes(1)
})
