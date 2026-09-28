import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { OperationalTimeline } from '../../src/features/gestor/OperationalTimeline'

afterEach(cleanup)

it('consulta paciente e mostra eventos operacionais do contrato em linguagem clara', async () => {
  const user = userEvent.setup()
  const service = {
    searchPatients: vi.fn().mockResolvedValue({ status: 'success', data: [{ patient_id: 'p1', full_name: 'Paciente retornado', patient_number: 'CAPO-1', cms: null }] }),
    loadTimeline: vi.fn().mockResolvedValue({ status: 'success', data: { items: [{ event_key: 'e1', event_at: '2026-09-28T10:00:00Z', title: 'Entrada na fila de espera', summary: 'Paciente incluído na fila de espera.', event_type: 'waiting_list_entered', specialty: 'Nutrição' }] } }),
  }
  render(<OperationalTimeline service={service} />)
  await user.type(screen.getByPlaceholderText('Nome, CMS ou Nº CAPO'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: /Paciente retornado/ }))
  expect(service.loadTimeline).toHaveBeenCalledWith('p1', null, null, 50)
  expect(await screen.findByText('Entrada na fila de espera')).toBeVisible()
  expect(screen.getByText('Paciente incluído na fila de espera.')).toBeVisible()
  expect(screen.getByText('Especialidade: Nutrição')).toBeVisible()
  expect(screen.queryByText('waiting_list_entered')).not.toBeInTheDocument()
})

it('mostra estado vazio após selecionar paciente', async () => {
  const user = userEvent.setup()
  render(<OperationalTimeline service={{ searchPatients: vi.fn().mockResolvedValue({ status: 'success', data: [{ patient_id: 'p1', full_name: 'Paciente retornado' }] }), loadTimeline: vi.fn().mockResolvedValue({ status: 'success', data: { items: [] } }) }} />)
  await user.type(screen.getByPlaceholderText('Nome, CMS ou Nº CAPO'), 'Paciente')
  await user.click(screen.getByRole('button', { name: 'Buscar' }))
  await user.click(await screen.findByRole('button', { name: 'Paciente retornado' }))
  expect(await screen.findByText('Nenhum evento operacional encontrado.')).toBeVisible()
})
