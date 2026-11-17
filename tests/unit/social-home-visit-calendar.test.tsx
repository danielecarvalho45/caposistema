import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { HomeScheduleGrid } from '../../src/features/agenda/AgendaPage'

const visit = {
  block_id: 'visit-block-1',
  date: '2026-11-18',
  start_time: '09:00:00',
  end_time: '12:00:00',
  patients: [{
    patient_id: 'patient-1',
    patient_name: 'Paciente domiciliar cadastrado',
    patient_number: 'CAPO-101',
    address: 'Endereço cadastrado',
    phone: '35999999999',
    status: 'programada',
  }],
}

afterEach(() => cleanup())

describe('Visita Domiciliar dentro da grade oficial da Assistência Social', () => {
  it('exibe paciente na visão Dia mesmo quando o bloqueio elimina todos os horários livres', () => {
    render(<HomeScheduleGrid slots={[]} appointments={[]} homeVisits={[visit]}
      startDate="2026-11-18" endDate="2026-11-18" view="day" />)
    expect(screen.getByRole('table')).toBeVisible()
    expect(screen.getByText('Paciente domiciliar cadastrado')).toBeVisible()
    expect(screen.getByText(/09:00–12:00 · Visita Domiciliar/)).toBeVisible()
    expect(screen.getByText('Endereço: Endereço cadastrado')).toBeVisible()
    expect(screen.getByText('Telefone: 35999999999')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Iniciar atendimento' })).not.toBeInTheDocument()
  })

  it.each([
    ['week', '2026-11-16', '2026-11-22'],
    ['month', '2026-11-01', '2026-11-30'],
  ] as const)('mostra uma única programação coletiva na visualização %s', (view, startDate, endDate) => {
    render(<HomeScheduleGrid slots={[]} appointments={[]} homeVisits={[visit]}
      startDate={startDate} endDate={endDate} view={view} />)
    expect(screen.getAllByText('Paciente domiciliar cadastrado')).toHaveLength(1)
    expect(screen.getAllByText(/09:00–12:00 · Visita Domiciliar/)).toHaveLength(1)
    const visitCard = screen.getByLabelText('Visita Domiciliar — 2026-11-18')
    expect(within(visitCard).getByText('1 paciente(s) programado(s) · período coletivo, sem horário individual')).toBeVisible()
  })

  it('preserva a grade convencional quando não há períodos específicos de visita', () => {
    render(<HomeScheduleGrid slots={[]} appointments={[]} homeVisits={[]}
      startDate="2026-11-18" endDate="2026-11-18" view="day" />)
    expect(screen.getByText('Nenhum horário configurado neste período.')).toBeVisible()
    expect(screen.queryByText('Paciente domiciliar cadastrado')).not.toBeInTheDocument()
  })
})
