import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GestorTeamPage, type TeamManagementService } from '../../src/features/gestor/GestorTeamPage'

describe('GestorTeamPage', () => {
  afterEach(cleanup)
  it('permite inativar o cadastro antigo mesmo sem conta de acesso', async () => {
    const success = async () => ({ status: 'success' as const, data: [] })
    const setActive = vi.fn(success)
    const service: TeamManagementService = {
      getContext: async () => ({ status: 'success', data: { team: [{
        professional_id: 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
        full_name: 'Profissional cadastrado', username: 'profissional.cadastrado',
        function_title: 'Atendimento', status: 'ativo',
      }], roles: [], specialties: [] } }),
      create: success, update: success, getCapabilities: success, setActive,
      setPrimaryContext: success, setCapability: success, removeCapability: success,
      setSpecialtyCapability: success,
    }
    render(<GestorTeamPage service={service} />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional cadastrado/ }))
    fireEvent.change(screen.getByPlaceholderText('Informe pelo menos 5 caracteres para inativar'), {
      target: { value: 'Fim do vínculo' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Inativar cadastro' }))
    await waitFor(() => expect(setActive).toHaveBeenCalledWith(
      'c9496e0b-6735-499a-b756-ea2cdd8ba6c0', false, 'Fim do vínculo',
    ))
  })

  it('vincula uma conta ao profissional já cadastrado sem criar outro perfil', async () => {
    const create = vi.fn(async () => ({ status: 'success' as const, data: { success: true } }))
    const getContext = vi.fn(async () => ({ status: 'success' as const, data: {
      team: [{ professional_id: 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
        full_name: 'Profissional cadastrado', username: 'profissional.cadastrado',
        function_title: 'Atendimento', status: 'ativo', is_professional: true,
        specialties: [{ specialty_id: '9e3db4d4-175f-4d11-bcf7-908f599eb966', name: 'Área assistencial' }] }],
      roles: [{ code: 'profissional', name: 'Profissional' }],
      specialties: [{ specialty_id: '9e3db4d4-175f-4d11-bcf7-908f599eb966', name: 'Área assistencial' }],
    } }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext, create, getCapabilities: success, update: success, setActive: success,
      setPrimaryContext: success, setCapability: success, removeCapability: success,
      setSpecialtyCapability: success,
    }
    render(<GestorTeamPage service={service} />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional cadastrado/ }))
    fireEvent.change(screen.getByLabelText('E-mail de recuperação'), { target: { value: 'pessoa@exemplo.org' } })
    fireEvent.change(screen.getByLabelText(/Conta de acesso: senha provisória/), { target: { value: '247985' } })
    fireEvent.click(screen.getByLabelText('Profissional'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso e salvar perfil' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'profissional.cadastrado', recoveryEmail: 'pessoa@exemplo.org' }),
      '247985', true, '', 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
    ))
  })

  it('mostra ativos inicialmente e permite localizar e inativar uma conta vinculada', async () => {
    const getContext = vi.fn(async (_query: string | null, status: string | null) => ({
      status: 'success' as const,
      data: {
        team: status === 'inativo' ? [] : [{
          professional_id: 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
          user_account_id: '76898c6a-90fc-4300-ac09-f5430814eaea',
          full_name: 'Profissional cadastrado',
          username: 'profissional.cadastrado',
          recovery_email: 'profissional@exemplo.org',
          function_title: 'Atendimento',
          status: 'ativo',
          is_professional: false,
          roles: [{ code: 'profissional' }],
          specialties: [],
        }],
        roles: [{ code: 'profissional', name: 'Profissional' }],
        specialties: [],
      },
    }))
    const setActive = vi.fn(async () => ({ status: 'success' as const, data: { success: true } }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext, setActive, getCapabilities: success,
      create: success, update: success, setPrimaryContext: success,
      setCapability: success, removeCapability: success, setSpecialtyCapability: success,
    }
    render(<GestorTeamPage service={service} />)
    expect(await screen.findByText('Profissional cadastrado')).toBeInTheDocument()
    expect(getContext).toHaveBeenCalledWith(null, 'ativo', 50, 0)
    fireEvent.click(screen.getByRole('button', { name: /Profissional cadastrado/ }))
    fireEvent.change(screen.getByPlaceholderText('Informe pelo menos 5 caracteres para inativar'), {
      target: { value: 'Deixou a equipe' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Inativar profissional e acesso' }))
    await waitFor(() => expect(setActive).toHaveBeenCalledWith(
      'c9496e0b-6735-499a-b756-ea2cdd8ba6c0', false, 'Deixou a equipe',
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Buscar profissionais inativos' }))
    await waitFor(() => expect(getContext).toHaveBeenCalledWith(null, 'inativo', 50, 0))
  })
})
