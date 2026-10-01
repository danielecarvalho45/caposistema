import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { TeamDayAgendaPanel } from '../../src/features/home/TeamDayAgendaPanel'

it('renderiza a mesma agenda geral do dia para perfis que compartilham o painel', () => {
  render(
    <MemoryRouter>
      <TeamDayAgendaPanel
        agenda={{
          status: 'success',
          data: [
            {
              professional_id: 'p1',
              professional_name: 'Médico Clínico',
              slot_date: '2026-09-30',
              weekday: 3,
              slot_start: '2026-09-30T12:00:00.000Z',
              slot_end: '2026-09-30T12:30:00.000Z',
              duration_minutes: 30,
              slot_status: 'livre',
              appointment_id: null,
              patient_id: null,
              patient_name: null,
              appointment_type: null,
              block_type: null,
            },
            {
              professional_id: 'p2',
              professional_name: 'Nutricionista',
              slot_date: '2026-09-30',
              weekday: 3,
              slot_start: '2026-09-30T13:00:00.000Z',
              slot_end: '2026-09-30T13:30:00.000Z',
              duration_minutes: 30,
              slot_status: 'bloqueado',
              appointment_id: null,
              patient_id: null,
              patient_name: null,
              appointment_type: null,
              block_type: 'alimentacao',
            },
            {
              professional_id: 'p3',
              professional_name: 'Assistente Social',
              slot_date: '2026-09-30',
              weekday: 3,
              slot_start: '2026-09-30T14:00:00.000Z',
              slot_end: '2026-09-30T14:30:00.000Z',
              duration_minutes: 30,
              slot_status: 'agendado',
              appointment_id: 'a1',
              patient_id: 'patient-1',
              patient_name: 'Paciente agendado',
              appointment_type: 'retorno',
              block_type: null,
            },
          ],
        }}
      />
    </MemoryRouter>,
  )

  expect(screen.getByRole('heading', { name: 'Agenda Geral do Dia' })).toBeVisible()
  const agendas = screen.getByLabelText('Agendas dos profissionais')
  expect(within(agendas).getByText('Médico Clínico')).toBeVisible()
  expect(within(agendas).getByText('Nutricionista')).toBeVisible()
  expect(within(agendas).getByText('Assistente Social')).toBeVisible()
  expect(within(agendas).getByText('Livre')).toBeVisible()
  expect(within(agendas).getByText('🍽️ Almoço')).toBeVisible()
  expect(within(agendas).getByText('Paciente agendado')).toBeVisible()
})

it('mantém ação de agendamento somente quando o contexto permite', () => {
  const agenda = {
    status: 'success' as const,
    data: [{
      professional_id: 'p1',
      professional_name: 'Médico Clínico',
      slot_date: '2026-09-30',
      weekday: 3,
      slot_start: '2026-09-30T12:00:00.000Z',
      slot_end: '2026-09-30T12:30:00.000Z',
      duration_minutes: 30,
      slot_status: 'livre' as const,
      appointment_id: null,
      patient_id: null,
      patient_name: null,
      appointment_type: null,
      block_type: null,
    }],
  }

  const { rerender } = render(
    <MemoryRouter>
      <TeamDayAgendaPanel agenda={agenda} />
    </MemoryRouter>,
  )
  expect(screen.queryByRole('link', { name: 'Agendar' })).not.toBeInTheDocument()

  rerender(
    <MemoryRouter>
      <TeamDayAgendaPanel agenda={agenda} enableSchedulingActions />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Agendar' })).toBeVisible()
})
