import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SocialHomeVisits } from '../../src/features/agenda/SocialHomeVisits'

const backend = vi.hoisted(() => ({
  rpc: vi.fn(),
  searchReferralPatients: vi.fn(),
  searchProfessionalPatients: vi.fn(),
}))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: backend.rpc }),
}))
vi.mock('../../src/lib/supabase/rpc', () => ({
  getRpcService: () => ({
    searchReferralPatients: backend.searchReferralPatients,
    searchProfessionalPatients: backend.searchProfessionalPatients,
  }),
}))
vi.mock('../../src/components/inputs/CapoDateInput', () => ({
  CapoDateInput: ({ value, onChange }: { value: string; onChange: (event: { target: { value: string } }) => void }) => (
    <input aria-label="Data da visita" value={value} onChange={onChange} />
  ),
}))
vi.mock('../../src/components/inputs/CapoTimeInput', () => ({
  CapoTimeInput: ({ value, onChange }: { value: string; onChange: (event: { target: { value: string } }) => void }) => (
    <input aria-label="Horário 24h" value={value} onChange={onChange} />
  ),
}))

const block = {
  block_id: 'block-1',
  date: '2026-11-19',
  start_time: '08:00:00',
  end_time: '12:00:00',
  description: 'Visita Domiciliar',
  patients: [],
}
beforeEach(() => {
  backend.searchProfessionalPatients.mockResolvedValue({
    status: 'success', data: [{ patient_id: 'patient-1', full_name: 'Paciente de teste', patient_number: '1' }],
  })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Visita Domiciliar na agenda oficial', () => {
  it('permite bloquear sem paciente e vinculá-lo posteriormente sem recriar o bloqueio', async () => {
    let created = false
    let patientAdded = false
    backend.rpc.mockImplementation(async (_name: string, args: { p_action: string }) => {
      if (args.p_action === 'list') return {
        data: { success: true, visits: created ? [{ ...block, patients: patientAdded ? [{
          patient_id: 'patient-1', patient_name: 'Paciente de teste',
          patient_number: '1', address: 'Rua Exemplo, 25', phone: '35999999999', status: 'programada',
        }] : [] }] : [] }, error: null,
      }
      if (args.p_action === 'create') { created = true; return { data: { success: true, block_id: 'block-1' }, error: null } }
      if (args.p_action === 'add') { patientAdded = true; return { data: { success: true }, error: null } }
      return { data: { success: true }, error: null }
    })
    const user = userEvent.setup()
    render(<SocialHomeVisits professionalId="professional-1" />)
    await user.type(screen.getByLabelText('Data da visita'), '2026-11-19')
    const times = screen.getAllByLabelText('Horário 24h')
    await user.type(times[0], '08:00')
    await user.type(times[1], '12:00')
    await user.click(screen.getByRole('button', { name: 'Bloquear para Visita Domiciliar' }))
    expect(await screen.findByText('Programação em aberto — sem pacientes')).toBeVisible()
    expect(backend.rpc.mock.calls.filter((call) => call[1]?.p_action === 'create')).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Adicionar pacientes' }))
    await user.type(screen.getByPlaceholderText('Nome ou nº CAPO'), 'Paciente')
    await user.click(screen.getByRole('button', { name: 'Buscar paciente' }))
    expect(backend.searchProfessionalPatients).toHaveBeenCalled()
    await user.selectOptions(screen.getByLabelText('Paciente'), 'patient-1')
    await user.click(screen.getByRole('button', { name: 'Agendar visita domiciliar' }))
    expect(await screen.findByText(/1 paciente\(s\) programado\(s\)/)).toBeVisible()
    expect(screen.getByText('Endereço: Rua Exemplo, 25')).toBeVisible()
    expect(screen.getByText('Telefone: 35999999999')).toBeVisible()
    expect(screen.queryByText(/Horário previsto/)).not.toBeInTheDocument()
    const addCall = backend.rpc.mock.calls.find((call) => call[1]?.p_action === 'add')
    expect(addCall?.[1]?.p_visit_time).toBeNull()
    expect(backend.rpc.mock.calls.filter((call) => call[1]?.p_action === 'create')).toHaveLength(1)
  })

  it('agenda paciente já selecionado na visita bloqueada sem novo slot nem horário individual', async () => {
    backend.rpc.mockImplementation(async (_name: string, args: { p_action: string }) => ({
      data: args.p_action === 'list'
        ? { success: true, visits: [block] }
        : { success: true }, error: null,
    }))
    const user = userEvent.setup()
    render(<SocialHomeVisits administrative professionalId="professional-1"
      preselectedPatientId="patient-1" preselectedPatientName="Paciente de teste" />)
    await user.click(await screen.findByRole('button', {
      name: 'Agendar visita domiciliar de Paciente de teste neste período',
    }))
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith(
      'manage_social_home_visits_for_interface',
      expect.objectContaining({
        p_action: 'add', p_professional_id: 'professional-1',
        p_patient_id: 'patient-1', p_block_id: 'block-1', p_visit_time: null,
      }),
    ))
    expect(backend.rpc.mock.calls.some((call) => call[1]?.p_action === 'create')).toBe(false)
  })

  it('não considera bloqueio criado quando o banco exige remanejamento', async () => {
    backend.rpc.mockImplementation(async (_name: string, args: { p_action: string }) => ({
      data: args.p_action === 'create'
        ? { success: false, requires_remanejamento: true, affected_appointments: 2, message: 'Remanejamento obrigatório.' }
        : { success: true, visits: [] },
      error: null,
    }))
    const user = userEvent.setup()
    render(<SocialHomeVisits professionalId="professional-1" />)
    await user.type(screen.getByLabelText('Data da visita'), '2026-11-19')
    const times = screen.getAllByLabelText('Horário 24h')
    await user.type(times[0], '08:00')
    await user.type(times[1], '12:00')
    await user.click(screen.getByRole('button', { name: 'Bloquear para Visita Domiciliar' }))
    expect(await screen.findByText(/2 consulta\(s\) atingida\(s\).*bloqueio não foi salvo/i)).toBeVisible()
    expect(screen.queryByText('Programação em aberto — sem pacientes')).not.toBeInTheDocument()
  })

  it('registra o resultado da visita e exige justificativa ao cancelar', async () => {
    backend.rpc.mockImplementation(async (_name: string, args: { p_action?: string }) => ({
      data: args.p_action === 'list' ? {
        success: true, visits: [{ ...block, patients: [{
          patient_id: 'patient-1', patient_name: 'Paciente de teste', patient_number: '1',
          address: 'Rua Exemplo, 25', phone: '35999999999', status: 'programada',
        }] }],
      } : { success: true },
      error: null,
    }))
    const user = userEvent.setup()
    render(<SocialHomeVisits professionalId="professional-1" />)
    await user.click(await screen.findByRole('button', { name: 'Registrar resultado' }))
    await user.selectOptions(screen.getByLabelText('Situação da visita'), 'cancelada')
    await user.click(screen.getByRole('button', { name: 'Salvar resultado da visita' }))
    expect(await screen.findByText('Informe a justificativa com pelo menos cinco caracteres.')).toBeVisible()
    await user.type(screen.getByLabelText('Justificativa'), 'Visita cancelada por motivo operacional')
    await user.click(screen.getByRole('button', { name: 'Salvar resultado da visita' }))
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith(
      'set_social_home_visit_outcome_for_interface',
      expect.objectContaining({ p_status: 'cancelada', p_patient_id: 'patient-1' }),
    ))
  })

  it('usa o profissional já selecionado na agenda administrativa sem exibir seletor extra', async () => {
    backend.rpc.mockImplementation(async (_name: string, args: { p_action: string }) => ({
      data: { success: true, visits: [block] }, error: null,
    }))
    render(<SocialHomeVisits administrative professionalId="professional-1" />)
    expect(await screen.findByText('Programação em aberto — sem pacientes')).toBeVisible()
    expect(screen.queryByLabelText('Assistente social')).not.toBeInTheDocument()
    await waitFor(() => expect(backend.rpc).toHaveBeenCalledWith(
      'manage_social_home_visits_for_interface', expect.objectContaining({
        p_action: 'list', p_professional_id: 'professional-1',
      }),
    ))
  })
})
