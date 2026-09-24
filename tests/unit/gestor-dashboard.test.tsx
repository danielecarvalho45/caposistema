import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { GestorDashboard } from '../../src/features/gestor/GestorDashboard'
import {
  GestorTeamPage,
  type TeamManagementService,
} from '../../src/features/gestor/GestorTeamPage'

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
      setSpecialtyCapability: vi.fn(),
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
})