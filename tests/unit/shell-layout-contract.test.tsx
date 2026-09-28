import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../src/components/shell/AppShell'
import { GestorShell } from '../../src/features/gestor/GestorShell'
import type { AccessContext } from '../../src/types/access'

vi.mock('../../src/lib/supabase/rpc', () => ({
  getRpcService: () => ({ getMyAccessContext: async () => ({ status: 'empty' }) }),
}))
vi.mock('../../src/features/notifications/notifications-integration', () => ({
  getNotificationsService: () => ({ getNotifications: async () => ({ status: 'empty' }) }),
}))

const professional: AccessContext = {
  user_account_id: 'account', username: 'professional', is_active: true,
  recovery_email: null, professional_id: 'professional', full_name: 'Profissional',
  function_title: null, professional_registration: null, administrative_responsibility: null,
  first_access_completed: true, must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }, { code: 'coordenador', name: 'Coordenador' }],
  primary_specialty_name: 'Clínica Geral', capabilities: [],
  primary_context: { role_id: 'role', code: 'profissional', name: 'Profissional', source: 'configured', is_configured: true, requires_configuration: false },
  real_identity: { professional_id: 'professional', full_name: 'Profissional', function_title: null,
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { role_id: 'role', code: 'profissional', name: 'Profissional', source: 'configured', is_configured: true, requires_configuration: false },
  },
  is_homologation_account: false, homologation_context: null,
}

describe('estrutura dos cabeçalhos por contexto', () => {
  afterEach(() => cleanup())

  it('mostra menu móvel, rodapé, conexão e atalho de coordenação no contexto profissional', async () => {
    render(<MemoryRouter><AppShell accessContext={professional} activePath="/agenda" onLogout={async () => {}}>
      <h1>Minha Agenda</h1>
    </AppShell></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Minha Agenda' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-controls', 'app-sidebar')
    expect(screen.getByLabelText(/Conexão/)).toBeInTheDocument()
    expect(screen.getByText(/Sistema CAPO — Gestão Administrativa e Operacional/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Perfil: Profissional/ }))
    expect(screen.getByRole('navigation', { name: 'Atalhos das funções autorizadas' }).getElementsByTagName('a')[1]).toHaveAttribute('href', '/coordenacao')
  })

  it('mostra menu móvel funcional e atalho profissional no contexto da titular', async () => {
    const titular: AccessContext = { ...professional,
      primary_context: { ...professional.primary_context, code: 'administrador', name: 'Administrador' },
      roles: [{ code: 'administrador', name: 'Administrador' }, { code: 'profissional', name: 'Profissional' }],
    }
    render(<MemoryRouter><GestorShell accessContext={titular} activePath="/" onLogout={async () => {}}>
      <h1>Início</h1>
    </GestorShell></MemoryRouter>)
    const menu = screen.getByRole('button', { name: 'Abrir menu' })
    expect(menu).toHaveAttribute('aria-controls', 'gestor-sidebar')
    await userEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('button', { name: 'Fechar menu' })).toHaveLength(2)
    expect(screen.getByLabelText(/Conexão/)).toBeInTheDocument()
    expect(screen.getByText(/Sistema CAPO — Gestão Administrativa e Operacional/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Perfil: Administrador/ }))
    expect(screen.getByRole('link', { name: 'Minha Agenda' })).toHaveAttribute('href', '/agenda')
    expect(screen.queryByRole('link', { name: 'Nutrição' })).not.toBeInTheDocument()
  })
})
