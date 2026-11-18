import { Link } from 'react-router-dom'
import type { AgendaScheduleSlot, AsyncState } from '../../lib/supabase/rpc'
import { DailyTeamAgendaRows } from './DailyTeamAgendaRows'

export function TeamDayAgendaPanel({
  agenda,
}: Readonly<{
  agenda: AsyncState<readonly AgendaScheduleSlot[]>
}>) {
  return (
    <article className="gestor-panel operational-agenda-panel">
      <header className="gestor-panel-head">
        <div>
          <p className="eyebrow">Hoje</p>
          <h2>Agenda Geral do Dia</h2>
        </div>
      </header>

      {agenda.status === 'loading' && <p>Carregando agendas dos profissionais…</p>}
      {agenda.status === 'error' && (
        <p role="alert">Não foi possível carregar as agendas dos profissionais.</p>
      )}
      {(agenda.status === 'empty' ||
        (agenda.status === 'success' && agenda.data.length === 0)) && (
        <div className="gestor-empty-state">
          Nenhum horário cadastrado para os profissionais neste dia.
        </div>
      )}

      {agenda.status === 'success' && agenda.data.length > 0 && (
        <DailyTeamAgendaRows slots={agenda.data} />
      )}

      <Link className="gestor-panel-foot" to="/agenda">
        Abrir Agenda Geral ›
      </Link>
    </article>
  )
}
