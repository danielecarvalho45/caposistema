import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../src/components/shell/AppShell'
import { ConstructionPage } from '../../src/app/App'
import { AgendaPage } from '../../src/features/agenda/AgendaPage'
import { HomePage } from '../../src/features/home/HomePage'
import { NoShowsPage } from '../../src/features/no-shows/NoShowsPage'
import { AssistentialPage } from '../../src/features/professional/AssistentialPage'
import { QueuePage } from '../../src/features/queues/QueuePage'
import { RequestsPage } from '../../src/features/requests/RequestsPage'
import { ReferralsPage } from '../../src/features/referrals/ReferralsPage'
import { TechnicalPage } from '../../src/features/technical/TechnicalPage'
import { DentistryPage } from '../../src/features/dentistry/DentistryPage'
import { NotificationsPage } from '../../src/features/notifications/NotificationsPage'
import type { AccessContext } from '../../src/types/access'

const context: AccessContext = {
  user_account_id: 'account-id',
  username: 'usuario.capo',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Nome real',
  function_title: 'Assistente administrativo',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [
    { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
  ],
  capabilities: ['preencher_solicitacao_transporte'],
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
    professional_id: 'professional-id',
    full_name: 'Nome real',
    function_title: 'Assistente administrativo',
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

const professionalContext: AccessContext = {
  ...context,
  function_title: 'Psicóloga',
  specialties: [
    { specialty_id: 'psychology-id', specialty_name: 'Psicologia', is_primary: true },
  ],
  primary_specialty_name: 'Psicologia',
  roles: [{ code: 'profissional', name: 'Profissional' }],
  primary_context: {
    ...context.primary_context,
    code: 'profissional',
    name: 'Profissional',
  },
}

const adminContext: AccessContext = {
  ...context,
  function_title: 'Administrador',
  roles: [{ code: 'administrador', name: 'Administrador' }],
  primary_context: {
    ...context.primary_context,
    code: 'administrador',
    name: 'Administrador',
  },
}

function renderShell(
  accessContext: AccessContext = context,
  onLogout = vi.fn().mockResolvedValue(undefined),
  activePath = window.location.pathname,
) {
  const content =
    activePath === '/agenda' ? (
      <AgendaPage
        accessContext={accessContext}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    ) : activePath === '/atuacao' ? (
      <AssistentialPage
        accessContext={accessContext}
        integration={{
          loadSpecialties: vi.fn().mockResolvedValue({
            status: 'success',
            data: [
              {
                specialty_id: 'specialty-id',
                specialty_name: 'Psicologia',
                is_current_context: true,
              },
            ],
          }),
          searchPatients: vi.fn().mockResolvedValue({ status: 'empty' }),
          loadAgenda: vi.fn().mockResolvedValue({ status: 'empty' }),
          loadReport: vi.fn().mockResolvedValue({
            status: 'success',
            data: {
              specialty_id: 'specialty-id',
              specialty_name: 'Psicologia',
              start_date: '2026-09-01',
              end_date: '2026-09-16',
              agenda: { agendado: 0 },
              retornos: { realizado: 0 },
              fila_especialidade: { waiting: 0 },
              solicitacoes: { pending: 0 },
              encaminhamentos: { enabled: true, pending_approval: 0 },
              encerramentos: { pendente: 0 },
            },
          }),
        }}
      />
    ) : activePath === '/fila' ? (
      <QueuePage
        accessContext={accessContext}
        loadPendingItems={async () => ({ status: 'empty' })}
      />
    ) : activePath === '/solicitacoes' ? (
      <RequestsPage
        accessContext={accessContext}
        service={{
          getAdministrativeRequests: vi
            .fn()
            .mockResolvedValue({ status: 'empty' }),
          getAdministrativeRequestEvents: vi.fn(),
          createAdministrativeRequest: vi.fn(),
          updateAdministrativeRequest: vi.fn(),
        }}
      />
    ) : activePath === '/encaminhamentos' ? (
      <ReferralsPage
        accessContext={accessContext}
        service={{
          getReferralSpecialties: vi.fn(),
          getReferralTargets: vi.fn(),
          searchReferralPatients: vi.fn(),
          getInterprofessionalReferrals: vi
            .fn()
            .mockResolvedValue({ status: 'empty' }),
          getReferralEvents: vi.fn(),
          createInterprofessionalReferral: vi.fn(),
          updateInterprofessionalReferral: vi.fn(),
        }}
      />
    ) : activePath === '/odontologia' ? (
      <DentistryPage accessContext={accessContext} />
    ) : activePath === '/notificacoes' ? (
      <NotificationsPage
        service={{
          getNotifications: vi.fn().mockResolvedValue({ status: 'empty' }),
          updateNotification: vi.fn(),
        }}
      />
    ) : activePath === '/tecnica' ? (
      <TechnicalPage
        accessContext={accessContext}
        integration={{
          loadDashboard: vi.fn().mockResolvedValue({
            status: 'success',
            data: {
              period: {
                start_at: '2026-09-09T00:00:00Z',
                end_at: '2026-09-16T23:59:59Z',
              },
              support: { pendente: 0, resolvida: 0 },
              runtime: {
                by_severity: { info: 0, error: 0 },
                by_component: [],
                by_event_code: [],
                by_result: [],
                recent_errors: [],
              },
            },
          }),
          loadSystemStatus: vi.fn().mockResolvedValue({
            status: 'success',
            data: {
              checked_at: '2026-09-16T12:00:00Z',
              components: [
                {
                  component: 'database',
                  label: 'Banco de Dados',
                  status: 'operacional',
                  verification: 'canonical_query',
                  detail: 'Consulta canônica executada.',
                  checked_at: '2026-09-16T12:00:00Z',
                },
              ],
            },
          }),
          loadIntegrations: vi.fn().mockResolvedValue({
            status: 'success',
            data: {
              inventoried_at: '2026-09-16T12:00:00Z',
              integrations: [],
            },
          }),
          loadRuntimeLogs: vi.fn().mockResolvedValue({
            status: 'success',
            data: [],
          }),
          loadSupportRequests: vi.fn().mockResolvedValue({
            status: 'success',
            data: [],
          }),
          loadSupportHistory: vi.fn(),
        }}
      />
    ) : activePath === '/em-construcao' ||
      ![
        '/',
        '/agenda',
        '/atuacao',
        '/fila',
        '/faltosos',
        '/solicitacoes',
        '/encaminhamentos',
        '/tecnica',
      ].includes(activePath) ? (
      <ConstructionPage path={activePath} />
    ) : (
      <HomePage
        accessContext={accessContext}
        loadBirthdays={async () => ({
          status: 'success',
          data: {
            reference_date: '2026-09-16',
            time_zone: 'America/Sao_Paulo',
            patients: [],
            team: [],
          },
        })}
      />
    )

  render(
    <MemoryRouter initialEntries={[activePath]}>
      <AppShell
        accessContext={accessContext}
        onLogout={onLogout}
        activePath={activePath}
      >
        {content}
      </AppShell>
    </MemoryRouter>,
  )
  return onLogout
}

describe('App', () => {
  afterEach(() => cleanup())

  it('renderiza o shell com o contexto real recebido', () => {
    renderShell()

    expect(
      screen.getByRole('heading', { name: 'Olá, Nome real' }),
    ).toBeVisible()
    expect(document.getElementById('profile-panel-title')).toHaveTextContent(
      'Painel Operacional',
    )
    expect(screen.getByRole('img', { name: /CAPO/ })).toHaveAttribute(
      'src',
      '/assets/capo-logo.jpg',
    )
    expect(screen.getByLabelText('Área de trabalho CAPO')).toHaveFocus()
    const accessSummary = screen.getByRole('region', {
      name: 'Resumo do seu contexto',
    })
    expect(
      within(accessSummary).getAllByText('Administrativo Operacional'),
    ).toHaveLength(2)
    expect(screen.getByText('1 permissão funcional reconhecida')).toBeVisible()
    expect(screen.getByText('preencher_solicitacao_transporte')).toBeVisible()
  })

  it('prioriza o primary_context real do backend para o painel inicial mesmo quando o cargo legado sugere operacional', () => {
    const adminWithLegacyOperationalRole: AccessContext = {
      ...context,
      full_name: 'Daniele Gestor',
      function_title: 'Auxiliar Administrativo',
      roles: [
        { code: 'administrador', name: 'Administrador' },
        { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
      ],
      capabilities: ['preencher_solicitacao_transporte'],
      primary_context: {
        ...context.primary_context,
        code: 'administrador',
        name: 'Administrador',
      },
    }

    render(
      <MemoryRouter>
        <HomePage
          accessContext={adminWithLegacyOperationalRole}
          loadBirthdays={async () => ({
            status: 'empty',
            data: {
              reference_date: '2026-09-16',
              time_zone: 'America/Sao_Paulo',
              patients: [],
              team: [],
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Acessos rápidos' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Painel Operacional' }),
    ).not.toBeInTheDocument()
  })

  it('carrega aniversariantes autorizados sem expor data de nascimento', async () => {
    render(
      <MemoryRouter>
        <HomePage
          accessContext={context}
          loadBirthdays={async () => ({
            status: 'success',
            data: {
              reference_date: '2026-09-16',
              time_zone: 'America/Sao_Paulo',
              patients: [
                {
                  patient_id: 'patient-id',
                  full_name: 'Paciente autorizado',
                  patient_number: 'CAPO-10',
                  cms: null,
                },
              ],
              team: [
                {
                  professional_id: 'team-id',
                  full_name: 'Integrante CAPO',
                  function_title: 'Psicóloga',
                },
              ],
            },
          })}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Paciente autorizado')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Aniversariantes de hoje' }),
    ).toBeVisible()
    expect(screen.getByText('Nº CAPO CAPO-10')).toBeVisible()
    expect(screen.getByText('Integrante CAPO')).toBeVisible()
    expect(screen.queryByText(/data de nascimento/i)).not.toBeInTheDocument()
  })

  it('não carrega aniversariantes para perfil sem autorização', () => {
    const loadBirthdays = vi.fn()
    const technicalContext: AccessContext = {
      ...context,
      roles: [{ code: 'administrador_tecnico', name: 'Administrador Técnico' }],
      primary_context: {
        ...context.primary_context,
        code: 'administrador_tecnico',
        name: 'Administrador Técnico',
      },
    }

    render(
      <MemoryRouter>
        <HomePage
          accessContext={technicalContext}
          loadBirthdays={loadBirthdays}
        />
      </MemoryRouter>,
    )

    expect(loadBirthdays).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('heading', { name: 'Aniversariantes de hoje' }),
    ).not.toBeInTheDocument()
  })

  it('exibe a agenda real para um papel autorizado', async () => {
    renderShell(
      {
        ...context,
        capabilities: [
          'agenda_transversal',
          'preencher_solicitacao_transporte',
        ],
      },
      vi.fn().mockResolvedValue(undefined),
      '/agenda',
    )

    expect(screen.getByRole('heading', { name: 'Agenda Geral' })).toBeVisible()
    expect(
      await screen.findByText('Nenhum agendamento encontrado no período.'),
    ).toBeVisible()
  })

  it('oferece somente navegação funcional e executa o logout', async () => {
    const logout = renderShell()
    const user = userEvent.setup()

    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    expect(logout).toHaveBeenCalledOnce()
  })

  it('oferece menu móvel, voltar e rodapé no shell compartilhado', async () => {
    renderShell(context, vi.fn().mockResolvedValue(undefined), '/agenda')
    const user = userEvent.setup()
    const menuButton = screen.getByRole('button', { name: 'Abrir menu' })

    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    await user.click(menuButton)
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('app-sidebar')).toHaveClass('is-open')
    expect(screen.getByRole('button', { name: '← Voltar' })).toBeVisible()
    expect(
      screen.getByText('Sistema CAPO — Gestão Administrativa e Operacional'),
    ).toBeVisible()
  })

  it('oferece agenda para o contexto administrativo', () => {
    renderShell(
      {
        ...context,
        capabilities: [
          'agenda_transversal',
          'preencher_solicitacao_transporte',
        ],
      },
      vi.fn().mockResolvedValue(undefined),
      '/agenda',
    )

    expect(screen.getByRole('heading', { name: 'Agenda Geral' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Agenda Geral' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('integra a rota de odontologia quando a capability está autorizada', () => {
    renderShell(
      {
        ...professionalContext,
        capabilities: ['emitir_encaminhamento_odontologico_externo'],
      },
      vi.fn().mockResolvedValue(undefined),
      '/odontologia',
    )

    expect(
      screen.getByRole('heading', {
        name: 'Encaminhamento odontológico externo',
      }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Odontologia' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('integra a central de notificações para o contexto autenticado', async () => {
    renderShell(context, vi.fn().mockResolvedValue(undefined), '/notificacoes')

    expect(screen.getByRole('heading', { name: 'Notificações' })).toBeVisible()
    expect(
      await screen.findByText('Nenhuma notificação encontrada.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Notificações' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('exibe a tela de construção quando a rota ainda não está disponível', () => {
    renderShell(context, vi.fn().mockResolvedValue(undefined), '/em-construcao')

    expect(screen.getByRole('heading', { name: 'Em construção' })).toBeVisible()
    expect(
      screen.getByText('Este módulo ainda não está disponível nesta etapa.'),
    ).toBeVisible()
  })

  it('oferece a área compartilhada ao profissional assistencial', async () => {
    renderShell(
      professionalContext,
      vi.fn().mockResolvedValue(undefined),
      '/atuacao',
    )

    expect(
      screen.getByRole('heading', { name: 'Minha atuação assistencial' }),
    ).toBeVisible()
    expect(await screen.findByText('Psicologia')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Minha agenda' })).toBeVisible()
    expect(
      await screen.findByText('Nenhum agendamento encontrado no período.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Minha atuação' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('integra a área técnica somente ao perfil autorizado', async () => {
    const user = userEvent.setup()
    renderShell(adminContext, vi.fn().mockResolvedValue(undefined), '/tecnica')

    expect(
      screen.getByRole('heading', { name: 'Operação e observabilidade' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Área técnica' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await screen.findByText('Chamados por situação')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Estado do sistema' }))
    expect(screen.getByText('Banco de Dados')).toBeVisible()
    expect(screen.getByText('Consulta canônica executada.')).toBeVisible()
  })

  it('oferece a fila operacional para o contexto administrativo', async () => {
    renderShell(
      {
        ...context,
        primary_context: {
          ...context.primary_context,
          code: 'administrativo_operacional',
          name: 'Administrativo Operacional',
        },
      },
      vi.fn().mockResolvedValue(undefined),
      '/fila',
    )

    expect(
      screen.getByRole('heading', { name: 'Filas, pendências e fluxos' }),
    ).toBeVisible()
    expect(
      await screen.findByText('Nenhuma pendência operacional encontrada.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Fila' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('renderiza pendências retornadas pela RPC da fila', async () => {
    render(
      <MemoryRouter>
        <QueuePage
          accessContext={context}
          loadPendingItems={async () => ({
            status: 'success',
            data: [
            {
              pending_type: 'waiting_list',
              source_table: 'waiting_list',
              source_id: 'pending-id',
              patient_id: 'patient-id',
              patient_name: 'Paciente autorizado',
              title: 'Fila de espera — Nutrição',
              status: 'waiting',
              responsible_role: 'administrativo_operacional',
              created_at: '2026-09-15T12:00:00Z',
              due_at: null,
              context_module: 'waiting_list',
              context_id: 'pending-id',
              priority: 1,
              total_count: 1,
            },
            ],
          })}
        />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Fila de espera — Nutrição')).toBeVisible()
    expect(screen.getByText('Paciente autorizado')).toBeVisible()
    expect(screen.getByText('1 pendência(s) encontrada(s)')).toBeVisible()
  })

  it('oferece ao profissional a fila da própria especialidade no contexto principal profissional', async () => {
    renderShell(
      professionalContext,
      vi.fn().mockResolvedValue(undefined),
      '/fila',
    )

    expect(
      screen.getByRole('heading', { name: 'Fila da própria especialidade' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Fila' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('preserva a fila profissional quando há função administrativa acumulada fora do contexto principal', async () => {
    renderShell(
      {
        ...professionalContext,
        roles: [
          { code: 'profissional', name: 'Profissional' },
          { code: 'administrador', name: 'Administrador' },
        ],
        primary_context: {
          ...professionalContext.primary_context,
          code: 'profissional',
          name: 'Profissional',
          source: 'configured',
          is_configured: true,
        },
      },
      vi.fn().mockResolvedValue(undefined),
      '/fila',
    )

    expect(
      screen.getByRole('heading', { name: 'Fila da própria especialidade' }),
    ).toBeVisible()
  })

  it('carrega faltosos reais e seu histórico por RPC', async () => {
    const service = {
      getNoShowFollowups: vi.fn().mockResolvedValue({
        status: 'success',
        data: [
          {
            followup_id: 'followup-id',
            appointment_id: 'appointment-id',
            patient_id: 'patient-id',
            patient_name: 'Paciente autorizado',
            patient_number: null,
            cms: '12345',
            professional_id: 'professional-id',
            professional_name: 'Profissional responsável',
            no_show_date: '2026-09-16T12:00:00Z',
            active_search_status: 'pendente',
            contact_attempts: 1,
            first_contact_at: '2026-09-16T12:30:00Z',
            last_contact_at: '2026-09-16T12:30:00Z',
            contact_result: 'Sem resposta',
            next_contact_date: null,
            rescheduling_requested: false,
            reschedule_request_id: null,
            rescheduled_appointment_id: null,
          },
        ],
      }),
      getNoShowContacts: vi.fn().mockResolvedValue({
        status: 'success',
        data: [
          {
            contact_id: 'contact-id',
            followup_id: 'followup-id',
            contact_method: 'phone',
            contact_result: 'Sem resposta',
            accepted_service: null,
            next_action: 'Tentar novamente',
            notes: null,
            next_contact_date: null,
            resulting_status: 'nao_localizado',
            created_at: '2026-09-16T12:30:00Z',
          },
        ],
      }),
      registerNoShowContact: vi.fn(),
      requestNoShowRescheduling: vi.fn(),
    }
    const user = userEvent.setup()

    render(<NoShowsPage accessContext={context} service={service} />)

    await user.click(
      await screen.findByRole('button', { name: /Paciente autorizado/ }),
    )
    expect(await screen.findByText('Histórico de contatos')).toBeVisible()
    expect(await screen.findByText('Sem resposta')).toBeVisible()
    expect(screen.getByText('Próxima ação: Tentar novamente')).toBeVisible()
    expect(service.getNoShowContacts).toHaveBeenCalledWith('followup-id')
  })

  it('não oferece Faltosos ao perfil profissional', () => {
    renderShell({
      ...context,
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: {
        ...context.primary_context,
        code: 'profissional',
        name: 'Profissional',
      },
    })

    expect(
      screen.queryByRole('link', { name: 'Faltosos' }),
    ).not.toBeInTheDocument()
  })

  it('oferece solicitações aos perfis integrados e exibe estado vazio real', async () => {
    renderShell(context, vi.fn().mockResolvedValue(undefined), '/solicitacoes')

    expect(screen.getByRole('heading', { name: 'Solicitações' })).toBeVisible()
    expect(
      await screen.findByText('Nenhuma solicitação encontrada.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Solicitações' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('oferece encaminhamentos aos perfis integrados e exibe estado vazio real', async () => {
    renderShell(
      context,
      vi.fn().mockResolvedValue(undefined),
      '/encaminhamentos',
    )

    expect(
      screen.getByRole('heading', {
        name: 'Encaminhamentos',
      }),
    ).toBeVisible()
    expect(
      await screen.findByText('Nenhum encaminhamento encontrado.'),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Encaminhamentos' }),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('envia uma nova solicitação e recarrega a lista', async () => {
    const user = userEvent.setup()
    const service = {
      getAdministrativeRequests: vi.fn().mockResolvedValueOnce({ status: 'empty' }).mockResolvedValue({ status: 'success', data: [{ request_id: 'request-id', subject: 'Transporte', status: 'pending', created_at: '2026-09-16T12:00:00Z', updated_at: '2026-09-16T12:00:00Z' }] }),
      getAdministrativeRequestEvents: vi.fn().mockResolvedValue({
        status: 'empty',
      }),
      createAdministrativeRequest: vi.fn().mockResolvedValue({
        status: 'success',
        data: {
          success: true,
          request_id: 'request-id',
          patient_id: null,
          requesting_professional_id: 'professional-id',
          status: 'pending',
          created_at: '2026-09-16T12:00:00Z',
        },
      }),
      updateAdministrativeRequest: vi.fn(),
    }

    render(<RequestsPage accessContext={{ ...context, professional_id: 'professional-id', roles: [{ code: 'profissional', name: 'Profissional' }], primary_context: { ...context.primary_context, code: 'profissional', name: 'Profissional' } }} service={service} />)

    await user.type(await screen.findByLabelText('Assunto'), 'Transporte')
    await user.type(
      screen.getByLabelText('Descrição'),
      'Solicito apoio para o deslocamento do paciente.',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar solicitação' }))

    expect(service.createAdministrativeRequest).toHaveBeenCalledWith(
      null,
      'Transporte',
      'Solicito apoio para o deslocamento do paciente.',
    )
    expect(service.getAdministrativeRequests).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Solicitação enviada ao Administrativo Operacional.',
    )
  })

  it('bloqueia solicitações fora de um contexto autorizado', () => {
    render(
      <RequestsPage
        accessContext={{
          ...context,
          professional_id: null,
          roles: [{ code: 'profissional', name: 'Profissional' }],
          primary_context: {
            ...context.primary_context,
            code: 'profissional',
            name: 'Profissional',
          },
        }}
        service={{
          getAdministrativeRequests: vi.fn(),
          getAdministrativeRequestEvents: vi.fn(),
          createAdministrativeRequest: vi.fn(),
          updateAdministrativeRequest: vi.fn(),
        }}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Solicitações indisponíveis' }),
    ).toBeVisible()
  })

  it('identifica explicitamente uma conta de homologação', () => {
    renderShell({
      ...context,
      is_homologation_account: true,
      homologation_context: {
        enabled: true,
        role_code: 'profissional',
        role_name: 'Profissional',
        professional_id: 'homologation-professional-id',
        professional_name: null,
        specialty_id: null,
        specialty_name: null,
        test_patient_id: null,
        test_patient_name: null,
        reason: 'Teste controlado',
        started_at: '2026-09-15T12:00:00Z',
      },
    })

    expect(screen.getByLabelText('Conta de homologação')).toHaveTextContent(
      'Atuação controlada como Profissional.',
    )
  })
})
