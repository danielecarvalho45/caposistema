import { Link } from 'react-router-dom'
import type { AgendaScheduleSlot, AsyncState } from '../../lib/supabase/rpc'

function agendaBlockLabel(value: string | null) {
  switch (value) {
    case 'intervalo': return '☕ Intervalo / Café'
    case 'alimentacao': return '🍽️ Almoço'
    case 'estudo_caso': return '📚 Estudo de caso'
    case 'atendimento_online': return '💻 Atendimentos online'
    case 'rotina_administrativa': return '📋 Rotinas administrativas'
    case 'reuniao': return '👥 Reunião'
    case 'relatorio': return '📊 Relatório'
    case 'atividade': return '📋 Atividade interna'
    case 'bloqueio': return '⛔ Bloqueio'
    default: return value ?? 'Bloqueado'
  }
}

function slotTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      }).format(date)
}

export function TeamDayAgendaPanel({
  agenda,
  enableSchedulingActions = false,
}: Readonly<{
  agenda: AsyncState<readonly AgendaScheduleSlot[]>
  enableSchedulingActions?: boolean
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
        <div className="operational-agenda-slot-list" aria-label="Agendas dos profissionais">
          {agenda.data.map((slot) => (
            <div
              className={`operational-agenda-slot is-${slot.slot_status}`}
              key={`${slot.professional_id}:${slot.slot_start}`}
            >
              <strong>{slotTime(slot.slot_start)}</strong>
              <span className="operational-agenda-professional">{slot.professional_name}</span>
              <span className="operational-agenda-status">
                {slot.slot_status === 'livre'
                  ? 'Livre'
                  : slot.slot_status === 'bloqueado'
                    ? agendaBlockLabel(slot.block_type)
                    : slot.patient_name ?? 'Horário ocupado'}
              </span>

              {enableSchedulingActions && slot.slot_status === 'livre' && (
                <Link
                  className="operational-agenda-action"
                  to="/agenda"
                  state={{
                    origin: 'home_free_slot',
                    professionalId: slot.professional_id,
                    slotDate: slot.slot_date,
                    slotStart: slot.slot_start,
                  }}
                >
                  Agendar
                </Link>
              )}

              {slot.slot_status === 'agendado' && (
                <Link className="operational-agenda-action" to="/agenda">
                  Abrir
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <Link className="gestor-panel-foot" to="/agenda">
        Abrir Agenda Geral ›
      </Link>
    </article>
  )
}
