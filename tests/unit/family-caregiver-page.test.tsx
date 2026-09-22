import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FamilyCaregiverPage } from '../../src/features/social/FamilyCaregiverPage'
import type { FamilyCaregiverService } from '../../src/features/social/family-caregiver-integration'
import type { AccessContext } from '../../src/types/access'

const accessContext = {
  primary_context: { name: 'Assistência Social' },
} as AccessContext

afterEach(() => cleanup())

describe('FamilyCaregiverPage', () => {
  it('exibe estado vazio sem dados fictícios antes da seleção de paciente', () => {
    render(<FamilyCaregiverPage accessContext={accessContext} />)

    expect(
      screen.getByRole('heading', { name: 'Familiar / Cuidador' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Paciente' })).toBeVisible()
    expect(
      screen.getAllByText('Nenhum registro real encontrado.'),
    ).toHaveLength(1)
    expect(
      screen.getByRole('link', { name: '← Voltar ao painel inicial' }),
    ).toHaveAttribute('href', '/')
    expect(screen.queryByText(/Paciente demonstração/i)).not.toBeInTheDocument()
  })

  it('carrega vínculo real e usa substituição atômica após selecionar paciente', async () => {
    const service: FamilyCaregiverService = {
      getFamilyContext: async () => ({
        status: 'success',
        data: {
          active_link: {
            link_id: 'link-1',
            full_name: 'Familiar Real',
            relationship: 'Filho',
            linked_at: '2026-09-17',
          },
          history: [
            {
              link_id: 'old-link',
              full_name: 'Familiar Anterior',
              unlinked_at: '2026-09-16',
              unlink_reason: 'Substituição',
            },
          ],
          can_admin_correct: false,
          can_operate: true,
        },
      }),
      createFamilyLink: async () => ({ status: 'success', data: {} }),
      replaceFamilyLink: async () => ({ status: 'success', data: {} }),
      closeFamilyLink: async () => ({ status: 'success', data: {} }),
      updateFamilyLinkOperational: async () => ({
        status: 'success',
        data: {},
      }),
      searchFamilyMembers: async () => ({ status: 'empty' }),
      createPsychologyRequest: async () => ({ status: 'success', data: {} }),
      searchPatients: async () => ({
        status: 'success',
        data: [
          {
            patient_id: 'patient-1',
            full_name: 'Paciente Real',
            cms: 'CMS-1',
            patient_number: 'CAPO-1',
          },
        ],
      }),
    }

    const user = (await import('@testing-library/user-event')).default.setup()
    render(
      <FamilyCaregiverPage accessContext={accessContext} service={service} />,
    )
    await user.type(
      screen.getByLabelText('Nome, CMS ou Nº CAPO'),
      'Paciente real',
    )
    await user.click(screen.getByRole('button', { name: 'Buscar paciente' }))
    await user.click(screen.getByRole('button', { name: /Paciente Real/ }))

    expect(screen.getByText('Familiar Real')).toBeVisible()
    expect(screen.getByText('Familiar Anterior')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Vincular / substituir familiar' }),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Histórico de substituições' }),
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Substituir familiar' }),
    ).toBeVisible()
  })

  it('bloqueia nova criação quando já existe familiar ativo', async () => {
    const service: FamilyCaregiverService = {
      getFamilyContext: async () => ({
        status: 'success',
        data: {
          active_link: {
            link_id: 'link-1',
            full_name: 'Familiar Real',
            relationship: 'Filho',
            linked_at: '2026-09-17',
            psychological_interest: 'avaliacao',
          },
          history: [],
          can_admin_correct: true,
          can_operate: true,
        },
      }),
      createFamilyLink: async () => ({ status: 'success', data: {} }),
      replaceFamilyLink: async () => ({ status: 'success', data: {} }),
      closeFamilyLink: async () => ({ status: 'success', data: {} }),
      updateFamilyLinkOperational: async () => ({
        status: 'success',
        data: {},
      }),
      searchFamilyMembers: async () => ({ status: 'empty' }),
      createPsychologyRequest: async () => ({ status: 'success', data: {} }),
      searchPatients: async () => ({
        status: 'success',
        data: [
          {
            patient_id: 'patient-1',
            full_name: 'Paciente Real',
            cms: 'CMS-1',
            patient_number: 'CAPO-1',
          },
        ],
      }),
    }

    const user = (await import('@testing-library/user-event')).default.setup()
    render(
      <FamilyCaregiverPage accessContext={accessContext} service={service} />,
    )
    await user.type(
      screen.getByLabelText('Nome, CMS ou Nº CAPO'),
      'Paciente real',
    )
    await user.click(screen.getByRole('button', { name: /Buscar paciente/ }))
    await user.click(screen.getByRole('button', { name: /Paciente Real/ }))

    expect(
      screen.getByRole('button', { name: 'Substituir familiar' }),
    ).toBeVisible()
    expect(screen.getByText(/Motivo da substituição/)).toBeVisible()
  })

  it('mostra bloqueio real quando a busca de familiar não é autorizada', async () => {
    const service: FamilyCaregiverService = {
      getFamilyContext: async () => ({
        status: 'success',
        data: {
          active_link: null,
          history: [],
          can_admin_correct: false,
          can_operate: true,
        },
      }),
      createFamilyLink: async () => ({ status: 'success', data: {} }),
      replaceFamilyLink: async () => ({ status: 'success', data: {} }),
      closeFamilyLink: async () => ({ status: 'success', data: {} }),
      updateFamilyLinkOperational: async () => ({
        status: 'success',
        data: {},
      }),
      searchFamilyMembers: async () => ({
        status: 'error',
        error: {
          name: 'SupabaseOperationError',
          message: 'Ação não autorizada.',
          code: '42501',
          kind: 'authorization',
          operation: 'search_family_members_for_interface',
        },
      }),
      createPsychologyRequest: async () => ({ status: 'success', data: {} }),
      searchPatients: async () => ({
        status: 'success',
        data: [
          {
            patient_id: 'patient-1',
            full_name: 'Paciente Real',
            cms: 'CMS-1',
            patient_number: 'CAPO-1',
          },
        ],
      }),
    }

    const user = (await import('@testing-library/user-event')).default.setup()
    render(
      <FamilyCaregiverPage accessContext={accessContext} service={service} />,
    )
    await user.type(
      screen.getByLabelText('Nome, CMS ou Nº CAPO'),
      'Paciente real',
    )
    await user.click(screen.getByRole('button', { name: 'Buscar paciente' }))
    await user.click(screen.getByRole('button', { name: /Paciente Real/ }))
    await user.type(screen.getByLabelText('Buscar familiar existente'), 'Maria')
    await user.click(screen.getByRole('button', { name: 'Buscar familiar' }))

    expect(screen.getByText(/Ação não autorizada/i)).toBeVisible()
  })

  it('explicita a separação dos registros confidenciais', () => {
    render(<FamilyCaregiverPage accessContext={accessContext} />)

    expect(
      screen.getByText(
        'Não há transferência automática de acompanhamento entre familiares.',
      ),
    ).toBeVisible()
    expect(screen.getByText(/Pendência de banco \/ integração/)).toBeVisible()
  })
})
