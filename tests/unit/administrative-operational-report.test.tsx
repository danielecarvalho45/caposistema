import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AdministrativeOperationalReport } from '../../src/features/reports/AdministrativeOperationalReport'
import { ReportsPage } from '../../src/features/reports/ReportsPage'
import type { AccessContext } from '../../src/types/access'

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


  it('mantém o relatório operacional quando há papel profissional acumulado fora do contexto principal', () => {
    const accessContext: AccessContext = {
      user_account_id: 'account-id',
      username: 'ao.capo',
      is_active: true,
      recovery_email: null,
      professional_id: 'professional-id',
      full_name: 'Operador com função acumulada',
      function_title: 'Administrativo Operacional',
      professional_registration: null,
      administrative_responsibility: null,
      first_access_completed: true,
      must_change_password: false,
      roles: [
        { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
        { code: 'profissional', name: 'Profissional' },
      ],
      capabilities: [],
      primary_context: {
        role_id: 'ao-role-id',
        code: 'administrativo_operacional',
        name: 'Administrativo Operacional',
        source: 'configured',
        is_configured: true,
        requires_configuration: false,
      },
      is_homologation_account: false,
      real_identity: {
        professional_id: 'professional-id',
        full_name: 'Operador com função acumulada',
        function_title: 'Administrativo Operacional',
        roles: [
          { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
          { code: 'profissional', name: 'Profissional' },
        ],
        primary_context: {
          role_id: 'ao-role-id',
          code: 'administrativo_operacional',
          name: 'Administrativo Operacional',
          source: 'configured',
          is_configured: true,
          requires_configuration: false,
        },
      },
      homologation_context: null,
    }

    render(
      <MemoryRouter>
        <ReportsPage accessContext={accessContext} />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Relações operacionais' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Abrir relação de pendências e filas' }),
    ).toHaveAttribute('href', '/fila')
  })
})
