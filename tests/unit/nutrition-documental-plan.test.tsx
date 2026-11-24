import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { NutritionPage } from '../../src/features/nutrition/NutritionPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getMyAssistentialSpecialties: vi.fn(),
  getBirthdays: vi.fn(),
  getNutritionContext: vi.fn(),
  saveDetailedNutritionPlan: vi.fn(),
  createNutritionDocument: vi.fn(),
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

function renderHomeAndPlan() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<NutritionPage accessContext={accessContext} homeOnly />} />
        <Route path="/nutricao" element={<NutritionPage accessContext={accessContext} />} />
        <Route path="/agenda" element={<div>Agenda de origem</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  rpc.getProfessionalAppointmentContext.mockResolvedValue({
    status: 'success',
    data: {
      appointment_id: 'appointment-test',
      patient_id: 'patient-test',
      patient_name: 'Paciente da homologação',
      professional_id: 'nutrition-professional-test',
      specialty_name: 'Nutrição',
      attendance_status: 'confirmado',
    },
  })
  rpc.getMyAssistentialSpecialties.mockResolvedValue({
    status: 'success', data: [{ specialty_name: 'Nutrição' }],
  })
  rpc.getBirthdays.mockResolvedValue({ status: 'empty' })
  rpc.getNutritionContext.mockResolvedValue({ status: 'success', data: nutritionContext })
  rpc.saveDetailedNutritionPlan.mockResolvedValue({ status: 'success', data: { success: true, plan_id: 'test-plan-id' } })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Plano Alimentar documental — Nutrição', () => {
  it('mantém a Home compacta e abre a tela independente ao clicar no atalho', async () => {
    const user = userEvent.setup()
    renderHomeAndPlan()
    expect(screen.getByRole('navigation', { name: 'Acessos rápidos da Nutrição' })).toBeVisible()
    expect(screen.queryByLabelText('Edição documental do Plano Alimentar')).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Planejamento Alimentar/ }))
    expect(await screen.findByLabelText('Edição documental do Plano Alimentar')).toBeVisible()
    expect(screen.queryByRole('navigation', { name: 'Acessos rápidos da Nutrição' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: /Voltar à Home/ }))
    expect(await screen.findByRole('navigation', { name: 'Acessos rápidos da Nutrição' })).toBeVisible()
    expect(screen.queryByLabelText('Edição documental do Plano Alimentar')).not.toBeInTheDocument()
  })

  it('confirma na agenda da Home e navega à tela exclusiva revalidando a consulta', async () => {
    const user = userEvent.setup()
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    expect(rpc.getProfessionalAppointmentContext).toHaveBeenCalledWith('appointment-test')
    expect(rpc.getNutritionContext).toHaveBeenCalledWith('patient-test')
    expect(screen.queryByRole('navigation', { name: 'Acessos rápidos da Nutrição' })).not.toBeInTheDocument()
  })

  it('abre um formulário livre de uma coluna e mantém campos adicionais digitáveis', async () => {
    const user = userEvent.setup()
    renderHomeAndPlan()
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

  it('informa erro real de salvamento e mantém os textos editados na tela', async () => {
    const user = userEvent.setup()
    rpc.saveDetailedNutritionPlan.mockResolvedValue({
      status: 'error', error: { message: 'Falha simulada na gravação' },
    })
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    await user.type(screen.getByLabelText('Sobremesa (almoço)'), 'Texto livre a preservar')
    await user.click(screen.getByRole('button', { name: 'Salvar / atualizar plano' }))
    expect(await screen.findByText(/Não foi possível salvar o plano: Falha simulada na gravação/)).toBeVisible()
    expect(screen.getByLabelText('Sobremesa (almoço)')).toHaveValue('Texto livre a preservar')
    expect(screen.getByRole('button', { name: 'Gerar documento nutricional oficial' })).toBeDisabled()
  })

  it('não declara sucesso sem confirmação do plano pelo banco', async () => {
    const user = userEvent.setup()
    rpc.saveDetailedNutritionPlan.mockResolvedValue({ status: 'success', data: { success: true } })
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    await user.type(screen.getByLabelText('Sobremesa (almoço)'), 'Conferência necessária')
    await user.click(screen.getByRole('button', { name: 'Salvar / atualizar plano' }))
    expect(await screen.findByText(/O banco não confirmou o plano salvo/)).toBeVisible()
    expect(screen.getByLabelText('Sobremesa (almoço)')).toHaveValue('Conferência necessária')
  })

  it('somente confirma salvamento após reler no banco o mesmo conteúdo digitado', async () => {
    const user = userEvent.setup()
    rpc.getNutritionContext
      .mockResolvedValueOnce({ status: 'success', data: nutritionContext })
      .mockResolvedValueOnce({ status: 'success', data: {
        ...nutritionContext,
        current_plan: {
          plan_id: 'test-plan-id', owned_by_me: true,
          dessert_lunch: 'Fruta conforme plano da nutricionista.',
          document_title: 'PLANO ALIMENTAR ORAL',
        },
      } })
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    await user.type(screen.getByLabelText('Sobremesa (almoço)'), 'Fruta conforme plano da nutricionista.')
    await user.click(screen.getByRole('button', { name: 'Salvar / atualizar plano' }))
    expect(await screen.findByText(/Plano alimentar salvo e conferido no banco/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Gerar documento nutricional oficial' })).toBeEnabled()
  })

  it('preserva rascunho e impede PDF se o banco devolver plano desatualizado', async () => {
    const user = userEvent.setup()
    rpc.getNutritionContext.mockResolvedValue({ status: 'success', data: nutritionContext })
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    await user.type(screen.getByLabelText('Sobremesa (almoço)'), 'Texto real que não pode ser descartado')
    await user.click(screen.getByRole('button', { name: 'Salvar / atualizar plano' }))
    expect(await screen.findByText(/o conteúdo ainda não corresponde ao plano digitado/)).toBeVisible()
    expect(screen.getByLabelText('Sobremesa (almoço)')).toHaveValue('Texto real que não pode ser descartado')
    expect(screen.getByRole('button', { name: 'Gerar documento nutricional oficial' })).toBeDisabled()
  })

  it('restaura o botão de PDF após erro inesperado sem apagar o plano salvo', async () => {
    const user = userEvent.setup()
    rpc.createNutritionDocument.mockRejectedValue(new Error('Serviço temporariamente indisponível'))
    rpc.getNutritionContext
      .mockResolvedValueOnce({ status: 'success', data: nutritionContext })
      .mockResolvedValueOnce({ status: 'success', data: {
        ...nutritionContext,
        current_plan: {
          plan_id: 'test-plan-id', owned_by_me: true,
          breakfast: 'Refeição individualizada',
          document_title: 'PLANO ALIMENTAR ORAL',
        },
      } })
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText('Paciente selecionado: Paciente da homologação')).toBeVisible()
    await user.type(screen.getByLabelText('Café da manhã'), 'Refeição individualizada')
    await user.click(screen.getByRole('button', { name: 'Salvar / atualizar plano' }))
    await screen.findByText(/Plano alimentar salvo e conferido no banco/)
    await user.click(screen.getByRole('button', { name: 'Gerar documento nutricional oficial' }))
    expect(await screen.findByText(/Falha na geração do PDF: Serviço temporariamente indisponível/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Gerar documento nutricional oficial' })).toBeEnabled()
  })

  it('não permite edição quando o plano atual pertence a outro profissional', async () => {
    const user = userEvent.setup()
    rpc.getNutritionContext.mockResolvedValue({
      status: 'success',
      data: { ...nutritionContext, current_plan: { owned_by_me: false } },
    })
    renderHomeAndPlan()
    await user.click(screen.getByRole('button', { name: 'Confirmar paciente da Nutrição' }))
    expect(await screen.findByText(/O plano atual pertence a outro profissional/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Salvar / atualizar plano' })).toBeDisabled()
    expect(rpc.saveDetailedNutritionPlan).not.toHaveBeenCalled()
  })

  it('não oferece geração de documento sem paciente confirmado', async () => {
    renderHomeAndPlan()
    expect(screen.queryByLabelText('Edição documental do Plano Alimentar')).not.toBeInTheDocument()
    expect(rpc.saveDetailedNutritionPlan).not.toHaveBeenCalled()
  })
})
