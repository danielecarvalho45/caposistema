import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { GestorDashboard } from '../../src/features/gestor/GestorDashboard'
import { GestorManagementPage } from '../../src/features/gestor/GestorManagementPage'

describe('GestorDashboard', () => {
  it('expõe o painel geral e os acessos estruturais do titular', () => {
    render(
      <MemoryRouter>
        <GestorDashboard />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Olá, seja bem-vinda ao CAPO.' })).toBeVisible()
    expect(screen.getByRole('link', { name: /Familiares/ })).toHaveAttribute('href', '/familiar-cuidador')
    expect(screen.getByRole('link', { name: /Relatórios/ })).toHaveAttribute('href', '/relatorios')
    expect(screen.getByRole('link', { name: /Status do Sistema/ })).toHaveAttribute('href', '/tecnica')
  })

  it('apresenta as superfícies de cadastro e permissões sem simular escrita', () => {
    render(<GestorManagementPage view="administracao" />)

    expect(screen.getByRole('heading', { name: 'Usuários e Contas' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Cadastrar Profissional' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Permissões' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Papéis, capacidades e permissões' })).toBeVisible()
    expect(
      screen.getByText(/o cadastro será gravado somente quando o contrato oficial/i),
    ).toBeVisible()
  })
})
