import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReferralsPage } from '../../src/features/referrals/ReferralsPage'
import { SupabaseOperationError } from '../../src/lib/supabase/errors'
import type { AccessContext } from '../../src/types/access'

const professionalContext: AccessContext = {
  user_account_id: 'account-id',
  username: 'profissional.capo',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Profissional real',
  function_title: 'Psicóloga',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }],
  capabilities: ['encaminhamento_interprofissional'],
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
    function_title: 'Psicóloga',
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

function referralService(result: object) {
  return {
    getReferralSpecialties: vi.fn().mockResolvedValue({
      status: 'success',
      data: [{ specialty_id: 'specialty-id', specialty_name: 'Fisioterapia' }],
    }),
    getReferralTargets: vi.fn().mockResolvedValue({ status: 'empty' }),
    searchReferralPatients: vi.fn().mockResolvedValue({ status: 'empty' }),
    getInterprofessionalReferrals: vi.fn().mockResolvedValue(result),
    getReferralEvents: vi.fn().mockResolvedValue({ status: 'empty' }),
    createInterprofessionalReferral: vi
      .fn()
      .mockResolvedValue({ status: 'empty' }),
    updateInterprofessionalReferral: vi
      .fn()
      .mockResolvedValue({ status: 'empty' }),
  }
}

afterEach(cleanup)

describe('ReferralsPage', () => {
  it('preserva os rótulos e visões do index administrativo', async () => {
    const service = referralService({ status: 'empty' })

    render(
      <ReferralsPage accessContext={professionalContext} service={service} />,
    )

    expect(
      await screen.findByRole('heading', { name: 'Encaminhamentos' }),
    ).toBeVisible()
    expect(
      screen.getByText(
        'Receber, encaminhar e acompanhar providências administrativas autorizadas.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Recebidos' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Enviados' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Em andamento' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Concluídos' })).toBeVisible()
  })

  it('exibe o estado vazio retornado pelo contrato', async () => {
    const service = referralService({ status: 'empty' })

    render(
      <ReferralsPage accessContext={professionalContext} service={service} />,
    )

    expect(
      await screen.findByText('Nenhum encaminhamento encontrado.'),
    ).toBeVisible()
  })

  it('exibe erro sanitizado ao falhar a leitura', async () => {
    const service = referralService({
      status: 'error',
      error: new SupabaseOperationError({
        operation: 'get_interprofessional_referrals',
        kind: 'network',
        message: 'Não foi possível consultar encaminhamentos.',
      }),
    })

    render(
      <ReferralsPage accessContext={professionalContext} service={service} />,
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível consultar encaminhamentos.',
    )
  })

  it('busca o paciente e cria um encaminhamento pela operação injetada', async () => {
    const user = userEvent.setup()
    const service = referralService({ status: 'empty' })
    service.searchReferralPatients.mockResolvedValue({
      status: 'success',
      data: [
        {
          patient_id: 'patient-id',
          full_name: 'Paciente real',
          patient_number: 'CAPO-10',
          cms: 'CMS-20',
        },
      ],
    })
    service.createInterprofessionalReferral.mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        referral_id: 'referral-id',
        status: 'pending_approval',
        created_at: '2026-09-17T12:00:00Z',
      },
    })

    render(
      <ReferralsPage accessContext={professionalContext} service={service} />,
    )

    await screen.findByText('Nenhum encaminhamento encontrado.')
    await user.type(
      screen.getByLabelText('Buscar paciente por nome, CMS ou nº CAPO'),
      'Paciente',
    )
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(
      await screen.findByRole('button', { name: /Paciente real/ }),
    )
    await user.selectOptions(
      screen.getByLabelText('Especialidade de destino'),
      'specialty-id',
    )
    await user.type(
      screen.getByLabelText('Informação operacional'),
      'Avaliação de mobilidade',
    )
    await user.click(
      screen.getByRole('button', { name: 'Enviar para triagem' }),
    )

    expect(service.searchReferralPatients).toHaveBeenCalledWith(
      'Paciente',
      20,
      0,
    )
    expect(service.createInterprofessionalReferral).toHaveBeenCalledWith(
      'patient-id',
      'specialty-id',
      'Avaliação de mobilidade',
    )
    expect(
      await screen.findByText(
        'Encaminhamento enviado para triagem administrativa.',
      ),
    ).toBeVisible()
  })
})
