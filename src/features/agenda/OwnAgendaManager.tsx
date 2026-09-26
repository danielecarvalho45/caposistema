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

type Props = Readonly<{
  professionalId: string
}>

type PendingConfirmation = Readonly<{
  overlap: boolean
  affected: boolean
  conflict: boolean
}>

export function OwnAgendaManager({ professionalId }: Props) {
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

    if (entryType === 'excecao') {
      const result = await rpc.createAgendaException({
        agendaConfigId: configId,
        exceptionDate: date,
        exceptionType: 'bloqueio',
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
          setFeedback('Exceção temporária registrada na própria agenda.')
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
        setFeedback('Alteração temporária registrada na própria agenda.')
        resetForm()
      }
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }

    setBusy(false)
  }

  return (
    <section className="agenda-own-management" aria-labelledby="own-agenda-title">
      <h3 id="own-agenda-title">Gerenciar minha agenda</h3>
      <p>
        Ajustes temporários da própria disponibilidade. Mudanças estruturais de
        jornada, carga ou disponibilidade devem ser solicitadas ao Coordenador.
      </p>

      {configuration?.status === 'loading' && <p>Carregando configuração da agenda…</p>}
      {configuration?.status === 'error' && (
        <p role="alert">{configuration.error.message}</p>
      )}
      {configuration?.status === 'empty' && (
        <p>Nenhuma configuração de agenda foi encontrada.</p>
      )}

      {configurations.length > 0 && (
        <>
          <label>
            Configuração
            <select value={configId} onChange={(event) => setConfigId(event.target.value)}>
              <option value="">Selecionar</option>
              {configurations.map((item) => (
                <option key={stringValue(item.config_id)} value={stringValue(item.config_id)}>
                  {stringValue(item.start_date)} · {stringValue(item.start_time)}–{stringValue(item.end_time)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo
            <select value={entryType} onChange={(event) => {
              setEntryType(event.target.value)
              setPendingConfirmation(null)
            }}>
              <option value="">Selecionar</option>
              <option value="intervalo">Café / Intervalo</option>
              <option value="alimentacao">Alimentação</option>
              <option value="reuniao">Reunião</option>
              <option value="atividade">Atividade interna</option>
              <option value="relatorio">Relatório</option>
              <option value="bloqueio">Bloquear período</option>
              <option value="excecao">Exceção de data</option>
            </select>
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

          {entryType !== 'excecao' && (
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
              disabled={
                busy ||
                !configId ||
                !entryType ||
                !date ||
                !startTime ||
                !endTime ||
                endTime <= startTime ||
                description.trim().length < 5
              }
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
