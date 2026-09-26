import { useState } from 'react'
import { getRpcService } from '../../lib/supabase/rpc'

type DeathSource = 'family_caregiver' | 'health_service' | 'official_document' | 'other_authorized_institution'

export function RegisterPatientDeath({ patientId, patientName }: Readonly<{ patientId: string; patientName: string }>) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [source, setSource] = useState<DeathSource>('family_caregiver')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [registered, setRegistered] = useState(false)

  async function register() {
    if (!date || busy || registered) return
    setBusy(true)
    setFeedback('')
    const result = await getRpcService().registerPatientDeath({
      patientId, deathDate: date, deathTime: time || null, source, notes: notes.trim() || null,
    })
    if (result.status === 'success') {
      setRegistered(true)
      setFeedback('Óbito registrado no banco. Atualize a consulta para ver os efeitos no acompanhamento.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o registro.')
    }
    setBusy(false)
  }

  return <div>
    <button type="button" disabled={registered} onClick={() => setOpen((current) => !current)}>
      Registrar óbito
    </button>
    {open && !registered && <fieldset>
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
    {feedback && <p role="status">{feedback}</p>}
  </div>
}
