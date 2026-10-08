import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../../src/app/App'
import { canAccessAppRoute, KNOWN_APP_ROUTES } from '../../src/app/route-access'
import type { AccessContext } from '../../src/types/access'

const access = vi.hoisted(() => ({ current: null as AccessContext | null }))
vi.mock('../../src/features/access/access-context', () => ({
  useAccessFlow: () => ({ accessContext: access.current, logout: async () => {} }),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/lib/supabase/rpc')>()
  const empty = async () => ({ status: 'empty' })
  const service = new Proxy({}, {
    get: (_target, key) => key === 'getMyAssistentialSpecialties'
      ? async () => ({ status: 'success', data: (access.current?.specialties?.length
        ? access.current.specialties
        : access.current?.primary_specialty_name
          ? [{ specialty_id: 'selected-specialty', specialty_name: access.current.primary_specialty_name }]
          : []).map(({ specialty_id, specialty_name }) => ({ specialty_id, specialty_name, is_current_context: true })) })
      : empty,
  })
  return { ...original, getRpcService: () => service }
})
vi.mock('../../src/features/closures/closures-integration', () => ({
  createClosuresIntegration: () => new Proxy({}, {
    get: () => async () => ({ status: 'empty' }),
  }),
}))
vi.mock('../../src/features/notifications/notifications-integration', () => ({
  getNotificationsService: () => new Proxy({}, {
    get: () => async () => ({ status: 'empty' }),
  }),
}))

const admin: AccessContext = {
  user_account_id: 'account', username: 'user', is_active: true,
  recovery_email: null, professional_id: 'professional', full_name: 'Titular',
  function_title: null, professional_registration: null, administrative_responsibility: null,
  first_access_completed: true, must_change_password: false,
  roles: [{ code: 'administrador', name: 'Administrador' }, { code: 'profissional', name: 'Profissional' }],
  primary_specialty_name: 'Clínica Geral',
  specialties: [
    { specialty_id: 'one', specialty_name: 'Nutrição', is_primary: false },
    { specialty_id: 'two', specialty_name: 'Assistência Social', is_primary: false },
  ],
  capabilities: ['renovacao_receita', 'preencher_solicitacao_transporte', 'emitir_encaminhamento_odontologico_externo'],
  primary_context: { role_id: 'role', code: 'administrador', name: 'Administrador', source: 'configured', is_configured: true, requires_configuration: false },
  real_identity: { professional_id: 'professional', full_name: 'Titular', function_title: null,
    roles: [{ code: 'administrador', name: 'Administrador' }],
    primary_context: { role_id: 'role', code: 'administrador', name: 'Administrador', source: 'configured', is_configured: true, requires_configuration: false },
  },
  is_homologation_account: false, homologation_context: null,
}

describe('montagem interna das rotas físicas sem dados operacionais', () => {
  afterEach(() => cleanup())

  it.each(KNOWN_APP_ROUTES.filter((route) => route !== '/em-construcao'))('abre %s sem tela de rota morta', (route) => {
    access.current = admin
    expect(canAccessAppRoute(admin, route)).toBe(true)
    render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
    expect(screen.queryByRole('heading', { name: 'Em construção' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Área não autorizada' })).not.toBeInTheDocument()
    expect(screen.getByRole('main', { name: 'Ambiente do Administrador do Sistema' })).toBeInTheDocument()
  })

  it.each([
    ['coordenador', null],
    ['administrativo_operacional', null],
    ['profissional', 'Clínica Geral'],
    ['profissional', 'Psicologia'],
    ['profissional', 'Fonoaudiologia'],
    ['profissional', 'Nutrição'],
    ['profissional', 'Assistência Social'],
    ['administrador_tecnico', null],
  ])('abre o início para %s / %s', (code, specialty) => {
    access.current = {
      ...admin,
      professional_id: code === 'profissional' ? 'professional' : null,
      roles: [{ code, name: code }],
      primary_context: { ...admin.primary_context, code, name: code },
      primary_specialty_name: specialty,
      specialties: [],
    }
    render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(screen.queryByRole('heading', { name: 'Em construção' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Área não autorizada' })).not.toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it.each([
    ['administrativo_operacional', null, 'Painel Operacional'],
    ['administrador_tecnico', null, 'Painel Técnico'],
  ])('exibe o painel do contexto %s no início', (code, specialty, title) => {
    access.current = { ...admin,
      professional_id: null, specialties: [], primary_specialty_name: specialty,
      roles: [{ code, name: code }], primary_context: { ...admin.primary_context, code, name: code },
    }
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(within(screen.getByRole('main')).getAllByRole('heading', { name: title })[0]).toBeVisible()
  })

  it('prioriza agenda antes dos aniversariantes na Nutrição', async () => {
    access.current = { ...admin,
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: { ...admin.primary_context, code: 'profissional', name: 'Profissional' },
      primary_specialty_name: 'Nutrição', specialties: [{ specialty_id: 'nutrition', specialty_name: 'Nutrição', is_primary: true }],
    }
    const { container } = render(<MemoryRouter><App /></MemoryRouter>)
    const agenda = await screen.findByRole('heading', { name: 'Minha Agenda' })
    const birthdays = screen.getByRole('heading', { name: 'Aniversariantes de hoje' })
    expect(agenda.compareDocumentPosition(birthdays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('.home-profile-grid')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Plano Alimentar e PDF oficial' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Solicitar manutenção/ })).toHaveAttribute('href', '/suporte')
  })

  it('mantém a Home Social restrita ao painel inicial', async () => {
    access.current = { ...admin,
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: { ...admin.primary_context, code: 'profissional', name: 'Profissional' },
      primary_specialty_name: 'Assistência Social', specialties: [{ specialty_id: 'social', specialty_name: 'Assistência Social', is_primary: true }],
    }
    const { container } = render(<MemoryRouter><App /></MemoryRouter>)
    const agenda = await screen.findByRole('heading', { name: 'Minha Agenda' })
    const birthdays = screen.getByRole('heading', { name: 'Aniversariantes de hoje' })
    const followup = container.querySelector('#acompanhamento-social')
    expect(agenda.compareDocumentPosition(birthdays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(followup).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Familiar \/ Cuidador/ }).some((link) => link.getAttribute('href') === '/familiar-cuidador')).toBe(true)
    expect(screen.getByRole('link', { name: /Solicitar manutenção/ })).toHaveAttribute('href', '/suporte')
  })

  it('mantém a Home assistencial sem relatórios e blocos operacionais extensos', async () => {
    access.current = { ...admin,
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: { ...admin.primary_context, code: 'profissional', name: 'Profissional' },
      primary_specialty_name: 'Fisioterapia', specialties: [{ specialty_id: 'physio', specialty_name: 'Fisioterapia', is_primary: true }],
    }
    render(<MemoryRouter><App /></MemoryRouter>)
    await screen.findByRole('heading', { name: 'Minha agenda' })
    expect(screen.queryByRole('heading', { name: 'Resumo operacional' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Registros clínicos continuam nos fluxos próprios/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Solicitar manutenção/ })).toHaveAttribute('href', '/suporte')
  })

  it('organiza equipe, agendas e aniversariantes na Coordenação', () => {
    access.current = { ...admin,
      professional_id: null, specialties: [], primary_specialty_name: null,
      roles: [{ code: 'coordenador', name: 'Coordenador' }],
      primary_context: { ...admin.primary_context, code: 'coordenador', name: 'Coordenador' },
    }
    render(<MemoryRouter><App /></MemoryRouter>)
    const main = screen.getByRole('main')
    const team = within(main).getByRole('heading', { name: 'Equipe e Profissionais' })
    const agenda = within(main).getByRole('heading', { name: 'Agendas da Equipe' })
    const birthdays = within(main).getByRole('heading', { name: 'Aniversariantes de hoje' })
    expect(team.compareDocumentPosition(agenda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(agenda.compareDocumentPosition(birthdays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(main).getByRole('heading', { name: 'Solicitações de alteração de agenda' })).toBeVisible()
    expect(within(main).queryByRole('heading', { name: 'Registrar decisão da equipe' })).not.toBeInTheDocument()
  })
})
