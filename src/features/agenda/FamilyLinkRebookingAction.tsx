import { CapoWhatsAppIcon, capoWhatsAppStyle } from '../../components/contact/PatientWhatsAppButton'
import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { CapoDateInput } from '../../components/inputs/CapoDateInput'
import { getRpcService, type AvailableAppointmentSlot } from '../../lib/supabase/rpc'
import { getSupabaseClient } from '../../lib/supabase/client'
import { openCapoWhatsAppTab } from '../../components/contact/whatsapp-tab'
import { movementWhatsAppMessage } from './appointment-communication'

type RebookingContext = {
  appointment_id: string
  professional_id: string
  professional_name: string
  family_name: string
  family_phone: string | null
  previous_start: string
}
type Notice = { phone: string; text: string }

export function FamilyLinkRebookingAction({
  appointmentId,
  accessContext,
  onSaved,
}: Readonly<{
  appointmentId: string
  accessContext: AccessContext
  onSaved: () => void
}>) {
  const [context, setContext] = useState<RebookingContext | null>(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<readonly AvailableAppointmentSlot[]>([])
  const [slot, setSlot] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    let active = true
    setContext(null)
    setFeedback('')
    void getSupabaseClient().rpc('get_family_link_rebooking_context_for_interface', {
      p_appointment_id: appointmentId,
    }).then(({ data, error }) => {
      if (!active) return
      if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
        setFeedback(error?.message ?? 'Não foi possível localizar a solicitação familiar no contexto autorizado.')
        return
      }
      setContext(data as RebookingContext)
    }).catch(() => {
      if (active) setFeedback('Falha ao consultar a solicitação de remarcação familiar.')
    })
    return () => { active = false }
  }, [appointmentId])

  function openWhatsApp(prepared: Notice) {
    const url = 'https://web.whatsapp.com/send?phone=' +
      encodeURIComponent(prepared.phone) + '&text=' + encodeURIComponent(prepared.text)
    if (!openCapoWhatsAppTab(url)) setFeedback('A remarcação foi salva. Autorize a abertura do WhatsApp e tente novamente.')
  }

  async function search() {
    if (!context || !date || busy) return
    setBusy(true)
    setFeedback('')
    setSlots([])
    setSlot('')
    try {
      const result = await getRpcService().getAvailableAppointmentSlots(context.professional_id, date)
      if (result.status === 'error') throw result.error
      setSlots(result.status === 'success' ? result.data : [])
      if (result.status !== 'success' || result.data.length === 0) setFeedback('Nenhuma vaga disponível nesta data.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao buscar vagas.')
    } finally { setBusy(false) }
  }

  async function save() {
    if (!context || !slot || busy) return
    setBusy(true)
    setFeedback('')
    let created = false
    try {
      const { data, error } = await getSupabaseClient().rpc(
        'rebook_family_link_cancellation_for_interface', {
          p_appointment_id: context.appointment_id,
          p_new_slot_start: slot,
        },
      )
      if (error) throw error
      if (!data || typeof data !== 'object' || Array.isArray(data)
        || (data as { success?: boolean }).success !== true) {
        throw new Error('O banco não confirmou o novo agendamento do familiar.')
      }
      created = true
      setDone(true)
      setFeedback('Consulta familiar remarcada na agenda oficial. A consulta cancelada permanece no histórico.')
      const digits = (context.family_phone ?? '').replace(/\D/g, '')
      const national = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits
      if (!/^[1-9][0-9]{9,10}$/.test(national)) {
        setFeedback('Remarcação registrada. Confira o telefone do familiar para preparar o WhatsApp.')
        return
      }
      const result = await getRpcService().getProfessionalCareLocation(context.professional_id)
      const location = result.status === 'success' && result.data &&
        typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data as Record<string, unknown> : null
      const address = typeof location?.care_location === 'string' ? location.care_location.trim() : ''
      if (!address) {
        setFeedback('Remarcação registrada. Confira o endereço para enviar o WhatsApp.')
        return
      }
      const sender = accessContext.real_identity.full_name?.trim()
        || accessContext.full_name?.trim() || accessContext.username
      const title = accessContext.function_title?.trim()
        || accessContext.real_identity.function_title?.trim()
        || accessContext.primary_context.name?.trim() || 'Equipe CAPO'
      const text = movementWhatsAppMessage('remarcacao', {
        patientName: context.family_name,
        oldStart: context.previous_start,
        newStart: slot,
        professionalName: context.professional_name,
        specialtyName: 'Psicologia',
        careLocation: address,
        senderName: sender,
        senderTitle: title,
      })
      const next = { phone: '55' + national, text }
      setNotice(next)
      openWhatsApp(next)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha na remarcação familiar.')
    } finally {
      if (created) onSaved()
      setBusy(false)
    }
  }

  return <section className="agenda-schedule-form" aria-label="Remarcação familiar solicitada pelo link">
    <h3>Solicitação de remarcação — Familiar/Cuidador</h3>
    {context && <p>{context.family_name} · Psicologia — {context.professional_name}. A consulta anterior permanece registrada no histórico.</p>}
    {context && !done && <>
      <label>Nova data
        <CapoDateInput value={date} onChange={(event) => { setDate(event.target.value); setSlots([]); setSlot('') }} />
      </label>
      <button type="button" disabled={!date || busy} onClick={() => void search()}>Buscar vagas</button>
      {slots.length > 0 && <label>Novo horário
        <select value={slot} onChange={(event) => setSlot(event.target.value)}>
          <option value="">Selecionar</option>
          {slots.map((item) => <option key={item.slot_start} value={item.slot_start}>{item.slot_time}</option>)}
        </select>
      </label>}
      <button type="button" disabled={!slot || busy} onClick={() => void save()}>Confirmar remarcação do familiar</button>
    </>}
    {notice && <button type="button" style={capoWhatsAppStyle} onClick={() => openWhatsApp(notice)}><CapoWhatsAppIcon /> Abrir WhatsApp de remarcação</button>}
    {feedback && <p role="status">{feedback}</p>}
  </section>
}
