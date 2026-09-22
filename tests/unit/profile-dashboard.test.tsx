import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ProfileDashboard } from '../../src/features/home/ProfileDashboard'
import type { AccessContext } from '../../src/types/access'

const context: AccessContext = {
  user_account_id: 'account-id',
  username: 'operacao.capo',
  is_active: true,
  recovery_email: null,
  professional_id: null,
  full_name: 'Operação CAPO',
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
    full_name: 'Operação CAPO',
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

describe('ProfileDashboard', () => {
  afterEach(() => cleanup())

  it('prioriza somente as ações do contexto administrativo principal', () => {
    render(
      <MemoryRouter>
        <ProfileDashboard accessContext={context} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', {
        name: 'Painel Operacional',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /Fila Operacional/ }),
    ).toHaveAttribute('href', '/fila')
    expect(
      screen.queryByRole('link', { name: /Área técnica/ }),
    ).not.toBeInTheDocument()
  })

  it('apresenta o painel de coordenação com visão gerencial e sem duplicar módulos executivos', () => {
    const coordinator = {
      ...context,
      professional_id: null,
      roles: [{ code: 'coordenador', name: 'Coordenador' }],
      primary_context: {
        ...context.primary_context,
        code: 'coordenador',
        name: 'Coordenação',
      },
    }

    const { rerender } = render(
      <MemoryRouter>
        <ProfileDashboard accessContext={context} />
      </MemoryRouter>,
    )

    rerender(
      <MemoryRouter>
        <ProfileDashboard accessContext={coordinator} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Painel da Coordenação' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /Agendas da Equipe/ }),
    ).toHaveAttribute('href', '/agenda')
    expect(
      screen.getByRole('link', { name: /Solicitações/ }),
    ).toHaveAttribute('href', '/solicitacoes')
    expect(
      screen.queryByRole('link', { name: /Área técnica/ }),
    ).not.toBeInTheDocument()
  })

  it('usa os acessos rápidos aprovados para o Gestor/Titular sem selector manual de perfil', () => {
    const gestor = {
      ...context,
      full_name: 'Daniele Gestor',
      roles: [{ code: 'administrador', name: 'Administrador' }],
      capabilities: ['preencher_solicitacao_transporte'],
      primary_context: {
        ...context.primary_context,
        code: 'administrador',
        name: 'Administrador',
      },
    }

    render(
      <MemoryRouter>
        <ProfileDashboard accessContext={gestor} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('region', {
        name: 'Acessos rápidos',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Acessos rápidos' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: /Pacientes/ }),
    ).toHaveAttribute('href', '/pacientes')
    expect(
      screen.getByRole('link', { name: /Agenda/ }),
    ).toHaveAttribute('href', '/agenda')
    expect(
      screen.getByRole('link', { name: /Faltosos/ }),
    ).toHaveAttribute('href', '/faltosos')
    expect(
      screen.getByRole('link', { name: /Solicitações/ }),
    ).toHaveAttribute('href', '/solicitacoes')
    expect(
      screen.queryByRole('link', { name: /Área técnica/ }),
    ).not.toBeInTheDocument()
  })

  it('não expõe agenda profissional no painel administrativo operacional', () => {
    render(
      <MemoryRouter>
        <ProfileDashboard accessContext={context} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('link', { name: /Agenda Geral/ }),
    ).toHaveAttribute('href', '/agenda')
    expect(
      screen.getByRole('link', { name: /Fila Operacional/ }),
    ).toHaveAttribute('href', '/fila')
    expect(
      screen.queryByRole('link', { name: /Minha Agenda/ }),
    ).not.toBeInTheDocument()
  })
})
