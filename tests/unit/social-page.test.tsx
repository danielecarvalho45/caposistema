import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SocialPage } from '../../src/features/social/SocialPage'
import { BereavementPage } from '../../src/features/social/BereavementPage'
import type { AccessContext } from '../../src/types/access'
import { MemoryRouter } from 'react-router-dom'

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
    name: 'Profissional',
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
      name: 'Profissional',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}
const loadSocialSpecialties = vi.fn().mockResolvedValue({ status: 'success', data: [{ specialty_id: 'social-id', specialty_name: 'Assistência Social', is_current_context: true }] })

afterEach(cleanup)

describe('SocialPage', () => {
  it('preserva os nomes canônicos e os acessos rápidos do index', async () => {
    render(<MemoryRouter><SocialPage accessContext={accessContext} loadSpecialties={loadSocialSpecialties} /></MemoryRouter>)
    await screen.findByRole('link', { name: /Minha Agenda/i })

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

  it('encaminha ao Luto real sem simular registros de outros módulos', async () => {
    render(<MemoryRouter><SocialPage accessContext={accessContext} loadSpecialties={loadSocialSpecialties} /></MemoryRouter>)
    await screen.findByRole('link', { name: /Luto/ })

    expect(screen.getByRole('link', { name: /Luto/ })).toHaveAttribute('href', '/luto')
    expect(screen.queryByText('Nenhum contrato de acompanhamento disponível.')).not.toBeInTheDocument()
    expect(screen.queryByText('Nenhum registro encontrado.')).not.toBeInTheDocument()
  })

  it('não abre a área social para profissional de outra especialidade', async () => {
    const loadSpecialties = vi.fn().mockResolvedValue({ status: 'success', data: [{ specialty_id: 'other-id', specialty_name: 'Psicologia', is_current_context: true }] })
    render(<MemoryRouter><SocialPage accessContext={accessContext} loadSpecialties={loadSpecialties} /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Assistência Social indisponível' })).toBeVisible()
    expect(screen.queryByRole('link', { name: /Luto/ })).not.toBeInTheDocument()
  })

  it('exibe os itens do contrato físico de Luto e só permite ação à especialidade social', async () => {
    const service = {
      getFamilyBereavement: vi.fn().mockResolvedValue({ status: 'success', data: { items: [{ bereavement_cycle_id: 'cycle-id', family_member_id: 'family-id', family_name: 'Familiar vinculado', status: 'active' }], total_count: 1 } }),
      getMyAssistentialSpecialties: vi.fn().mockResolvedValue({ status: 'success', data: [{ specialty_id: 'specialty-id', specialty_name: 'Assistência Social', is_current_context: true }] }),
      startFamilyBereavement: vi.fn(),
      closeFamilyBereavement: vi.fn(), searchBereavementFamilyMembers: vi.fn().mockResolvedValue({ status: 'empty' }),
    }
    render(<MemoryRouter><BereavementPage accessContext={accessContext} service={service} /></MemoryRouter>)
    expect(await screen.findByText('Familiar vinculado')).toBeVisible()
    expect(await screen.findByRole('region', { name: 'Iniciar luto' })).toBeVisible()
    expect(service.getMyAssistentialSpecialties).toHaveBeenCalledOnce()
  })

  it('não libera ação de Luto a profissional de outra especialidade', async () => {
    const service = {
      getFamilyBereavement: vi.fn().mockResolvedValue({ status: 'success', data: { items: [], total_count: 0 } }),
      getMyAssistentialSpecialties: vi.fn().mockResolvedValue({ status: 'success', data: [{ specialty_id: 'other-id', specialty_name: 'Psicologia', is_current_context: true }] }),
      startFamilyBereavement: vi.fn(), closeFamilyBereavement: vi.fn(), searchBereavementFamilyMembers: vi.fn().mockResolvedValue({ status: 'empty' }),
    }
    render(<MemoryRouter><BereavementPage accessContext={accessContext} service={service} /></MemoryRouter>)
    expect(await screen.findByText('Nenhum acompanhamento de luto real encontrado.')).toBeVisible()
    expect(screen.queryByRole('region', { name: 'Iniciar luto' })).not.toBeInTheDocument()
  })
})
