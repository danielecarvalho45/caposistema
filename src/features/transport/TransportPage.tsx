import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type ReferralPatient } from '../../lib/supabase/rpc'
import { getSupabaseClient } from '../../lib/supabase/client'
import { buildCapoDocumentPdf } from '../../lib/pdf/capo-document-pdf'
import { buildTransportOfficialPdf } from '../../lib/pdf/capo-transport-request-pdf'
import './transport-contacts.css'

type TransportRecord = Readonly<Record<string, unknown>>

type ContactKey = 'whatsapp_primary' | 'phone_responsible' | 'email'
type TransportContacts = Readonly<Record<ContactKey, string>>
const CONTACT_FIELDS: readonly { key: ContactKey; label: string }[] = [
  { key: 'whatsapp_primary', label: 'WhatsApp do setor' },
  { key: 'phone_responsible', label: 'Telefone do responsável' },
  { key: 'email', label: 'E-mail institucional' },
]
const EMPTY_CONTACTS: TransportContacts = { whatsapp_primary: '', phone_responsible: '', email: '' }

type Props = Readonly<{
  accessContext: AccessContext
}>

function field(record: TransportRecord | null, ...keys: string[]) {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function rowsFromContext(
  context: TransportRecord | null,
  ...keys: string[]
): readonly TransportRecord[] {
  if (!context) return []
  for (const key of keys) {
    const value = context[key]
    if (Array.isArray(value)) return value as readonly TransportRecord[]
  }
  return []
}

function boolField(record: TransportRecord | null, key: string) {
  return record?.[key] === true
}

function requestId(record: TransportRecord) {
  return field(record, 'request_id', 'id') ?? ''
}

function wrapLine(value: string, width = 86) {
  const words = value.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= width) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function buildTransportClosurePdfBlob(input: Readonly<{
  patientName: string
  cms: string | null
  channel: string | null
  reference: string | null
  requester: string
  requesterRole: string
}>) {
  const lines = [
    'ENCERRAMENTO DE SOLICITAÇÃO DE TRANSPORTE',
    '',
    'Ao Setor de Transportes da Secretaria Municipal de Saúde.',
    '',
    `Paciente: ${input.patientName}${input.cms ? ` · CMS ${input.cms}` : ''}`,
    '',
    'Informamos, para os devidos fins, o encerramento da solicitação de transporte vinculada ao paciente identificado neste documento, após conclusão do acompanhamento administrativo correspondente no CAPO.',
    input.channel ? `Canal de encaminhamento: ${input.channel}` : '',
    input.reference ? `Referência / protocolo: ${input.reference}` : '',
    '',
    `Responsável pela emissão: ${input.requester}`,
    `Função: ${input.requesterRole}`,
  ].flatMap((line) => wrapLine(line))

  return buildCapoDocumentPdf(lines, {
    fontSize: 10,
    lineHeight: 14,
    linesPerPage: 40,
    generatedBy: input.requester,
    generatedByRole: input.requesterRole,
  })
}

export function TransportPage({ accessContext }: Props) {
  const hasRole = (code: string) =>
    accessContext.roles.some((role) => role.code === code)
  const isManager = hasRole('administrador')
  const isAdministrativeOperational = hasRole('administrativo_operacional')
  const hasTransportCapability = accessContext.capabilities.includes(
    'preencher_solicitacao_transporte',
  )
  const isSocialProfessional =
    Boolean(accessContext.professional_id) &&
    hasRole('profissional') &&
    (accessContext.specialties ?? []).some(
      (specialty) =>
        specialty.specialty_name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()
          .toLowerCase() === 'assistencia social',
    )
  const canCreateRequest =
    isManager || isAdministrativeOperational || (isSocialProfessional && hasTransportCapability)
  const canAdminister = isManager || isAdministrativeOperational
  const canForwardExternally = isManager || isAdministrativeOperational
  const issuerRole = isManager
    ? 'Gestor/Titular'
    : isAdministrativeOperational
      ? 'Auxiliar Administrativo / Administrativo Operacional'
      : accessContext.function_title?.trim() || accessContext.primary_context.name?.trim() || 'Profissional CAPO'
  const authorized = canCreateRequest || canAdminister

  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<readonly ReferralPatient[]>([])
  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [context, setContext] = useState<TransportRecord | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [reason, setReason] = useState('')
  const [channel, setChannel] = useState('')
  const [reference, setReference] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [needReason, setNeedReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [administrativeQueue, setAdministrativeQueue] = useState<readonly TransportRecord[]>([])
  const [reminderQueue, setReminderQueue] = useState<readonly TransportRecord[]>([])
  const [queueLoading, setQueueLoading] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [contactsBusy, setContactsBusy] = useState(false)
  const [contacts, setContacts] = useState<TransportContacts>(EMPTY_CONTACTS)
  const [selectedContacts, setSelectedContacts] = useState<readonly ContactKey[]>([])
  const [documentsRequest, setDocumentsRequest] = useState<TransportRecord | null>(null)
  const [attachedDocuments, setAttachedDocuments] = useState<readonly TransportRecord[]>([])
  const [shareAccess, setShareAccess] = useState<{requestId: string; url: string; pin: string; expires: string} | null>(null)
  const [pdfVersionHistory, setPdfVersionHistory] = useState<{requestId: string; versions: readonly TransportRecord[]} | null>(null)
  const [pdfDetailsRequest, setPdfDetailsRequest] = useState<TransportRecord | null>(null)
  const [pdfDetailsMode, setPdfDetailsMode] = useState<'address' | 'periodicity'>('address')
  const [boardingSource, setBoardingSource] = useState<'cadastro' | 'alternativo'>('cadastro')
  const [addressConfirmed, setAddressConfirmed] = useState(false)
  const [boardingAddress, setBoardingAddress] = useState('')
  const [periodicity, setPeriodicity] = useState<'unica' | 'semanal' | 'quinzenal'>('unica')
  const [periodicityChosen, setPeriodicityChosen] = useState(false)

  useEffect(() => {
    if (!authorized) return
    let active = true
    void getRpcService().getTransportSectorContacts().then((result) => {
      if (!active) return
      if (result.status === 'success') {
        const data = result.data as TransportRecord
        setContacts({
          whatsapp_primary: field(data, 'whatsapp_primary') ?? '',
          phone_responsible: field(data, 'phone_responsible') ?? '',
          email: field(data, 'email') ?? '',
        })
      } else if (result.status === 'error') {
        setFeedback('Não foi possível carregar contatos do Transporte: ' + result.error.message)
      }
    })
    return () => { active = false }
  }, [authorized])

  useEffect(() => {
    if (!contactsOpen) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContactsOpen(false)
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [contactsOpen])

  async function reloadReminders() {
    if (!canAdminister) return
    const result = await getRpcService().getTransportReminderQueue()
    if (result.status === 'success') {
      setReminderQueue(Array.isArray(result.data) ? result.data as readonly TransportRecord[] : [])
    } else if (result.status === 'error') {
      setFeedback('Não foi possível consultar os lembretes de Transporte: ' + result.error.message)
    }
  }

  function openManualReminder(item: TransportRecord) {
    const destination = contacts.whatsapp_primary.trim()
    if (!destination) {
      setFeedback('Cadastre o WhatsApp principal do setor de transporte antes de abrir um lembrete.')
      return
    }
    const digits = destination.replace(/\D/g, '')
    const dateRaw = field(item, 'next_visit_date')
    const date = dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw.slice(8,10) + '/' + dateRaw.slice(5,7) + '/' + dateRaw.slice(0,4) : dateRaw
    const cadence = field(item, 'periodicity') === 'quinzenal' ? 'Quinzenal' : 'Semanal'
    const sender = accessContext.full_name ?? accessContext.username
    const message = [
      'Ao Setor de Transportes da Secretaria Municipal de Saúde,',
      'Lembrete de transporte — CAPO.',
      'Paciente: ' + (field(item, 'patient_name') ?? 'Não informado'),
      'Número CAPO: ' + (field(item, 'patient_number') ?? 'Não informado'),
      'CMS: ' + (field(item, 'cms') ?? 'Não informado'),
      'Periodicidade: ' + cadence,
      'Próximo atendimento: ' + (date ?? 'Data não informada') + ' às ' + (field(item, 'appointment_time') ?? 'Horário não informado'),
      'Profissional: ' + (field(item, 'professional_name') ?? 'Não informado'),
      'Embarque: ' + (field(item, 'boarding_address') ?? 'Não informado'),
      'Destino: ' + (field(item, 'care_location') ?? 'Não informado'),
      'Atenciosamente, ' + sender + ' — ' + issuerRole + ' / CAPO.',
    ].join('\n')
    const url = 'https://wa.me/' + (digits.startsWith('55') ? digits : '55' + digits) + '?text=' + encodeURIComponent(message)
    const popup = globalThis.open(url, 'capo-transporte-whatsapp')
    if (popup) popup.opener = null
    setFeedback('Mensagem de lembrete aberta para envio manual. Abrir o WhatsApp não confirma o envio nem o recebimento.')
  }

  async function reloadAdministrativeQueue() {
    if (!canAdminister) return
    setQueueLoading(true)
    try {
      const result = await getRpcService().getTransportAdministrativeQueue(50)
      if (result.status === 'success') {
        setAdministrativeQueue(Array.isArray(result.data) ? result.data as readonly TransportRecord[] : [])
      } else if (result.status === 'empty') {
        setAdministrativeQueue([])
      } else if (result.status === 'error') {
        setFeedback(result.error.message)
      }
    } finally {
      setQueueLoading(false)
    }
  }

  useEffect(() => {
    if (!canAdminister) return
    void reloadReminders()
    let mounted = true
    void getRpcService().getTransportAdministrativeQueue(50).then((result) => {
      if (!mounted) return
      if (result.status === 'success') {
        setAdministrativeQueue(Array.isArray(result.data) ? result.data as readonly TransportRecord[] : [])
      } else if (result.status === 'error') {
        setFeedback(result.error.message)
      }
    })
    return () => { mounted = false }
  }, [canAdminister])

  function editPdfDetails(request: TransportRecord, mode: 'address' | 'periodicity') {
    const savedSource = field(request, 'boarding_source')
    setPdfDetailsRequest(request)
    setPdfDetailsMode(mode)
    setBoardingSource(savedSource === 'alternativo' ? 'alternativo' : 'cadastro')
    setAddressConfirmed(Boolean(savedSource))
    setBoardingAddress(field(request, 'boarding_address') ?? '')
    const savedPeriodicity = field(request, 'periodicity')
    setPeriodicity(savedPeriodicity === 'semanal' || savedPeriodicity === 'quinzenal' ? savedPeriodicity : 'unica')
    setPeriodicityChosen(Boolean(savedPeriodicity))
  }

  async function savePdfDetails() {
    const id = pdfDetailsRequest && requestId(pdfDetailsRequest)
    const homeAddress = field(patient, 'address') ?? ''
    if (!id || !canAdminister || busy || !periodicityChosen || !addressConfirmed) {
      setFeedback('Confirme explicitamente o endereço de embarque e a periodicidade antes de salvar os dados do PDF.')
      return
    }
    if (boardingSource === 'cadastro' && !homeAddress.trim()) {
      setFeedback('Não há endereço residencial cadastrado; informe outro endereço de embarque.')
      return
    }
    if (boardingSource === 'alternativo' && boardingAddress.trim().length < 8) {
      setFeedback('Informe o endereço completo de embarque.')
      return
    }
    setBusy(true)
    try {
      const result = await getRpcService().setTransportPdfDetails(
        id, boardingSource, boardingSource === 'cadastro' ? homeAddress : boardingAddress.trim(), periodicity,
      )
      if (result.status === 'success') {
        setPdfDetailsRequest(null)
        await loadContext(patientId, patientName)
        setFeedback('Endereço de embarque e periodicidade confirmados para esta solicitação. O cadastro do paciente permanece intacto.')
      } else {
        setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou os dados do PDF.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function saveContacts() {
    if (!isManager || contactsBusy) return
    setContactsBusy(true)
    try {
      const result = await getRpcService().setTransportSectorContacts(
        contacts.whatsapp_primary, contacts.phone_responsible, contacts.email,
      )
      if (result.status === 'success') {
        const data = result.data as TransportRecord
        setContacts({
          whatsapp_primary: field(data, 'whatsapp_primary') ?? '',
          phone_responsible: field(data, 'phone_responsible') ?? '',
          email: field(data, 'email') ?? '',
        })
        setFeedback('Contatos institucionais do Transporte salvos.')
      } else {
        setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou os contatos.')
      }
    } finally {
      setContactsBusy(false)
    }
  }

  function chooseContact(key: ContactKey, checked: boolean) {
    setSelectedContacts((current) => checked
      ? current.includes(key) ? current : [...current, key]
      : current.filter((item) => item !== key))
  }

  async function openDocuments(request: TransportRecord) {
    setDocumentsRequest(request)
    setAttachedDocuments([])
    const result = await getRpcService().listTransportAttachments(requestId(request))
    if (result.status === 'success') {
      setAttachedDocuments(Array.isArray(result.data) ? result.data as readonly TransportRecord[] : [])
    } else if (result.status === 'error') {
      setFeedback('Não foi possível carregar os anexos: ' + result.error.message)
    }
  }

  async function uploadDocument(request: TransportRecord, file: File | undefined) {
    if (!file || busy || !canAdminister) return
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) {
      setFeedback('Aceitamos somente PDF de até 10 MB por arquivo.')
      return
    }
    const id = requestId(request)
    const path = `transport/${id}/anexos/${globalThis.crypto.randomUUID()}.pdf`
    setBusy(true)
    try {
      const { error: uploadError } = await getSupabaseClient().storage.from('capo-documents')
        .upload(path, file, { contentType: 'application/pdf', upsert: false })
      if (uploadError) {
        setFeedback('Não foi possível enviar o PDF: ' + uploadError.message)
        return
      }
      const result = await getRpcService().registerTransportAttachment(id, path, file.name.slice(0, 160))
      if (result.status !== 'success') {
        setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o anexo.')
        return
      }
      setShareAccess(null)
      const updated = await getRpcService().listTransportAttachments(id)
      if (updated.status === 'success') setAttachedDocuments(Array.isArray(updated.data) ? updated.data as readonly TransportRecord[] : [])
      setFeedback('Documento complementar anexado. Qualquer link anterior foi revogado; gere outro após concluir os anexos.')
    } finally {
      setBusy(false)
    }
  }

  async function openAttachedDocument(item: TransportRecord) {
    const path = field(item, 'storage_path')
    if (!path) return
    const { data, error } = await getSupabaseClient().storage.from('capo-documents').createSignedUrl(path, 120)
    if (error || !data?.signedUrl) {
      setFeedback(error?.message ?? 'Não foi possível visualizar o anexo.')
      return
    }
    globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function issueShare(request: TransportRecord) {
    if (busy || !canAdminister) return
    setBusy(true)
    try {
      const id = requestId(request)
      const result = await getRpcService().createTransportShare(id, 7)
      if (result.status !== 'success') {
        setFeedback(result.status === 'error' ? result.error.message : 'Não foi possível gerar o link seguro.')
        return
      }
      const data = result.data as TransportRecord
      const token = field(data, 'token')
      const pin = field(data, 'pin')
      const expires = field(data, 'expires_at')
      if (!token || !pin || !expires) {
        setFeedback('O sistema não devolveu o link e o código de forma segura.')
        return
      }
      const url = `https://caposistema.pages.dev/transporte-documentos.html#acesso=${token}`
      setShareAccess({requestId: id, url, pin, expires})
      setFeedback('Link seguro gerado. Envie o código de acesso por canal separado do link. Gerar novo link revoga o anterior.')
    } finally {
      setBusy(false)
    }
  }

  async function revokeShare(request: TransportRecord) {
    if (busy || !canAdminister) return
    setBusy(true)
    try {
      const result = await getRpcService().revokeTransportShare(requestId(request))
      if (result.status === 'success') {
        setShareAccess(null)
        setFeedback('Link externo revogado no banco.')
      } else {
        setFeedback(result.status === 'error' ? result.error.message : 'Falha ao revogar o link.')
      }
    } finally {
      setBusy(false)
    }
  }

  function openTransportChannel(key: ContactKey, request: TransportRecord) {
    const destination = contacts[key].trim()
    if (!destination || !selectedContacts.includes(key)) return
    const activeShare = shareAccess?.requestId === requestId(request) ? shareAccess : null
    if (!activeShare) {
      setFeedback('Gere o link seguro desta solicitação antes de preparar o WhatsApp.')
      return
    }
    if (new Date(activeShare.expires).getTime() <= Date.now()) {
      setFeedback('O link expirou. Gere outro link antes de abrir a mensagem.')
      return
    }
    const sender = accessContext.full_name ?? accessContext.username
    const date = field(request, 'appointment_date')
    const appointmentLabel = date ? new Date(date).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', hour12: false,
    }) : null
    const brazilHour = Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo', hour: '2-digit', hourCycle: 'h23',
    }).format(new Date()))
    const greeting = brazilHour < 12 ? 'Bom dia!' : brazilHour < 18 ? 'Boa tarde!' : 'Boa noite!'
    const message = [
      greeting,
      'Ao Setor de Transportes da Secretaria Municipal de Saúde,',
      'O CAPO solicita providências de transporte para o(a) paciente ' + patientName + ', em acompanhamento pelo serviço.',
      appointmentLabel ? 'Atendimento previsto: ' + appointmentLabel + '.' : '',
      'PDF oficial e documentos complementares: ' + activeShare.url,
      'Abra o link para visualizar, baixar ou imprimir os documentos.',
      'Código de acesso: fornecido separadamente pelo CAPO.',
      'Link válido até: ' + new Date(activeShare.expires).toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo', hour12:false}) + '.',
      'Atenciosamente, ' + sender + ' — ' + issuerRole + ' / CAPO.',
    ].filter(Boolean).join('\n')
    const digits = destination.replace(/\D/g, '')
    const url = key === 'email'
      ? 'mailto:' + encodeURIComponent(destination) + '?subject=' + encodeURIComponent('CAPO — Solicitação de Transporte') + '&body=' + encodeURIComponent(message)
      : 'https://wa.me/' + (digits.startsWith('55') ? digits : '55' + digits) + '?text=' + encodeURIComponent(message)
    if (key === 'email') {
      globalThis.open(url, '_blank', 'noopener,noreferrer')
    } else {
      // Reutilizar a janela de WhatsApp do Transporte para não criar uma aba a cada envio.
      const destinationWindow = globalThis.open(url, 'capo-transporte-whatsapp')
      if (destinationWindow) destinationWindow.opener = null
    }
    setFeedback('Mensagem com o link seguro aberta. O envio é manual e não registra recebimento automático.')
  }


  const requests = rowsFromContext(context, 'requests', 'transport_requests', 'items')
  const appointments = rowsFromContext(context, 'appointments')
  const patient = context && typeof context.patient === 'object' && context.patient !== null
    ? context.patient as TransportRecord
    : null
  const activeNeed = context && typeof context.active_need === 'object' && context.active_need !== null
    ? context.active_need as TransportRecord
    : null

  async function searchPatients() {
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2 && !/^\d$/.test(cleanQuery)) {
      setFeedback('Informe ao menos dois caracteres ou o Nº CAPO exato.')
      return
    }
    const result = await getRpcService().searchReferralPatients(cleanQuery, 20, 0)
    setPatients(result.status === 'success' ? result.data : [])
    setFeedback(result.status === 'error' ? result.error.message : null)
  }

  async function loadContext(id: string, name: string) {
    setPatientId(id)
    setPatientName(name)
    setShareAccess((value) => value?.requestId && id !== patientId ? null : value)
    setDocumentsRequest(null)
    setPdfVersionHistory(null)
    setSelectedAppointmentId('')
    const result = await getRpcService().getTransportContext(id)
    if (result.status === 'success') {
      setContext(result.data as TransportRecord)
      setFeedback(null)
    } else if (result.status === 'empty') {
      setContext(null)
      setFeedback('Nenhum contexto de transporte real encontrado para este paciente.')
    } else if (result.status === 'error') {
      setContext(null)
      setFeedback(result.error.message)
    }
  }

  async function recognizeNeed() {
    if (!patientId || !canCreateRequest || busy) return
    setBusy(true)
    const result = await getRpcService().recognizeTransportNeed(patientId)
    if (result.status === 'success') {
      await loadContext(patientId, patientName)
      setFeedback('Necessidade de transporte reconhecida no banco.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a necessidade de transporte.')
    }
    setBusy(false)
  }

  async function manageNeed(action: 'request_cancel' | 'cancel') {
    const cycleId = field(activeNeed, 'cycle_id', 'id')
    if (!cycleId || needReason.trim().length < 5 || busy) {
      setFeedback('Informe a justificativa da alteração da necessidade de transporte.')
      return
    }
    setBusy(true)
    const result = await getRpcService().manageTransportNeed(
      cycleId,
      action,
      needReason.trim(),
    )
    if (result.status === 'success') {
      setFeedback(action === 'request_cancel'
        ? 'Solicitação de cancelamento da necessidade registrada.'
        : 'Necessidade de transporte encerrada.')
      setNeedReason('')
      await loadContext(patientId, patientName)
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a alteração da necessidade.')
    }
    setBusy(false)
  }

  async function createRequest() {
    if (!patientId || (appointments.length > 0 && !selectedAppointmentId) || reason.trim().length < 5 || busy) {
      setFeedback('Selecione o paciente, informe a justificativa e, se houver agendamento, selecione o atendimento.')
      return
    }
    setBusy(true)
    const result = await getRpcService().createTransportRequest({
      p_patient_id: patientId,
      p_appointment_id: selectedAppointmentId || null,
      p_transport_notes: reason.trim(),
    })
    if (result.status === 'success') {
      setReason('')
      setSelectedAppointmentId('')
      await loadContext(patientId, patientName)
      if (canAdminister) { void reloadAdministrativeQueue(); void reloadReminders() }
      setFeedback(canAdminister
        ? 'Solicitação salva. Confirme a solicitação na seção Acompanhamento para gerar o PDF oficial.'
        : 'Solicitação enviada ao Administrativo com sua justificativa. O Administrativo gerará o PDF.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a solicitação.')
    }
    setBusy(false)
  }

  async function manage(request: TransportRecord, action: string) {
    const id = requestId(request)
    if (!id || busy) return
    const args: Record<string, unknown> = {
      p_request_id: id,
      p_action: action,
    }
    if (action === 'forward') {
      if (channel.trim().length < 2) {
        setFeedback('Informe o canal institucional utilizado.')
        return
      }
      args.p_channel = channel.trim()
      args.p_reference = reference.trim() || null
    }
    if (action === 'cancel') {
      if (cancellationReason.trim().length < 5) {
        setFeedback('Informe o motivo do cancelamento.')
        return
      }
      args.p_reason = cancellationReason.trim()
    }

    setBusy(true)
    const result = await getRpcService().manageTransportRequest(args)
    if (result.status === 'success') {
      if (action === 'forward') {
        setChannel('')
        setReference('')
      }
      if (action === 'cancel') setCancellationReason('')
      await loadContext(patientId, patientName)
      void reloadAdministrativeQueue()
      void reloadReminders()
      setFeedback('Providência de transporte registrada no banco.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a providência.')
    }
    setBusy(false)
  }

  async function generatePdf(request: TransportRecord, reissue = false) {
    const id = requestId(request)
    if (!id || !canAdminister || busy) return
    if (reissue) {
      if (field(request, 'status') !== 'confirmado' || !boolField(request, 'pdf_persisted') ||
          !field(request, 'pdf_prepared_at') || field(request, 'external_forwarded_at')) {
        setFeedback('Somente solicitações confirmadas, com PDF preparado e ainda não encaminhadas, podem ser reemitidas.')
        return
      }
      if (!globalThis.confirm('Gerar nova versão do PDF? A anterior ficará preservada no histórico. Será necessário confirmar novamente o novo documento antes de encaminhá-lo.')) return
    }
    const notes = field(request, 'transport_notes') ?? 'Necessidade de transporte registrada no CAPO.'
    const boarding = field(request, 'boarding_address')
    if (!boarding || !field(request, 'pdf_details_confirmed_at')) {
      setFeedback('Confirme o endereço de embarque e a periodicidade nos ícones antes de gerar o PDF.')
      return
    }
    const cadence = field(request, 'periodicity')
    if (cadence !== 'unica' && cadence !== 'semanal' && cadence !== 'quinzenal') {
      setFeedback('Escolha a periodicidade para esta solicitação.')
      return
    }
    if (field(request, 'appointment_id') && !field(request, 'appointment_location')) {
      setFeedback('O endereço onde o profissional atende não está informado no agendamento ou cadastro profissional. Regularize o local oficial do atendimento antes de gerar o PDF.')
      return
    }
    const appointmentDate = field(request, 'appointment_date')
    const appointmentLabel = appointmentDate
      ? new Date(appointmentDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
      : null
    const blob = buildTransportOfficialPdf({
      patientName: patientName || field(patient, 'full_name') || 'Paciente',
      cms: field(patient, 'cms'),
      capoNumber: field(patient, 'patient_number'),
      registeredAddress: field(patient, 'address'),
      boardingAddress: boarding,
      boardingSource: field(request, 'boarding_source') === 'alternativo' ? 'alternativo' : 'cadastro',
      periodicity: cadence,
      reason: notes,
      requestedBy: field(request, 'requested_by') ?? 'Não identificado',
      requestedByRole: field(request, 'requested_by_role'),
      issuer: accessContext.full_name ?? accessContext.username,
      appointmentLabel,
      professionalName: field(request, 'appointment_professional'),
      specialty: field(request, 'appointment_specialty'),
      careLocation: field(request, 'appointment_location'),
    })
    const storagePath = `transport/${id}/solicitacao-transporte-${Date.now()}.pdf`

    setBusy(true)
    setFeedback(reissue ? 'Gerando nova versão e arquivando o PDF anterior…' : 'Gerando e registrando PDF oficial…')
    const { error: uploadError } = await getSupabaseClient()
      .storage.from('capo-documents')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setFeedback(uploadError.message)
      setBusy(false)
      return
    }

    const result = reissue
      ? await getRpcService().reissueTransportPdf(id, storagePath)
      : await getRpcService().registerTransportPdf(id, storagePath)
    if (result.status === 'success') {
      setShareAccess(null)
      await loadContext(patientId, patientName)
      setFeedback(reissue
        ? 'Nova versão do PDF vinculada. O documento anterior está no histórico. Clique em Assinar PDF para confirmar a nova versão antes de encaminhar.'
        : 'PDF oficial gerado e vinculado à solicitação.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o PDF.')
    }
    setBusy(false)
  }

  async function loadPdfVersionHistory(request: TransportRecord) {
    const id = requestId(request)
    if (!id || !canAdminister || busy) return
    if (pdfVersionHistory?.requestId === id) {
      setPdfVersionHistory(null)
      return
    }
    setBusy(true)
    try {
      const result = await getRpcService().listTransportPdfVersions(id)
      if (result.status === 'success') {
        setPdfVersionHistory({ requestId: id, versions: Array.isArray(result.data)
          ? result.data as readonly TransportRecord[] : [] })
      } else {
        setFeedback(result.status === 'error' ? result.error.message : 'Não foi possível consultar o histórico de PDFs.')
      }
    } finally {
      setBusy(false)
    }
  }

  async function openPreviousPdf(version: TransportRecord) {
    if (!canAdminister || busy) return
    const path = field(version, 'previous_path')
    if (!path) return
    setBusy(true)
    try {
      const { data, error } = await getSupabaseClient()
        .storage.from('capo-documents').createSignedUrl(path, 120)
      if (error || !data?.signedUrl) {
        setFeedback(error?.message ?? 'Não foi possível abrir a versão anterior.')
        return
      }
      globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } finally {
      setBusy(false)
    }
  }

  async function signPdf(request: TransportRecord) {
    const id = requestId(request)
    if (!id || !canAdminister || busy) return
    setBusy(true)
    const result = await getRpcService().signTransportPdf(id)
    if (result.status === 'success') {
      await loadContext(patientId, patientName)
      void reloadReminders()
      setFeedback('PDF oficial confirmado e liberado para continuidade administrativa.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a assinatura.')
    }
    setBusy(false)
  }

  async function completeWithClosurePdf(request: TransportRecord) {
    const id = requestId(request)
    if (!id || !canForwardExternally || busy) return

    const blob = buildTransportClosurePdfBlob({
      patientName: patientName || field(patient, 'full_name') || 'Paciente',
      cms: field(patient, 'cms'),
      channel: field(request, 'external_channel'),
      reference: field(request, 'external_reference'),
      requester: accessContext.full_name ?? accessContext.username,
      requesterRole: issuerRole,
    })
    const storagePath = `transport/${id}/encerramento-transporte-${Date.now()}.pdf`

    setBusy(true)
    setFeedback('Gerando PDF de encerramento e concluindo solicitação…')
    const { error: uploadError } = await getSupabaseClient()
      .storage.from('capo-documents')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setFeedback(uploadError.message)
      setBusy(false)
      return
    }

    const result = await getRpcService()
      .completeTransportRequestWithClosurePdf(id, storagePath)
    if (result.status === 'success') {
      setFeedback('Transporte concluído com PDF de encerramento vinculado.')
      await loadContext(patientId, patientName)
    } else {
      setFeedback(
        result.status === 'error'
          ? result.error.message
          : 'O banco não confirmou a conclusão documental do transporte.',
      )
    }
    setBusy(false)
  }

  async function openPdf(
    request: TransportRecord,
    download: boolean,
    documentKind: 'request' | 'closure' = 'request',
  ) {
    const id = requestId(request)
    if (!id || busy) return
    setBusy(true)
    const documentState = await getRpcService().getTransportDocument(id)
    if (documentState.status !== 'success') {
      setFeedback(documentState.status === 'error' ? documentState.error.message : 'Documento não localizado.')
      setBusy(false)
      return
    }
    const documentRecord = documentState.data as TransportRecord
    const path = documentKind === 'closure'
      ? field(documentRecord, 'closure_pdf_path')
      : field(documentRecord, 'request_pdf_path')
    if (!path) {
      setFeedback(documentKind === 'closure'
        ? 'O PDF de encerramento ainda não foi gerado.'
        : 'O PDF oficial ainda não foi gerado.')
      setBusy(false)
      return
    }
    const { data, error } = await getSupabaseClient()
      .storage.from('capo-documents')
      .createSignedUrl(path, 120, download ? { download: true } : undefined)
    if (error || !data?.signedUrl) {
      setFeedback(error?.message ?? 'Não foi possível abrir o PDF.')
      setBusy(false)
      return
    }
    globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    setBusy(false)
  }

  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="transport-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Transporte</p>
          <h1 id="transport-blocked-title">Transporte indisponível</h1>
          <p>O contexto atual não possui autorização para esta área.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="home-page" aria-labelledby="transport-title">
      <div className="home-welcome">
        <p className="eyebrow">Fluxos e Providências</p>
        <h1 id="transport-title">Transporte</h1>
        <p>Solicitação, documento oficial e acompanhamento da providência.</p>
      </div>

      {canCreateRequest && (
        <div className="home-ops" aria-label="Orientação sobre a solicitação de transporte">
          <h2>Solicitação de Transporte</h2>
          <p>
            Selecione o paciente e informe a justificativa. Se houver atendimento agendado, vincule-o à solicitação.
            Sem agendamento, a solicitação será genérica. A necessidade de transporte permanece ativa até o cancelamento formal.
          </p>
        </div>
      )}

      <div className="home-ops transport-sector-contacts">
        <button type="button" className="transport-contact-toggle" aria-expanded={contactsOpen}
          onClick={() => setContactsOpen((value) => !value)}>
          <span aria-hidden="true">✉</span> Contatos do Transporte
        </button>
        {contactsOpen && (
          <div className="transport-contact-overlay">
            <button type="button" className="transport-contact-backdrop"
              aria-label="Fechar janela de contatos" onClick={() => setContactsOpen(false)} />
            <section className="transport-contact-modal" role="dialog" aria-modal="true" aria-label="Contatos do Transporte">
              <div className="transport-contact-modal-head">
                <h2>Contatos do Transporte</h2>
                <button type="button" onClick={() => setContactsOpen(false)} aria-label="Fechar contatos">✕ Fechar</button>
              </div>
              <div className="transport-contact-details">
                <p>Contatos institucionais utilizados no encaminhamento de PDFs e documentos.</p>
            {CONTACT_FIELDS.map(({ key, label }) => (
              <label key={key} className="transport-contact-field">{label}
                {isManager ? (
                  <input type={key === 'email' ? 'email' : 'tel'} autoComplete="off"
                    value={contacts[key]} onChange={(event) => setContacts((current) => ({
                      ...current, [key]: event.target.value,
                    }))} placeholder={key === 'email' ? 'E-mail do setor' : 'DDD e número'} />
                ) : (
                  <span className="transport-contact-value">{contacts[key] || 'Não cadastrado'}</span>
                )}
              </label>
            ))}
            {isManager && (
              <button type="button" disabled={contactsBusy} onClick={() => void saveContacts()}>
                {contactsBusy ? 'Salvando…' : 'Salvar contatos'}
              </button>
            )}
            {canForwardExternally && (
              <fieldset className="transport-contact-selection">
                <legend>Destinatários do encaminhamento</legend>
                {CONTACT_FIELDS.map(({ key, label }) => (
                  <label key={key}>
                    <input type="checkbox" disabled={!contacts[key].trim()}
                      checked={selectedContacts.includes(key)}
                      onChange={(event) => chooseContact(key, event.target.checked)} />
                    {label}
                  </label>
                ))}
                <small>Marque um, dois ou três contatos. Cada canal abre individualmente.</small>
              </fieldset>
            )}
              </div>
            </section>
          </div>
        )}
      </div>

      {documentsRequest && (
        <div className="transport-contact-overlay">
          <button type="button" className="transport-contact-backdrop" aria-label="Fechar anexos"
            onClick={() => setDocumentsRequest(null)} />
          <section className="transport-contact-modal" role="dialog" aria-modal="true" aria-label="Documentos complementares do Transporte">
            <div className="transport-contact-modal-head">
              <h2>📎 Documentos complementares</h2>
              <button type="button" onClick={() => setDocumentsRequest(null)}>✕ Fechar</button>
            </div>
            <div className="transport-contact-details">
              <p>Anexos PDF exclusivos desta solicitação. Armazenamento privado; limite de 10 arquivos, até 10 MB cada.</p>
              <ul>{attachedDocuments.map((doc) => (
                <li key={field(doc,'id') ?? field(doc,'storage_path')}>
                  {field(doc,'name') ?? 'Documento'}{' '}
                  <button type="button" onClick={() => void openAttachedDocument(doc)}>Visualizar PDF</button>
                </li>
              ))}</ul>
              {attachedDocuments.length === 0 && <p>Sem documentos complementares.</p>}
              {canAdminister && ['solicitado','confirmado'].includes(field(documentsRequest,'status') ?? '')
                && !field(documentsRequest,'external_forwarded_at') && (
                <label>Incluir documento PDF
                  <input type="file" accept=".pdf,application/pdf" disabled={busy || attachedDocuments.length >= 10}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      if (file) void uploadDocument(documentsRequest, file)
                      event.currentTarget.value = ''
                    }} />
                </label>
              )}
            </div>
          </section>
        </div>
      )}

      {pdfDetailsRequest && (
        <div className="transport-contact-overlay">
          <button type="button" className="transport-contact-backdrop" aria-label="Fechar conferência de transporte"
            onClick={() => setPdfDetailsRequest(null)} />
          <section className="transport-contact-modal" role="dialog" aria-modal="true"
            aria-label="Conferir informações da solicitação de transporte">
            <div className="transport-contact-modal-head">
              <h2>{pdfDetailsMode === 'address' ? 'Endereço de embarque' : 'Periodicidade da consulta'}</h2>
              <button type="button" onClick={() => setPdfDetailsRequest(null)}>✕ Fechar</button>
            </div>
            <div className="transport-contact-details">
              <div className="transport-detail-switch">
                <button type="button" onClick={() => setPdfDetailsMode('address')} aria-pressed={pdfDetailsMode === 'address'}>⌖ Endereço</button>
                <button type="button" onClick={() => setPdfDetailsMode('periodicity')} aria-pressed={pdfDetailsMode === 'periodicity'}>▦ Periodicidade</button>
              </div>
              {pdfDetailsMode === 'address' ? (
                <fieldset>
                  <legend>Onde o transporte buscará o paciente?</legend>
                  <p>Endereço do cadastro: {field(patient, 'address') ?? 'Não informado'}</p>
                  <label><input type="radio" checked={boardingSource === 'cadastro'}
                    onChange={() => { setBoardingSource('cadastro'); setAddressConfirmed(true) }} /> Mesmo endereço do cadastro</label>
                  <label><input type="radio" checked={boardingSource === 'alternativo'}
                    onChange={() => { setBoardingSource('alternativo'); setAddressConfirmed(true) }} /> Outro local de embarque</label>
                  {boardingSource === 'alternativo' && (
                    <label>Endereço completo de embarque
                      <textarea rows={3} maxLength={500} value={boardingAddress}
                        onChange={(event) => setBoardingAddress(event.target.value)}
                        placeholder="Logradouro, número, complemento, bairro e município" />
                    </label>
                  )}
                  <small>O endereço alternativo fica somente nesta solicitação; não altera a ficha do paciente.</small>
                </fieldset>
              ) : (
                <fieldset>
                  <legend>Periodicidade da solicitação</legend>
                  {(['unica','semanal','quinzenal'] as const).map((item) => (
                    <label key={item}><input type="radio" checked={periodicityChosen && periodicity === item}
                      onChange={() => { setPeriodicity(item); setPeriodicityChosen(true) }} />
                      {item === 'unica' ? 'Consulta única' : item === 'semanal' ? 'Semanal' : 'Quinzenal'}
                    </label>
                  ))}
                  <small>A periodicidade não cria nem altera consultas na agenda.</small>
                </fieldset>
              )}
              <button type="button" disabled={busy} onClick={() => void savePdfDetails()}>
                Confirmar dados para o PDF
              </button>
            </div>
          </section>
        </div>
      )}

      {feedback && <p role="status">{feedback}</p>}

      {canAdminister && reminderQueue.length > 0 && (
        <div className="home-ops" aria-label="Avisos de transporte recorrente">
          <div className="transport-queue-head">
            <h2>▦ Lembretes de transporte</h2>
            <button type="button" onClick={() => void reloadReminders()}>Atualizar avisos</button>
          </div>
          <p>Consultas semanais ou quinzenais com lembrete para hoje ou amanhã. Envio manual pelo WhatsApp; sem confirmação de recebimento.</p>
          <ul className="transport-queue">
            {reminderQueue.map((item) => (
              <li key={requestId(item)}>
                <div className="transport-reminder-entry">
                  <strong>{field(item, 'patient_name') ?? 'Paciente'}</strong>
                  <small>{field(item, 'periodicity') === 'quinzenal' ? 'Quinzenal' : 'Semanal'} · {field(item, 'next_visit_date') ?? ''} · {field(item, 'appointment_time') ?? ''}</small>
                  <button type="button" onClick={() => openManualReminder(item)}>✉ Abrir lembrete no WhatsApp</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {canAdminister && (
        <div className="home-ops" aria-label="Solicitações administrativas de transporte">
          <div className="transport-queue-head">
            <h2>Solicitações recebidas</h2>
            <button type="button" disabled={queueLoading} onClick={() => void reloadAdministrativeQueue()}>
              {queueLoading ? 'Atualizando…' : 'Atualizar fila'}
            </button>
          </div>
          {administrativeQueue.length === 0 ? (
            <p>Não há solicitações pendentes na fila.</p>
          ) : (
            <ul className="transport-queue">
              {administrativeQueue.map((item) => (
                <li key={requestId(item)}>
                  <button type="button" disabled={busy} onClick={() => void loadContext(
                    field(item, 'patient_id') ?? '', field(item, 'patient_name') ?? 'Paciente',
                  )}>
                    <strong>{field(item, 'patient_name') ?? 'Paciente'}</strong>
                    <small>{field(item, 'status') === 'solicitado' ? 'Aguardando confirmação administrativa' : 'Em processamento'}</small>
                    <span>{field(item, 'transport_notes') ?? 'Sem justificativa informada'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="home-ops">
        <h2>Localizar paciente</h2>
        <div className="patient-search">
          <label>Nome, Nº CAPO ou CMS
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button type="button" onClick={() => void searchPatients()} disabled={busy}>Buscar</button>
        </div>
        {patients.length > 0 && (
          <div className="patient-results">
            {patients.map((item) => (
              <button
                key={item.patient_id}
                type="button"
                className={item.patient_id === patientId ? 'is-selected' : ''}
                onClick={() => void loadContext(item.patient_id, item.full_name)}
              >
                {item.full_name}
                <small>{item.patient_number ?? item.cms ?? 'Identificação disponível no cadastro'}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {patientId && (
        <div className="home-ops">
          <h2>Necessidade de transporte</h2>
          {activeNeed ? (
            <p>Situação: <strong>{field(activeNeed, 'status') ?? 'ativo'}</strong></p>
          ) : canCreateRequest ? (
            <button type="button" disabled={busy} onClick={() => void recognizeNeed()}>
              Reconhecer necessidade de transporte
            </button>
          ) : (
            <p>Nenhuma necessidade de transporte ativa para este paciente.</p>
          )}
        </div>
      )}

      {patientId && canCreateRequest && activeNeed && (
        <div className="home-ops">
          <h2>Solicitação de Transporte</h2>
          <p>Paciente: <strong>{patientName}</strong>{field(patient, 'cms') ? ` · CMS ${field(patient, 'cms')}` : ''}</p>
          {appointments.length > 0 ? (
            <label>Atendimento vinculado *
              <select value={selectedAppointmentId} onChange={(event) => setSelectedAppointmentId(event.target.value)}>
                <option value="">Selecionar atendimento</option>
                {appointments.map((appointment, index) => (
                  <option key={field(appointment, 'appointment_id', 'id') ?? index} value={field(appointment, 'appointment_id', 'id') ?? ''}>
                    {field(appointment, 'appointment_date')
                      ? new Date(field(appointment, 'appointment_date') ?? '').toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
                      : 'Atendimento'} · {field(appointment, 'professional_name') ?? 'Profissional'}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>Sem agendamento ativo — solicitação genérica de transporte.</p>
          )}
          <label>Motivo da solicitação *
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
          </label>
          <button type="button" onClick={() => void createRequest()} disabled={busy || (appointments.length > 0 && !selectedAppointmentId) || reason.trim().length < 5}>
            Salvar solicitação
          </button>
          {!isManager && isSocialProfessional && hasTransportCapability && (
            <p>A justificativa será encaminhada diretamente ao Administrativo, que emitirá e confirmará o PDF oficial.</p>
          )}
        </div>
      )}

      {patientId && activeNeed && (
        <div className="home-ops transport-cancellation">
          <h2>Cancelamento da necessidade de transporte</h2>
          <label>Justificativa para alteração da necessidade
            <textarea value={needReason} onChange={(event) => setNeedReason(event.target.value)} rows={2} />
          </label>
          {!isManager && isSocialProfessional && hasTransportCapability && (
            <button type="button" disabled={busy || needReason.trim().length < 5} onClick={() => void manageNeed('request_cancel')}>
              Solicitar cancelamento
            </button>
          )}
          {canAdminister && (
            <button type="button" disabled={busy || needReason.trim().length < 5} onClick={() => void manageNeed('cancel')}>
              Encerrar necessidade
            </button>
          )}
        </div>
      )}

      <div className="home-ops">
        <h2>Acompanhamento</h2>
        {canForwardExternally && (
          <>
            <label>Canal institucional para encaminhamento
              <input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="Ex.: e-mail institucional" />
            </label>
            <label>Referência / protocolo
              <input value={reference} onChange={(event) => setReference(event.target.value)} />
            </label>
            <label>Motivo de cancelamento
              <textarea value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} rows={2} />
            </label>
          </>
        )}

        {requests.length === 0 && <p>Nenhuma solicitação de transporte encontrada.</p>}
        {requests.length > 0 && (
          <ul>
            {requests.map((request, index) => {
              const id = requestId(request)
              const status = field(request, 'status') ?? 'Situação não informada'
              const pdfPersisted = boolField(request, 'pdf_persisted')
              const pdfPrepared = Boolean(field(request, 'pdf_prepared_at'))
              const forwarded = Boolean(field(request, 'external_forwarded_at'))
              return (
                <li key={id || index}>
                  <strong>{patientName || 'Paciente'}</strong>
                  <span>{status}</span>
                  <small>{field(request, 'appointment_id') ? 'Agendamento vinculado' : 'Solicitação genérica (sem agendamento)'}</small>
                  <small>{field(request, 'transport_notes') ?? 'Sem observação operacional.'}</small>
                  <div>
                    {canAdminister && status === 'confirmado' && !pdfPersisted && (
                      <>
                        <button type="button" disabled={busy} title="Confirmar local de embarque"
                          onClick={() => editPdfDetails(request, 'address')}>⌖ Endereço de embarque</button>
                        <button type="button" disabled={busy} title="Definir periodicidade"
                          onClick={() => editPdfDetails(request, 'periodicity')}>▦ Periodicidade</button>
                        <button type="button" disabled={busy || !field(request, 'pdf_details_confirmed_at')}
                          onClick={() => void generatePdf(request)}>Gerar PDF</button>
                      </>
                    )}
                    {canAdminister && status === 'confirmado' && pdfPersisted && !pdfPrepared && (
                      <button type="button" disabled={busy} onClick={() => void signPdf(request)}>Assinar PDF</button>
                    )}
                    {canAdminister && status === 'confirmado' && pdfPersisted && pdfPrepared && !forwarded && (
                      <button type="button" disabled={busy} onClick={() => void generatePdf(request, true)}>
                        Atualizar PDF para novo modelo
                      </button>
                    )}
                    {canAdminister && status !== 'cancelado' && (
                      <button type="button" disabled={busy} onClick={() => void openDocuments(request)}>
                        📎 Documentos complementares
                      </button>
                    )}
                    {canAdminister && status === 'confirmado' && pdfPrepared && (
                      <>
                        <button type="button" disabled={busy} onClick={() => void issueShare(request)}>🔗 Gerar link seguro</button>
                        <button type="button" disabled={busy} onClick={() => void revokeShare(request)}>Revogar link</button>
                        {shareAccess?.requestId === id && (
                          <div className="transport-share-access">
                            <p><strong>Link válido por 7 dias.</strong> Envie o link pelo WhatsApp e o código por outro canal.</p>
                            <p>Código de acesso: <strong>{shareAccess.pin}</strong></p>
                            <button type="button" onClick={() => void navigator.clipboard.writeText(shareAccess.pin)}>Copiar código</button>
                            <button type="button" onClick={() => void navigator.clipboard.writeText(shareAccess.url)}>Copiar link</button>
                          </div>
                        )}
                      </>
                    )}
                    {pdfPersisted && (
                      <>
                        <button type="button" disabled={busy} onClick={() => void openPdf(request, false)}>Visualizar PDF</button>
                        <button type="button" disabled={busy} onClick={() => void openPdf(request, true)}>Baixar PDF</button>
                      </>
                    )}
                    {canAdminister && pdfPersisted && (
                      <button type="button" disabled={busy} onClick={() => void loadPdfVersionHistory(request)}>
                        Versões anteriores do PDF
                      </button>
                    )}
                    {pdfVersionHistory?.requestId === id && (
                      <div className="transport-share-access">
                        <strong>Histórico documental preservado</strong>
                        {pdfVersionHistory.versions.length === 0 ? (
                          <p>Nenhuma versão anterior registrada.</p>
                        ) : pdfVersionHistory.versions.map((version, i) => (
                          <div key={field(version, 'version_id') ?? i}>
                            <span>Versão anterior {i + 1} — {field(version, 'superseded_at')
                              ? new Date(field(version, 'superseded_at') ?? '').toLocaleString('pt-BR', {
                                timeZone: 'America/Sao_Paulo', hour12: false,
                              }) : 'Data não informada'}</span>
                            <button type="button" disabled={busy} onClick={() => void openPreviousPdf(version)}>
                              Visualizar versão anterior
                            </button>
                          </div>
                        ))}
                      </div>
                    )
                    {canAdminister && status === 'solicitado' && (
                      <button type="button" disabled={busy} onClick={() => void manage(request, 'confirm')}>Confirmar solicitação</button>
                    )}
                    {canForwardExternally && status === 'confirmado' && pdfPrepared && !forwarded && selectedContacts.length > 0 && (
                      <div className="transport-send-actions">
                        {selectedContacts.map((key) => contacts[key].trim() ? (
                          <button type="button" key={key} disabled={busy}
                            onClick={() => openTransportChannel(key, request)}>
                            {key === 'email' ? '✉ Abrir e-mail' : key === 'phone_responsible' ? '☏ WhatsApp responsável' : '✉ WhatsApp setor'}
                          </button>
                        ) : null)}
                        <small>A mensagem contém um único link seguro. Informe o código de acesso por canal separado. Confirme o envio manual antes de registrar o encaminhamento.</small>
                      </div>
                    )}
                    {canForwardExternally && status === 'confirmado' && pdfPrepared && !forwarded && (
                      <button type="button" disabled={busy || channel.trim().length < 2} onClick={() => void manage(request, 'forward')}>Registrar encaminhamento</button>
                    )}
                    {canForwardExternally && status === 'confirmado' && forwarded && (
                      <button type="button" disabled={busy} onClick={() => void completeWithClosurePdf(request)}>Concluir e gerar PDF de encerramento</button>
                    )}
                    {status === 'realizado' && (
                      <>
                        <button type="button" disabled={busy} onClick={() => void openPdf(request, false, 'closure')}>Visualizar PDF de encerramento</button>
                        <button type="button" disabled={busy} onClick={() => void openPdf(request, true, 'closure')}>Baixar PDF de encerramento</button>
                      </>
                    )}
                    {canAdminister && ['solicitado', 'confirmado'].includes(status) && (
                      <button type="button" disabled={busy || cancellationReason.trim().length < 5} onClick={() => void manage(request, 'cancel')}>Cancelar</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
