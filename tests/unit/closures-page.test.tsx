import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('ClosuresPage', () => {
  it('carrega estado vazio e não expõe fluxos bloqueados', async () => {
    render(<ClosuresPage accessContext={context} integration={service()} />)
    expect(
      await screen.findByText('Nenhum encerramento encontrado.'),
    ).toBeVisible()
    expect(
      screen.queryByText(/encerramento global|registrar óbito|luto/i),
    ).not.toBeInTheDocument()
  })

  it('solicita encerramento e recarrega após sucesso', async () => {
    const user = userEvent.setup()
    const integration = service()
    render(<ClosuresPage accessContext={context} integration={integration} />)
    await user.type(screen.getByLabelText('ID do paciente'), 'patient-id')
    await user.type(
      screen.getByLabelText('ID da especialidade'),
      'specialty-id',
    )
    await user.type(
      screen.getByLabelText('Motivo'),
      'Encerramento assistencial',
    )
    await user.click(
      screen.getByRole('button', { name: 'Solicitar encerramento' }),
    )
    expect(integration.requestOwnClosure).toHaveBeenCalledWith(
      'patient-id',
      'specialty-id',
      'Encerramento assistencial',
    )
    expect(integration.loadClosures).toHaveBeenCalledTimes(2)
  })

  it('carrega acompanhamentos sociais', async () => {
    const user = userEvent.setup()
    const integration = service({
      loadSocial: vi.fn().mockResolvedValue({
        status: 'success',
        data: [
          {
            cycle_id: 'cycle-id',
            patient_name: 'Paciente real',
            status: 'ativo',
          },
        ],
      }),
    })
    render(<ClosuresPage accessContext={context} integration={integration} />)
    await user.click(
      screen.getByRole('button', { name: 'Acompanhamento social' }),
    )
    expect(await screen.findByText('Paciente real')).toBeVisible()
    expect(integration.loadSocial).toHaveBeenCalled()
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
    render(<ClosuresPage accessContext={context} integration={integration} />)
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
