import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
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

    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

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

  it('distribui ocorrências em novas, pendentes e encerradas sem filtro de situação', async () => {
    const service = serviceWithFollowups({
      status: 'success',
      data: [
        followup,
        { ...followup, followup_id: 'em-contato-id', patient_name: 'Paciente em contato', active_search_status: 'em_contato' },
        { ...followup, followup_id: 'encerrado-id', patient_name: 'Paciente encerrado', active_search_status: 'encerrado' },
      ],
    })
    const user = userEvent.setup()
    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

    expect(await screen.findByText('Paciente em contato')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Acompanhamento' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Contatos' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Ocorrências novas/ })).toBeVisible()
    expect(screen.getByRole('heading', { name: /Ocorrências pendentes/ })).toBeVisible()
    expect(screen.getByRole('heading', { name: /Ocorrências encerradas/ })).toBeVisible()
    expect(screen.queryByLabelText('Situação')).not.toBeInTheDocument()
    expect(screen.getByText('Paciente encerrado')).toBeVisible()

    await user.click(screen.getByRole('link', { name: /Paciente encerrado/ }))
    expect(screen.getByRole('heading', { name: 'Acompanhamento' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Remanejamento / Remarcação' }))
    expect(screen.queryByRole('link', { name: 'Agendar' })).not.toBeInTheDocument()
    expect(service.getNoShowFollowups).toHaveBeenCalledWith(null, 100, 0)
  })

  it('ao clicar no nome abre página própria e volta para as três colunas', async () => {
    const user = userEvent.setup()
    const service = serviceWithFollowups({ status: 'success', data: [followup] })
    render(<MemoryRouter initialEntries={['/faltosos']}><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: /Ocorrências novas/ })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Acompanhamento' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Paciente real/ }))
    expect(screen.getByRole('heading', { name: 'Acompanhamento de Faltosos' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Acompanhamento' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: /Ocorrências novas/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Contatos' })).toBeVisible()

    await user.click(screen.getByRole('link', { name: 'Voltar para Faltosos' }))
    expect(await screen.findByRole('heading', { name: /Ocorrências novas/ })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Acompanhamento' })).not.toBeInTheDocument()
  })

  it('Agendar abre a Agenda Geral do profissional da falta sem criar solicitação', async () => {
    const service = serviceWithFollowups({ status: 'success', data: [followup] })
    const user = userEvent.setup()
    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)
    await user.click(await screen.findByRole('link', { name: /Paciente real/ }))
    await user.click(screen.getByRole('button', { name: 'Remanejamento / Remarcação' }))
    const action = await screen.findByRole('link', { name: 'Agendar' })
    expect(action).toHaveAttribute('href', '/agenda')
    expect(service.requestNoShowRescheduling).not.toHaveBeenCalled()
  })

  it('exibe o estado vazio retornado pelo contrato', async () => {
    const service = serviceWithFollowups({ status: 'empty' })

    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

    expect(
      await screen.findByText('Nenhuma ocorrência nova.'),
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

    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

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

    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

    await user.click(
      await screen.findByRole('link', { name: /Paciente real/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Contatos' }))
    await screen.findByText('Nenhum contato registrado.')
    await user.type(screen.getByLabelText('Resultado'), 'Contato realizado')
    await user.click(
      screen.getByRole('button', { name: 'Registrar contato' }),
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

  it('separa as quatro abas sem modificar a ocorrência selecionada', async () => {
    const user = userEvent.setup()
    const service = serviceWithFollowups({ status: 'success', data: [followup] })
    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)
    await user.click(await screen.findByRole('link', { name: /Paciente real/ }))

    expect(screen.getByRole('heading', { name: 'Acompanhamento' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Agendar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar contato' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Contatos' }))
    expect(screen.getByRole('heading', { name: 'Registrar contato' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Registrar contato' })).toBeVisible()
    expect(screen.getByLabelText('Aceitou o serviço')).toBeVisible()
    expect(screen.queryByLabelText('Próxima ação')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Motivo / providência' }))
    expect(screen.getByRole('heading', { name: 'Registrar motivo e providência' })).toBeVisible()
    expect(screen.getByLabelText('Próxima ação')).toBeVisible()
    expect(screen.getByLabelText('Observação administrativa')).toBeVisible()
    expect(screen.queryByLabelText('Aceitou o serviço')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remanejamento / Remarcação' }))
    expect(screen.getByRole('link', { name: 'Agendar' })).toHaveAttribute('href', '/agenda')
    expect(screen.queryByRole('button', { name: 'Registrar providência' })).not.toBeInTheDocument()
  })

  it('consulta histórico mas impede novas ações numa ocorrência encerrada', async () => {
    const user = userEvent.setup()
    const service = serviceWithFollowups({
      status: 'success', data: [{ ...followup, active_search_status: 'encerrado' }],
    })
    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)
    await user.click(await screen.findByRole('link', { name: /Paciente real/ }))
    await user.click(screen.getByRole('button', { name: 'Contatos' }))
    expect(screen.queryByRole('button', { name: 'Registrar contato' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remanejamento / Remarcação' }))
    expect(screen.queryByRole('link', { name: 'Agendar' })).not.toBeInTheDocument()
    expect(screen.getByText('Ocorrência encerrada. Consulte o histórico de remarcação.')).toBeVisible()
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

    render(<MemoryRouter><NoShowsPage accessContext={context} service={service} /></MemoryRouter>)

    await userEvent
      .setup()
      .click(await screen.findByRole('link', { name: /Paciente real/ }))

    await userEvent.setup().click(screen.getByRole('button', { name: 'Contatos' }))

    expect(
      await screen.findByText('Situação registrada: aguardando_retorno'),
    ).toBeVisible()
    expect(screen.getByText('Aceitou o serviço: Não')).toBeVisible()
    expect(screen.getByText('Próxima ação: Aguardar retorno')).toBeVisible()
    expect(screen.getByText('Próximo contato: 20/09/2026')).toBeVisible()
    expect(screen.getByText('Paciente solicitou novo contato.')).toBeVisible()
  })
})
