import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RenewalPrescriptionPage } from '../../src/features/renewals/RenewalPrescriptionPage'
import type { AccessContext } from '../../src/types/access'

const professionalContext: AccessContext = {
  user_account_id: 'account-id',
  username: 'profissional.capo',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Profissional real',
  function_title: 'Administrativo',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }],
  capabilities: ['renovacao_receita'],
  primary_context: {
    role_id: 'role-id',
    code: 'profissional',
    name: 'Profissional',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: 'professional-id',
    full_name: 'Profissional real',
    function_title: 'Administrativo',
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: {
      role_id: 'role-id',
      code: 'profissional',
      name: 'Profissional',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

function renewalService(result: object) {
  return {
    getPrescriptionRenewalDoctors: vi.fn().mockResolvedValue({
      status: 'success',
      data: [
        {
          doctor_id: 'doctor-id',
          doctor_name: 'Dr. José Silva',
          specialty_name: 'Clínica Geral',
          professional_registration: 'CRM-12345',
          is_active: true,
        },
      ],
    }),
    createPrescriptionRenewal: vi.fn().mockResolvedValue({ status: 'empty' }),
    getPrescriptionRenewals: vi.fn().mockResolvedValue(result),
    managePrescriptionRenewalMedical: vi
      .fn()
      .mockResolvedValue({ status: 'empty' }),
    managePrescriptionRenewalAdmin: vi
      .fn()
      .mockResolvedValue({ status: 'empty' }),
    searchReferralPatients: vi.fn().mockResolvedValue({ status: 'empty' }),
  }
}

afterEach(cleanup)

describe('RenewalPrescriptionPage', () => {
  it('exibe o estado vazio retornado pelo contrato', async () => {
    const service = renewalService({ status: 'empty' })

    render(
      <RenewalPrescriptionPage
        accessContext={professionalContext}
        service={service}
      />,
    )

    expect(
      await screen.findByText('Nenhuma solicitação encontrada neste contexto.'),
    ).toBeVisible()
  })

  it('busca paciente e cria solicitação com médico selecionado', async () => {
    const user = userEvent.setup()
    const service = renewalService({ status: 'empty' })
    service.searchReferralPatients.mockResolvedValue({
      status: 'success',
      data: [
        {
          patient_id: 'patient-id',
          full_name: 'Paciente real',
          patient_number: 'CAPO-10',
          cms: null,
        },
      ],
    })
    service.createPrescriptionRenewal.mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        renewal_id: 'renewal-id',
        status: 'awaiting_medical',
      },
    })

    render(
      <RenewalPrescriptionPage
        accessContext={professionalContext}
        service={service}
      />,
    )

    await screen.findByText('Nenhuma solicitação encontrada neste contexto.')
    await user.type(screen.getByLabelText('Buscar paciente'), 'Paciente')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(await screen.findByRole('button', { name: /Paciente real/ }))
    await user.selectOptions(
      screen.getByLabelText('Médico responsável'),
      'doctor-id',
    )
    await user.type(
      screen.getByLabelText('Motivo operacional'),
      'Continuidade de tratamento',
    )
    await user.click(
      screen.getByRole('button', { name: 'Enviar para avaliação' }),
    )

    expect(service.createPrescriptionRenewal).toHaveBeenCalledWith(
      'patient-id',
      'doctor-id',
      'Continuidade de tratamento',
    )
    expect(
      await screen.findByText('Solicitação enviada para avaliação médica.'),
    ).toBeVisible()
  })

  it('executa a decisão médica na solicitação selecionada', async () => {
    const user = userEvent.setup()
    const medicalContext = {
      ...professionalContext,
      roles: [{ code: 'profissional', name: 'Profissional' }],
    }
    const service = renewalService({
      status: 'success',
      data: [
        {
          renewal_id: 'renewal-id',
          patient_id: 'patient-id',
          patient_name: 'Paciente real',
          patient_number: 'CAPO-10',
          cms: null,
          doctor_id: 'doctor-id',
          doctor_name: 'Dr. José Silva',
          specialty_name: 'Clínica Geral',
          status: 'awaiting_medical',
          request_note: 'Continuidade de tratamento',
          medical_feedback: null,
          administrative_feedback: null,
          created_at: '2026-09-17T12:00:00Z',
          updated_at: '2026-09-17T12:00:00Z',
          reviewed_at: null,
          completed_at: null,
          cancelled_at: null,
          total_count: 1,
        },
      ],
    })
    service.managePrescriptionRenewalMedical.mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        renewal_id: 'renewal-id',
        action: 'authorize',
        status: 'awaiting_admin',
      },
    })

    render(
      <RenewalPrescriptionPage
        accessContext={medicalContext}
        service={service}
      />,
    )

    await screen.findByText('Paciente real')
    await user.click(screen.getByRole('button', { name: /Paciente real/ }))
    await user.type(
      screen.getByLabelText('Observação da ação'),
      'Receita renovada conforme avaliação',
    )
    await user.click(screen.getByRole('button', { name: 'Autorizar e enviar ao administrativo' }))

    expect(service.managePrescriptionRenewalMedical).toHaveBeenCalledWith(
      'renewal-id',
      'authorize',
      'Receita renovada conforme avaliação',
    )
  })
})