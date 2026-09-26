import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ProfileShortcuts } from '../../src/components/shell/ProfileShortcuts'
import type { AccessContext } from '../../src/types/access'

const context: AccessContext = {
  user_account_id: 'account-id', username: 'profissional', is_active: true,
  recovery_email: null, professional_id: 'professional-id', full_name: 'Profissional CAPO',
  function_title: null, professional_registration: null, administrative_responsibility: null,
  first_access_completed: true, must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }, { code: 'coordenador', name: 'Coordenador' }],
  capabilities: [],
  primary_context: { role_id: 'role-id', code: 'profissional', name: 'Profissional', source: 'configured', is_configured: true, requires_configuration: false },
  is_homologation_account: false,
  real_identity: { professional_id: 'professional-id', full_name: 'Profissional CAPO', function_title: null,
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { role_id: 'role-id', code: 'profissional', name: 'Profissional', source: 'configured', is_configured: true, requires_configuration: false },
  },
  homologation_context: null,
}

describe('atalhos de funções acumuladas no cabeçalho', () => {
  afterEach(() => cleanup())

  it('mostra somente rotas autorizadas e mantém o início do contexto principal', async () => {
    render(<MemoryRouter><ProfileShortcuts accessContext={context} activePath="/agenda" className="app-profile-button" profileLabel="Profissional" /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /Perfil: Profissional/ }))
    expect(screen.getByRole('link', { name: 'Coordenação' })).toHaveAttribute('href', '/coordenacao')
    expect(screen.getByRole('link', { name: /Início — contexto principal/ })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: 'Administração do Sistema' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Área Técnica' })).not.toBeInTheDocument()
  })

  it('dá à titular com função profissional autorizada atalho para a atuação sem mudar o contexto', async () => {
    const titular: AccessContext = { ...context,
      roles: [{ code: 'administrador', name: 'Administrador' }, { code: 'profissional', name: 'Profissional' }],
      primary_context: { ...context.primary_context, code: 'administrador', name: 'Administrador' },
      primary_specialty_name: 'Clínica Geral',
    }
    render(<MemoryRouter><ProfileShortcuts accessContext={titular} activePath="/" className="gestor-profile-button" profileLabel="Administrador" /></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /Perfil: Administrador/ }))
    expect(screen.getByRole('link', { name: 'Minha atuação' })).toHaveAttribute('href', '/atuacao')
    expect(screen.queryByRole('link', { name: 'Coordenação' })).not.toBeInTheDocument()
  })

  it('mostra o perfil sem link morto quando não existem funções secundárias', () => {
    render(<MemoryRouter><ProfileShortcuts accessContext={{ ...context, roles: [context.roles[0]] }} activePath="/" className="app-profile-button" profileLabel="Profissional" /></MemoryRouter>)
    expect(screen.getByText('Perfil: Profissional')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Perfil:/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Perfil:/ })).not.toBeInTheDocument()
  })
})
