import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it } from 'vitest'
import { GestorManagementPage } from '../../src/features/gestor/GestorManagementPage'
import type { AccessContext } from '../../src/types/access'

afterEach(cleanup)

it('direciona o Gestor/Titular com função TI adicional para a Área Técnica', () => {
  render(<MemoryRouter><GestorManagementPage view="suporte" accessContext={{ roles: [{ code: 'administrador' }, { code: 'administrador_tecnico' }] } as unknown as AccessContext} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Abrir Área Técnica e chamados de suporte' })).toHaveAttribute('href', '/tecnica')
  expect(screen.queryByRole('button', { name: /Solicitar suporte/ })).not.toBeInTheDocument()
})

it('direciona o Gestor/Titular à Área Técnica mesmo sem papel TI adicional', () => {
  render(<MemoryRouter><GestorManagementPage view="suporte" accessContext={{ roles: [{ code: 'administrador' }] } as unknown as AccessContext} /></MemoryRouter>)
  expect(screen.getByRole('link', { name: 'Abrir Área Técnica e chamados de suporte' })).toHaveAttribute('href', '/tecnica')
  expect(screen.queryByRole('button', { name: /Solicitar suporte/ })).not.toBeInTheDocument()
})
