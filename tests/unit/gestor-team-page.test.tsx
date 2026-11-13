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
      setSpecialtyCapability: success, getCapabilityCatalog: success,
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

  it('salva alterações de profissional sem conta sem tentar criar acesso', async () => {
    const update = vi.fn(async () => ({ status: 'success' as const, data: { success: true } }))
    const create = vi.fn(async () => ({ status: 'success' as const, data: { success: true } }))
    const getContext = vi.fn(async () => ({ status: 'success' as const, data: {
      team: [{ professional_id: 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
        full_name: 'Profissional cadastrado', username: 'profissional.cadastrado',
        recovery_email: 'profissional@exemplo.org', function_title: 'Atendimento',
        status: 'ativo', is_professional: true,
        specialties: [{ specialty_id: '9e3db4d4-175f-4d11-bcf7-908f599eb966', name: 'Área assistencial' }] }],
      roles: [{ code: 'profissional', name: 'Profissional' }],
      specialties: [{ specialty_id: '9e3db4d4-175f-4d11-bcf7-908f599eb966', name: 'Área assistencial' }],
    } }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext, create, update, getCapabilities: success, setActive: success,
      setPrimaryContext: success, setCapability: success, removeCapability: success,
      setSpecialtyCapability: success, getCapabilityCatalog: success,
    }
    render(<GestorTeamPage service={service} />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional cadastrado/ }))
    fireEvent.change(screen.getByLabelText('Função'), { target: { value: 'Atendimento atualizado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(update).toHaveBeenCalledWith(
      'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
      expect.objectContaining({ functionTitle: 'Atendimento atualizado' }),
    ))
    expect(create).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Cadastro do profissional atualizado.')
  })

  it('cadastra novo profissional com conta, papel e especialidade', async () => {
    const create = vi.fn(async () => ({ status: 'success' as const, data: { success: true } }))
    const getContext = vi.fn(async () => ({ status: 'success' as const, data: {
      team: [],
      roles: [{ code: 'profissional', name: 'Profissional' }],
      specialties: [{ specialty_id: '9e3db4d4-175f-4d11-bcf7-908f599eb966', name: 'Área assistencial' }],
    } }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext, create, update: success, getCapabilities: success, setActive: success,
      setPrimaryContext: success, setCapability: success, removeCapability: success,
      setSpecialtyCapability: success, getCapabilityCatalog: success,
    }
    render(<GestorTeamPage service={service} />)
    await screen.findByRole('button', { name: 'Novo profissional' })
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Novo Profissional' } })
    fireEvent.change(screen.getByLabelText('Função'), { target: { value: 'Atendimento' } })
    fireEvent.change(screen.getByLabelText('Usuário'), { target: { value: 'novo.profissional' } })
    fireEvent.change(screen.getByLabelText('E-mail de recuperação'), { target: { value: 'novo@exemplo.org' } })
    fireEvent.change(screen.getByLabelText(/Conta de acesso: senha provisória/), { target: { value: 'Capo2026' } })
    fireEvent.click(screen.getByLabelText('Profissional'))
    fireEvent.click(screen.getByLabelText('Área assistencial'))
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar profissional' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Novo Profissional',
        username: 'novo.profissional',
        recoveryEmail: 'novo@exemplo.org',
        roleCodes: ['profissional'],
        specialtyIds: ['9e3db4d4-175f-4d11-bcf7-908f599eb966'],
      }),
      'Capo2026', true, '',
    ))
    expect(await screen.findByRole('status')).toHaveTextContent('Profissional cadastrado com conta de acesso criada.')
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
      setSpecialtyCapability: success, getCapabilityCatalog: success,
    }
    render(<GestorTeamPage service={service} />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional cadastrado/ }))
    fireEvent.change(screen.getByLabelText('E-mail de recuperação'), { target: { value: 'pessoa@exemplo.org' } })
    fireEvent.change(screen.getByLabelText(/Conta de acesso: senha provisória/), { target: { value: 'Capo2026' } })
    fireEvent.click(screen.getByLabelText('Profissional'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }))
    await waitFor(() => expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'profissional.cadastrado', recoveryEmail: 'pessoa@exemplo.org' }),
      'Capo2026', true, '', 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0',
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
      setCapability: success, removeCapability: success, setSpecialtyCapability: success, getCapabilityCatalog: success,
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


  it('reflete a capacidade individual quando o backend retorna códigos escalares', async () => {
    const professionalId = '67f1f8fb-cc4e-45be-a567-828186d56f76'
    const getContext = vi.fn(async () => ({
      status: 'success' as const,
      data: {
        team: [{
          professional_id: professionalId,
          user_account_id: 'account-id',
          full_name: 'Profissional clínico',
          username: 'profissional.clinico',
          recovery_email: 'clinico@exemplo.org',
          function_title: 'Médico Clínico',
          status: 'ativo',
          is_professional: true,
          roles: [{ code: 'profissional' }],
          specialties: [{ specialty_id: 'clinica-id', specialty_name: 'Clínica Geral' }],
        }],
        roles: [{ code: 'profissional', name: 'Profissional' }],
        specialties: [{ specialty_id: 'clinica-id', name: 'Clínica Geral' }],
      },
    }))
    const getCapabilities = vi.fn()
      .mockResolvedValueOnce({ status: 'success' as const, data: [] })
      .mockResolvedValue({ status: 'success' as const, data: ['encaminhamento_interprofissional'] })
    const setCapability = vi.fn(async () => ({ status: 'success' as const, data: { success: true } }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext,
      create: success,
      update: success,
      setActive: success,
      setPrimaryContext: success,
      getCapabilities,
      setCapability,
      removeCapability: success,
      setSpecialtyCapability: success,
      getCapabilityCatalog: async () => ({
        status: 'success' as const,
        data: {
          capabilities: [{
            capability_code: 'encaminhamento_interprofissional',
            individual_assignable: true,
          }],
          specialty_capabilities: [],
        },
      }),
    }

    render(<GestorTeamPage service={service} mode="administracao" />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional clínico/ }))

    const capability = await screen.findByRole('checkbox', {
      name: 'Autorizar Encaminhamento Interprofissional',
    })
    await waitFor(() => expect(capability).toBeEnabled())
    expect(capability).not.toBeChecked()

    fireEvent.click(capability)

    await waitFor(() =>
      expect(setCapability).toHaveBeenCalledWith(
        professionalId,
        'encaminhamento_interprofissional',
        true,
      ),
    )
    await waitFor(() => expect(capability).toBeChecked())
  })
  it('carrega permissões salvas no banco e só altera estado após confirmação', async () => {
    const id = '67f1f8fb-cc4e-45be-a567-828186d56f76'
    const getContext = vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        team: [{ professional_id: id, user_account_id: 'account-id', full_name: 'Profissional clínico',
          username: 'profissional.clinico', function_title: 'Clínico Geral', status: 'ativo',
          is_professional: true, roles: [{ code: 'profissional' }], specialties: [] }],
        roles: [{ code: 'profissional', name: 'Profissional' }],
        specialties: [],
      },
    })
    const getCapabilities = vi.fn()
      .mockResolvedValueOnce({ status: 'success', data: { items: [
        { capability_code: 'encaminhamento_interprofissional', is_enabled: true },
      ] } })
      .mockResolvedValue({ status: 'success', data: { items: [
        { capability_code: 'encaminhamento_interprofissional', is_enabled: false },
      ] } })
    const success = async () => ({ status: 'success' as const, data: { success: true } })
    const setCapability = vi.fn(success)
    const service: TeamManagementService = {
      getContext, create: success, update: success, setActive: success,
      setPrimaryContext: success, getCapabilities, setCapability,
      removeCapability: success, setSpecialtyCapability: success,
      getCapabilityCatalog: async () => ({ status: 'success', data: {
        capabilities: [{ capability_code: 'encaminhamento_interprofissional', individual_assignable: true }],
        specialty_capabilities: [],
      } }),
    }
    render(<GestorTeamPage service={service} mode="administracao" />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional clínico/ }))
    const checkbox = await screen.findByRole('checkbox', { name: 'Autorizar Encaminhamento Interprofissional' })
    await waitFor(() => expect(checkbox).toBeChecked())
    fireEvent.click(checkbox)
    await waitFor(() => expect(setCapability).toHaveBeenCalledWith(id, 'encaminhamento_interprofissional', false))
    await waitFor(() => expect(checkbox).not.toBeChecked())
    expect(screen.getByText('Permissão salva e conferida no banco.')).toBeInTheDocument()
  })

  it('reconsulta permissões ao voltar ao cadastro do mesmo profissional', async () => {
    const firstId = '67f1f8fb-cc4e-45be-a567-828186d56f76'
    const secondId = 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0'
    const getContext = vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        team: [firstId, secondId].map((id, i) => ({
          professional_id: id, user_account_id: `account-${i}`,
          full_name: i === 0 ? 'Profissional A' : 'Profissional B',
          function_title: 'Atendimento', status: 'ativo', is_professional: true,
          roles: [{ code: 'profissional' }], specialties: [],
        })),
        roles: [{ code: 'profissional', name: 'Profissional' }],
        specialties: [],
      },
    })
    const getCapabilities = vi.fn(async (id: string) => ({
      status: 'success' as const,
      data: { items: id === firstId
        ? [{ capability_code: 'encaminhamento_interprofissional', is_enabled: true }]
        : [] },
    }))
    const success = async () => ({ status: 'success' as const, data: { success: true } })
    const service: TeamManagementService = {
      getContext, create: success, update: success, setActive: success,
      setPrimaryContext: success, getCapabilities, setCapability: success,
      removeCapability: success, setSpecialtyCapability: success,
      getCapabilityCatalog: async () => ({
        status: 'success' as const,
        data: { capabilities: [{
          capability_code: 'encaminhamento_interprofissional',
          individual_assignable: true,
        }], specialty_capabilities: [] },
      }),
    }
    render(<GestorTeamPage service={service} mode="administracao" />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional A/ }))
    const capability = await screen.findByRole('checkbox', { name: 'Autorizar Encaminhamento Interprofissional' })
    await waitFor(() => expect(capability).toBeChecked())
    fireEvent.click(screen.getByRole('button', { name: /Profissional B/ }))
    await waitFor(() => expect(capability).not.toBeChecked())
    fireEvent.click(screen.getByRole('button', { name: /Profissional A/ }))
    await waitFor(() => expect(capability).toBeChecked())
    expect(getCapabilities).toHaveBeenCalledWith(firstId)
    expect(getCapabilities).toHaveBeenCalledTimes(3)
  })

  it('mostra o contexto principal existente e salva o novo código de papel sem perder a seleção', async () => {
    const getContext = vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        team: [{ professional_id: 'professional-id', user_account_id: 'account-id', full_name: 'Profissional duplo',
          username: 'profissional.duplo', function_title: 'Administração', status: 'ativo',
          is_professional: false, roles: [{ code: 'profissional' }, { code: 'administrativo_operacional' }],
          primary_context: { code: 'profissional', name: 'Profissional' }, specialties: [] }],
        roles: [{ code: 'profissional', name: 'Profissional' },
          { code: 'administrativo_operacional', name: 'Administrativo Operacional' }],
        specialties: [],
      },
    })
    const setPrimaryContext = vi.fn().mockResolvedValue({ status: 'success', data: {
      success: true, primary_context: { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
    } })
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext, create: success, update: success, setActive: success,
      setPrimaryContext, getCapabilities: success, setCapability: success,
      removeCapability: success, setSpecialtyCapability: success,
      getCapabilityCatalog: success,
    }
    render(<GestorTeamPage service={service} mode="administracao" />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional duplo/ }))
    const select = screen.getByLabelText('Contexto principal')
    expect(select).toHaveValue('profissional')
    fireEvent.change(select, { target: { value: 'administrativo_operacional' } })
    await waitFor(() => expect(setPrimaryContext).toHaveBeenCalledWith('account-id', 'administrativo_operacional'))
    await waitFor(() => expect(select).toHaveValue('administrativo_operacional'))
    expect(screen.getByText('Contexto principal salvo no banco.')).toBeInTheDocument()
    expect(screen.getByText('Profissional duplo')).toBeInTheDocument()
  })

  it('redefine a senha de conta existente por ação separada sem alterar o cadastro nem criar outra identidade', async () => {
    const id = 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0'
    const resetTemporaryPassword = vi.fn(async () => ({ status: 'success' as const, data: { ok: true } }))
    const update = vi.fn(async () => ({ status: 'success' as const, data: {} }))
    const create = vi.fn(async () => ({ status: 'success' as const, data: {} }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext: async () => ({ status: 'success', data: {
        team: [{ professional_id: id, user_account_id: '76898c6a-90fc-4300-ac09-f5430814eaea',
          full_name: 'Profissional ativo', function_title: 'Atendimento', username: 'profissional.ativo',
          recovery_email: 'pessoa@exemplo.org', status: 'ativo', is_professional: false,
          roles: [{ code: 'profissional' }] }],
        roles: [{ code: 'profissional', name: 'Profissional' }], specialties: [],
      } }),
      create, update, resetTemporaryPassword, setActive: success, getCapabilities: success,
      setPrimaryContext: success, setCapability: success, removeCapability: success,
      setSpecialtyCapability: success, getCapabilityCatalog: success,
    }
    const confirmation = vi.spyOn(window, 'confirm').mockReturnValue(true)
    try {
      render(<GestorTeamPage service={service} mode="administracao" />)
      fireEvent.click(await screen.findByRole('button', { name: /Profissional ativo/ }))
      fireEvent.change(screen.getByLabelText(/Conta de acesso: senha provisória/),
        { target: { value: 'NovaSenha2026' } })
      fireEvent.change(screen.getByLabelText(/Justificativa de recuperação excepcional/),
        { target: { value: 'Profissional perdeu o acesso ao e-mail cadastrado' } })
      fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha provisória' }))
      await waitFor(() => expect(resetTemporaryPassword).toHaveBeenCalledWith(
        id, 'NovaSenha2026', 'Profissional perdeu o acesso ao e-mail cadastrado',
      ))
      expect(update).not.toHaveBeenCalled()
      expect(create).not.toHaveBeenCalled()
    } finally {
      confirmation.mockRestore()
    }
  })

  it('não envia redefinição com senha provisória sem número', async () => {
    const id = 'c9496e0b-6735-499a-b756-ea2cdd8ba6c0'
    const resetTemporaryPassword = vi.fn(async () => ({ status: 'success' as const, data: {} }))
    const success = async () => ({ status: 'success' as const, data: [] })
    const service: TeamManagementService = {
      getContext: async () => ({ status: 'success', data: {
        team: [{ professional_id: id, user_account_id: '76898c6a-90fc-4300-ac09-f5430814eaea',
          full_name: 'Profissional ativo', function_title: 'Atendimento', username: 'profissional.ativo',
          recovery_email: 'pessoa@exemplo.org', status: 'ativo', is_professional: false,
          roles: [{ code: 'profissional' }] }],
        roles: [{ code: 'profissional', name: 'Profissional' }], specialties: [],
      } }),
      create: success, update: success, resetTemporaryPassword, setActive: success,
      getCapabilities: success, setPrimaryContext: success, setCapability: success,
      removeCapability: success, setSpecialtyCapability: success, getCapabilityCatalog: success,
    }
    render(<GestorTeamPage service={service} mode="administracao" />)
    fireEvent.click(await screen.findByRole('button', { name: /Profissional ativo/ }))
    fireEvent.change(screen.getByLabelText(/Conta de acesso: senha provisória/),
      { target: { value: 'SenhaSemNumero' } })
    fireEvent.click(screen.getByRole('button', { name: 'Redefinir senha provisória' }))
    expect(resetTemporaryPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('uma letra maiúscula, uma minúscula e um número')
  })

})
