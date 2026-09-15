import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '../../src/components/shell/AppShell'
import { HomePage } from '../../src/features/home/HomePage'
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

function renderShell(
  accessContext: AccessContext = context,
  onLogout = vi.fn().mockResolvedValue(undefined),
) {
  render(
    <AppShell accessContext={accessContext} onLogout={onLogout}>
      <HomePage accessContext={accessContext} />
    </AppShell>,
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
    expect(
      screen.queryByText('preencher_solicitacao_transporte'),
    ).not.toBeInTheDocument()
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
