import { useEffect, useMemo, useState } from 'react'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'
import './patient-discharge-proximity.css'

export type DischargeProximityLevel = 'verde' | 'amarelo' | 'vermelho'

type Indicator = Readonly<{
  level: DischargeProximityLevel
  label: string
}>

function parseIndicator(value: unknown): Indicator | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const level = record.level
  if (level !== 'verde' && level !== 'amarelo' && level !== 'vermelho') return null
  const defaultLabel =
    level === 'verde'
      ? 'Em acompanhamento'
      : level === 'amarelo'
        ? 'Atenção'
        : 'Alta próxima'
  return {
    level,
    label: typeof record.label === 'string' && record.label.trim()
      ? record.label
      : defaultLabel,
  }
}

export function PatientDischargeProximityIndicator({
  patientId,
  editable = false,
}: Readonly<{
  patientId: string
  editable?: boolean
}>) {
  const service = useMemo(() => getRpcService(), [])
  const [state, setState] = useState<AsyncState<Indicator>>(loadingState)
  const [selectedLevel, setSelectedLevel] = useState<DischargeProximityLevel>('verde')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return
    let active = true
    setState(loadingState())
    setFeedback(null)
    void service.getPatientDischargeProximity(patientId).then((result) => {
      if (!active) return
      if (result.status === 'success') {
        const indicator = parseIndicator(result.data)
        if (indicator) {
          setState({ status: 'success', data: indicator })
          setSelectedLevel(indicator.level)
        } else {
          setState({ status: 'success', data: { level: 'verde', label: 'Em acompanhamento' } })
          setSelectedLevel('verde')
        }
      } else if (result.status === 'error') {
        setState(result)
      } else {
        setState({ status: 'success', data: { level: 'verde', label: 'Em acompanhamento' } })
        setSelectedLevel('verde')
      }
    })
    return () => {
      active = false
    }
  }, [patientId, service])

  async function save(level: DischargeProximityLevel) {
    if (!editable || saving) return
    setSelectedLevel(level)
    setSaving(true)
    setFeedback(null)
    const result = await service.setPatientDischargeProximity(patientId, level)
    if (result.status === 'success') {
      const indicator = parseIndicator(result.data)
      if (indicator) {
        setState({ status: 'success', data: indicator })
        setSelectedLevel(indicator.level)
        setFeedback('Sinalização atualizada.')
      } else {
        setFeedback('A atualização foi recebida, mas o retorno do indicador não pôde ser confirmado.')
      }
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setSaving(false)
  }

  if (!patientId) return null
  if (state.status === 'loading') {
    return <div className="discharge-proximity discharge-proximity--loading">Consultando proximidade de alta…</div>
  }
  if (state.status === 'error') {
    return <div className="discharge-proximity discharge-proximity--error" role="status">Indicador de proximidade de alta indisponível.</div>
  }

  const indicator = state.data

  return (
    <section className="discharge-proximity" aria-label="Indicador de proximidade de alta">
      <div className="discharge-proximity__heading">
        <strong>Proximidade de alta</strong>
        <span className={`discharge-proximity__badge is-${indicator.level}`}>
          <span className="discharge-proximity__dot" aria-hidden="true" />
          {indicator.label}
        </span>
      </div>

      {editable && (
        <>
          <div className="discharge-proximity__options" role="group" aria-label="Alterar proximidade de alta">
            {([
              ['verde', 'Em acompanhamento'],
              ['amarelo', 'Atenção'],
              ['vermelho', 'Alta próxima'],
            ] as const).map(([level, label]) => (
              <button
                key={level}
                type="button"
                className={`discharge-proximity__option is-${level}`}
                aria-pressed={selectedLevel === level}
                disabled={saving}
                onClick={() => void save(level)}
              >
                <span className="discharge-proximity__dot" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <small>Esta sinalização não inicia encerramento automaticamente.</small>
        </>
      )}

      {feedback && <p className="discharge-proximity__feedback" role="status">{feedback}</p>}
    </section>
  )
}
