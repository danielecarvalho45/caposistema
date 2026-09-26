import { useEffect, useMemo, useState } from 'react'
import {
  getRpcService,
  type AsyncState,
  type DentistryAccessContext,
  type DentistryPatient,
  type DentistryReferral,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { getSupabaseClient } from '../../lib/supabase/client'
import './dentistry-page.css'

const DENTISTRY_CAPABILITY = 'emitir_encaminhamento_odontologico_externo'

const statusLabels: Record<string, string> = {
  pending_approval: 'Aguardando aprovação',
  in_progress: 'Em atendimento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
}

const actionLabels: Record<string, string> = {
  start: 'Iniciar atendimento',
  complete: 'Concluir atendimento',
  cancel: 'Cancelar encaminhamento',
}

export type DentistryService = Pick<
  ReturnType<typeof getRpcService>,
  | 'getDentistryAccessContextForInterface'
  | 'searchDentistryPatientsForInterface'
  | 'createDentistryReferralForInterface'
  | 'getDentistryReferralsForInterface'
  | 'manageDentistryReferralForInterface'
> &
  Partial<
    Pick<
      ReturnType<typeof getRpcService>,
      | 'registerDentistryPdfForInterface'
      | 'getDentistryReferralDocumentForInterface'
    >
  >

type Props = Readonly<{
  accessContext: AccessContext
  service?: DentistryService
}>

function errorMessage<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

type DentistryDocumentState = Readonly<Record<string, unknown>>

function documentField(record: DentistryDocumentState | null, key: string) {
  const value = record?.[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function dentistryPdfSafe(value: string) {
  return Array.from(value).map((character) => {
    const code = character.charCodeAt(0)
    if (code <= 255) return character
    return ({ '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '•': '*' } as Record<string, string>)[character] ?? '?'
  }).join('')
}

function dentistryPdfEscape(value: string) {
  return dentistryPdfSafe(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function dentistryPdfBytes(value: string) {
  return Uint8Array.from(Array.from(value).map((character) => character.charCodeAt(0) & 255))
}

function dentistryPdfWrap(value: string, width = 88) {
  const output: string[] = []
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) {
      output.push('')
      continue
    }
    let line = ''
    for (const word of words) {
      const next = line ? `${line} ${word}` : word
      if (next.length > width) {
        if (line) output.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) output.push(line)
  }
  return output
}

function buildDentistryOfficialPdf(
  referral: DentistryReferral,
  professionalRegistration: string | null,
) {
  const generatedAt = new Date()
  const lines = [
    'CAPO - Centro de Acolhimento ao Paciente Oncológico',
    'Pouso Alegre - MG',
    '',
    'ENCAMINHAMENTO ODONTOLÓGICO',
    '',
    `Paciente: ${referral.patient_name}`,
    `CMS: ${referral.cms ?? '—'}`,
    `Nº CAPO: ${referral.patient_number ?? '—'}`,
    `Destino: ${referral.destination ?? 'Odontologia - Secretaria Municipal de Saúde'}`,
    '',
    'Encaminhamento / informações relevantes:',
    referral.operational_reason,
    '',
    `Médico Clínico: ${referral.requesting_professional_name}`,
    `CRM: ${professionalRegistration ?? 'Não informado'}`,
    `Data da emissão: ${generatedAt.toLocaleString('pt-BR')}`,
  ].flatMap((line) => dentistryPdfWrap(line)).slice(0, 48)

  const stream =
    'BT\n/F1 10 Tf\n50 792 Td\n14 TL\n' +
    lines.map((line) => `(${dentistryPdfEscape(line)}) Tj\nT*\n`).join('') +
    'ET\n'
  const streamBytes = dentistryPdfBytes(stream)
  const objects = [
    dentistryPdfBytes('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    dentistryPdfBytes('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    dentistryPdfBytes('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n'),
    dentistryPdfBytes('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n'),
  ]
  const contentObject = [
    dentistryPdfBytes(`5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`),
    streamBytes,
    dentistryPdfBytes('endstream\nendobj\n'),
  ]
  const contentLength = contentObject.reduce((total, part) => total + part.length, 0)
  const content = new Uint8Array(contentLength)
  let contentOffset = 0
  for (const part of contentObject) {
    content.set(part, contentOffset)
    contentOffset += part.length
  }
  objects.push(content)

  const header = dentistryPdfBytes('%PDF-1.4\n')
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
  parts.push(dentistryPdfBytes(xref))
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(total)
  let at = 0
  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }
  return new Blob([bytes], { type: 'application/pdf' })
}

export function DentistryPage({ accessContext, service }: Props) {
  const rpcService = useMemo(() => service ?? getRpcService(), [service])
  const [backendAccess, setBackendAccess] =
    useState<DentistryAccessContext | null>(null)
  const [patients, setPatients] = useState<readonly DentistryPatient[]>([])
  const [referrals, setReferrals] = useState<readonly DentistryReferral[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  )
  const [patientQuery, setPatientQuery] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(
    null,
  )
  const [administrativeResponse, setAdministrativeResponse] = useState('')
  const [documentState, setDocumentState] = useState<DentistryDocumentState | null>(null)
  const [documentLoading, setDocumentLoading] = useState(false)

  const selectedPatient = patients.find(
    (patient) => patient.patient_id === selectedPatientId,
  )
  const selectedReferral =
    referrals.find((referral) => referral.referral_id === selectedReferralId) ??
    referrals[0] ??
    null

  const localCapabilityAuthorized =
    accessContext.capabilities.includes(DENTISTRY_CAPABILITY)
  const backendAuthorized = Boolean(backendAccess?.can_issue)
  const canManage = Boolean(backendAccess?.can_manage)
  const authorized = backendAccess
    ? backendAuthorized || canManage
    : loading && localCapabilityAuthorized

  const loadReferrals = async () => {
    const result = await rpcService.getDentistryReferralsForInterface(
      statusFilter === 'all' ? null : statusFilter,
      50,
      0,
    )
    if (result.status === 'success') {
      setReferrals(result.data)
      setSelectedReferralId((current) =>
        current && result.data.some((item) => item.referral_id === current)
          ? current
          : (result.data[0]?.referral_id ?? null),
      )
    } else if (result.status === 'empty') {
      setReferrals([])
      setSelectedReferralId(null)
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível carregar histórico.',
      )
    }
  }

  useEffect(() => {
    let active = true
    void rpcService.getDentistryAccessContextForInterface().then((result) => {
      if (!active) return
      if (result.status === 'success') {
        setBackendAccess(result.data)
        setFeedback(null)
      } else if (result.status === 'error') {
        setFeedback(result.error.message)
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [rpcService])

  useEffect(() => {
    if (!backendAccess?.can_issue && !backendAccess?.can_manage) return
    let active = true
    void rpcService
      .getDentistryReferralsForInterface(
        statusFilter === 'all' ? null : statusFilter,
        50,
        0,
      )
      .then((result) => {
        if (!active) return
        if (result.status === 'success') {
          setReferrals(result.data)
          setSelectedReferralId((current) =>
            current && result.data.some((item) => item.referral_id === current)
              ? current
              : (result.data[0]?.referral_id ?? null),
          )
        } else if (result.status === 'empty') {
          setReferrals([])
          setSelectedReferralId(null)
        } else if (result.status === 'error') {
          setFeedback(result.error.message)
        }
      })
    return () => {
      active = false
    }
  }, [backendAccess, rpcService, statusFilter])

  useEffect(() => {
    if (!selectedReferral || !rpcService.getDentistryReferralDocumentForInterface) {
      setDocumentState(null)
      return
    }
    let active = true
    setDocumentLoading(true)
    void rpcService
      .getDentistryReferralDocumentForInterface(selectedReferral.referral_id)
      .then((result) => {
        if (!active) return
        setDocumentState(result.status === 'success' ? result.data as DentistryDocumentState : null)
        if (result.status === 'error') setFeedback(result.error.message)
        setDocumentLoading(false)
      })
    return () => {
      active = false
    }
  }, [rpcService, selectedReferral])

  async function searchPatients() {
    if (patientQuery.trim().length < 2) {
      setFeedback('Informe ao menos 2 caracteres para buscar o paciente.')
      return
    }
    setSearching(true)
    setFeedback(null)
    const result = await rpcService.searchDentistryPatientsForInterface(
      patientQuery.trim(),
      10,
      0,
    )
    if (result.status === 'success') {
      setPatients(result.data)
      setSelectedPatientId(null)
      if (result.data.length === 0) {
        setFeedback('Nenhum paciente encontrado para este critério.')
      }
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setSearching(false)
  }

  async function createReferral() {
    if (!selectedPatientId || reason.trim().length < 5) {
      setFeedback(
        'Selecione o paciente e informe um motivo operacional válido.',
      )
      return
    }
    setSubmitting(true)
    setFeedback(null)
    const result = await rpcService.createDentistryReferralForInterface(
      selectedPatientId,
      reason.trim(),
    )
    if (result.status === 'success') {
      setPatients([])
      setSelectedPatientId(null)
      setPatientQuery('')
      setReason('')
      setFeedback(
        'Encaminhamento odontológico registrado. Gere o PDF oficial antes da etapa administrativa.',
      )
      await loadReferrals()
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível criar o encaminhamento.',
      )
    }
    setSubmitting(false)
  }

  async function act(referral: DentistryReferral, action: string) {
    if (busy) return
    const response = administrativeResponse.trim()
    if ((action === 'complete' || action === 'cancel') && response.length < 5) {
      setFeedback('Conclusão ou cancelamento exige informação administrativa com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    setFeedback(null)
    const result = await rpcService.manageDentistryReferralForInterface(
      referral.referral_id,
      action,
      response || null,
    )
    if (result.status === 'success') {
      setFeedback('Atualização do encaminhamento registrada com sucesso.')
      setAdministrativeResponse('')
      await loadReferrals()
    } else {
      setFeedback(
        errorMessage(result) ?? 'Não foi possível atualizar o encaminhamento.',
      )
    }
    setBusy(false)
  }

  async function generatePdf(referral: DentistryReferral) {
    if (
      !backendAccess?.can_issue ||
      backendAccess.professional_id !== referral.requesting_professional_id ||
      !rpcService.registerDentistryPdfForInterface ||
      busy
    ) return

    const blob = buildDentistryOfficialPdf(
      referral,
      accessContext.professional_registration,
    )
    const storagePath =
      `dentistry/${referral.referral_id}/encaminhamento-odontologico-${Date.now()}.pdf`

    setBusy(true)
    setFeedback('Gerando e registrando PDF odontológico oficial…')
    const { error: uploadError } = await getSupabaseClient()
      .storage.from('capo-documents')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setFeedback(uploadError.message)
      setBusy(false)
      return
    }

    const result = await rpcService.registerDentistryPdfForInterface(
      referral.referral_id,
      storagePath,
    )
    if (result.status === 'success') {
      setFeedback('PDF odontológico oficial gerado e vinculado ao encaminhamento.')
      setDocumentState(result.data as DentistryDocumentState)
      await loadReferrals()
    } else {
      setFeedback(
        result.status === 'error'
          ? result.error.message
          : 'O banco não confirmou o documento odontológico.',
      )
    }
    setBusy(false)
  }

  async function openPdf(referral: DentistryReferral, download: boolean) {
    if (!rpcService.getDentistryReferralDocumentForInterface || busy) return
    setBusy(true)
    const result =
      await rpcService.getDentistryReferralDocumentForInterface(referral.referral_id)
    if (result.status !== 'success') {
      setFeedback(
        result.status === 'error'
          ? result.error.message
          : 'Documento odontológico não localizado.',
      )
      setBusy(false)
      return
    }
    const path = documentField(result.data as DentistryDocumentState, 'document_pdf_path')
    if (!path) {
      setFeedback('O PDF odontológico oficial ainda não foi gerado.')
      setBusy(false)
      return
    }
    const { data, error } = await getSupabaseClient()
      .storage.from('capo-documents')
      .createSignedUrl(path, 120, download ? { download: true } : undefined)
    if (error || !data?.signedUrl) {
      setFeedback(error?.message ?? 'Não foi possível abrir o PDF odontológico.')
      setBusy(false)
      return
    }
    globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    setBusy(false)
  }

  const visibleReferrals = useMemo(
    () =>
      referrals.filter(
        (referral) =>
          statusFilter === 'all' || referral.status === statusFilter,
      ),
    [referrals, statusFilter],
  )

  if (loading && !backendAccess && !localCapabilityAuthorized) {
    return (
      <section className="home-page" aria-labelledby="dentistry-loading-title">
        <div className="home-ops">
          <p className="eyebrow">Odontologia</p>
          <h1 id="dentistry-loading-title">
            Carregando contexto odontológico…
          </h1>
          <p>Validando autorização e fluxo externo do backend CAPO.</p>
        </div>
      </section>
    )
  }

  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="dentistry-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Odontologia</p>
          <h1 id="dentistry-blocked-title">Odontologia indisponível</h1>
          <p>
            {feedback ??
              'O contexto atual não possui autorização para emitir encaminhamento odontológico externo.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="dentistry-page" aria-labelledby="dentistry-title">
      <header className="home-welcome">
        <p className="eyebrow">Continuidade do cuidado</p>
        <h1 id="dentistry-title">Encaminhamento odontológico externo</h1>
        <p>
          Fluxo de emissão e acompanhamento controlado pelo backend do CAPO.
          {backendAccess?.professional_name
            ? ` Emissor atual: ${backendAccess.professional_name}.`
            : ''}
        </p>
      </header>

      <div className="dentistry-layout">
        {backendAccess?.can_issue && <div className="dentistry-panel">
          <h2>Nova emissão</h2>
          <label htmlFor="dentistry-patient-search">Buscar paciente</label>
          <div className="dentistry-search">
            <input
              id="dentistry-patient-search"
              value={patientQuery}
              onChange={(event) => setPatientQuery(event.target.value)}
              placeholder="Nome, Nº CAPO ou CMS"
              aria-label="Buscar paciente"
            />
            <button
              type="button"
              onClick={() => void searchPatients()}
              disabled={searching}
            >
              {searching ? 'Buscando…' : 'Buscar paciente'}
            </button>
          </div>
          {patients.length > 0 && (
            <ul className="dentistry-results">
              {patients.map((patient) => (
                <li key={patient.patient_id}>
                  <button
                    type="button"
                    aria-label={patient.full_name}
                    onClick={() => setSelectedPatientId(patient.patient_id)}
                    className={
                      selectedPatientId === patient.patient_id ? 'is-selected' : ''
                    }
                  >
                    {patient.full_name} ·{' '}
                    {patient.patient_number ?? 'Nº CAPO não informado'} ·{' '}
                    {patient.cms ?? 'CMS não informado'}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedPatient && (
            <div className="dentistry-form">
              <p>
                <strong>Paciente selecionado:</strong>{' '}
                {selectedPatient.full_name}
              </p>
              <label htmlFor="dentistry-reason">Motivo operacional</label>
              <textarea
                id="dentistry-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                aria-label="Motivo operacional"
              />
              <button
                type="button"
                onClick={() => void createReferral()}
                disabled={submitting}
              >
                {submitting ? 'Emitindo…' : 'Emitir encaminhamento'}
              </button>
            </div>
          )}
        </div>}

        <div className="dentistry-panel">
          <h2>Histórico e acompanhamento</h2>
          <label htmlFor="dentistry-status">Status</label>
          <select
            id="dentistry-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending_approval">Aguardando aprovação</option>
            <option value="in_progress">Em atendimento</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>

          {canManage && (
            <label htmlFor="dentistry-admin-response">
              Providência / informação administrativa
              <textarea
                id="dentistry-admin-response"
                value={administrativeResponse}
                onChange={(event) => setAdministrativeResponse(event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Obrigatória para concluir ou cancelar."
              />
            </label>
          )}

          {visibleReferrals.length === 0 ? (
            <p>Nenhum encaminhamento odontológico externo foi encontrado.</p>
          ) : (
            <ul className="dentistry-list">
              {visibleReferrals.map((referral) => (
                <li key={referral.referral_id} className="dentistry-item">
                  <button
                    type="button"
                    onClick={() => setSelectedReferralId(referral.referral_id)}
                  >
                    {referral.patient_name}
                  </button>
                  <p>
                    <strong>Status:</strong>{' '}
                    {statusLabels[referral.status] ?? referral.status}
                  </p>
                  <p>
                    <strong>Destino:</strong>{' '}
                    {referral.destination ?? 'Destino institucional CAPO'}
                  </p>
                  <p>
                    <strong>Emissor:</strong>{' '}
                    {referral.requesting_professional_name}
                  </p>
                  <p>
                    <strong>Motivo:</strong> {referral.operational_reason}
                  </p>
                  {canManage && (
                    <div className="dentistry-actions">
                      {referral.status === 'pending_approval' && (
                        <button type="button" onClick={() => void act(referral, 'start')}>
                          {actionLabels.start}
                        </button>
                      )}
                      {referral.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => void act(referral, 'complete')}
                        >
                          {actionLabels.complete}
                        </button>
                      )}
                      {['pending_approval', 'in_progress'].includes(
                        referral.status,
                      ) && (
                        <button
                          type="button"
                          onClick={() => void act(referral, 'cancel')}
                        >
                          {actionLabels.cancel}
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedReferral && (
          <div className="dentistry-panel dentistry-history-panel">
            <h3>Documento odontológico oficial</h3>
            {documentLoading ? (
              <p>Consultando documento…</p>
            ) : documentState?.pdf_available === true ? (
              <div className="dentistry-actions">
                <button type="button" disabled={busy} onClick={() => void openPdf(selectedReferral, false)}>
                  Visualizar PDF
                </button>
                <button type="button" disabled={busy} onClick={() => void openPdf(selectedReferral, true)}>
                  Baixar PDF
                </button>
              </div>
            ) : backendAccess?.can_issue &&
              backendAccess.professional_id === selectedReferral.requesting_professional_id &&
              ['pending_approval', 'in_progress'].includes(selectedReferral.status) ? (
              <button type="button" disabled={busy} onClick={() => void generatePdf(selectedReferral)}>
                Gerar PDF oficial
              </button>
            ) : (
              <p>PDF oficial ainda não disponível para este encaminhamento.</p>
            )}
            <h3>Histórico do encaminhamento</h3>
            {selectedReferral.history.length === 0 ? (
              <p>Nenhum evento registrado.</p>
            ) : (
              <ul className="dentistry-history-list">
                {selectedReferral.history.map((event) => (
                  <li key={event.event_id}>
                    <strong>{event.actor_name}</strong> · {event.created_at}
                    <div>{event.detail ?? event.event_type}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {feedback && <p className="dentistry-feedback" role="status">{feedback}</p>}
    </section>
  )
}
