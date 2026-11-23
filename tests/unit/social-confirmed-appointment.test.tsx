import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SocialPage } from '../../src/features/social/SocialPage'
import type { AccessContext } from '../../src/types/access'
import type { ClosuresIntegration } from '../../src/features/closures/closures-integration'

const backend = vi.hoisted(() => ({
  getProfessionalAppointmentContext: vi.fn(),
  getSocialVulnerabilityIndicator: vi.fn(),
  setSocialVulnerabilityIndicator: vi.fn(),
}))

vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/supabase/rpc')>()
  return {
    ...original,
    getRpcService: () => backend,
  }
})

vi.mock('../../src/features/agenda/AgendaPage', () => ({
  AgendaPage: ({ onConfirmed }: { onConfirmed?: (appointment: unknown) => void }) => (
    <button type="button" onClick={() => onConfirmed?.({
      appointment_id: 'appointment-1',
      patient_id: 'patient-1',
      patient_name: 'Paciente autorizado',
      patient_number: null,
      professional_id: 'professional-1',
      professional_name: 'Profissional autorizado',
      specialty_name: 'Assistência Social',
      appointment_date: '2026-11-16T13:00:00Z',
      appointment_end: '2026-11-16T13:40:00Z',
      appointment_type: 'retorno',
      attendance_status: 'confirmado',
      general_notes: null,
      rescheduled_from_id: null,
      reschedule_reason: null,
      reschedule_origin: null,
    })}>
      Confirmar consulta social
    </button>
  ),
}))

vi.mock('../../src/components/birthdays/BirthdayPanel', () => ({
  BirthdayPanel: () => <h2>Aniversariantes de hoje</h2>,
}))
vi.mock('../../src/components/patients/PatientCareSpecialties', () => ({
  PatientCareSpecialties: () => <div>Especialidades vinculadas</div>,
}))
vi.mock('../../src/components/patients/PatientDischargeProximityIndicator', () => ({
  PatientDischargeProximityIndicator: () => <div>Alta próxima</div>,
}))
vi.mock('../../src/components/patients/RegisterPatientDeath', () => ({
  RegisterPatientDeath: () => <div>Registro de óbito autorizado</div>,
}))

const context = {
  user_account_id: 'account-1',
  username: 'social',
  is_active: true,
  professional_id: 'professional-1',
  roles: [{ code: 'profissional', name: 'Profissional' }],
  primary_specialty_name: 'Assistência Social',
  specialties: [{ specialty_id: 'social-id', specialty_name: 'Assistência Social', is_primary: true }],
} as AccessContext

const integration = {
  loadSocial: vi.fn().mockResolvedValue({ status: 'empty' }),
  startSocial: vi.fn().mockResolvedValue({ status: 'success', data: { ok: true } }),
  closeSocial: vi.fn(),
} as unknown as ClosuresIntegration

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Assistência Social — confirmação e continuidade de atendimento', () => {
  it('abre a atuação com paciente confirmado na Home, mantendo a agenda canônica', async () => {
    backend.getSocialVulnerabilityIndicator.mockResolvedValue({ status: 'empty' })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <SocialPage accessContext={context} mode="home" integration={integration} />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Acessos rápidos' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Confirmar consulta social' }))
    expect(await screen.findByText('Paciente confirmado na agenda: Paciente autorizado')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Iniciar acompanhamento social' }))
    expect(integration.startSocial).toHaveBeenCalledWith('patient-1', 'appointment-1')
  })

  it('não presume verde sem avaliação e permite salvar a classificação escolhida', async () => {
    backend.getSocialVulnerabilityIndicator.mockResolvedValue({ status: 'empty' })
    backend.setSocialVulnerabilityIndicator.mockResolvedValue({ status: 'success', data: { level: 'amarelo' } })
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <SocialPage accessContext={context} mode="home" integration={integration} />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Confirmar consulta social' }))
    const save = await screen.findByRole('button', { name: 'Salvar indicador' })
    expect(save).toBeDisabled()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Nível' }), 'amarelo')
    expect(save).toBeEnabled()
    await user.click(save)
    await waitFor(() => expect(backend.setSocialVulnerabilityIndicator).toHaveBeenCalledWith('patient-1', 'amarelo'))
    expect(await screen.findByText(/Indicador de vulnerabilidade atualizado/)).toBeVisible()
  })

  it('na rota separada relê a consulta do backend antes de abrir atendimento', async () => {
    backend.getProfessionalAppointmentContext.mockResolvedValue({
      status: 'success',
      data: {
        appointment_id: 'appointment-1',
        patient_id: 'patient-1',
        patient_name: 'Paciente autorizado',
        patient_number: null,
        professional_id: 'professional-1',
        professional_name: 'Profissional autorizado',
        specialty_name: 'Assistência Social',
        appointment_date: '2026-11-16T13:00:00Z',
        appointment_end: '2026-11-16T13:40:00Z',
        appointment_type: 'retorno',
        attendance_status: 'confirmado',
      },
    })
    backend.getSocialVulnerabilityIndicator.mockResolvedValue({ status: 'empty' })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/assistencia-social', state: { confirmedAppointmentId: 'appointment-1' } }]}>
        <SocialPage accessContext={context} mode="followup" integration={integration} />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Paciente confirmado na agenda: Paciente autorizado')).toBeVisible()
    expect(backend.getProfessionalAppointmentContext).toHaveBeenCalledWith('appointment-1')
    expect(screen.getByRole('button', { name: 'Iniciar acompanhamento social' })).toBeEnabled()
  })

  it('não permite iniciar acompanhamento sem confirmação validada pelo backend', async () => {
    backend.getProfessionalAppointmentContext.mockResolvedValue({
      status: 'success',
      data: {
        appointment_id: 'appointment-2',
        patient_id: 'patient-2',
        patient_name: 'Paciente ainda não confirmado',
        patient_number: null,
        professional_id: 'professional-1',
        professional_name: 'Profissional autorizado',
        specialty_name: 'Assistência Social',
        appointment_date: '2026-11-16T13:00:00Z',
        appointment_end: '2026-11-16T13:40:00Z',
        appointment_type: 'retorno',
        attendance_status: 'agendado',
      },
    })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/assistencia-social', state: { confirmedAppointmentId: 'appointment-2' } }]}>
        <SocialPage accessContext={context} mode="followup" integration={integration} />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText('Confirme a presença na agenda antes de iniciar o acompanhamento social.')).toBeVisible()
    })
    expect(screen.queryByRole('button', { name: 'Iniciar acompanhamento social' })).not.toBeInTheDocument()
    expect(integration.startSocial).not.toHaveBeenCalled()
  })
})
