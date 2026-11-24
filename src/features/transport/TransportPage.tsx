import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type ReferralPatient } from '../../lib/supabase/rpc'
import { getSupabaseClient } from '../../lib/supabase/client'
import { buildCapoDocumentPdf } from '../../lib/pdf/capo-document-pdf'
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

function buildTransportPdfBlob(input: Readonly<{
  patientName: string
  cms: string | null
  reason: string
  requester: string
  requesterRole: string
  appointmentLabel: string | null
}>) {
  const lines = [
    'SOLICITAÇÃO DE TRANSPORTE',
    '',
    'Ao Setor de Transportes da Secretaria Municipal de Saúde.',
    '',
    `Paciente: ${input.patientName}${input.cms ? ` · CMS ${input.cms}` : ''}`,
    input.appointmentLabel ? `Atendimento vinculado: ${input.appointmentLabel}` : '',
    '',
    'Declara-se, para os devidos fins, que o(a) paciente identificado(a) neste documento encontra-se em acompanhamento pelo Centro de Apoio ao Paciente Oncológico – CAPO e apresenta necessidade de utilização de transporte para viabilizar o deslocamento relacionado ao seu acompanhamento e/ou tratamento de saúde.',
    '',
    'A presente solicitação tem por finalidade formalizar a necessidade de transporte, possibilitando o encaminhamento ao setor responsável para análise, organização e demais providências cabíveis.',
    '',
    `Motivo da solicitação: ${input.reason}`,
    '',
    'As informações específicas acima consideram a situação individual do paciente e a necessidade que originou esta solicitação.',
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
    isManager || (isSocialProfessional && hasTransportCapability)
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
  const [contactsOpen, setContactsOpen] = useState(false)
  const [contactsBusy, setContactsBusy] = useState(false)
  const [contacts, setContacts] = useState<TransportContacts>(EMPTY_CONTACTS)
  const [selectedContacts, setSelectedContacts] = useState<readonly ContactKey[]>([])

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

  function openTransportChannel(key: ContactKey) {
    const destination = contacts[key].trim()
    if (!destination || !selectedContacts.includes(key)) return
    const sender = accessContext.full_name ?? accessContext.username
    const message = [
      'Bom dia/Boa tarde.',
      'Ao Setor de Transportes da Secretaria Municipal de Saúde,',
      'O CAPO solicita providências de transporte para o(a) paciente ' + patientName + ', em acompanhamento pelo serviço.',
      'O PDF oficial da solicitação e a documentação necessária serão anexados a esta mensagem.',
      'Solicitamos a confirmação do recebimento e orientações para continuidade.',
      'Atenciosamente, ' + sender + ' — ' + issuerRole + ' / CAPO.',
    ].join('\n')
    const digits = destination.replace(/\D/g, '')
    const url = key === 'email'
      ? 'mailto:' + encodeURIComponent(destination) + '?subject=' + encodeURIComponent('CAPO — Solicitação de Transporte') + '&body=' + encodeURIComponent(message)
      : 'https://wa.me/' + (digits.startsWith('55') ? digits : '55' + digits) + '?text=' + encodeURIComponent(message)
    globalThis.open(url, '_blank', 'noopener,noreferrer')
    setFeedback('Canal aberto para envio. Anexe o PDF oficial e demais documentos manualmente; o CAPO não confirma entrega automática.')
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
      setFeedback('Necessidade de transporte reconhecida no banco.')
      await loadContext(patientId, patientName)
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
    if (!patientId || !selectedAppointmentId || reason.trim().length < 5 || busy) {
      setFeedback('Selecione paciente, atendimento vinculado e informe o motivo do transporte.')
      return
    }
    setBusy(true)
    const result = await getRpcService().createTransportRequest({
      p_patient_id: patientId,
      p_appointment_id: selectedAppointmentId,
      p_transport_notes: reason.trim(),
    })
    if (result.status === 'success') {
      setFeedback('Solicitação de transporte registrada no banco.')
      setReason('')
      setSelectedAppointmentId('')
      await loadContext(patientId, patientName)
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
      setFeedback('Providência de transporte registrada no banco.')
      if (action === 'forward') {
        setChannel('')
        setReference('')
      }
      if (action === 'cancel') setCancellationReason('')
      await loadContext(patientId, patientName)
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a providência.')
    }
    setBusy(false)
  }

  async function generatePdf(request: TransportRecord) {
    const id = requestId(request)
    if (!id || !isManager || busy) return
    const notes = field(request, 'transport_notes') ?? 'Necessidade de transporte registrada no CAPO.'
    const appointmentDate = field(request, 'appointment_date')
    const appointmentLabel = appointmentDate
      ? new Date(appointmentDate).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour12: false })
      : null
    const blob = buildTransportPdfBlob({
      patientName: patientName || field(patient, 'full_name') || 'Paciente',
      cms: field(patient, 'cms'),
      reason: notes,
      requester: accessContext.full_name ?? accessContext.username,
      requesterRole: issuerRole,
      appointmentLabel,
    })
    const storagePath = `transport/${id}/solicitacao-transporte-${Date.now()}.pdf`

    setBusy(true)
    setFeedback('Gerando e registrando PDF oficial…')
    const { error: uploadError } = await getSupabaseClient()
      .storage.from('capo-documents')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setFeedback(uploadError.message)
      setBusy(false)
      return
    }

    const result = await getRpcService().registerTransportPdf(id, storagePath)
    if (result.status === 'success') {
      setFeedback('PDF oficial gerado e vinculado à solicitação.')
      await loadContext(patientId, patientName)
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o PDF.')
    }
    setBusy(false)
  }

  async function signPdf(request: TransportRecord) {
    const id = requestId(request)
    if (!id || !isManager || busy) return
    setBusy(true)
    const result = await getRpcService().signTransportPdf(id)
    if (result.status === 'success') {
      setFeedback('PDF oficial assinado e liberado para continuidade administrativa.')
      await loadContext(patientId, patientName)
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
            Selecione o paciente e um agendamento válido para registrar a solicitação.
            A necessidade de transporte permanecerá ativa até seu cancelamento formal.
          </p>
        </div>
      )}

      <div className="home-ops transport-sector-contacts">
        <button type="button" className="transport-contact-toggle" aria-expanded={contactsOpen}
          onClick={() => setContactsOpen((value) => !value)}>
          <span aria-hidden="true">✉</span> Contatos do Transporte
        </button>
        {contactsOpen && (
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
        )}
      </div>

      {feedback && <p role="status">{feedback}</p>}

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
          <label>Motivo da solicitação *
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
          </label>
          <button type="button" onClick={() => void createRequest()} disabled={busy || !selectedAppointmentId || reason.trim().length < 5}>
            Salvar solicitação
          </button>
          {!isManager && isSocialProfessional && hasTransportCapability && (
            <p>O PDF oficial será gerado e assinado pelo Gestor do Sistema. A etapa administrativa posterior recebe o documento já vinculado.</p>
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
                  <small>{field(request, 'transport_notes') ?? 'Sem observação operacional.'}</small>
                  <div>
                    {isManager && status === 'confirmado' && !pdfPersisted && (
                      <button type="button" disabled={busy} onClick={() => void generatePdf(request)}>Gerar PDF</button>
                    )}
                    {isManager && status === 'confirmado' && pdfPersisted && !pdfPrepared && (
                      <button type="button" disabled={busy} onClick={() => void signPdf(request)}>Assinar PDF</button>
                    )}
                    {pdfPersisted && (
                      <>
                        <button type="button" disabled={busy} onClick={() => void openPdf(request, false)}>Visualizar PDF</button>
                        <button type="button" disabled={busy} onClick={() => void openPdf(request, true)}>Baixar PDF</button>
                      </>
                    )}
                    {canAdminister && status === 'solicitado' && (
                      <button type="button" disabled={busy} onClick={() => void manage(request, 'confirm')}>Confirmar solicitação</button>
                    )}
                    {canForwardExternally && status === 'confirmado' && pdfPrepared && !forwarded && selectedContacts.length > 0 && (
                      <div className="transport-send-actions">
                        {selectedContacts.map((key) => contacts[key].trim() ? (
                          <button type="button" key={key} disabled={busy}
                            onClick={() => openTransportChannel(key)}>
                            {key === 'email' ? '✉ Abrir e-mail' : key === 'phone_responsible' ? '☏ WhatsApp responsável' : '✉ WhatsApp setor'}
                          </button>
                        ) : null)}
                        <small>Baixe o PDF assinado acima e anexe-o manualmente com os demais documentos. Confirme o envio antes de registrar o encaminhamento.</small>
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
