import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DentistryPage } from '../../src/features/dentistry/DentistryPage'
import type { DentistryService } from '../../src/features/dentistry/DentistryPage'
import type { AccessContext } from '../../src/types/access'

const baseContext: AccessContext = {
  user_account_id: 'account-id',
  username: 'profissional.capo',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Profissional real',
  function_title: 'Clínica geral',
  professional_registration: 'CRM-12345',
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }],
  capabilities: ['emitir_encaminhamento_odontologico_externo'],
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
    function_title: 'Clínica geral',
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

afterEach(cleanup)

describe('DentistryPage', () => {
  it('bloqueia acesso quando o backend informa que o profissional não pode emitir', async () => {
    const service = {
      getDentistryAccessContextForInterface: vi.fn(async () => ({
        status: 'success',
        data: {
          professional_id: 'professional-id',
          professional_name: 'Profissional real',
          can_issue: false,
          can_manage: false,
        },
      })),
    }

    render(
      <DentistryPage
        accessContext={baseContext}
        service={service as unknown as DentistryService}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Odontologia indisponível')).toBeVisible()
    })

    expect(
      screen.getByText(
        'O contexto atual não possui autorização para emitir encaminhamento odontológico externo.',
      ),
    ).toBeVisible()
  })

  it('bloqueia acesso quando não consegue validar a autorização no backend', async () => {
    const service = {
      getDentistryAccessContextForInterface: vi.fn(async () => ({
        status: 'error',
        error: new Error('Falha temporária no contexto de autorização'),
      })),
    }

    render(
      <DentistryPage
        accessContext={baseContext}
        service={service as unknown as DentistryService}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Odontologia indisponível')).toBeVisible()
    })

    expect(
      screen.getByText('Falha temporária no contexto de autorização'),
    ).toBeVisible()
  })

  it('busca paciente e cria encaminhamento usando os contratos reais do backend', async () => {
    const service = {
      getDentistryAccessContextForInterface: vi.fn(async () => ({
        status: 'success',
        data: {
          professional_id: 'professional-id',
          professional_name: 'Profissional real',
          can_issue: true,
          can_manage: false,
        },
      })),
      searchDentistryPatientsForInterface: vi.fn(async () => ({
        status: 'success',
        data: [
          {
            patient_id: 'patient-1',
            full_name: 'Maria da Silva',
            patient_number: '1001',
            cms: 'CMS-001',
          },
        ],
      })),
      createDentistryReferralForInterface: vi.fn(async () => ({
        status: 'success',
        data: {
          success: true,
          referral_id: 'referral-1',
          patient_id: 'patient-1',
          status: 'pending_approval',
          created_at: '2026-09-17T00:00:00Z',
        },
      })),
      getDentistryReferralsForInterface: vi.fn(async () => ({
        status: 'empty',
      })),
    }

    render(
      <DentistryPage
        accessContext={baseContext}
        service={service as unknown as DentistryService}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          name: 'Encaminhamento odontológico externo',
        }),
      ).toBeVisible()
    })

    fireEvent.change(screen.getByLabelText('Buscar paciente'), {
      target: { value: 'Maria' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar paciente' }))

    await waitFor(() => {
      expect(service.searchDentistryPatientsForInterface).toHaveBeenCalledWith(
        'Maria',
        10,
        0,
      )
    })

    fireEvent.click(screen.getByRole('button', { name: 'Maria da Silva' }))
    fireEvent.change(screen.getByLabelText('Motivo operacional'), {
      target: { value: 'Solicitação de avaliação odontológica inicial.' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Emitir encaminhamento' }),
    )

    await waitFor(() => {
      expect(service.createDentistryReferralForInterface).toHaveBeenCalledWith(
        'patient-1',
        'Solicitação de avaliação odontológica inicial.',
      )
    })
  })

  it('expõe ações administrativas quando o backend autoriza gestión', async () => {
    const service = {
      getDentistryAccessContextForInterface: vi.fn(async () => ({
        status: 'success',
        data: {
          professional_id: 'professional-id',
          professional_name: 'Profissional real',
          can_issue: true,
          can_manage: true,
        },
      })),
      getDentistryReferralsForInterface: vi.fn(async () => ({
        status: 'success',
        data: [
          {
            referral_id: 'referral-2',
            patient_id: 'patient-2',
            patient_name: 'João da Silva',
            patient_number: '2002',
            cms: 'CMS-002',
            requesting_professional_id: 'professional-id',
            requesting_professional_name: 'Profissional real',
            destination: 'Clínica Odontológica Externa',
            operational_reason: 'Avaliação com urgência',
            response: null,
            status: 'pending_approval',
            created_at: '2026-09-17T00:00:00Z',
            completed_at: null,
            cancelled_at: null,
            history: [
              {
                event_id: 'event-1',
                event_type: 'created',
                from_status: null,
                to_status: 'pending_approval',
                detail: 'Encaminhamento criado',
                actor_name: 'Profissional real',
                actor_role: 'profissional',
                created_at: '2026-09-17T00:00:00Z',
              },
            ],
            total_count: 1,
          },
        ],
      })),
      manageDentistryReferralForInterface: vi.fn(async () => ({
        status: 'success',
        data: {
          success: true,
          referral_id: 'referral-2',
          status: 'in_progress',
        },
      })),
    }

    render(
      <DentistryPage
        accessContext={baseContext}
        service={service as unknown as DentistryService}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('João da Silva')).toBeVisible()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar atendimento' }))

    await waitFor(() => {
      expect(service.manageDentistryReferralForInterface).toHaveBeenCalledWith(
        'referral-2',
        'start',
        null,
      )
    })
  })
})
