import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClosuresPage } from '../../src/features/closures/ClosuresPage'
import type { AccessContext } from '../../src/types/access'

const context: AccessContext = {
  user_account_id: 'account-id',
  username: 'professional',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Profissional',
  function_title: 'Psicóloga',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }],
  capabilities: [],
  primary_context: {
    role_id: 'role-id',
    code: 'profissional',
    name: 'Profissional',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: 'professional-id',
    full_name: 'Profissional',
    function_title: 'Psicóloga',
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: {
      role_id: 'role-id',
      code: 'profissional',
      name: 'Profissional',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

function service(overrides = {}) {
  return {
    loadClosures: vi.fn().mockResolvedValue({ status: 'empty' }),
    requestOwnClosure: vi
      .fn()
      .mockResolvedValue({ status: 'success', data: { id: 'closure-id' } }),
    closeClosure: vi.fn(),
    assignProfessional: vi.fn(),
    loadEligibleProfessionals: vi.fn().mockResolvedValue({ status: 'empty' }),
    reopenClosure: vi.fn(),
    openReturnCycle: vi.fn(),
    startSocial: vi.fn(),
    loadSocial: vi.fn().mockResolvedValue({ status: 'empty' }),
    closeSocial: vi.fn(),
    ...overrides,
  }
}

afterEach(cleanup)

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('ClosuresPage', () => {
  it('carrega estado vazio e não expõe fluxos bloqueados', async () => {
    renderWithRouter(<ClosuresPage accessContext={context} integration={service()} />)
    expect(
      await screen.findByText('Nenhum encerramento encontrado.'),
    ).toBeVisible()
    expect(
      screen.queryByText(/encerramento global|registrar óbito|luto/i),
    ).not.toBeInTheDocument()
  })

  it('usa busca real de paciente e especialidade em vez de UUID manual', async () => {
    renderWithRouter(<ClosuresPage accessContext={context} integration={service()} />)

    expect(screen.getByLabelText('Paciente')).toHaveAttribute(
      'placeholder',
      'Nome, Nº CAPO ou CMS',
    )
    expect(screen.getByLabelText('Minha especialidade')).toBeVisible()
    expect(screen.getByLabelText('Motivo / observação')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Solicitar encerramento da própria atuação' }),
    ).toBeDisabled()
    expect(screen.queryByLabelText('ID do paciente')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('ID da especialidade')).not.toBeInTheDocument()
  })

  it('mantém acompanhamento social fora da tela de encerramentos', () => {
    const integration = service()
    renderWithRouter(<ClosuresPage accessContext={context} integration={integration} />)

    expect(
      screen.queryByRole('button', { name: 'Acompanhamento social' }),
    ).not.toBeInTheDocument()
    expect(integration.loadSocial).not.toHaveBeenCalled()
  })

  it('não expõe conclusão, atribuição ou reabertura para perfil sem gestão', async () => {
    const integration = service({
      loadClosures: vi.fn().mockResolvedValue({
        status: 'success',
        data: [
          {
            closure_id: 'closure-id',
            patient_name: 'Paciente real',
            status: 'pendente',
          },
        ],
      }),
    })
    renderWithRouter(<ClosuresPage accessContext={context} integration={integration} />)
    await screen.findByText('Paciente real')
    expect(
      screen.queryByRole('button', { name: 'Concluir encerramento' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Atribuir profissional' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Reabrir encerramento' }),
    ).not.toBeInTheDocument()
  })
})
