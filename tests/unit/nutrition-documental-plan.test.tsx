import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NutritionPage } from '../../src/features/nutrition/NutritionPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getMyAssistentialSpecialties: vi.fn(),
  getBirthdays: vi.fn(),
  getNutritionContext: vi.fn(),
  saveDetailedNutritionPlan: vi.fn(),
  getProfessionalAppointmentContext: vi.fn(),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/supabase/rpc')>()
  return { ...original, getRpcService: () => rpc }
})
vi.mock('../../src/features/agenda/AgendaPage', () => ({
  AgendaPage: ({ onConfirmed }: { onConfirmed?: (appointment: unknown) => void }) => (
    <button type="button" onClick={() => onConfirmed?.({
      appointment_id: 'appointment-test',
      patient_id: 'patient-test',
      patient_name: 'Paciente da homologação',
      attendance_status: 'confirmado',
    })}>Confirmar paciente da Nutrição</button>
  ),
}))
vi.mock('../../src/components/patients/PatientDischargeProximityIndicator', () => ({
  PatientDischargeProximityIndicator: () => <span>Indicador preservado</span>,
}))

const accessContext = {
  is_active: true,
  professional_id: 'nutrition-professional-test',
  primary_context: { code: 'profissional', name: 'Profissional' },
  roles: [{ code: 'profissional', name: 'Profissional' }],
} as AccessContext

const nutritionContext = {
  patient: { patient_id: 'patient-test', patient_number: 'CAPO-HOMOLOG', cms: 'CMS-HOMOLOG' },
  current_plan: null,
  vulnerability_alert: null,
}

beforeEach(() => {
  rpc.getMyAssistentialSpecialties.mockResolvedValue({
    status: 'success', data: [{ specialty_name: 'Nutrição' }],
  })
  rpc.getBirthdays.mockResolvedValue({ status: 'empty' })
  rpc.getNutritionContext.mockResolvedValue({ status: 'success', data: nutritionContext })
  rpc.saveDetailedNutritionPlan.mockResolvedValue({ status: 'success', data: { success: true } })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Plano Alimentar documental — Nutrição', () => {
  it('abre um formulário livre de uma coluna e mantém campos adicionais digitáveis', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><NutritionPage accessContext={accessContext} homeOnly /></MemoryRouter>)
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    expect(screen.getByLabelText('Edição documental do Plano Alimentar')).toBeVisible()
    expect(screen.getByText(/Nº CAPO: CAPO-HOMOLOG/)).toBeVisible()
    expect(screen.getByLabelText('Sobremesa (almoço)')).toBeEnabled()
    expect(screen.getByLabelText('Orientações nutricionais em tratamento oncológico')).toBeEnabled()
    await user.type(screen.getByLabelText('Sobremesa (almoço)'), 'Fruta a critério da nutricionista.')
    await user.type(screen.getByLabelText('Orientações nutricionais em tratamento oncológico'), 'Texto livre digitado.')
    expect(screen.getByRole('button', { name: 'Gerar documento nutricional oficial' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Visualizar prévia' }))
    expect(screen.getByLabelText('Prévia do Plano Alimentar')).toHaveTextContent('Texto livre digitado.')
    await user.click(screen.getByRole('button', { name: 'Salvar / atualizar plano' }))
    await waitFor(() => expect(rpc.saveDetailedNutritionPlan).toHaveBeenCalledWith(
      expect.objectContaining({
        p_patient_id: 'patient-test',
        p_dessert_lunch: 'Fruta a critério da nutricionista.',
        p_oncology_guidance: 'Texto livre digitado.',
        p_document_title: 'PLANO ALIMENTAR ORAL',
      }),
    ))
  })

  it('não oferece geração de documento sem paciente confirmado', async () => {
    render(<MemoryRouter><NutritionPage accessContext={accessContext} homeOnly /></MemoryRouter>)
    expect(screen.queryByLabelText('Edição documental do Plano Alimentar')).not.toBeInTheDocument()
    expect(rpc.saveDetailedNutritionPlan).not.toHaveBeenCalled()
  })
})
