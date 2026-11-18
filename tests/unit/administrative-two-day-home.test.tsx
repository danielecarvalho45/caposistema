import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgendaScheduleSlot } from '../../src/lib/supabase/rpc'
import { AdministrativeTwoDayAgenda, administrativeAgendaDates } from '../../src/features/home/AdministrativeTwoDayAgenda'

const mocks = vi.hoisted(() => ({
  getAppointmentPrevisitContacts: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()),
  getRpcService: () => ({
    getAppointmentPrevisitContacts: mocks.getAppointmentPrevisitContacts,
  }),
}))

beforeEach(() => {
  mocks.getAppointmentPrevisitContacts.mockResolvedValue({ status: 'success', data: { items: [] } })
  mocks.rpc.mockResolvedValue({ data: [], error: null })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Home exclusivamente administrativa — dois dias úteis', () => {
  it('avança de sexta-feira para segunda-feira', () => {
    expect(administrativeAgendaDates(new Date('2026-11-20T15:00:00-03:00'))).toEqual({
      first: '2026-11-20', second: '2026-11-23', isToday: true,
    })
  })
  it('durante o fim de semana apresenta segunda e terça', () => {
    for (const date of ['2026-11-21T12:00:00-03:00', '2026-11-22T12:00:00-03:00']) {
      expect(administrativeAgendaDates(new Date(date))).toEqual({
        first: '2026-11-23', second: '2026-11-24', isToday: false,
      })
    }
  })
  it('consulta separadamente o dia atual e o seguinte sem gravar agendas', async () => {
    const day = administrativeAgendaDates()
    const freeSlot: AgendaScheduleSlot = {
      professional_id: 'prof-livre', professional_name: 'Profissional disponível',
      slot_date: day.second, weekday: 1,
      slot_start: day.second + 'T09:00:00-03:00', slot_end: day.second + 'T10:00:00-03:00',
      duration_minutes: 60, slot_status: 'livre', appointment_id: null,
      patient_id: null, patient_name: null, appointment_type: null, block_type: null,
    }
    const load = vi.fn().mockImplementation(async (firstDate: string) => ({
      status: 'success', data: firstDate === day.second ? [freeSlot] : [],
    }))
    render(<MemoryRouter><AdministrativeTwoDayAgenda loadAgenda={load} /></MemoryRouter>)
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
    expect(load).toHaveBeenCalledWith(day.first, day.first, null)
    expect(load).toHaveBeenCalledWith(day.second, day.second, null)
    const columns = await screen.findAllByLabelText(/Próximo dia útil|Hoje|Dia útil seguinte/)
    expect(columns).toHaveLength(2)
    expect(within(columns[1]).getByText('Horário livre')).toBeVisible()
    expect(within(columns[0]).queryByText('Horário livre')).not.toBeInTheDocument()
    expect(within(columns[1]).getByRole('link', { name: 'Agendar' })).toHaveAttribute('href', '/agenda')
  })
})
