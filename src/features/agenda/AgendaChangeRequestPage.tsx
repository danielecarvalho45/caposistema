import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'

type Row = Record<string, unknown>
function record(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null
}
function rows(value: unknown, field: string): Row[] {
  const source = record(value)
  const list = Array.isArray(value) ? value : source?.[field]
  return Array.isArray(list) ? list.map(record).filter((item): item is Row => item !== null) : []
}
function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
function number(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
function weekdayValues(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && item >= 0 && item <= 6)
    : []
}
function timeHHMM(value: unknown): string {
  const text = string(value)
  return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text
}
const weekdayLabels: Readonly<Record<number, string>> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

type Service = Pick<ReturnType<typeof getRpcService>, 'getAgendaConfiguration' | 'getAgendaChangeRequests' | 'createAgendaChangeRequest'>
export function AgendaChangeRequestPage({ accessContext, service = getRpcService() }: { accessContext: AccessContext; service?: Service }) {
  const professionalId = accessContext.professional_id
  const [configuration, setConfiguration] = useState<AsyncState<unknown>>(loadingState)
  const [requests, setRequests] = useState<AsyncState<unknown>>(loadingState)
  const [configId, setConfigId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [notes, setNotes] = useState('')
  const [justification, setJustification] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const authorized = accessContext.is_active && Boolean(professionalId) && accessContext.roles.some((role) => role.code === 'profissional')

  function hydrateConfiguration(id: string) {
    setConfigId(id)
    const item = configuration.status === 'success'
      ? rows(configuration.data, 'configurations').find((config) => string(config.config_id) === id)
      : undefined
    if (!item) return
    setStartDate(string(item.start_date))
    setEndDate(string(item.end_date))
    setStartTime(timeHHMM(item.start_time))
    setEndTime(timeHHMM(item.end_time))
    setDurationMinutes(String(number(item.appointment_duration_minutes) || ''))
    setWeekdays(weekdayValues(item.weekdays))
    setNotes(string(item.notes))
  }

  function toggleWeekday(weekday: number, checked: boolean) {
    setWeekdays((current) =>
      checked
        ? [...new Set([...current, weekday])].sort((a, b) => a - b)
        : current.filter((item) => item !== weekday),
    )
  }

  useEffect(() => {
    if (!authorized || !professionalId) return
    let active = true
    void service.getAgendaConfiguration(professionalId).then((result) => { if (active) setConfiguration(result) })
    void service.getAgendaChangeRequests(null, professionalId, 50).then((result) => { if (active) setRequests(result) })
    return () => { active = false }
  }, [authorized, professionalId, service])

  async function submit() {
    const duration = Number(durationMinutes)
    if (
      !authorized ||
      !professionalId ||
      !configId ||
      !startDate ||
      !startTime ||
      !endTime ||
      endTime <= startTime ||
      (endDate && endDate < startDate) ||
      !Number.isInteger(duration) ||
      duration <= 0 ||
      weekdays.length === 0 ||
      justification.trim().length < 5 ||
      justification.trim().length > 1000 ||
      busy
    ) return
    setBusy(true); setFeedback('')
    const result = await service.createAgendaChangeRequest(
      configId,
      'configuracao',
      {
        start_date: startDate,
        end_date: endDate || null,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: duration,
        weekdays,
        notes: notes.trim() || null,
      },
      justification.trim(),
    )
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O backend não confirmou a solicitação.'); setBusy(false); return
    }
    setRequests(loadingState())
    const reloaded = await service.getAgendaChangeRequests(null, professionalId, 50)
    setRequests(reloaded)
    const requestId = string(record(result.data)?.request_id)
    if (reloaded.status === 'success' && requestId && rows(reloaded.data, 'requests').some((item) => item.request_id === requestId)) {
      setJustification('')
      setFeedback('Solicitação registrada e lista recarregada do banco.')
    } else {
      setFeedback(reloaded.status === 'error' ? `Solicitação registrada, mas a recarga falhou: ${reloaded.error.message}` : 'Solicitação registrada, mas ainda não apareceu na lista consultada.')
    }
    setBusy(false)
  }
  if (!authorized) return <section className="home-page"><h1>Solicitação de agenda indisponível</h1><p>É necessário vínculo profissional ativo e autorizado.</p></section>
  const configs = configuration.status === 'success' ? rows(configuration.data, 'configurations') : []
  const pending = requests.status === 'success' ? rows(requests.data, 'requests') : []
  return <section className="home-page" aria-labelledby="agenda-change-title">
    <header className="home-welcome">
      <p className="eyebrow">Minha agenda</p>
      <h1 id="agenda-change-title">Solicitar alteração de agenda</h1>
      <p>Informe exatamente a mudança desejada. A Coordenação apenas aprova ou rejeita; se aprovada, a alteração segue para efetivação administrativa.</p>
    </header>
    <section className="home-profile"><h2>Mudança de horário / padrão semanal</h2>
      {configuration.status === 'loading' && <p>Carregando configurações…</p>}
      {configuration.status === 'error' && <p role="alert">{configuration.error.message}</p>}
      {configuration.status === 'empty' && <p>Nenhuma configuração retornada.</p>}
      {configuration.status === 'success' && configs.length === 0 && <p>Não há configuração de agenda disponível para solicitar alteração.</p>}
      {configs.length > 0 && <>
        <label>Configuração atual
          <select value={configId} onChange={(event) => hydrateConfiguration(event.target.value)}>
            <option value="">Selecione</option>
            {configs.map((item) => <option key={string(item.config_id)} value={string(item.config_id)}>{string(item.start_date)} · {timeHHMM(item.start_time)}–{timeHHMM(item.end_time)}</option>)}
          </select>
        </label>
        {configId && <>
          <div className="home-profile-grid">
            <label>Data inicial<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
            <label>Data final<input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            <label>Horário inicial<input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
            <label>Horário final<input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
            <label>Duração da consulta (minutos)<input type="number" min="1" step="1" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
          </div>
          <fieldset>
            <legend>Dias da semana</legend>
            <div className="home-profile-grid">
              {Object.entries(weekdayLabels).map(([weekday, label]) => {
                const value = Number(weekday)
                return <label key={weekday}>
                  <input type="checkbox" checked={weekdays.includes(value)} onChange={(event) => toggleWeekday(value, event.target.checked)} />
                  {label}
                </label>
              })}
            </div>
          </fieldset>
          <label>Observações da configuração<textarea value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} /></label>
          <label>Justificativa da solicitação<textarea minLength={5} maxLength={1000} value={justification} onChange={(event) => setJustification(event.target.value)} /></label>
          <button
            type="button"
            disabled={
              busy ||
              !startDate ||
              !startTime ||
              !endTime ||
              endTime <= startTime ||
              Boolean(endDate && endDate < startDate) ||
              !Number.isInteger(Number(durationMinutes)) ||
              Number(durationMinutes) <= 0 ||
              weekdays.length === 0 ||
              justification.trim().length < 5
            }
            onClick={() => void submit()}
          >
            {busy ? 'Enviando…' : 'Enviar à Coordenação'}
          </button>
        </>}
      </>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
    <section className="home-profile"><h2>Solicitações da própria agenda</h2>
      {requests.status === 'loading' && <p>Carregando solicitações…</p>}
      {requests.status === 'error' && <p role="alert">{requests.error.message}</p>}
      {requests.status === 'empty' && <p>Nenhuma solicitação retornada.</p>}
      {requests.status === 'success' && (pending.length ? <ul>{pending.map((item) => <li key={string(item.request_id)}><strong>{string(item.status)}</strong> · {string(item.justification)}{string(item.decision_reason) && <> · Decisão: {string(item.decision_reason)}</>}</li>)}</ul> : <p>Nenhuma solicitação retornada.</p>)}
    </section>
  </section>
}
