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

function timeHHMM(value: unknown) {
  const text = stringValue(value)
  return /^\d{2}:\d{2}/.test(text) ? text.slice(0, 5) : text
}

type Props = Readonly<{
  professionalId: string
  title?: string
  intro?: string
  allowEmergencySlot?: boolean
}>

type PendingConfirmation = Readonly<{
  overlap: boolean
  affected: boolean
  conflict: boolean
}>

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

  const configurations =
    configuration?.status === 'success'
      ? rows(configuration.data, 'configurations')
      : []

  useEffect(() => {
    let active = true
    setConfiguration({ status: 'loading' })
    void rpc.getAgendaConfiguration(professionalId).then((result) => {
      if (!active) return
      setConfiguration(result)
      if (result.status === 'success') {
        const activeConfig = rows(result.data, 'configurations')
          .find((item) => booleanValue(item.is_active))
        if (activeConfig) setConfigId(stringValue(activeConfig.config_id))
      }
    })
    return () => {
      active = false
    }
  }, [professionalId, rpc])

  function resetForm() {
    setEntryType('')
    setDate('')
    setStartTime('')
    setEndTime('')
    setDescription('')
    setRescheduleInstructions('')
    setPendingConfirmation(null)
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
