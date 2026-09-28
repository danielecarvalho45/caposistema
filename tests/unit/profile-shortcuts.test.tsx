import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ProfileShortcuts } from '../../src/components/shell/ProfileShortcuts'
import { getProfileShortcuts } from '../../src/components/shell/profile-shortcuts'
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
    expect(screen.getByRole('link', { name: 'Minha Agenda' })).toHaveAttribute('href', '/atuacao')
    expect(screen.queryByRole('link', { name: 'Coordenação' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Nutrição' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Assistência Social' })).not.toBeInTheDocument()
  })

  it('mostra o perfil sem link morto quando não existem funções secundárias', () => {
    render(<MemoryRouter><ProfileShortcuts accessContext={{ ...context, roles: [context.roles[0]] }} activePath="/" className="app-profile-button" profileLabel="Profissional" /></MemoryRouter>)
    expect(screen.getByText('Perfil: Profissional')).toBeVisible()
    expect(screen.queryByRole('button', { name: /Perfil:/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Perfil:/ })).not.toBeInTheDocument()
  })

  it.each([
    ['administrador', '/gestor/administracao', 'Administração do Sistema'],
    ['coordenador', '/coordenacao', 'Coordenação'],
    ['administrativo_operacional', '/fila', 'Administrativo Operacional'],
    ['administrador_tecnico', '/tecnica', 'Área Técnica'],
  ])('oferece a função secundária %s somente quando seu papel está vinculado', (secondaryRole, path, label) => {
    const base: AccessContext = { ...context, roles: [{ code: 'profissional', name: 'Profissional' }] }
    const withRole: AccessContext = { ...base, roles: [...base.roles, { code: secondaryRole, name: label }] }
    expect(getProfileShortcuts(base)).not.toContainEqual({ path, label })
    expect(getProfileShortcuts(withRole)).toContainEqual({ path, label })
  })

  it.each([
    ['Clínica Geral', '/agenda', 'Minha Agenda'],
    ['Psicologia', '/agenda', 'Minha Agenda'],
    ['Fonoaudiologia', '/atuacao', 'Minha atuação'],
    ['Nutrição', '/nutricao', 'Nutrição'],
    ['Assistência Social', '/assistencia-social', 'Assistência Social'],
  ])('respeita a especialidade profissional secundária %s', (specialty, path, label) => {
    const combined: AccessContext = {
      ...context,
      primary_context: { ...context.primary_context, code: 'coordenador', name: 'Coordenação' },
      primary_specialty_name: specialty,
    }
    expect(getProfileShortcuts(combined)).toContainEqual({ path, label })
    const noProfessional: AccessContext = { ...combined, roles: [{ code: 'coordenador', name: 'Coordenador' }] }
    expect(getProfileShortcuts(noProfessional)).not.toContainEqual({ path, label })
  })

  it('não concede atuação profissional sem vínculo profissional ativo no contexto', () => {
    const withoutProfessional: AccessContext = {
      ...context,
      professional_id: null,
      primary_context: { ...context.primary_context, code: 'administrador', name: 'Administrador' },
      roles: [{ code: 'administrador', name: 'Administrador' }, { code: 'profissional', name: 'Profissional' }],
    }
    expect(getProfileShortcuts(withoutProfessional)).toEqual([])
  })

  it('navega para a função e fecha o menu mantendo o contexto principal', async () => {
    function Path() { return <output data-testid="path">{useLocation().pathname}</output> }
    render(<MemoryRouter initialEntries={['/agenda']}>
      <ProfileShortcuts accessContext={context} activePath="/agenda" className="app-profile-button" profileLabel="Profissional" />
      <Path />
    </MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: /Perfil: Profissional/ }))
    expect(screen.getByRole('button', { name: /Perfil: Profissional/ })).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('link', { name: 'Coordenação' }))
    expect(screen.getByTestId('path')).toHaveTextContent('/coordenacao')
    expect(screen.queryByRole('link', { name: 'Coordenação' })).not.toBeInTheDocument()
  })

  it('usa o mesmo botão Perfil para todos os contextos de homologação, sem Gestor Titular', async () => {
    const homologationContext: AccessContext = {
      ...context,
      username: 'manuteste',
      professional_id: null,
      full_name: null,
      roles: [{ code: 'administrador_tecnico', name: 'Administrador Técnico' }],
      primary_context: {
        role_id: 'technical-role',
        code: 'administrador_tecnico',
        name: 'Administrador Técnico',
        source: 'configured',
        is_configured: true,
        requires_configuration: false,
      },
      is_homologation_account: true,
      real_identity: {
        professional_id: null,
        full_name: null,
        function_title: null,
        roles: [{ code: 'administrador_tecnico', name: 'Administrador Técnico' }],
        primary_context: {
          role_id: 'technical-role',
          code: 'administrador_tecnico',
          name: 'Administrador Técnico',
          source: 'configured',
          is_configured: true,
          requires_configuration: false,
        },
      },
      homologation_context: {
        enabled: false,
        role_code: null,
        role_name: null,
        professional_id: null,
        professional_name: null,
        specialty_id: null,
        specialty_name: null,
        test_patient_id: null,
        test_patient_name: null,
        reason: null,
        started_at: null,
      },
    }
    const homologationService = {
      getHomologationOptions: async () => ({
        status: 'success' as const,
        data: { roles: [], professionals: [], specialties: [] },
      }),
      setHomologationContext: async () => ({
        status: 'success' as const,
        data: {},
      }),
      clearHomologationContext: async () => ({
        status: 'success' as const,
        data: {},
      }),
    }

    render(
      <MemoryRouter>
        <ProfileShortcuts
          accessContext={homologationContext}
          activePath="/"
          className="app-profile-button"
          profileLabel="Administrador Técnico"
          homologationService={homologationService}
        />
      </MemoryRouter>,
    )

    await userEvent.click(screen.getByRole('button', { name: /Perfil: Administrador Técnico/ }))

    expect(screen.getByRole('button', { name: /TI \/ Manutenção/ })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Coordenador' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Administrativo Operacional' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Médico Clínico Geral' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Nutrição' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Assistência Social' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Psicologia' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fisioterapia' })).toBeVisible()
    expect(screen.queryByText(/Gestor/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Titular/i)).not.toBeInTheDocument()
  })

})
