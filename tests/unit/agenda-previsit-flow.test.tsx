import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AgendaPage } from '../../src/features/agenda/AgendaPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getSchedulingCatalog: vi.fn(),
  getAgendaScheduleGrid: vi.fn(),
  getAppointmentPrevisitContacts: vi.fn(),
  registerAppointmentPrevisitContact: vi.fn(),
  getPatientContact: vi.fn(),
}))

vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => rpc,
}))

const patientAppointment = {
  appointment_id: 'appointment-1',
  patient_id: 'patient-1',
  patient_name: 'Paciente da consulta',
  patient_number: 'CAPO-1',
  professional_id: 'professional-1',
  professional_name: 'Profissional CAPO',
  specialty_name: 'Psicologia',
  appointment_date: '2026-11-04T09:00:00-03:00',
  appointment_end: '2026-11-04T10:00:00-03:00',
  appointment_type: 'primeiro_capo',
  attendance_status: 'agendado',
  general_notes: null,
  rescheduled_from_id: null,
  reschedule_reason: null,
  reschedule_origin: null,
} as const

const administrativeContext = {
  username: 'manuteste',
  full_name: 'Operador de manutenção',
  roles: [{ code: 'administrativo_operacional', name: 'Administrativo Operacional' }],
  professional_id: null,
  primary_context: { code: 'administrativo_operacional' },
} as unknown as AccessContext

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

it('registra aviso prévio sem marcar comparecimento nem iniciar atendimento', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'success', data: [] })
  rpc.getAppointmentPrevisitContacts.mockResolvedValue({ status: 'success', data: { items: [] } })
  rpc.registerAppointmentPrevisitContact.mockResolvedValue({
    status: 'success', data: { success: true, attendance_unchanged: true },
  })
  rpc.getPatientContact.mockResolvedValue({ status: 'success', data: { phone: '35999999999' } })
  const open = vi.fn()
  vi.stubGlobal('open', open)
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AgendaPage accessContext={administrativeContext}
        loadAgenda={async () => ({ status: 'success', data: [patientAppointment] })} />
    </MemoryRouter>,
  )
  const panel = await screen.findByRole('region', { name: 'Avisos prévios das consultas' })
  const select = within(panel).getByRole('combobox', { name: 'Resultado do contato com Paciente da consulta' })
  expect(within(select).getAllByRole('option').map((option) => (option as HTMLOptionElement).value)).toEqual(['', 'avisado', 'solicitou_cancelamento'])
  await user.selectOptions(select, 'avisado')
  await user.click(within(panel).getByRole('button', { name: '✓ Registrar aviso' }))
  await waitFor(() => expect(rpc.registerAppointmentPrevisitContact).toHaveBeenCalledWith(
    'appointment-1', 'avisado',
  ))
  expect(await screen.findByText(/não registra presença nem inicia atendimento/)).toBeVisible()
  await user.click(within(panel).getByRole('button', { name: /Lembrar consulta/ }))
  await waitFor(() => expect(open).toHaveBeenCalled())
  const u = new URL(open.mock.calls[0][0])
  expect(u.searchParams.get('text')).toContain('Caso precise cancelar ou remarcar')
  expect(u.searchParams.get('text')).not.toContain('confirme se poderá comparecer')
  expect(u.searchParams.get('phone')).toBe('5535999999999')
})

it('informa ao profissional o aviso administrativo como indicador distinto da presença', async () => {
  rpc.getAgendaScheduleGrid.mockResolvedValue({ status: 'success', data: [] })
  rpc.getAppointmentPrevisitContacts.mockResolvedValue({
    status: 'success',
    data: { items: [{ appointment_id: 'appointment-1', result: 'confirmou', recorded_at: '2026-11-03T14:00:00Z' }] },
  })
  const professionalContext = {
    ...administrativeContext,
    professional_id: 'professional-1',
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: { code: 'profissional' },
  } as unknown as AccessContext
  render(
    <MemoryRouter>
      <AgendaPage accessContext={professionalContext}
        loadAgenda={async () => ({ status: 'success', data: [patientAppointment] })}
        loadPatientSpecialties={async () => ({ status: 'success', data: [] })} />
    </MemoryRouter>,
  )
  expect(await screen.findByText('💬 Avisado previamente')).toBeVisible()
  expect(screen.queryByRole('region', { name: 'Avisos prévios das consultas' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Registrar aviso/ })).not.toBeInTheDocument()
})
