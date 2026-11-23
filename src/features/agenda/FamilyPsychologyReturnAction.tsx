import { useState } from 'react'
import type { AccessContext } from '../../types/access'
import { CapoDateInput } from '../../components/inputs/CapoDateInput'
import { getRpcService, type AvailableAppointmentSlot } from '../../lib/supabase/rpc'
import { getSupabaseClient } from '../../lib/supabase/client'
import { openCapoWhatsAppTab } from '../../components/contact/whatsapp-tab'
import { movementWhatsAppMessage } from './appointment-communication'

type Family = Record<string, unknown>
type Notice = { phone: string; text: string }
const value = (row: Family, key: string) => typeof row[key] === 'string' ? row[key] as string : ''

export function FamilyPsychologyReturnAction({
  family,
  accessContext,
  onSaved,
  onNotice,
  onFeedback,
  presetSlot,
  notifyAdministrativeOnly = false,
}: Readonly<{
  family: Family
  accessContext: AccessContext
  onSaved: () => void
  onNotice?: (notice: { phone: string; text: string }) => void
  onFeedback?: (message: string) => void
  /** Vaga já escolhida no formulário canônico da Agenda Geral. */
  presetSlot?: string
  notifyAdministrativeOnly?: boolean
}>) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState<readonly AvailableAppointmentSlot[]>([])
  const [slot, setSlot] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const appointmentId = value(family, 'appointment_id')
  const professionalId = value(family, 'professional_id')
  const status = value(family, 'attendance_status')
  if (!['confirmado', 'realizado'].includes(status) || !appointmentId || !professionalId) return null

  function openNotice(next: Notice) {
    const url = 'https://web.whatsapp.com/send?phone=' +
      encodeURIComponent(next.phone) + '&text=' + encodeURIComponent(next.text)
    if (!openCapoWhatsAppTab(url)) setFeedback('Retorno salvo. O navegador bloqueou o WhatsApp. Use o botão novamente.')
  }

  async function search() {
    if (!date || busy) return
    setBusy(true)
    setFeedback('')
    setSlots([])
    setSlot('')
    try {
      const result = await getRpcService().getAvailableAppointmentSlots(professionalId, date)
      if (result.status === 'error') throw result.error
      setSlots(result.status === 'success' ? result.data : [])
      if (result.status !== 'success' || !result.data.length) setFeedback('Nenhuma vaga disponível nessa data.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível consultar as vagas.')
    } finally { setBusy(false) }
  }

  async function save() {
    const chosenSlot = presetSlot || slot
    if (!chosenSlot || busy) return
    setBusy(true)
    setFeedback('')
    let created = false
    try {
      const { data, error } = await getSupabaseClient().rpc('create_family_psychology_return_for_interface', {
        p_previous_appointment_id: appointmentId,
        p_slot_start: chosenSlot,
      })
      if (error) throw error
      if (!data || typeof data !== 'object' || Array.isArray(data)
        || (data as { success?: boolean }).success !== true) {
        throw new Error('O banco não confirmou o retorno.')
      }
      created = true
      setFeedback('Retorno registrado na mesma agenda da Psicologia.')
      setOpen(false)
      if (notifyAdministrativeOnly) {
        setFeedback('Retorno registrado. O Administrativo receberá uma notificação para avisar o familiar.')
        onFeedback?.('Retorno familiar registrado. Aviso encaminhado ao Administrativo.')
        return
      }
      const rawPhone = value(family, 'family_phone').replace(/\D/g, '')
      const national = rawPhone.startsWith('55') && rawPhone.length >= 12 ? rawPhone.slice(2) : rawPhone
      if (!/^[1-9][0-9]{9,10}$/.test(national)) {
        setFeedback('Retorno salvo. Confira o telefone do familiar para enviar o WhatsApp.')
        onFeedback?.('Retorno salvo. Confira o telefone do familiar antes de avisar.')
        return
      }
      const locationResult = await getRpcService().getProfessionalCareLocation(professionalId)
      const location = locationResult.status === 'success' && locationResult.data &&
        typeof locationResult.data === 'object' && !Array.isArray(locationResult.data)
        ? locationResult.data as Record<string, unknown> : null
      const address = typeof location?.care_location === 'string' ? location.care_location.trim() : ''
      if (!address) {
        setFeedback('Retorno salvo. Confira o endereço do atendimento para preparar o WhatsApp.')
        onFeedback?.('Retorno salvo. Confira o endereço do atendimento antes de avisar.')
        return
      }
      const sender = accessContext.real_identity.full_name?.trim()
        || accessContext.full_name?.trim() || accessContext.username
      const title = accessContext.function_title?.trim()
        || accessContext.real_identity.function_title?.trim()
        || accessContext.primary_context.name?.trim() || 'Equipe CAPO'
      const text = movementWhatsAppMessage('retorno', {
        patientName: value(family, 'family_name') || 'Familiar',
        newStart: chosenSlot,
        careLocation: address,
        professionalName: value(family, 'professional_name'),
        senderName: sender,
        senderTitle: title,
      })
      const prepared = { phone: '55' + national, text }
      setNotice(prepared)
      onNotice?.(prepared)
      openNotice(prepared)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha no agendamento do retorno.')
    } finally {
      if (created) onSaved()
      setBusy(false)
    }
  }

  return <span className="agenda-family-return-action">
    {presetSlot ? (
      <span className="agenda-form-actions">
        <button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? 'Confirmando retorno…' : 'Confirmar agendamento'}
        </button>
      </span>
    ) : (
      <button type="button" disabled={busy} onClick={() => setOpen((current) => !current)}>
        Agendar retorno
      </button>
    )}
    {!presetSlot && open && <span className="agenda-form-grid" aria-label="Agendar retorno do Familiar/Cuidador">
      <label>Nova data <CapoDateInput value={date}
        onChange={(event) => { setDate(event.target.value); setSlots([]); setSlot('') }} /></label>
      <button type="button" disabled={!date || busy} onClick={() => void search()}>Buscar vagas de retorno</button>
      {slots.length > 0 && <label>Horário
        <select value={slot} onChange={(event) => setSlot(event.target.value)}>
          <option value="">Selecionar</option>
          {slots.map((item) => <option key={item.slot_start} value={item.slot_start}>{item.slot_time}</option>)}
        </select>
      </label>}
      <button type="button" disabled={!slot || busy} onClick={() => void save()}>Confirmar retorno</button>
    </span>}
    {notice && <button type="button" onClick={() => openNotice(notice)}>
      💬 Abrir WhatsApp do retorno
    </button>}
    {feedback && <small role="status">{feedback}</small>}
  </span>
}
