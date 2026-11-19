import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NutritionPage } from '../../src/features/nutrition/NutritionPage'
import type { AccessContext } from '../../src/types/access'

const backend = vi.hoisted(() => ({
  getMyAssistentialSpecialties: vi.fn(),
  getProfessionalAppointmentContext: vi.fn(),
  getNutritionContext: vi.fn(),
  getBirthdays: vi.fn(),
}))

vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/supabase/rpc')>()
  return { ...original, getRpcService: () => backend }
})
vi.mock('../../src/components/patients/PatientDischargeProximityIndicator', () => ({
  PatientDischargeProximityIndicator: () => <div>Indicador de alta</div>,
}))

const context = {
  is_active: true,
  professional_id: 'nutrition-professional-test',
  roles: [{ code: 'profissional', name: 'Profissional' }],
  primary_context: { code: 'profissional', name: 'Profissional' },
} as AccessContext

const confirmed = {
  appointment_id: 'appointment-test',
  patient_id: 'patient-test',
  patient_name: 'Paciente de homologação',
  professional_id: 'nutrition-professional-test',
  specialty_name: 'Nutrição',
  attendance_status: 'confirmado',
}

function renderFromAgenda(state: Record<string, unknown> = { confirmedAppointmentId: 'appointment-test' }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/nutricao', state }]}>
      <NutritionPage accessContext={context} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  backend.getMyAssistentialSpecialties.mockResolvedValue({
    status: 'success',
    data: [{ specialty_name: 'Nutrição' }],
  })
  backend.getProfessionalAppointmentContext.mockResolvedValue({
    status: 'success', data: confirmed,
  })
  backend.getNutritionContext.mockResolvedValue({
    status: 'success',
    data: { current_plan: null, vulnerability_alert: null },
  })
  backend.getBirthdays.mockResolvedValue({ status: 'empty' })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Nutrição — confirmação na agenda e Plano Alimentar', () => {
  it('valida o agendamento confirmado no banco e abre o Plano Alimentar do mesmo paciente', async () => {
    renderFromAgenda()
    expect(await screen.findByText('Paciente selecionado: Paciente de homologação')).toBeVisible()
    expect(backend.getProfessionalAppointmentContext).toHaveBeenCalledWith('appointment-test')
    expect(backend.getNutritionContext).toHaveBeenCalledWith('patient-test')
    expect(screen.getByRole('heading', { name: 'Plano Alimentar e PDF oficial' })).toBeVisible()
  })

  it.each([
    [{ attendance_status: 'agendado' }, 'consulta ainda não confirmada'],
    [{ professional_id: 'other-professional-test' }, 'consulta de outro profissional'],
    [{ specialty_name: 'Psicologia' }, 'consulta de outra especialidade'],
  ])('impede abertura de plano: %s (%s)', async (changes) => {
    backend.getProfessionalAppointmentContext.mockResolvedValue({
      status: 'success', data: { ...confirmed, ...changes },
    })
    renderFromAgenda()
    expect(await screen.findByText(/O agendamento não corresponde a um atendimento de Nutrição confirmado/)).toBeVisible()
    expect(backend.getNutritionContext).not.toHaveBeenCalled()
  })

  it('não abre o plano quando a confirmação não pode ser revalidada no banco', async () => {
    backend.getProfessionalAppointmentContext.mockResolvedValue({
      status: 'error', error: { message: 'Consulta não autorizada' },
    })
    renderFromAgenda()
    expect(await screen.findByText('Consulta não autorizada')).toBeVisible()
    expect(backend.getNutritionContext).not.toHaveBeenCalled()
  })

  it('não abre plano automaticamente sem ID de consulta na rota', async () => {
    renderFromAgenda({})
    await waitFor(() => expect(backend.getMyAssistentialSpecialties).toHaveBeenCalled())
    expect(backend.getProfessionalAppointmentContext).not.toHaveBeenCalled()
    expect(backend.getNutritionContext).not.toHaveBeenCalled()
  })
})
