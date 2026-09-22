import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SocialPage } from '../../src/features/social/SocialPage'
import type { AccessContext } from '../../src/types/access'

const accessContext: AccessContext = {
  user_account_id: 'account-id',
  username: 'assistencia.social',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-1',
  full_name: 'Profissional autorizado',
  function_title: 'Assistência Social',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }],
  capabilities: [],
  primary_context: {
    role_id: 'role-id',
    code: 'profissional',
    name: 'Assistência Social',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: 'professional-1',
    full_name: 'Profissional autorizado',
    function_title: 'Assistência Social',
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: {
      role_id: 'role-id',
      code: 'profissional',
      name: 'Assistência Social',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

describe('SocialPage', () => {
  it('preserva os nomes canônicos e os acessos rápidos do index', () => {
    render(<SocialPage accessContext={accessContext} />)

    const headings = screen.getAllByRole('heading', {
      name: 'Acompanhamento Social no Serviço CAPO',
    })

    expect(headings).toHaveLength(2)
    headings.forEach((heading) => expect(heading).toBeVisible())
    expect(
      screen.getByRole('link', { name: /Minha Agenda/i }),
    ).toHaveAttribute('href', '#agenda')
    expect(
      screen.getByRole('link', { name: /Familiar \/ Cuidador/i }),
    ).toHaveAttribute('href', '/familiar-cuidador')
    expect(screen.getByText('Faltosos seguem fluxo próprio')).toBeVisible()
  })

  it('expõe Luto e Registro Autorizado de Óbito com os nomes do index', () => {
    render(<SocialPage accessContext={accessContext} />)

    expect(screen.getAllByRole('heading', { name: 'Luto' }).length).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('heading', {
        name: 'Registro Autorizado de Óbito',
      }).length,
    ).toBeGreaterThan(0)
  })
})
