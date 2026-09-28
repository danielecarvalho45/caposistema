import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuditLogPage } from '../../src/features/gestor/AuditLogPage'

afterEach(cleanup)

function renderAudit(result: object = { status: 'empty' }) {
  const service = { getAuditLogs: vi.fn().mockResolvedValue(result) }
  render(<AuditLogPage service={service} />)
  return service
}

describe('Auditoria administrativa do Gestor', () => {
  it('oferece filtros em português com códigos internos somente nos valores das opções', async () => {
    const user = userEvent.setup()
    const service = renderAudit()
    expect(screen.getByLabelText('De')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Até')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Área / Módulo')).toHaveRole('combobox')
    expect(screen.getByLabelText('Tipo de alteração')).toHaveRole('combobox')
    expect(screen.queryByRole('textbox', { name: 'Entidade' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Ação' })).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('Área / Módulo')).getByRole('option', { name: 'Agendamentos' })).toHaveValue('patient_appointments')
    await user.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(service.getAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ entityName: null, action: null, limit: 100 }))
  })

  it.each([
    ['Criação', 'INSERT'], ['Alteração', 'UPDATE'], ['Exclusão', 'DELETE'],
  ])('envia %s ao contrato como %s', async (label, code) => {
    const user = userEvent.setup()
    const service = renderAudit()
    await user.selectOptions(screen.getByLabelText('Área / Módulo'), 'patient_appointments')
    await user.selectOptions(screen.getByLabelText('Tipo de alteração'), label)
    await user.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(service.getAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ entityName: 'patient_appointments', action: code }))
  })

  it('apresenta autoria, área, resumo e alterações seguras, omitindo código da tabela', async () => {
    const user = userEvent.setup()
    renderAudit({ status: 'success', data: { items: [{
      audit_id: 'audit-1', created_at: '2026-09-28T13:32:00Z',
      action: 'UPDATE', entity_name: 'patient_appointments', entity_label: 'Agendamentos',
      actor_name: 'Responsável retornado pela RPC', actor_role_label: 'Administrador / Controlador',
      patient_name: 'Nome retornado pela RPC', patient_number: 'CAPO-001',
      summary: 'Alteração registrada em Agendamentos.',
      changes: [{ field: 'attendance_status', label: 'Comparecimento', old_value: 'agendado', new_value: 'confirmado' }],
    }] } })
    await user.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByText('Alteração — Agendamentos')).toBeVisible()
    expect(screen.getByText(/Responsável retornado pela RPC · Administrador \/ Controlador/)).toBeVisible()
    expect(screen.getByText('Paciente: Nome retornado pela RPC')).toBeVisible()
    expect(screen.getByText('Nº CAPO: CAPO-001')).toBeVisible()
    expect(screen.getByText('Alteração registrada em Agendamentos.')).toBeVisible()
    expect(screen.getByText(/28\/09\/2026.*10:32/)).toBeVisible()
    expect(screen.queryByText('patient_appointments')).not.toBeInTheDocument()
    await user.click(screen.getByText('Ver detalhes'))
    const table = screen.getByRole('table')
    expect(within(table).getByRole('row', { name: /Comparecimento agendado confirmado/ })).toBeVisible()
    expect(screen.queryByText('attendance_status')).not.toBeInTheDocument()
  })

  it('não inventa paciente nem detalhes quando a RPC os omite', async () => {
    const user = userEvent.setup()
    renderAudit({ status: 'success', data: { items: [{ action: 'INSERT', entity_label: 'Profissionais', actor_name: 'Sistema / processo automático', summary: 'Criação registrada em Profissionais.', changes: [] }] } })
    await user.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByText('Criação — Profissionais')).toBeVisible()
    expect(screen.queryByText(/Paciente:/)).not.toBeInTheDocument()
    expect(screen.queryByText('Ver detalhes')).not.toBeInTheDocument()
  })

  it('impede período inválido sem consultar o serviço', async () => {
    const user = userEvent.setup()
    const service = renderAudit()
    await user.clear(screen.getByLabelText('Até'))
    await user.type(screen.getByLabelText('Até'), '2026-09-01')
    await user.clear(screen.getByLabelText('De'))
    await user.type(screen.getByLabelText('De'), '2026-09-28')
    expect(screen.getByRole('button', { name: 'Consultar' })).toBeDisabled()
    expect(service.getAuditLogs).not.toHaveBeenCalled()
  })

  it('mostra ausência de registros e erro real sem simular sucesso', async () => {
    const user = userEvent.setup()
    const service = renderAudit()
    await user.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByText('Nenhum registro autorizado foi retornado.')).toBeVisible()
    cleanup()
    service.getAuditLogs.mockResolvedValue({ status: 'error', error: { message: 'Consulta não autorizada.' } })
    render(<AuditLogPage service={service} />)
    await user.click(screen.getByRole('button', { name: 'Consultar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Consulta não autorizada.')
  })
})
