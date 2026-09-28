import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { ReportsPage } from '../../src/features/reports/ReportsPage'
import type { AccessContext } from '../../src/types/access'

afterEach(cleanup)

it('traduz somente os rótulos, preservando os indicadores, filtros e valores retornados', async () => {
  const access = {
    roles: [{ code: 'administrador', name: 'Administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext
  const loadDashboard = vi.fn().mockResolvedValue({ status: 'success', data: {
    specialty_options: [{ id: 'specialty-id', name: 'Nutrição' }],
    patients: { total_current: 17, registered_period: 3 },
    closures: { pending_current: 2, closed_period: 5 },
    no_show_followup: { open_current: 4 },
    agenda: { total_period: 11, absenteeism_rate_pct: 9.5 },
  } })
  render(<ReportsPage accessContext={access} integration={{
    loadDashboard,
    loadSpecialties: vi.fn(),
    loadReport: vi.fn(),
  }} />)
  const patientSection = await screen.findByRole('region', { name: 'Pacientes' })
  expect(within(patientSection).getByText('Total atual').nextElementSibling).toHaveTextContent('17')
  expect(screen.getByRole('region', { name: 'Encerramentos' })).toHaveTextContent('5')
  expect(screen.getByRole('region', { name: 'Acompanhamento de Faltosos' })).toHaveTextContent('4')
  expect(screen.getByText('Total no período').nextElementSibling).toHaveTextContent('11')
  expect(screen.getByRole('option', { name: 'Nutrição' })).toHaveValue('specialty-id')
  expect(loadDashboard).toHaveBeenCalledWith(expect.any(String), expect.any(String), null)
  for (const key of ['closures', 'patients', 'no show followup', 'total period']) {
    expect(screen.queryByText(key, { exact: true })).not.toBeInTheDocument()
  }
})

it.each(['administrador', 'coordenador'])('oferece impressão e PDF do relatório gerencial ao %s com filtros reais', async (role) => {
  const user = userEvent.setup()
  const loadDashboard = vi.fn().mockResolvedValue({ status: 'success', data: {
    specialty_options: [{ id: 'nutrition', name: 'Nutrição' }],
    patients: { total_current: 17 },
  } })
  render(<ReportsPage accessContext={{ roles: [{ code: role, name: role }], primary_context: { code: role }, professional_id: null } as unknown as AccessContext} integration={{ loadDashboard, loadSpecialties: vi.fn(), loadReport: vi.fn() }} />)
  await screen.findByText('Total atual')
  expect(screen.getByRole('button', { name: 'Imprimir' })).toBeEnabled()
  expect(screen.getByRole('button', { name: 'Gerar / salvar PDF' })).toBeEnabled()
  await user.selectOptions(screen.getByLabelText('Especialidade'), 'nutrition')
  expect(loadDashboard).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'nutrition')
  expect(await screen.findByText(/Especialidade: Nutrição/)).toBeVisible()
})
