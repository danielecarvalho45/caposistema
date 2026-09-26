import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GestorDashboard } from '../../src/features/gestor/GestorDashboard'
import {
  GestorTeamPage,
  type TeamManagementService,
} from '../../src/features/gestor/GestorTeamPage'

afterEach(cleanup)

describe('GestorDashboard', () => {
  it('expõe o painel geral e os acessos estruturais do titular', () => {
    render(
      <MemoryRouter>
        <GestorDashboard />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Painel Geral do CAPO' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Equipe e Agendas/ })).toHaveAttribute('href', '/gestor/equipe')
    expect(screen.getByRole('link', { name: /Auditoria e Relatórios/ })).toHaveAttribute('href', '/gestor/auditoria')
    expect(screen.getByRole('link', { name: /TI \/ Manutenção/ })).toHaveAttribute('href', '/tecnica')
  })

  it('edita um profissional retornado pelo backend e recarrega a equipe', async () => {
    const user = userEvent.setup()
    const context = {
      professionals: [{
        professional_id: 'professional-1',
        user_account_id: 'account-1',
        full_name: 'Ana Silva',
        username: 'ana.silva',
        recovery_email: 'ana@example.com',
        function_title: 'Médica',
        is_active: true,
        is_professional: true,
        role_codes: ['medico'],
        specialty_ids: ['specialty-1'],
      }],
      roles: [{ role_code: 'medico', role_name: 'Médica' }],
      specialties: [{ specialty_id: 'specialty-1', specialty_name: 'Clínica' }],
      available_user_accounts: [{ user_account_id: 'account-1', full_name: 'Ana Silva' }],
    }
    const service: TeamManagementService = {
      getContext: vi.fn().mockResolvedValue({ status: 'success', data: context }),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
      setActive: vi.fn(),
      setPrimaryContext: vi.fn(),
      getCapabilities: vi.fn().mockResolvedValue({ status: 'success', data: { capabilities: [] } }),
      setCapability: vi.fn(),
      removeCapability: vi.fn(),
      setSpecialtyCapability: vi.fn(), getCapabilityCatalog: vi.fn().mockResolvedValue({ status: 'success', data: { capabilities: [], specialty_capabilities: [] } }),
    }

    render(<GestorTeamPage service={service} />)

    await user.click(await screen.findByRole('button', { name: /Ana Silva/ }))
    await user.clear(screen.getByLabelText('Nome completo'))
    await user.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(service.update).toHaveBeenCalledWith(
      'professional-1',
      expect.objectContaining({ fullName: 'Ana Souza' }),
    ))
    await waitFor(() => expect(service.getContext).toHaveBeenCalledTimes(2))
  })

  it('cadastra a identidade e o perfil no mesmo formulário', async () => {
    const user = userEvent.setup()
    const service: TeamManagementService = {
      getContext: vi.fn().mockResolvedValue({ status: 'success', data: {
        team: [],
        roles: [{ role_id: 'role-1', code: 'administrador', name: 'Administrador' }],
        specialties: [],
      } }),
      create: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
      update: vi.fn(), setActive: vi.fn(), setPrimaryContext: vi.fn(),
      getCapabilities: vi.fn(), setCapability: vi.fn(),
      removeCapability: vi.fn(), setSpecialtyCapability: vi.fn(), getCapabilityCatalog: vi.fn().mockResolvedValue({ status: 'success', data: { capabilities: [], specialty_capabilities: [] } }),
    }

    render(<GestorTeamPage service={service} />)
    await user.type(screen.getByLabelText('Nome completo'), 'Conta de Teste')
    await user.type(screen.getByLabelText(/^Conta de acesso/), '573829')
    await user.type(screen.getByLabelText('Usuário'), 'contateste')
    await user.type(screen.getByLabelText('E-mail de recuperação'), 'teste@exemplo.com')
    await user.type(screen.getByLabelText('Função'), 'Administração')
    await user.click(screen.getByLabelText('Perfil profissional'))
    await user.click(screen.getByLabelText('Administrador'))
    await user.click(screen.getByRole('button', { name: 'Cadastrar profissional' }))

    await waitFor(() => expect(service.create).toHaveBeenCalledWith(expect.objectContaining({
      authUserId: null, roleCodes: ['administrador'], isProfessional: false,
    }), '573829', true, ''))
  })

  it('usa qualquer especialidade ativa como principal sem uma lista fixa na tela', async () => {
    const user = userEvent.setup()
    const service: TeamManagementService = {
      getContext: vi.fn().mockResolvedValue({ status: 'success', data: {
        team: [], roles: [{ code: 'profissional', name: 'Profissional' }],
        specialties: [{ specialty_id: 'nova-especialidade', name: 'Nova Especialidade' }],
      } }),
      create: vi.fn().mockResolvedValue({ status: 'success', data: {} }),
      update: vi.fn(), setActive: vi.fn(), setPrimaryContext: vi.fn(),
      getCapabilities: vi.fn(), setCapability: vi.fn(),
      removeCapability: vi.fn(), setSpecialtyCapability: vi.fn(), getCapabilityCatalog: vi.fn().mockResolvedValue({ status: 'success', data: { capabilities: [], specialty_capabilities: [] } }),
    }
    render(<GestorTeamPage service={service} />)
    await user.type(screen.getByLabelText('Nome completo'), 'Profissional Teste')
    await user.type(screen.getByLabelText(/^Conta de acesso/), '573829')
    await user.type(screen.getByLabelText('Usuário'), 'profissionalteste')
    await user.type(screen.getByLabelText('E-mail de recuperação'), 'teste@exemplo.com')
    await user.type(screen.getByLabelText('Função'), 'Fonoaudióloga')
    await user.click(screen.getByLabelText('Profissional'))
    await user.click(screen.getByLabelText('Nova Especialidade'))
    await user.click(screen.getByRole('button', { name: 'Cadastrar profissional' }))
    await waitFor(() => expect(service.create).toHaveBeenCalledWith(expect.objectContaining({
      roleCodes: ['profissional'],
      primarySpecialtyId: 'nova-especialidade',
      specialtyIds: ['nova-especialidade'],
    }), '573829', true, ''))
  })
})
