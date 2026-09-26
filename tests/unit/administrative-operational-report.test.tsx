import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AdministrativeOperationalReport } from '../../src/features/reports/AdministrativeOperationalReport'

afterEach(cleanup)

describe('relações operacionais do Auxiliar', () => {
  it('encaminha às relações reais sem exibir uma contagem parcial como relatório', () => {
    render(<MemoryRouter><AdministrativeOperationalReport /></MemoryRouter>)

    expect(screen.getByRole('link', { name: 'Abrir relação de pendências e filas' }))
      .toHaveAttribute('href', '/fila')
    expect(screen.getByRole('link', { name: 'Abrir relação de faltosos' }))
      .toHaveAttribute('href', '/faltosos')
    expect(screen.queryByText(/registros exibidos|até 50 registros/i)).not.toBeInTheDocument()
  })
})
