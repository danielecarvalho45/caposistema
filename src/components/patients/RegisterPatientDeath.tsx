import { CapoWhatsAppIcon, capoWhatsAppStyle } from '../contact/PatientWhatsAppButton'
import { CapoTimeInput } from '../inputs/CapoTimeInput'
import { capoTodayIso } from '../../lib/date/capo-locale'
import { CapoDateInput } from '../inputs/CapoDateInput'
import { useCallback, useEffect, useState } from 'react'
import { getRpcService } from '../../lib/supabase/rpc'
import { reserveCapoWhatsAppTab } from '../contact/whatsapp-tab'

type ContactChoice = Readonly<{ phone: string; label: string }>

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

export function RegisterPatientDeath({ patientId, patientName, onChanged }: Readonly<{ patientId: string; patientName: string; onChanged?: (status: string) => void }>) {
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
  const [contactChoices, setContactChoices] = useState<ContactChoice[]>([])
  const [contactsLoaded, setContactsLoaded] = useState(false)

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
    setContactChoices([])
    setContactsLoaded(false)
    void loadContext()
  }, [loadContext])

  async function loadCondolenceContacts() {
    const result = await getRpcService().getPatientBereavementContact(patientId)
    if (result.status !== 'success') {
      setContactChoices([])
      setContactsLoaded(false)
      setFeedback(result.status === 'error' ? result.error.message : 'Não foi possível consultar os telefones cadastrados.')
      return
    }
    const row = result.data && typeof result.data === 'object' && !Array.isArray(result.data)
      ? result.data as Record<string, unknown> : null
    const choices: ContactChoice[] = []
    for (const [key, label] of [['phone', 'WhatsApp principal'], ['phone_secondary', 'WhatsApp secundário']] as const) {
      const phone = row?.[key]
      if (typeof phone !== 'string' || !phone.trim()) continue
      const digits = phone.replace(/\D/g, '')
      const normalized = digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`
      if (!/^55\d{10,11}$/.test(normalized)) continue
      if (!choices.some((choice) => choice.phone === normalized)) choices.push({ phone: normalized, label })
    }
    setContactChoices(choices)
    setContactsLoaded(true)
    setFeedback(choices.length
      ? 'Selecione o telefone cadastrado e confira com quem ele está antes de enviar as condolências.'
      : 'Óbito registrado. Não há telefone principal ou secundário válido no cadastro. Revise os contatos antes de preparar condolências.')
  }

  function openCondolences(choice: ContactChoice) {
    if (busy || !deathContext?.deceased) return
    const reservation = reserveCapoWhatsAppTab()
    const message = `À família de ${patientName},\n\nRecebemos com profunda tristeza a notícia do falecimento de ${patientName}. Neste momento de dor, desejamos que vocês encontrem acolhimento, força e carinho nas lembranças e no amor compartilhado.\n\nToda a equipe do CAPO se solidariza com a família e permanece à disposição para acolhê-los.\n\nCom respeito e afeto,\nEquipe CAPO`
    const url = `https://web.whatsapp.com/send?phone=${encodeURIComponent(choice.phone)}&text=${encodeURIComponent(message)}`
    if (!reservation?.open(url)) {
      setFeedback('Não foi possível abrir o WhatsApp. Autorize a janela no navegador e tente novamente. O registro de óbito permanece preservado.')
      return
    }
    setFeedback(`WhatsApp aberto no ${choice.label.toLowerCase()}. Confira se o destinatário é um contato familiar autorizado antes do envio manual.`)
  }

  async function register() {
    if (!date || busy || deathContext?.deceased) return
    setBusy(true)
    setFeedback('')
    try {
      const result = await getRpcService().registerPatientDeath({
        patientId, deathDate: date, deathTime: time || null, source, notes: notes.trim() || null,
      })
      if (result.status === 'success') {
        setFeedback('Óbito registrado no banco e preservado na auditoria. Consultas futuras canceladas.')
        setOpen(false)
        onChanged?.('obito')
        await loadContext()
        await loadCondolenceContacts()
      } else {
        setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o registro.')
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível confirmar o registro de óbito.')
    } finally {
      setBusy(false)
    }
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
      onChanged?.(typeof result.data === 'object' && result.data !== null && 'restored_status' in result.data && typeof result.data.restored_status === 'string' ? result.data.restored_status : 'inativo')
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
      <label>Data do óbito<CapoDateInput  max={capoTodayIso()} value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label>Horário, quando conhecido<CapoTimeInput value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label>Origem da informação<select value={source} onChange={(event) => setSource(event.target.value as DeathSource)}>
        <option value="family_caregiver">Familiar / cuidador</option>
        <option value="health_service">Serviço de saúde</option>
        <option value="official_document">Documento oficial</option>
        <option value="other_authorized_institution">Outra instituição autorizada</option>
      </select></label>
      <label>Observação administrativa<textarea maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button type="button" disabled={busy || !date || date > capoTodayIso()} onClick={() => void register()}>
        {busy ? 'Registrando…' : 'Confirmar registro de óbito'}
      </button>
    </fieldset>}

    {deceased && <fieldset>
      <legend>Óbito registrado — {patientName}</legend>
      <p>Data: {deathContext?.death_date ?? 'não informada'}{deathContext?.death_recorded_by_name ? ` · Registrado por: ${deathContext.death_recorded_by_name}` : ''}</p>
      <p>O paciente permanece identificado com situação de óbito, fora da agenda ativa. As consultas futuras são canceladas, com histórico preservado.</p>
      {!contactsLoaded && <button type="button" disabled={busy} onClick={() => void loadCondolenceContacts()}>
        Consultar telefones para condolências
      </button>}
      {contactsLoaded && contactChoices.length > 0 && <>
        <p>Selecione o número cadastrado. Verifique antes do envio se pertence a um contato familiar autorizado; o número pode ser de uso exclusivo do paciente falecido.</p>
        {contactChoices.map((choice) => <button type="button" style={capoWhatsAppStyle} key={choice.phone} disabled={busy} onClick={() => openCondolences(choice)}>
          <CapoWhatsAppIcon /> {choice.label}: {choice.phone}
        </button>)}
      </>}
      {contactsLoaded && contactChoices.length === 0 && <button type="button" disabled={busy} onClick={() => void loadCondolenceContacts()}>
        Consultar telefones novamente
      </button>}
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
