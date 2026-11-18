import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AgendaScheduleSlot, type AsyncState } from '../../lib/supabase/rpc'
import { DailyTeamAgendaRows } from './DailyTeamAgendaRows'
import './daily-team-agenda.css'

type AgendaLoader = (
  startDate: string,
  endDate: string,
  professionalId: string | null,
) => Promise<AsyncState<readonly AgendaScheduleSlot[]>>

function nextBusinessDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12))
  while (next.getUTCDay() === 0 || next.getUTCDay() === 6) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next.toISOString().slice(0, 10)
}

export function administrativeAgendaDates(now = new Date()) {
  const today = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  // Em sábados e domingos a Home antecipa os dois próximos dias úteis.
  const [year, month, day] = today.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  const first = weekday === 0 || weekday === 6
    ? nextBusinessDay(new Date(Date.UTC(year, month - 1, day - 1, 12)).toISOString().slice(0, 10))
    : today
  return { first, second: nextBusinessDay(first), isToday: first === today }
}

function displayDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)))
}

export function AdministrativeTwoDayAgenda({
  loadAgenda = getRpcService().getAgendaScheduleGrid,
}: Readonly<{ loadAgenda?: AgendaLoader }>) {
  const [dates] = useState(() => administrativeAgendaDates())
  const [first, setFirst] = useState<AsyncState<readonly AgendaScheduleSlot[]>>(loadingState())
  const [second, setSecond] = useState<AsyncState<readonly AgendaScheduleSlot[]>>(loadingState())

  useEffect(() => {
    let active = true
    void loadAgenda(dates.first, dates.first, null)
      .then((result) => { if (active) setFirst(result) })
      .catch(() => { if (active) setFirst({ status: 'error', error: { message: 'Falha na consulta da agenda.' } } as AsyncState<readonly AgendaScheduleSlot[]>) })
    void loadAgenda(dates.second, dates.second, null)
      .then((result) => { if (active) setSecond(result) })
      .catch(() => { if (active) setSecond({ status: 'error', error: { message: 'Falha na consulta da agenda.' } } as AsyncState<readonly AgendaScheduleSlot[]>) })
    return () => { active = false }
  }, [dates, loadAgenda])

  return (
    <article className="gestor-panel capo-two-day-home" aria-label="Agenda administrativa de dois dias úteis">
      <header className="gestor-panel-head">
        <div><p className="eyebrow">Agendas administrativas</p><h2>Hoje e próximo dia útil</h2></div>
      </header>
      <div className="capo-two-day-grid">
        {([
          { date: dates.first, label: dates.isToday ? 'Hoje' : 'Próximo dia útil', state: first, mode: 'today' as const },
          { date: dates.second, label: dates.isToday ? 'Próximo dia útil' : 'Dia útil seguinte', state: second, mode: 'next' as const },
        ]).map((column) => (
          <section className="capo-two-day-column" key={column.date} aria-label={column.label}>
            <h3>{column.label} <small>— {displayDate(column.date)}</small></h3>
            <p>{column.mode === 'today' ? 'Consultas agendadas e disponibilidade resumida' : 'Consultas agendadas e horários livres'}</p>
            {column.state.status === 'loading' && <p>Carregando agenda…</p>}
            {column.state.status === 'error' && <p role="alert">Não foi possível consultar a agenda deste dia.</p>}
            {column.state.status === 'empty' && <DailyTeamAgendaRows slots={[]} day={column.date} mode={column.mode} />}
            {column.state.status === 'success' && <DailyTeamAgendaRows slots={column.state.data} day={column.date} mode={column.mode} />}
          </section>
        ))}
      </div>
      <Link className="gestor-panel-foot" to="/agenda">Consultar Agenda Geral ›</Link>
    </article>
  )
}
