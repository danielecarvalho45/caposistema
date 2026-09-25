import { useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type ReferralPatient } from '../../lib/supabase/rpc'

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

function requestsFromContext(context: TransportRecord | null): readonly TransportRecord[] {
  if (!context) return []
  const value = context.requests ?? context.transport_requests ?? context.items
  return Array.isArray(value) ? (value as readonly TransportRecord[]) : []
}

export function TransportPage({ accessContext }: Props) {
  const authorized = accessContext.roles.some((role) => role.code === 'administrador') || accessContext.capabilities.includes(
    'preencher_solicitacao_transporte',
  )
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<readonly ReferralPatient[]>([])
  const [patientId, setPatientId] = useState('')
  const [patientName, setPatientName] = useState('')
  const [context, setContext] = useState<TransportRecord | null>(null)
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function searchPatients() {
    if (query.trim().length < 2) {
      setFeedback('Informe ao menos dois caracteres para buscar o paciente.')
      return
    }
    const result = await getRpcService().searchReferralPatients(query.trim(), 20, 0)
    setPatients(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setFeedback(result.error.message)
  }

  async function loadContext(id: string, name: string) {
    setPatientId(id)
    setPatientName(name)
    const result = await getRpcService().getTransportContext(id)
    if (result.status === 'success') {
      setContext(result.data as TransportRecord)
      setFeedback(null)
    } else if (result.status === 'empty') {
      setContext(null)
      setFeedback('Nenhum contexto de transporte real encontrado para este paciente.')
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    } else {
      setFeedback('Contexto de transporte ainda em carregamento.')
    }
  }

  async function createRequest() {
    if (!patientId || reason.trim().length < 3 || busy) {
      setFeedback('Selecione o paciente e informe o motivo do transporte.')
      return
    }
    setBusy(true)
    const result = await getRpcService().createTransportRequest({
      p_patient_id: patientId,
      p_reason: reason.trim(),
    })
    if (result.status === 'success') {
      setFeedback('Solicitação de transporte enviada ao banco.')
      setReason('')
      await loadContext(patientId, patientName)
    } else setFeedback(result.status === 'error' ? result.error.message : 'Retorno sem confirmação.')
    setBusy(false)
  }

  async function manage(requestId: string, action: string) {
    if (busy) return
    setBusy(true)
    const result = await getRpcService().manageTransportRequest({
      p_request_id: requestId,
      p_action: action,
    })
    if (result.status === 'success') {
      setFeedback('Solicitação atualizada pelo banco.')
      await loadContext(patientId, patientName)
    } else setFeedback(result.status === 'error' ? result.error.message : 'Retorno sem confirmação.')
    setBusy(false)
  }

  async function sign(requestId: string) {
    if (busy) return
    setBusy(true)
    const result = await getRpcService().signTransportPdf(requestId)
    setFeedback(
      result.status === 'success'
        ? 'Documento assinado pelo banco.'
        : result.status === 'error'
          ? result.error.message
          : 'Retorno sem confirmação.',
    )
    setBusy(false)
  }

  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="transport-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Transporte</p>
          <h1 id="transport-blocked-title">Transporte indisponível</h1>
          <p>
            O contexto atual não possui autorização para consultar esta área.
          </p>
        </div>
      </section>
    )
  }

  const requests = requestsFromContext(context)

  return (
    <section className="home-page" aria-labelledby="transport-title">
      <div className="home-welcome">
        <p className="eyebrow">Operação autorizada</p>
        <h1 id="transport-title">Transporte</h1>
        <p>
          Solicitações, processamento, conclusão e histórico conforme o contrato
          institucional do CAPO.
        </p>
      </div>
      {feedback && <p role="status">{feedback}</p>}
      <div className="home-ops">
        <h2>Buscar paciente</h2>
        <div className="patient-search">
          <label>Buscar paciente<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <button type="button" onClick={() => void searchPatients()}>Buscar</button>
        </div>
        {patients.length > 0 && (
          <div className="patient-results">
            {patients.map((patient) => (
              <button
                key={patient.patient_id}
                type="button"
                className={patient.patient_id === patientId ? 'is-selected' : ''}
                onClick={() => void loadContext(patient.patient_id, patient.full_name)}
              >
                {patient.full_name}
                <small>{patient.patient_number ?? patient.cms ?? 'Identificação disponível no cadastro'}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      {patientId && (
        <div className="home-ops">
          <h2>Nova solicitação de transporte</h2>
          <label>Motivo<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
          <button type="button" onClick={() => void createRequest()} disabled={busy}>Enviar solicitação</button>
        </div>
      )}
      <div className="home-ops">
        <h2>Solicitações de transporte</h2>
        {requests.length === 0 && <p>Nenhuma solicitação de transporte encontrada.</p>}
        {requests.length > 0 && (
          <ul>
            {requests.map((request, index) => (
              <li key={field(request, 'request_id', 'id') ?? index}>
                <strong>{field(request, 'destination') ?? 'Destino não informado'}</strong>
                <span>{field(request, 'status') ?? 'Situação não informada'}</span>
                <div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void manage(String(field(request, 'request_id', 'id')), 'confirm')}
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void sign(String(field(request, 'request_id', 'id')))}
                  >
                    Assinar documento
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
