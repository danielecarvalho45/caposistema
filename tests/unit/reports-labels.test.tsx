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

it('permite escolher uma seção real para o PDF sem alterar o painel nem os números', async () => {
  const user = userEvent.setup()
  const loadDashboard = vi.fn().mockResolvedValue({ status: 'success', data: {
    patients: { total_current: 17 }, closures: { closed_period: 5 },
  } })
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:relatorio')
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  try {
    render(<ReportsPage accessContext={{ roles: [{ code: 'administrador' }], primary_context: { code: 'administrador' }, professional_id: null } as unknown as AccessContext} integration={{ loadDashboard, loadSpecialties: vi.fn(), loadReport: vi.fn() }} />)
    await screen.findByRole('option', { name: 'Pacientes' })
    expect(screen.getByRole('option', { name: 'Encerramentos' })).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Relatório para PDF'), 'patients')
    expect(screen.getByText(/Relatório: Pacientes/)).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Gerar / salvar PDF' }))
    const pdf = createUrl.mock.calls[0][0] as Blob
    const content = new TextDecoder('latin1').decode(await pdf.arrayBuffer())
    expect(content).toContain('Total atual: 17')
    expect(content).not.toContain('Encerrados no período: 5')
    expect(screen.getByRole('region', { name: 'Encerramentos' })).toHaveTextContent('5')
    await user.selectOptions(screen.getByLabelText('Relatório para PDF'), '')
    await user.click(screen.getByRole('button', { name: 'Gerar / salvar PDF' }))
    expect(new TextDecoder('latin1').decode(await (createUrl.mock.calls[1][0] as Blob).arrayBuffer())).toContain('Encerrados no período: 5')
    expect(loadDashboard).toHaveBeenCalledTimes(1)
  } finally { createUrl.mockRestore(); click.mockRestore() }
})

it('permite PDF institucional quando a consulta retorna estado vazio', async () => {
  const loadDashboard = vi.fn().mockResolvedValue({ status: 'empty' })
  render(<ReportsPage accessContext={{ roles: [{ code: 'administrador' }], primary_context: { code: 'administrador' }, professional_id: null, username: 'gestor_autenticado' } as unknown as AccessContext} integration={{ loadDashboard, loadSpecialties: vi.fn(), loadReport: vi.fn() }} />)
  await screen.findByText('Nenhum indicador autorizado foi retornado.')
  expect(screen.getByRole('button', { name: 'Gerar / salvar PDF' })).toBeEnabled()
  expect(screen.getByText(/Relatório: Visão geral/)).toBeVisible()
})


it('profissional gera relatório da própria especialidade sem chamar dashboard gerencial', async () => {
  const loadDashboard = vi.fn().mockResolvedValue({
    status: 'error',
    error: new Error('Perfil sem autorização para Relatórios gerenciais do CAPO.'),
  })
  const loadSpecialties = vi.fn().mockResolvedValue({
    status: 'success',
    data: [
      {
        specialty_id: 'clinica-geral',
        specialty_name: 'Clínica Geral',
        is_current_context: true,
      },
    ],
  })
  const loadReport = vi.fn().mockResolvedValue({
    status: 'success',
    data: {
      agenda: { agendado: 0, confirmado: 0, realizado: 0, faltou: 0, cancelado: 0, remarcado: 0 },
      retornos: { agendado: 0, confirmado: 0, realizado: 0, faltou: 0, cancelado: 0, remarcado: 0 },
      fila_especialidade: { waiting: 0 },
      solicitacoes: { pending: 0 },
      encaminhamentos: { enabled: true, pending_approval: 0 },
      encerramentos: { pendente: 0, encerrado: 0, reaberto: 0 },
    },
  })

  render(
    <ReportsPage
      accessContext={{
        roles: [
          { code: 'profissional', name: 'Profissional' },
          { code: 'administrador', name: 'Administrador' },
        ],
        primary_context: { code: 'profissional' },
        professional_id: 'professional-id',
      } as unknown as AccessContext}
      integration={{ loadDashboard, loadSpecialties, loadReport }}
    />,
  )

  expect(await screen.findByRole('heading', { name: 'Relatorio operacional' })).toBeVisible()
  expect(await screen.findByRole('button', { name: /Agenda/ })).toBeVisible()
  expect(loadReport).toHaveBeenCalledWith('clinica-geral', expect.any(String), expect.any(String))
  expect(loadDashboard).not.toHaveBeenCalled()
  expect(screen.queryByText(/Perfil sem autorização para Relatórios gerenciais do CAPO/)).not.toBeInTheDocument()
})
