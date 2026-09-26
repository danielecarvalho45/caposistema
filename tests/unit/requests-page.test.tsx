import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RequestsPage } from '../../src/features/requests/RequestsPage'
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
  capabilities: [],
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

function requestService(result: object) {
  return {
    getAdministrativeRequests: vi.fn().mockResolvedValue(result),
    getAdministrativeRequestEvents: vi
      .fn()
      .mockResolvedValue({ status: 'empty' }),
    createAdministrativeRequest: vi.fn().mockResolvedValue({ status: 'empty' }),
    updateAdministrativeRequest: vi.fn().mockResolvedValue({ status: 'empty' }),
    getFamilyPsychologyRequestContext: vi.fn().mockResolvedValue({ status: 'empty' }),
    addFamilyToWaitingList: vi.fn().mockResolvedValue({ status: 'empty' }),
  }
}

afterEach(cleanup)

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('RequestsPage', () => {
  it('preserva os rótulos e visões do index administrativo', async () => {
    const service = requestService({ status: 'empty' })

    renderWithRouter(
      <RequestsPage accessContext={professionalContext} service={service} />,
    )

    expect(await screen.findByRole('heading', { name: 'Solicitações' })).toBeVisible()
    expect(
      screen.getByText(
        'Receber, executar, encaminhar e concluir providências administrativas.',
      ),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Recebidas' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Aceitas / Em atendimento' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Concluídas' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Devolvidas / pendentes' }),
    ).toBeVisible()
  })

  it('exibe o estado vazio retornado pelo contrato', async () => {
    const service = requestService({ status: 'empty' })

    renderWithRouter(
      <RequestsPage accessContext={professionalContext} service={service} />,
    )

    expect(
      await screen.findByText('Nenhuma solicitação encontrada.'),
    ).toBeVisible()
  })

  it('exibe erro sanitizado ao falhar a leitura', async () => {
    const service = requestService({
      status: 'error',
      error: new SupabaseOperationError({
        operation: 'get_administrative_requests',
        kind: 'network',
        message: 'Não foi possível consultar solicitações.',
      }),
    })

    renderWithRouter(
      <RequestsPage accessContext={professionalContext} service={service} />,
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Não foi possível consultar solicitações.',
    )
  })

  it('cria uma solicitação pela operação injetada e recarrega a lista', async () => {
    const user = userEvent.setup()
    const service = requestService({ status: 'empty' })
    service.getAdministrativeRequests
      .mockResolvedValueOnce({ status: 'empty' })
      .mockResolvedValue({
        status: 'success',
        data: [{
          request_id: 'request-id', patient_id: null, patient_name: null,
          patient_number: null, cms: null, requesting_professional_id: 'professional-id',
          requesting_professional_name: 'Profissional autorizado', subject: 'Apoio administrativo',
          description: 'Providência administrativa necessária', status: 'pending',
          administrative_response: null, counter_reference: null,
          created_at: '2026-09-17T12:00:00Z', updated_at: '2026-09-17T12:00:00Z',
          completed_at: null, cancelled_at: null, total_count: 1,
        }],
      })
    service.createAdministrativeRequest.mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        request_id: 'request-id',
        patient_id: null,
        requesting_professional_id: 'professional-id',
        status: 'pending',
        created_at: '2026-09-17T12:00:00Z',
      },
    })

    renderWithRouter(
      <RequestsPage accessContext={professionalContext} service={service} />,
    )

    await screen.findByText('Nenhuma solicitação encontrada.')
    await user.type(screen.getByLabelText('Assunto'), 'Apoio administrativo')
    await user.type(
      screen.getByLabelText('Descrição'),
      'Providência administrativa necessária',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }))

    expect(service.createAdministrativeRequest).toHaveBeenCalledWith(
      null,
      'Apoio administrativo',
      'Providência administrativa necessária',
    )
    expect(
      await screen.findByText(
        'Solicitação enviada ao Administrativo Operacional.',
      ),
    ).toBeVisible()
    expect(service.getAdministrativeRequests).toHaveBeenCalledTimes(2)
  })

  it('não confirma na interface uma solicitação ausente após a recarga', async () => {
    const user = userEvent.setup()
    const service = requestService({ status: 'empty' })
    service.createAdministrativeRequest.mockResolvedValue({
      status: 'success',
      data: { request_id: 'request-id' },
    })
    renderWithRouter(<RequestsPage accessContext={professionalContext} service={service} />)
    await screen.findByText('Nenhuma solicitação encontrada.')
    await user.type(screen.getByLabelText('Assunto'), 'Apoio administrativo')
    await user.type(screen.getByLabelText('Descrição'), 'Providência administrativa necessária')
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }))
    expect(await screen.findByRole('status')).toHaveTextContent('ainda não apareceu na lista retornada pelo banco')
  })
})
