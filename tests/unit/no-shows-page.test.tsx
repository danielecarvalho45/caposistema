import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NoShowsPage } from '../../src/features/no-shows/NoShowsPage'
import { SupabaseOperationError } from '../../src/lib/supabase/errors'
import type { NoShowFollowup } from '../../src/lib/supabase/rpc'
import type { AccessContext } from '../../src/types/access'

const context: AccessContext = {
  user_account_id: 'account-id',
  username: 'operador.capo',
  is_active: true,
  recovery_email: null,
  professional_id: null,
  full_name: 'Operador real',
  function_title: 'Administrativo Operacional',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [
    { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
  ],
  capabilities: [],
  primary_context: {
    role_id: 'role-id',
    code: 'administrativo_operacional',
    name: 'Administrativo Operacional',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: null,
    full_name: 'Operador real',
    function_title: 'Administrativo Operacional',
    roles: [
      {
        code: 'administrativo_operacional',
        name: 'Administrativo Operacional',
      },
    ],
    primary_context: {
      role_id: 'role-id',
      code: 'administrativo_operacional',
      name: 'Administrativo Operacional',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

const followup: NoShowFollowup = {
  followup_id: 'followup-id',
  appointment_id: 'appointment-id',
  patient_id: 'patient-id',
  patient_name: 'Paciente real',
  patient_number: 'CAPO-10',
  cms: 'CMS-20',
  professional_id: 'professional-id',
  professional_name: 'Profissional real',
  no_show_date: '2026-09-16',
  active_search_status: 'pendente',
  contact_attempts: 0,
  first_contact_at: null,
  last_contact_at: null,
  contact_result: null,
  next_contact_date: null,
  rescheduling_requested: false,
  reschedule_request_id: null,
  rescheduled_appointment_id: null,
}

function serviceWithFollowups(result: object) {
  return {
    getNoShowFollowups: vi.fn().mockResolvedValue(result),
    getNoShowContacts: vi.fn().mockResolvedValue({ status: 'empty' }),
    registerNoShowContact: vi.fn().mockResolvedValue({ status: 'empty' }),
    requestNoShowRescheduling: vi.fn().mockResolvedValue({ status: 'empty' }),
  }
}

afterEach(cleanup)

describe('NoShowsPage', () => {
  it('preserva os rótulos do index físico do módulo Faltosos', async () => {
    const service = serviceWithFollowups({ status: 'empty' })

    render(<NoShowsPage accessContext={context} service={service} />)

    expect(await screen.findByRole('heading', { name: 'Faltosos' })).toBeVisible()
    expect(
      screen.getByText(
        'Fluxo originado pela Falta registrada na agenda profissional. Não é Busca Ativa.',
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Acompanhar faltas' }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Contatos' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Motivo / providência' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Remanejamento / Remarcação' }),
    ).toBeVisible()
  })

  it('exibe o estado vazio retornado pelo contrato', async () => {
    const service = serviceWithFollowups({ status: 'empty' })

    render(<NoShowsPage accessContext={context} service={service} />)

    expect(
      await screen.findByText('Nenhum faltoso encontrado para o filtro atual.'),
    ).toBeVisible()
  })

  it('exibe erro sanitizado ao falhar a leitura', async () => {
    const service = serviceWithFollowups({
      status: 'error',
      error: new SupabaseOperationError({
        operation: 'get_no_show_followups',
        kind: 'network',
        message: 'Serviço temporariamente indisponível.',
      }),
    })

    render(<NoShowsPage accessContext={context} service={service} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Serviço temporariamente indisponível.',
    )
  })

  it('registra um contato pela operação injetada e recarrega o fluxo', async () => {
    const user = userEvent.setup()
    const service = serviceWithFollowups({
      status: 'success',
      data: [followup],
    })
    service.registerNoShowContact.mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        followup_id: 'followup-id',
        contact_id: 'contact-id',
        status: 'contatado',
        contact_attempt_registered: true,
        registered_at: '2026-09-17T12:00:00Z',
      },
    })

    render(<NoShowsPage accessContext={context} service={service} />)

    await user.click(
      await screen.findByRole('button', { name: /Paciente real/ }),
    )
    await screen.findByText('Nenhum contato registrado.')
    await user.type(screen.getByLabelText('Resultado'), 'Contato realizado')
    await user.click(
      screen.getByRole('button', { name: 'Registrar acompanhamento' }),
    )

    expect(service.registerNoShowContact).toHaveBeenCalledWith(
      expect.objectContaining({
        followupId: 'followup-id',
        contactMethod: 'phone',
        contactResult: 'Contato realizado',
        newStatus: 'contatado',
      }),
    )
    expect(
      await screen.findByText('Contato e providência registrados no CAPO.'),
    ).toBeVisible()
    expect(service.getNoShowFollowups).toHaveBeenCalledTimes(2)
  })

  it('exibe os campos administrativos preservados no histórico', async () => {
    const service = serviceWithFollowups({
      status: 'success',
      data: [followup],
    })
    service.getNoShowContacts.mockResolvedValue({
      status: 'success',
      data: [
        {
          contact_id: 'contact-id',
          followup_id: 'followup-id',
          contact_method: 'phone',
          contact_result: 'Contato realizado',
          accepted_service: false,
          next_action: 'Aguardar retorno',
          notes: 'Paciente solicitou novo contato.',
          next_contact_date: '2026-09-20',
          resulting_status: 'aguardando_retorno',
          created_at: '2026-09-17T12:00:00Z',
        },
      ],
    })

    render(<NoShowsPage accessContext={context} service={service} />)

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: /Paciente real/ }))

    expect(
      await screen.findByText('Situação registrada: aguardando_retorno'),
    ).toBeVisible()
    expect(screen.getByText('Aceitou o serviço: Não')).toBeVisible()
    expect(screen.getByText('Próxima ação: Aguardar retorno')).toBeVisible()
    expect(screen.getByText('Próximo contato: 20/09/2026')).toBeVisible()
    expect(screen.getByText('Paciente solicitou novo contato.')).toBeVisible()
  })
})
