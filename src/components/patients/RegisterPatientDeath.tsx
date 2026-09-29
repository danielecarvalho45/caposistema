import { useCallback, useEffect, useState } from 'react'
import { getRpcService } from '../../lib/supabase/rpc'

type DeathSource = 'family_caregiver' | 'health_service' | 'official_document' | 'other_authorized_institution'

type DeathContext = Readonly<{
  deceased: boolean
  death_date?: string | null
  death_time?: string | null
  death_source?: string | null
  death_notes?: string | null
  death_recorded_at?: string | null
  death_recorded_by_name?: string | null
}>

function asDeathContext(value: unknown): DeathContext | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const row = value as Record<string, unknown>
  if (typeof row.deceased !== 'boolean') return null
  return {
    deceased: row.deceased,
    death_date: typeof row.death_date === 'string' ? row.death_date : null,
    death_time: typeof row.death_time === 'string' ? row.death_time : null,
    death_source: typeof row.death_source === 'string' ? row.death_source : null,
    death_notes: typeof row.death_notes === 'string' ? row.death_notes : null,
    death_recorded_at: typeof row.death_recorded_at === 'string' ? row.death_recorded_at : null,
    death_recorded_by_name: typeof row.death_recorded_by_name === 'string' ? row.death_recorded_by_name : null,
  }
}

export function RegisterPatientDeath({ patientId, patientName }: Readonly<{ patientId: string; patientName: string }>) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [source, setSource] = useState<DeathSource>('family_caregiver')
  const [notes, setNotes] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [deathContext, setDeathContext] = useState<DeathContext | null>(null)
  const [contextLoaded, setContextLoaded] = useState(false)

  const loadContext = useCallback(async () => {
    const result = await getRpcService().getPatientDeathContext(patientId)
    if (result.status === 'success') {
      setDeathContext(asDeathContext(result.data))
      setContextLoaded(true)
      return
    }
    if (result.status === 'empty') {
      setDeathContext(null)
      setContextLoaded(true)
      return
    }
    setFeedback(result.status === 'error' ? result.error.message : 'Não foi possível consultar o contexto de óbito.')
    setContextLoaded(true)
  }, [patientId])

  useEffect(() => {
    setContextLoaded(false)
    setDeathContext(null)
    setOpen(false)
    setCorrectionReason('')
    void loadContext()
  }, [loadContext])

  async function register() {
    if (!date || busy || deathContext?.deceased) return
    setBusy(true)
    setFeedback('')
    const result = await getRpcService().registerPatientDeath({
      patientId, deathDate: date, deathTime: time || null, source, notes: notes.trim() || null,
    })
    if (result.status === 'success') {
      setFeedback('Óbito registrado no banco e preservado na auditoria.')
      setOpen(false)
      await loadContext()
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o registro.')
    }
    setBusy(false)
  }

  async function correct() {
    const reason = correctionReason.trim()
    if (busy || !deathContext?.deceased || reason.length < 5) return
    setBusy(true)
    setFeedback('')
    const result = await getRpcService().correctPatientDeath(patientId, reason)
    if (result.status === 'success') {
      setCorrectionReason('')
      setFeedback('Registro de óbito corrigido. O status anterior foi restaurado com histórico preservado.')
      await loadContext()
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a correção.')
    }
    setBusy(false)
  }

  const deceased = deathContext?.deceased === true

  return <div className="patient-death-control">
    {!deceased && (
      <button type="button" disabled={busy || !contextLoaded} onClick={() => setOpen((current) => !current)}>
        Registrar óbito
      </button>
    )}

    {open && !deceased && <fieldset>
      <legend>Registro autorizado de óbito — {patientName}</legend>
      <label>Data do óbito<input type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label>Horário, quando conhecido<input type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label>Origem da informação<select value={source} onChange={(event) => setSource(event.target.value as DeathSource)}>
        <option value="family_caregiver">Familiar / cuidador</option>
        <option value="health_service">Serviço de saúde</option>
        <option value="official_document">Documento oficial</option>
        <option value="other_authorized_institution">Outra instituição autorizada</option>
      </select></label>
      <label>Observação administrativa<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button type="button" disabled={busy || !date || date > new Date().toISOString().slice(0, 10)} onClick={() => void register()}>
        {busy ? 'Registrando…' : 'Confirmar registro de óbito'}
      </button>
    </fieldset>}

    {deceased && <fieldset>
      <legend>Óbito registrado — {patientName}</legend>
      <p>Data: {deathContext?.death_date ?? 'não informada'}{deathContext?.death_recorded_by_name ? ` · Registrado por: ${deathContext.death_recorded_by_name}` : ''}</p>
      <p>Para corrigir um registro feito por engano, informe o motivo. O histórico anterior não será apagado.</p>
      <label>
        Motivo da correção *
        <textarea
          value={correctionReason}
          minLength={5}
          maxLength={500}
          onChange={(event) => setCorrectionReason(event.target.value)}
        />
      </label>
      <button type="button" disabled={busy || correctionReason.trim().length < 5} onClick={() => void correct()}>
        {busy ? 'Corrigindo…' : 'Corrigir registro de óbito'}
      </button>
    </fieldset>}

    {feedback && <p role="status">{feedback}</p>}
  </div>
}
