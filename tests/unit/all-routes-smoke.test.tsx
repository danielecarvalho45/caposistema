import { cleanup, render, screen } from '@testing-library/react'
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
  return { ...original, getRpcService: () => new Proxy({}, {
    get: () => async () => ({ status: 'empty' }),
  }) }
})
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
})
