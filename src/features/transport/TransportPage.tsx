import { useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type ReferralPatient } from '../../lib/supabase/rpc'
import { getSupabaseClient } from '../../lib/supabase/client'

type TransportRecord = Readonly<Record<string, unknown>>

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

function winAnsiBytes(value: string) {
  const bytes = new Uint8Array(value.length)
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    bytes[index] = code <= 255 ? code : 63
  }
  return bytes
}

function concatBytes(parts: readonly Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
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
  appointmentLabel: string | null
}>) {
  const lines = [
    'Secretaria Municipal de Saúde de Pouso Alegre - MG',
    '',
    'Ao Setor de Transportes da Secretaria Municipal de Saúde.',
    '',
    `Solicitamos transporte para ${input.patientName}${input.cms ? `, CMS ${input.cms}` : ''}, paciente em acompanhamento pela equipe multiprofissional do CAPO - Centro de Acolhimento ao Paciente Oncológico.`,
    '',
    'A solicitação decorre da necessidade de acessibilidade do paciente para continuidade do acompanhamento.',
    input.appointmentLabel ? `Atendimento vinculado: ${input.appointmentLabel}` : '',
    '',
    `Motivo da solicitação: ${input.reason}`,
    '',
    'Os dias e horários do transporte ficam sob responsabilidade do CAPO, que os informará com antecedência por meio de relatório e/ou outro meio de comunicação estabelecido com o Setor de Transportes da Secretaria Municipal de Saúde.',
    '',
    `Solicitante: ${input.requester}`,
    '',
    'CAPO - Centro de Acolhimento ao Paciente Oncológico',
    'Secretaria Municipal de Saúde de Pouso Alegre - MG',
  ].flatMap((line) => wrapLine(line)).slice(0, 48)

  const stream =
    'BT\n/F1 10 Tf\n50 792 Td\n14 TL\n' +
    lines.map((line) => `(${pdfEscape(line)}) Tj\nT*\n`).join('') +
    'ET\n'
  const contentBytes = winAnsiBytes(stream)
  const objects = [
    winAnsiBytes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    winAnsiBytes('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    winAnsiBytes('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'),
    winAnsiBytes('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'),
    concatBytes([
      winAnsiBytes(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      winAnsiBytes('endstream\nendobj\n'),
    ]),
  ]
  const header = winAnsiBytes('%PDF-1.4\n')
  const parts: Uint8Array[] = [header]
  const offsets = [0]
  let offset = header.length
  for (const object of objects) {
    offsets.push(offset)
    parts.push(object)
    offset += object.length
  }
  const xrefOffset = offset
  const xref =
    'xref\n0 6\n0000000000 65535 f \n' +
    offsets.slice(1).map((value) => `${String(value).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  parts.push(winAnsiBytes(xref))
  return new Blob([concatBytes(parts)], { type: 'application/pdf' })
}

export function TransportPage({ accessContext }: Props) {
  const hasRole = (code: string) =>
    accessContext.roles.some((role) => role.code === code)
  const isManager = hasRole('administrador')
  const isAdministrativeOperational = hasRole('administrativo_operacional')
  const hasTransportCapability = accessContext.capabilities.includes(
    'preencher_solicitacao_transporte',
  )
  const canCreateRequest = isManager || hasTransportCapability
  const canAdminister = isManager || isAdministrativeOperational
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

  const requests = rowsFromContext(context, 'requests', 'transport_requests', 'items')
  const appointments = rowsFromContext(context, 'appointments')
  const patient = context && typeof context.patient === 'object' && context.patient !== null
    ? context.patient as TransportRecord
    : null
  const activeNeed = context && typeof context.active_need === 'object' && context.active_need !== null
    ? context.active_need as TransportRecord
    : null

  async function searchPatients() {
    if (query.trim().length < 2) {
      setFeedback('Informe ao menos dois caracteres para buscar o paciente.')
      return
    }
    const result = await getRpcService().searchReferralPatients(query.trim(), 20, 0)
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
      ? new Date(appointmentDate).toLocaleString('pt-BR')
      : null
    const blob = buildTransportPdfBlob({
      patientName: patientName || field(patient, 'full_name') || 'Paciente',
      cms: field(patient, 'cms'),
      reason: notes,
      requester: accessContext.full_name ?? accessContext.username,
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

  async function openPdf(request: TransportRecord, download: boolean) {
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
    const path = field(documentRecord, 'request_pdf_path')
    if (!path) {
      setFeedback('O PDF oficial ainda não foi gerado.')
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
            <>
              <p>Situação: <strong>{field(activeNeed, 'status') ?? 'ativo'}</strong></p>
              <label>Justificativa para alteração da necessidade
                <textarea value={needReason} onChange={(event) => setNeedReason(event.target.value)} rows={2} />
              </label>
              {!isManager && hasTransportCapability && (
                <button type="button" disabled={busy || needReason.trim().length < 5} onClick={() => void manageNeed('request_cancel')}>
                  Solicitar cancelamento
                </button>
              )}
              {canAdminister && (
                <button type="button" disabled={busy || needReason.trim().length < 5} onClick={() => void manageNeed('cancel')}>
                  Encerrar necessidade
                </button>
              )}
            </>
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
                    ? new Date(field(appointment, 'appointment_date') ?? '').toLocaleString('pt-BR')
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
          {!isManager && hasTransportCapability && (
            <p>O PDF oficial será gerado e assinado pelo Gestor do Sistema. A etapa administrativa posterior recebe o documento já vinculado.</p>
          )}
        </div>
      )}

      <div className="home-ops">
        <h2>Acompanhamento</h2>
        {canAdminister && (
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
                    {canAdminister && status === 'confirmado' && pdfPrepared && !forwarded && (
                      <button type="button" disabled={busy || channel.trim().length < 2} onClick={() => void manage(request, 'forward')}>Registrar encaminhamento</button>
                    )}
                    {canAdminister && status === 'confirmado' && forwarded && (
                      <button type="button" disabled={busy} onClick={() => void manage(request, 'complete')}>Concluir</button>
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
