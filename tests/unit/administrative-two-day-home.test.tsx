import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgendaScheduleSlot } from '../../src/lib/supabase/rpc'
import { AdministrativeTwoDayAgenda, administrativeAgendaDates } from '../../src/features/home/AdministrativeTwoDayAgenda'
import { capoHolidayOn, capoHolidaysForYear, capoIsBusinessDay, capoNextBusinessDay } from '../../src/lib/calendar/capo-holidays'

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
  it('não conta feriado nacional de 20/11 como dia útil da Home', () => {
    expect(capoHolidayOn('2026-11-20')).toMatchObject({ scope: 'nacional' })
    expect(administrativeAgendaDates(new Date('2026-11-19T15:00:00-03:00'))).toEqual({
      first: '2026-11-19', second: '2026-11-23', isToday: true,
    })
    expect(administrativeAgendaDates(new Date('2026-11-20T15:00:00-03:00'))).toEqual({
      first: '2026-11-23', second: '2026-11-24', isToday: false,
    })
  })
  it('exclui Corpus Christi, padroeiro e emancipação municipais', () => {
    expect(capoHolidayOn('2026-06-04')).toMatchObject({ scope: 'municipal', name: 'Corpus Christi' })
    expect(capoHolidayOn('2026-08-06')?.scope).toBe('municipal')
    expect(capoHolidayOn('2026-10-19')?.scope).toBe('municipal')
    expect(capoNextBusinessDay('2026-06-03')).toBe('2026-06-05')
    expect(capoNextBusinessDay('2026-10-18')).toBe('2026-10-20')
  })
  it('reconhece data móvel anual e Data Magna de Minas Gerais', () => {
    expect(capoHolidayOn('2026-04-03')?.scope).toBe('nacional')
    expect(capoHolidayOn('2027-03-26')?.name).toBe('Sexta-Feira da Paixão')
    expect(capoHolidayOn('2027-05-27')?.name).toBe('Corpus Christi')
    expect(capoHolidayOn('2026-04-21')?.name).toContain('Data Magna')
    expect(capoIsBusinessDay('2026-04-21')).toBe(false)
    expect(capoHolidaysForYear(2026).every((h, i, arr) => i === 0 || h.date !== arr[i - 1].date)).toBe(true)
  })
  it('mantém pontos facultativos como dias úteis até decisão institucional', () => {
    expect(capoIsBusinessDay('2026-02-17')).toBe(true)
    expect(capoIsBusinessDay('2026-10-28')).toBe(true)
    expect(capoIsBusinessDay('2026-11-21')).toBe(false)
  })
  it('durante o fim de semana apresenta segunda e terça', () => {
    for (const date of ['2026-11-21T12:00:00-03:00', '2026-11-22T12:00:00-03:00']) {
      expect(administrativeAgendaDates(new Date(date))).toEqual({
        first: '2026-11-23', second: '2026-11-24', isToday: false,
      })
    }
  })
  it('consulta separadamente ambos os dias e mostra apenas resumo das vagas', async () => {
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
    expect(within(columns[1]).queryByText('Horário livre')).not.toBeInTheDocument()
    expect(within(columns[0]).queryByText('Horário livre')).not.toBeInTheDocument()
    expect(within(columns[1]).getByText('Profissional disponível · horários disponíveis')).toBeVisible()
    expect(within(columns[1]).getByRole('link', { name: 'Consultar agenda' })).toHaveAttribute('href', '/agenda')
  })
})
