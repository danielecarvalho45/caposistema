import { useCallback, useEffect, useState } from 'react'
import { capoTodayIso } from '../../lib/date/capo-locale'
import { getSupabaseClient } from '../../lib/supabase/client'
import './professional-cancellations.css'

export type DailyCancellation = Readonly<{
  appointment_id: string
  appointment_date: string
  patient_name: string
  cancellation_reason: string
  cancelled_at: string
  cancelled_by: string
}>

export function getCancellationSummary(rows: readonly DailyCancellation[]) {
  return rows.slice().sort((a, b) => Date.parse(a.appointment_date) - Date.parse(b.appointment_date))
}

function dateTime(value: string, options: Intl.DateTimeFormatOptions) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Não registrado' :
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...options }).format(date)
}

export function ProfessionalDailyCancellations() {
  const [rows, setRows] = useState<readonly DailyCancellation[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const reload = useCallback(async () => {
    try {
      const { data, error } = await getSupabaseClient().rpc(
        'get_my_daily_appointment_cancellations_for_interface' as never,
        { p_date: capoTodayIso() } as never,
      )
      if (error) throw error
      setRows(Array.isArray(data) ? data as DailyCancellation[] : [])
      setState('success')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => {
    void reload()
    const onFocus = () => { if (document.visibilityState === 'visible') void reload() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, 30000)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.clearInterval(interval)
    }
  }, [reload])

  const items = getCancellationSummary(rows)
  return (
    <article className="agenda-home-cancellations" aria-label="Cancelamentos do dia">
      <header>
        <span>Cancelamentos do Dia</span>
        <strong>{state === 'success' ? items.length : '—'}</strong>
      </header>
      {state === 'loading' && <p>Consultando cancelamentos…</p>}
      {state === 'error' && <p role="alert">Não foi possível consultar os cancelamentos.</p>}
      {state === 'success' && items.length === 0 && <p>Nenhum cancelamento registrado hoje.</p>}
      {state === 'success' && items.length > 0 && (
        <ul>
          {items.map(item => (
            <li key={item.appointment_id}>
              <strong>{dateTime(item.appointment_date, { hour: '2-digit', minute: '2-digit', hour12: false })} — {item.patient_name}</strong>
              <p><b>Motivo:</b> {item.cancellation_reason}</p>
              <small>Cancelado em {dateTime(item.cancelled_at, { dateStyle: 'short', timeStyle: 'short' })} · Registrado por {item.cancelled_by}</small>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
