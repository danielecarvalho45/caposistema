import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService } from '../../lib/supabase/rpc'
import { reserveCapoWhatsAppTab } from '../../components/contact/whatsapp-tab'
import { movementWhatsAppMessage } from './appointment-communication'
import { FamilyPsychologyReturnAction } from './FamilyPsychologyReturnAction'

type Family = Readonly<{ family_member_id: string; full_name: string; capo_number: string | null; cms: string | null; source_patient_name: string }>
type RecordValue = Record<string, unknown>
const obj = (value: unknown): RecordValue | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as RecordValue : null
const val = (value: unknown): string => typeof value === 'string' ? value : ''

export function FamilyAgendaBookingPanel({
  family, professionalId, slotStart, isPsychology, accessContext, onBooked,
}: Readonly<{
  family: Family
  professionalId: string
  slotStart: string
  isPsychology: boolean
  accessContext: AccessContext
  onBooked: () => void
}>) {
  const [context, setContext] = useState<RecordValue | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [notice, setNotice] = useState<{ phone: string; text: string } | null>(null)

  async function refresh(active = true) {
    const { data, error } = await getSupabaseClient().rpc(
      'get_family_agenda_booking_context_for_interface',
      { p_family_member_id: family.family_member_id },
    )
    if (!active) return
    if (error || !obj(data)) throw new Error(error?.message ?? 'Não foi possível verificar a situação do familiar.')
    setContext(obj(data))
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setContext(null)
    setFeedback('')
    setNotice(null)
    void refreshForSelection()
    async function refreshForSelection() {
      try {
        const { data, error } = await getSupabaseClient().rpc(
          'get_family_agenda_booking_context_for_interface',
          { p_family_member_id: family.family_member_id },
        )
        if (!active) return
        if (error || !obj(data)) throw new Error(error?.message ?? 'Consulta familiar indisponível.')
        setContext(obj(data))
      } catch (error) {
        if (active) setFeedback(error instanceof Error ? error.message : 'Falha na consulta familiar.')
      } finally {
        if (active) setLoading(false)
      }
    }
    return () => { active = false }
  }, [family.family_member_id])

  const appointment = obj(context?.appointment)
  const queue = obj(context?.queue)
  const status = val(appointment?.attendance_status)
  const queueStatus = val(queue?.status)
  const queueId = val(queue?.waiting_list_id)
  const familyLinkId = val(context?.family_link_id)
  const activeAppointment = ['agendado', 'confirmado'].includes(status)
  const canReturn = ['confirmado', 'realizado'].includes(status)

  async function includeInQueue() {
    if (!familyLinkId || busy) return
    setBusy(true)
    setFeedback('')
    try {
      const result = await getRpcService().addFamilyToWaitingList(familyLinkId, 3, null)
      if (result.status !== 'success' || obj(result.data)?.success === false) {
        throw new Error(result.status === 'error' ? result.error.message : 'O banco não confirmou a inclusão na fila.')
      }
      await refresh()
      setFeedback('Familiar incluído na fila de Psicologia. Selecione um psicólogo e uma vaga para agendar.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Não foi possível incluir o familiar na fila.')
    } finally { setBusy(false) }
  }

  async function schedule() {
    if (busy || !professionalId || !slotStart || !isPsychology || !queueId ||
        queueStatus !== 'waiting' || activeAppointment || canReturn) return
    const reservation = reserveCapoWhatsAppTab()
    setBusy(true)
    setFeedback('')
    try {
      // A vaga, a prioridade e a incompatibilidade com o psicólogo do paciente
      // são obrigatoriamente validadas pelo mesmo contrato usado na Fila.
      const candidates = await getRpcService().getFamilyQueueCandidatesForSlot(professionalId, slotStart, 20)
      if (candidates.status !== 'success' || !Array.isArray(candidates.data)) {
        throw new Error(candidates.status === 'error' ? candidates.error.message : 'Não foi possível validar a elegibilidade.')
      }
      const first = obj(candidates.data[0])
      if (val(first?.waiting_list_id) !== queueId) {
        throw new Error('Este familiar não é o próximo elegível para o profissional e horário selecionados. Confira a prioridade na fila de Psicologia.')
      }
      const result = await getRpcService().createFamilyPsychologyAppointment({
        waitingListId: queueId, professionalId, slotStart, generalNotes: null,
      })
      if (result.status !== 'success' || obj(result.data)?.success === false) {
        throw new Error(result.status === 'error' ? result.error.message : 'O banco não confirmou o agendamento familiar.')
      }
      setFeedback('Consulta familiar registrada na agenda oficial da Psicologia.')
      onBooked()
      await refresh()

      const raw = val(context?.family_phone).replace(/\D/g, '')
      const national = raw.startsWith('55') && raw.length >= 12 ? raw.slice(2) : raw
      if (!/^[1-9][0-9]{9,10}$/.test(national)) {
        reservation.cancel()
        setFeedback('Consulta familiar salva. Confira o telefone antes do aviso por WhatsApp.')
        return
      }
      const care = await getRpcService().getProfessionalCareLocation(professionalId)
      const location = care.status === 'success' ? obj(care.data) : null
      const address = val(location?.care_location)
      if (!address) {
        reservation.cancel()
        setFeedback('Consulta familiar salva. Confira o endereço do atendimento para preparar o WhatsApp.')
        return
      }
      const senderName = accessContext.real_identity.full_name?.trim()
        || accessContext.full_name?.trim() || accessContext.username
      const senderTitle = accessContext.function_title?.trim()
        || accessContext.real_identity.function_title?.trim()
        || accessContext.primary_context.name?.trim() || 'Equipe CAPO'
      const prepared = {
        phone: '55' + national,
        text: movementWhatsAppMessage('agendamento', {
          patientName: family.full_name,
          professionalName: val(first?.professional_name),
          newStart: slotStart, careLocation: address, senderName, senderTitle,
        }),
      }
      setNotice(prepared)
      const url = 'https://web.whatsapp.com/send?phone='
        + encodeURIComponent(prepared.phone) + '&text=' + encodeURIComponent(prepared.text)
      if (!reservation.open(url)) setFeedback('Consulta salva. Abra o WhatsApp manualmente pelo botão abaixo.')
    } catch (error) {
      reservation.cancel()
      setFeedback(error instanceof Error ? error.message : 'Não foi possível agendar este familiar.')
    } finally { setBusy(false) }
  }

  function openNotice() {
    if (!notice) return
    const url = 'https://web.whatsapp.com/send?phone='
      + encodeURIComponent(notice.phone) + '&text=' + encodeURIComponent(notice.text)
    window.open(url, 'capo-whatsapp')
  }

  return <div className="agenda-contract-note" aria-label="Agendamento de Familiar/Cuidador">
    <strong>Familiar/Cuidador — {family.full_name}</strong>
    <p>CAPO {family.capo_number ?? 'Pendente'} · CMS {family.cms ?? 'Não informado'}.
      Paciente vinculado: {family.source_patient_name}. Atendimento exclusivamente pela Psicologia.</p>
    {loading && <p role="status">Verificando vínculo, fila e histórico familiar…</p>}
    {!loading && !context && <p role="alert">Não foi possível validar o familiar. Nenhum agendamento será efetuado.</p>}
    {context && <>
      {activeAppointment && <p>Consulta familiar existente: {val(appointment?.appointment_date)
        ? new Date(val(appointment?.appointment_date)).toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo', hour12: false,
        }) : 'Data não informada'}.
        {status === 'agendado'
          ? ' Utilize a consulta existente, sem criar outra.'
          : ' Retorno disponível apenas conforme os critérios do atendimento anterior.'}</p>}
      {canReturn && appointment && <FamilyPsychologyReturnAction
        family={appointment} accessContext={accessContext} onSaved={() => { onBooked(); void refresh() }}
        onFeedback={setFeedback} />}
      {!activeAppointment && !canReturn && queueStatus === 'waiting' && <>
        <p>Familiar aguardando na fila de Psicologia. Escolha a especialidade Psicologia,
          um profissional elegível e um horário disponível acima.</p>
        <button type="button" disabled={busy || !professionalId || !slotStart || !isPsychology}
          onClick={() => void schedule()}>
          {busy ? 'Validando…' : 'Confirmar agendamento do familiar'}
        </button>
      </>}
      {!activeAppointment && !canReturn && queueStatus === 'called' &&
        <p>Familiar já chamado na fila. Regularize o contato na Fila de Psicologia antes de gravar o agendamento.</p>}
      {!activeAppointment && !canReturn &&
        !['waiting', 'called'].includes(queueStatus) && <>
        <p>Não há encaminhamento familiar aguardando agendamento.
          A inclusão na fila é necessária para a primeira consulta; o histórico será preservado.</p>
        <button type="button" disabled={busy || !familyLinkId} onClick={() => void includeInQueue()}>
          {busy ? 'Registrando…' : 'Incluir familiar na fila de Psicologia'}
        </button>
      </>}
      {queueId && ['waiting', 'called'].includes(queueStatus) &&
        <p><Link to={'/filas?queueKind=family&waitingListId=' + encodeURIComponent(queueId)}>
          Consultar prioridade e elegibilidade na fila de familiares
        </Link></p>}
    </>}
    {notice && <button type="button" onClick={openNotice}>💬 Abrir aviso familiar no WhatsApp</button>}
    {feedback && <p role="status">{feedback}</p>}
  </div>
}
