import { useEffect, useMemo, useState } from 'react'
import {
  getRpcService,
  type AsyncState,
} from '../../lib/supabase/rpc'

type Row = Readonly<Record<string, unknown>>

function record(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Row
    : null
}

function rows(value: unknown, key: string): readonly Row[] {
  const source = record(value)
  const list = source?.[key]
  return Array.isArray(list)
    ? list.filter((item): item is Row => record(item) !== null)
    : []
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function booleanValue(value: unknown) {
  return value === true
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function weekdayValues(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === 'number' && item >= 0 && item <= 6)
    : []
}

function timeHHMM(value: unknown) {
  const text = stringValue(value)
  return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text
}

type Props = Readonly<{
  professionalId: string
  title?: string
  intro?: string
  allowEmergencySlot?: boolean
  allowStructuralEdit?: boolean
}>

type PendingConfirmation = Readonly<{
  overlap: boolean
  affected: boolean
  conflict: boolean
}>

const weekdayLabels: Readonly<Record<number, string>> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

const managementActions = [
  {
    value: 'horario_provisorio',
    icon: '🕒',
    label: 'Alterar horário do dia',
    description: 'Mudar provisoriamente o início ou o fechamento da agenda.',
  },
  {
    value: 'bloqueio',
    icon: '⛔',
    label: 'Bloquear período',
    description: 'Fechar um intervalo específico da agenda.',
  },
  {
    value: 'alimentacao',
    icon: '🍽️',
    label: 'Almoço',
    description: 'Reservar temporariamente o horário de alimentação.',
  },
  {
    value: 'intervalo',
    icon: '☕',
    label: 'Café / Intervalo',
    description: 'Reservar um intervalo temporário.',
  },
  {
    value: 'reuniao',
    icon: '👥',
    label: 'Reunião',
    description: 'Bloquear horário para reunião.',
  },
  {
    value: 'atividade',
    icon: '📋',
    label: 'Atividade interna',
    description: 'Reservar período para atividade interna.',
  },
  {
    value: 'relatorio',
    icon: '📊',
    label: 'Relatório',
    description: 'Reservar período para elaboração de relatório.',
  },
  {
    value: 'excecao',
    icon: '📅',
    label: 'Exceção de data',
    description: 'Registrar um bloqueio excepcional em uma data.',
  },
  {
    value: 'urgencia',
    icon: '🚑',
    label: 'Horário de urgência',
    description: 'Abrir excepcionalmente um horário adicional para atendimento de urgência.',
  },
] as const

export function OwnAgendaManager({
  professionalId,
  title = 'Gerenciar minha agenda',
  intro = 'Você pode flexibilizar temporariamente sua própria agenda sem depender do Administrativo: ajustar café/almoço, reunião, atividade interna, relatório, bloquear períodos e alterar provisoriamente o horário em uma data específica. Alterações permanentes de jornada, turno, carga ou horário seguem Coordenação → anuência → efetivação administrativa.',
  allowEmergencySlot = false,
  allowStructuralEdit = false,
}: Props) {
  const rpc = useMemo(() => getRpcService(), [])
  const [configuration, setConfiguration] = useState<AsyncState<unknown> | null>(null)
  const [configId, setConfigId] = useState('')
  const [entryType, setEntryType] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [rescheduleInstructions, setRescheduleInstructions] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null)
  const [structuralConfigId, setStructuralConfigId] = useState('')
  const [structuralExpectedUpdatedAt, setStructuralExpectedUpdatedAt] = useState('')
  const [structuralStartDate, setStructuralStartDate] = useState('')
  const [structuralEndDate, setStructuralEndDate] = useState('')
  const [structuralStartTime, setStructuralStartTime] = useState('')
  const [structuralEndTime, setStructuralEndTime] = useState('')
  const [structuralDuration, setStructuralDuration] = useState(30)
  const [structuralWeekdays, setStructuralWeekdays] = useState<number[]>([])
  const [structuralNotes, setStructuralNotes] = useState('')
  const [structuralJustification, setStructuralJustification] = useState('')
  const [structuralFeedback, setStructuralFeedback] = useState<string | null>(null)
  const [structuralBusy, setStructuralBusy] = useState(false)
  const [recurringType, setRecurringType] = useState<'intervalo' | 'alimentacao'>('intervalo')
  const [recurringStartTime, setRecurringStartTime] = useState('')
  const [recurringEndTime, setRecurringEndTime] = useState('')
  const [recurringWeekdays, setRecurringWeekdays] = useState<number[]>([])
  const [recurringDescription, setRecurringDescription] = useState('')
  const [recurringFeedback, setRecurringFeedback] = useState<string | null>(null)
  const [recurringBusy, setRecurringBusy] = useState(false)

  const configurations =
    configuration?.status === 'success'
      ? rows(configuration.data, 'configurations')
      : []

  const selectedStructuralConfiguration = configurations.find(
    (item) => stringValue(item.config_id) === structuralConfigId,
  )

  const recurringIntervals = selectedStructuralConfiguration
    ? rows(selectedStructuralConfiguration, 'blocks').filter((item) => {
        const weekday = item.weekday
        return (
          booleanValue(item.is_active) &&
          typeof weekday === 'number' &&
          weekday >= 0 &&
          weekday <= 6 &&
          !stringValue(item.specific_date) &&
          ['intervalo', 'alimentacao'].includes(stringValue(item.block_type))
        )
      })
    : []

  useEffect(() => {
    let active = true
    setConfiguration({ status: 'loading' })
    void rpc.getAgendaConfiguration(professionalId).then((result) => {
      if (!active) return
      setConfiguration(result)
      if (result.status === 'success') {
        const list = rows(result.data, 'configurations')
        const activeConfig = list.find((item) => booleanValue(item.is_active))
        if (activeConfig) {
          const activeId = stringValue(activeConfig.config_id)
          setConfigId(activeId)
          setStructuralConfigId(activeId)
          setStructuralExpectedUpdatedAt(stringValue(activeConfig.updated_at))
          setStructuralStartDate(stringValue(activeConfig.start_date))
          setStructuralEndDate(stringValue(activeConfig.end_date))
          setStructuralStartTime(timeHHMM(activeConfig.start_time))
          setStructuralEndTime(timeHHMM(activeConfig.end_time))
          setStructuralDuration(numberValue(activeConfig.appointment_duration_minutes, 30))
          setStructuralWeekdays([...weekdayValues(activeConfig.weekdays)])
          setStructuralNotes(stringValue(activeConfig.notes))
        } else if (allowStructuralEdit) {
          const today = new Date()
          const local = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
          ].join('-')
          setStructuralConfigId('')
          setStructuralExpectedUpdatedAt('')
          setStructuralStartDate(local)
          setStructuralEndDate('')
          setStructuralStartTime('')
          setStructuralEndTime('')
          setStructuralDuration(30)
          setStructuralWeekdays([])
          setStructuralNotes('')
        }
      }
    })
    return () => {
      active = false
    }
  }, [allowStructuralEdit, professionalId, rpc])

  function resetForm() {
    setEntryType('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setDescription('')
    setRescheduleInstructions('')
    setPendingConfirmation(null)
  }

  function selectStructuralConfiguration(id: string) {
    setStructuralConfigId(id)
    setStructuralFeedback(null)
    const selected = configurations.find((item) => stringValue(item.config_id) === id)
    if (!selected) {
      setStructuralExpectedUpdatedAt('')
      return
    }
    setStructuralExpectedUpdatedAt(stringValue(selected.updated_at))
    setStructuralStartDate(stringValue(selected.start_date))
    setStructuralEndDate(stringValue(selected.end_date))
    setStructuralStartTime(timeHHMM(selected.start_time))
    setStructuralEndTime(timeHHMM(selected.end_time))
    setStructuralDuration(numberValue(selected.appointment_duration_minutes, 30))
    setStructuralWeekdays([...weekdayValues(selected.weekdays)])
    setStructuralNotes(stringValue(selected.notes))
  }

  function toggleStructuralWeekday(weekday: number, checked: boolean) {
    setStructuralWeekdays((current) =>
      checked
        ? [...new Set([...current, weekday])].sort((a, b) => a - b)
        : current.filter((item) => item !== weekday),
    )
  }

  function toggleRecurringWeekday(weekday: number, checked: boolean) {
    setRecurringWeekdays((current) =>
      checked
        ? [...new Set([...current, weekday])].sort((a, b) => a - b)
        : current.filter((item) => item !== weekday),
    )
  }

  async function refreshConfigurationAfterRecurringChange() {
    const refreshed = await rpc.getAgendaConfiguration(professionalId)
    setConfiguration(refreshed)
    if (refreshed.status !== 'success') return
    const list = rows(refreshed.data, 'configurations')
    const selected =
      list.find((item) => stringValue(item.config_id) === structuralConfigId) ??
      list.find((item) => booleanValue(item.is_active))
    if (!selected) return
    setStructuralConfigId(stringValue(selected.config_id))
    setStructuralExpectedUpdatedAt(stringValue(selected.updated_at))
  }

  async function saveRecurringInterval() {
    if (
      recurringBusy ||
      !structuralConfigId ||
      recurringWeekdays.length === 0 ||
      !recurringStartTime ||
      !recurringEndTime ||
      recurringEndTime <= recurringStartTime
    ) {
      setRecurringFeedback('Selecione os dias e informe um intervalo de horário válido.')
      return
    }

    if (recurringWeekdays.some((weekday) => !structuralWeekdays.includes(weekday))) {
      setRecurringFeedback('O intervalo só pode ser aplicado aos dias ativos da agenda.')
      return
    }

    setRecurringBusy(true)
    setRecurringFeedback(null)
    const result = await rpc.saveAgendaRecurringInterval({
      agendaConfigId: structuralConfigId,
      weekdays: recurringWeekdays,
      startTime: recurringStartTime,
      endTime: recurringEndTime,
      blockType: recurringType,
      description: recurringDescription.trim() || null,
    })

    if (result.status === 'error') {
      setRecurringFeedback(result.error.message)
      setRecurringBusy(false)
      return
    }

    const payload = record(result.data)
    if (payload?.success === false) {
      setRecurringFeedback(
        stringValue(payload.message) || 'O intervalo semanal não foi registrado.',
      )
      setRecurringBusy(false)
      return
    }

    setRecurringFeedback('Intervalo semanal aplicado à configuração-base.')
    setRecurringStartTime('')
    setRecurringEndTime('')
    setRecurringWeekdays([])
    setRecurringDescription('')
    await refreshConfigurationAfterRecurringChange()
    setRecurringBusy(false)
  }

  async function removeRecurringInterval(blockId: string) {
    if (!blockId || recurringBusy) return
    setRecurringBusy(true)
    setRecurringFeedback(null)
    const result = await rpc.setAgendaRecurringIntervalStatus(blockId, false)
    if (result.status === 'error') {
      setRecurringFeedback(result.error.message)
      setRecurringBusy(false)
      return
    }
    setRecurringFeedback('Intervalo semanal removido da grade ativa.')
    await refreshConfigurationAfterRecurringChange()
    setRecurringBusy(false)
  }

  async function saveStructuralConfiguration() {
    if (
      structuralBusy ||
      !structuralStartDate ||
      !structuralStartTime ||
      !structuralEndTime ||
      structuralEndTime <= structuralStartTime ||
      structuralDuration <= 0 ||
      structuralWeekdays.length === 0
    ) {
      setStructuralFeedback('Informe vigência, dias da semana, horário inicial/final e duração válida.')
      return
    }

    setStructuralBusy(true)
    setStructuralFeedback(null)
    const result = await rpc.saveAgendaConfiguration({
      configId: structuralConfigId || null,
      professionalId,
      startDate: structuralStartDate,
      endDate: structuralEndDate || null,
      startTime: structuralStartTime,
      endTime: structuralEndTime,
      durationMinutes: structuralDuration,
      weekdays: structuralWeekdays,
      notes: structuralNotes.trim() || null,
      expectedUpdatedAt: structuralConfigId ? structuralExpectedUpdatedAt || null : null,
      justification: structuralJustification.trim() || null,
    })

    if (result.status === 'error') {
      setStructuralFeedback(result.error.message)
      setStructuralBusy(false)
      return
    }

    const payload = record(result.data)
    if (payload?.success === false) {
      setStructuralFeedback(
        stringValue(payload.message) ||
          'A alteração não foi aplicada porque existem atendimentos que precisam ser tratados antes.',
      )
      setStructuralBusy(false)
      return
    }

    setStructuralFeedback('Configuração-base da agenda atualizada.')
    setStructuralJustification('')
    const refreshed = await rpc.getAgendaConfiguration(professionalId)
    setConfiguration(refreshed)
    if (refreshed.status === 'success') {
      const activeConfig = rows(refreshed.data, 'configurations')
        .find((item) => booleanValue(item.is_active))
      if (activeConfig) {
        const id = stringValue(activeConfig.config_id)
        setConfigId(id)
        selectStructuralConfiguration(id)
        setStructuralExpectedUpdatedAt(stringValue(activeConfig.updated_at))
        setStructuralStartDate(stringValue(activeConfig.start_date))
        setStructuralEndDate(stringValue(activeConfig.end_date))
        setStructuralStartTime(timeHHMM(activeConfig.start_time))
        setStructuralEndTime(timeHHMM(activeConfig.end_time))
        setStructuralDuration(numberValue(activeConfig.appointment_duration_minutes, 30))
        setStructuralWeekdays([...weekdayValues(activeConfig.weekdays)])
        setStructuralNotes(stringValue(activeConfig.notes))
      }
    }
    setStructuralBusy(false)
  }

  async function submit(confirm = false) {
    if (
      !configId ||
      !entryType ||
      !date ||
      !startTime ||
      !endTime ||
      endTime <= startTime ||
      busy
    ) {
      setFeedback('Selecione a configuração, o tipo, a data e um período válido.')
      return
    }

    if (description.trim().length < 5) {
      setFeedback('Informe uma justificativa operacional com pelo menos cinco caracteres.')
      return
    }

    setBusy(true)
    setFeedback(null)

    if (entryType === 'excecao' || entryType === 'horario_provisorio' || entryType === 'urgencia') {
      const result = await rpc.createAgendaException({
        agendaConfigId: configId,
        exceptionDate: date,
        exceptionType:
          entryType === 'horario_provisorio'
            ? 'alteracao_horario'
            : entryType === 'urgencia'
              ? 'atendimento_extra'
              : 'bloqueio',
        startTime,
        endTime,
        description: description.trim(),
        confirmConflict: confirm,
      })
      if (result.status === 'success') {
        const data = record(result.data)
        if (data && data.success === false && data.requires_conflict_confirmation === true) {
          setPendingConfirmation({ overlap: false, affected: false, conflict: true })
          setFeedback(
            stringValue(data.message) ||
              'Existe conflito nessa data. Confirme para registrar a exceção.',
          )
        } else {
          setFeedback(
            entryType === 'horario_provisorio'
              ? 'Horário provisório registrado na própria agenda.'
              : entryType === 'urgencia'
                ? 'Horário adicional de urgência incluído na agenda.'
                : 'Exceção temporária registrada na agenda.',
          )
          resetForm()
        }
      } else if (result.status === 'error') {
        setFeedback(result.error.message)
      }
      setBusy(false)
      return
    }

    const result = await rpc.createAgendaBlock({
      agendaConfigId: configId,
      weekday: null,
      specificDate: date,
      startTime,
      endTime,
      blockType: entryType,
      description: description.trim(),
      confirmOverlap: confirm,
      confirmAffected: confirm,
      rescheduleInstructions: rescheduleInstructions.trim(),
    })

    if (result.status === 'success') {
      const data = record(result.data)
      if (data && data.success === false) {
        const overlap = data.requires_overlap_confirmation === true
        const affected = data.requires_affected_confirmation === true
        setPendingConfirmation({ overlap, affected, conflict: false })
        setFeedback(
          stringValue(data.message) ||
            'A operação exige confirmação adicional antes de ser registrada.',
        )
      } else {
        setFeedback('Alteração temporária registrada na agenda.')
        resetForm()
      }
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }

    setBusy(false)
  }

  return (
    <section className="agenda-own-management" aria-labelledby="own-agenda-title">
      <h3 id="own-agenda-title">{title}</h3>
      <p>{intro}</p>

      {configuration?.status === 'loading' && <p>Carregando configuração da agenda…</p>}
      {configuration?.status === 'error' && (
        <p role="alert">{configuration.error.message}</p>
      )}
      {configuration?.status === 'empty' && (
        <p>Nenhuma configuração de agenda foi encontrada.</p>
      )}

      {allowStructuralEdit && configuration?.status === 'success' && (
        <section className="agenda-structural-editor" aria-labelledby="agenda-structural-title">
          <div className="agenda-structural-heading">
            <div>
              <p className="eyebrow">Gestor / Titular</p>
              <h4 id="agenda-structural-title">Configuração-base da agenda</h4>
              <p>Edite diretamente a agenda permanente do profissional: dias, horário, duração e vigência.</p>
            </div>
          </div>

          {configurations.length > 0 && (
            <label>
              Configuração
              <select
                value={structuralConfigId}
                onChange={(event) => selectStructuralConfiguration(event.target.value)}
              >
                {configurations.map((item) => (
                  <option key={stringValue(item.config_id)} value={stringValue(item.config_id)}>
                    {timeHHMM(item.start_time)}–{timeHHMM(item.end_time)}
                    {booleanValue(item.is_active) ? ' · Ativa' : ' · Inativa'}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="agenda-structural-grid">
            <label>
              Início da vigência
              <input type="date" value={structuralStartDate} onChange={(event) => setStructuralStartDate(event.target.value)} />
            </label>
            <label>
              Fim da vigência
              <input type="date" value={structuralEndDate} onChange={(event) => setStructuralEndDate(event.target.value)} />
            </label>
            <label>
              Horário inicial
              <input type="time" value={structuralStartTime} onChange={(event) => setStructuralStartTime(event.target.value)} />
            </label>
            <label>
              Horário final
              <input type="time" value={structuralEndTime} onChange={(event) => setStructuralEndTime(event.target.value)} />
            </label>
            <label>
              Duração da consulta (minutos)
              <input type="number" min="1" step="1" value={structuralDuration} onChange={(event) => setStructuralDuration(Number(event.target.value))} />
            </label>
          </div>

          <fieldset className="agenda-structural-weekdays">
            <legend>Dias da semana</legend>
            {[
              [1, 'Segunda'],
              [2, 'Terça'],
              [3, 'Quarta'],
              [4, 'Quinta'],
              [5, 'Sexta'],
              [6, 'Sábado'],
              [0, 'Domingo'],
            ].map(([weekday, label]) => (
              <label key={weekday}>
                <input
                  type="checkbox"
                  checked={structuralWeekdays.includes(Number(weekday))}
                  onChange={(event) => toggleStructuralWeekday(Number(weekday), event.target.checked)}
                />
                {label}
              </label>
            ))}
          </fieldset>

          <section className="agenda-recurring-intervals" aria-labelledby="agenda-recurring-title">
            <div className="agenda-recurring-heading">
              <div>
                <h5 id="agenda-recurring-title">Intervalos semanais recorrentes</h5>
                <p>
                  Defina almoço ou intervalo para um, vários ou todos os dias ativos.
                  Esses períodos passam a fazer parte da agenda semanal permanente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecurringWeekdays([...structuralWeekdays])}
                disabled={structuralWeekdays.length === 0 || recurringBusy}
              >
                Usar todos os dias ativos
              </button>
            </div>

            <div className="agenda-recurring-grid">
              <label>
                Tipo
                <select
                  value={recurringType}
                  onChange={(event) => setRecurringType(event.target.value as 'intervalo' | 'alimentacao')}
                >
                  <option value="intervalo">Intervalo</option>
                  <option value="alimentacao">Almoço / Alimentação</option>
                </select>
              </label>
              <label>
                Início
                <input type="time" value={recurringStartTime} onChange={(event) => setRecurringStartTime(event.target.value)} />
              </label>
              <label>
                Fim
                <input type="time" value={recurringEndTime} onChange={(event) => setRecurringEndTime(event.target.value)} />
              </label>
            </div>

            <fieldset className="agenda-structural-weekdays">
              <legend>Aplicar nos dias</legend>
              {[
                [1, 'Segunda'],
                [2, 'Terça'],
                [3, 'Quarta'],
                [4, 'Quinta'],
                [5, 'Sexta'],
                [6, 'Sábado'],
                [0, 'Domingo'],
              ].map(([weekday, label]) => {
                const day = Number(weekday)
                const active = structuralWeekdays.includes(day)
                return (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={recurringWeekdays.includes(day)}
                      disabled={!active || recurringBusy}
                      onChange={(event) => toggleRecurringWeekday(day, event.target.checked)}
                    />
                    {label}
                  </label>
                )
              })}
            </fieldset>

            <label>
              Observação do intervalo
              <input value={recurringDescription} onChange={(event) => setRecurringDescription(event.target.value)} />
            </label>

            <button
              type="button"
              className="agenda-structural-save"
              disabled={recurringBusy || !structuralConfigId}
              onClick={() => void saveRecurringInterval()}
            >
              {recurringBusy ? 'Salvando…' : 'Adicionar intervalo semanal'}
            </button>

            {recurringIntervals.length > 0 && (
              <div className="agenda-recurring-list" aria-label="Intervalos semanais ativos">
                <strong>Intervalos ativos</strong>
                {recurringIntervals.map((item) => {
                  const weekday = numberValue(item.weekday, -1)
                  const blockId = stringValue(item.id)
                  return (
                    <div className="agenda-recurring-row" key={blockId}>
                      <span>{weekdayLabels[weekday] ?? 'Dia'} · {timeHHMM(item.start_time)}–{timeHHMM(item.end_time)}</span>
                      <small>{stringValue(item.block_type) === 'alimentacao' ? 'Almoço / Alimentação' : 'Intervalo'}</small>
                      <button type="button" disabled={recurringBusy} onClick={() => void removeRecurringInterval(blockId)}>
                        Remover
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {recurringFeedback && <p role="status">{recurringFeedback}</p>}
          </section>

          <label>
            Observação da configuração
            <textarea rows={2} value={structuralNotes} onChange={(event) => setStructuralNotes(event.target.value)} />
          </label>

          <label>
            Justificativa, quando necessária
            <textarea rows={2} value={structuralJustification} onChange={(event) => setStructuralJustification(event.target.value)} />
          </label>

          <button type="button" className="agenda-structural-save" disabled={structuralBusy} onClick={() => void saveStructuralConfiguration()}>
            {structuralBusy ? 'Salvando…' : 'Salvar configuração-base'}
          </button>
          {structuralFeedback && <p role="status">{structuralFeedback}</p>}
        </section>
      )}

      <div className="agenda-own-action-grid" aria-label="Ações temporárias da própria agenda">
        {managementActions
          .filter((action) => action.value !== 'urgencia' || allowEmergencySlot)
          .map((action) => (
          <button
            key={action.value}
            type="button"
            className="agenda-own-action-card"
            aria-pressed={entryType === action.value}
            disabled={configurations.length === 0 || busy}
            onClick={() => {
              setEntryType(action.value)
              setPendingConfirmation(null)
              setFeedback(null)
            }}
          >
            <span className="agenda-own-action-icon" aria-hidden="true">{action.icon}</span>
            <strong>{action.label}</strong>
            <small>{action.description}</small>
          </button>
        ))}
      </div>

      {configuration?.status === 'success' && configurations.length === 0 && (
        <p className="agenda-own-warning" role="alert">
          Este contexto profissional não possui configuração de agenda ativa disponível.
          Os ajustes temporários só podem ser registrados depois que existir uma agenda configurada para este profissional.
        </p>
      )}

      {configurations.length > 0 && (
        <>
          <label>
            Configuração
            <select value={configId} onChange={(event) => setConfigId(event.target.value)}>
              <option value="">Selecionar</option>
              {configurations.map((item) => (
                <option key={stringValue(item.config_id)} value={stringValue(item.config_id)}>
                  {timeHHMM(item.start_time)}–{timeHHMM(item.end_time)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ação selecionada
            <input
              readOnly
              value={
                managementActions.find((action) => action.value === entryType)?.label ?? 'Selecione uma ação acima'
              }
            />
          </label>

          <label>
            Data
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Início
            <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          </label>
          <label>
            Fim
            <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </label>
          <label>
            Justificativa operacional
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              minLength={5}
              maxLength={800}
              rows={3}
            />
          </label>

          {entryType !== 'excecao' && entryType !== 'horario_provisorio' && entryType !== 'urgencia' && (
            <label>
              Orientação de remanejamento, se houver paciente afetado
              <textarea
                value={rescheduleInstructions}
                onChange={(event) => setRescheduleInstructions(event.target.value)}
                maxLength={800}
                rows={3}
              />
            </label>
          )}

          {feedback && <p role="status">{feedback}</p>}

          {pendingConfirmation ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(true)}
            >
              Confirmar alteração temporária
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(false)}
            >
              Registrar alteração temporária
            </button>
          )}
        </>
      )}
    </section>
  )
}
