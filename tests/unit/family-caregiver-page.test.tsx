import type { ReactElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { FamilyCaregiverPage } from '../../src/features/social/FamilyCaregiverPage'
import type { FamilyCaregiverService } from '../../src/features/social/family-caregiver-integration'
import type { AccessContext } from '../../src/types/access'

const accessContext = {
  primary_context: { name: 'Assistência Social' },
} as AccessContext

afterEach(() => cleanup())

function renderPage(ui: ReactElement, initialEntries: Parameters<typeof MemoryRouter>[0]['initialEntries'] = ['/familiar-cuidador']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>)
}

describe('FamilyCaregiverPage', () => {
  it('exibe estado vazio sem dados fictícios antes da seleção de paciente', () => {
    renderPage(<FamilyCaregiverPage accessContext={accessContext} />)

    expect(
      screen.getByRole('heading', { name: 'Familiar / Cuidador' }),
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Paciente' })).toBeVisible()
    expect(
      screen.getByText('Nenhum familiar ativo para o paciente selecionado.'),
    ).toBeVisible()
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
    renderPage(
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
    renderPage(
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

  it('não expõe a busca administrativa de familiar quando o contexto não pode corrigir', async () => {
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
      updateFamilyLinkOperational: async () => ({ status: 'success', data: {} }),
      searchFamilyMembers: async () => ({ status: 'empty' }),
      createPsychologyRequest: async () => ({ status: 'success', data: {} }),
      searchPatients: async () => ({
        status: 'success',
        data: [{
          patient_id: 'patient-1',
          full_name: 'Paciente Real',
          cms: 'CMS-1',
          patient_number: 'CAPO-1',
        }],
      }),
    }

    const user = (await import('@testing-library/user-event')).default.setup()
    renderPage(<FamilyCaregiverPage accessContext={accessContext} service={service} />)
    await user.type(screen.getByLabelText('Nome, CMS ou Nº CAPO'), 'Paciente real')
    await user.click(screen.getByRole('button', { name: 'Buscar paciente' }))
    await user.click(screen.getByRole('button', { name: /Paciente Real/ }))

    expect(screen.queryByLabelText('Buscar familiar existente')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buscar familiar' })).not.toBeInTheDocument()
  })

  it('abre diretamente o paciente recebido da consulta de pacientes', async () => {
    const getFamilyContext = async () => ({
      status: 'success' as const,
      data: {
        active_link: null,
        history: [],
        can_admin_correct: true,
        can_operate: true,
      },
    })
    const service: FamilyCaregiverService = {
      getFamilyContext,
      createFamilyLink: async () => ({ status: 'success', data: {} }),
      replaceFamilyLink: async () => ({ status: 'success', data: {} }),
      closeFamilyLink: async () => ({ status: 'success', data: {} }),
      updateFamilyLinkOperational: async () => ({ status: 'success', data: {} }),
      searchFamilyMembers: async () => ({ status: 'empty' }),
      createPsychologyRequest: async () => ({ status: 'success', data: {} }),
      searchPatients: async () => ({ status: 'empty' }),
    }

    renderPage(
      <FamilyCaregiverPage accessContext={accessContext} service={service} />,
      [{
        pathname: '/familiar-cuidador',
        state: { patientId: 'patient-1', patientName: 'Paciente Real' },
      }],
    )

    expect(await screen.findByText('Paciente selecionado: Paciente Real')).toBeVisible()
  })

  it('não expõe textos técnicos de integração ao usuário', () => {
    renderPage(<FamilyCaregiverPage accessContext={accessContext} />)

    expect(screen.queryByText(/Supabase/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Registros confidenciais/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Integração oficial CAPO/i)).not.toBeInTheDocument()
  })
})
