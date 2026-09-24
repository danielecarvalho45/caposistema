import { useState } from 'react'
import { PatientSearch } from '../../components/forms/PatientSearch'
import { AsyncStateView } from '../../components/feedback/AsyncStateView'
import { getRpcService, type AsyncState, type ReferralPatient } from '../../lib/supabase/rpc'

type TimelineService = Readonly<{
  searchPatients: (query: string, limit?: number, offset?: number) => Promise<AsyncState<readonly ReferralPatient[]>>
  loadTimeline: (patientId: string, beforeAt?: string | null, beforeKey?: string | null, limit?: number) => Promise<AsyncState<unknown>>
}>

function defaultService(): TimelineService {
  const rpc = getRpcService()
  return { searchPatients: (query, limit = 20, offset = 0) => rpc.searchReferralPatients(query, limit, offset), loadTimeline: (patientId, beforeAt, beforeKey, limit) => rpc.getPatientTimeline(patientId, beforeAt, beforeKey, limit) }
}

function timelineEntries(value: unknown): readonly Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  const items = record.items ?? record.timeline ?? record.events
  return Array.isArray(items) ? items.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []
}

function text(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) if (typeof record[key] === 'string') return record[key]
  return null
}

export function OperationalTimeline({ service = defaultService() }: Readonly<{ service?: TimelineService }>) {
  const [patient, setPatient] = useState<ReferralPatient | null>(null)
  const [state, setState] = useState<AsyncState<unknown> | null>(null)

  async function select(selected: ReferralPatient) {
    setPatient(selected)
    setState({ status: 'loading' })
    setState(await service.loadTimeline(selected.patient_id, null, null, 50))
  }

  return <section className="gestor-route" aria-labelledby="timeline-title"><header><span>Governança e Gestão</span><h2 id="timeline-title">Linha do Tempo Operacional</h2><p>Eventos retornados pelo backend para o paciente autorizado.</p></header><article className="gestor-panel"><PatientSearch label="Localizar paciente para timeline" loadPatients={service.searchPatients} onSelect={(selected) => void select(selected)} /></article>{patient && state && <article className="gestor-panel"><h3>{patient.full_name}</h3><AsyncStateView state={state} loading="Carregando timeline..." empty="Nenhum evento autorizado foi retornado.">{(data) => { const entries = timelineEntries(data); return entries.length === 0 ? <p>Nenhum evento autorizado foi retornado.</p> : <ol>{entries.map((entry, index) => <li key={text(entry, ['event_id', 'id', 'key']) ?? index}><strong>{text(entry, ['title', 'event_type', 'action', 'label']) ?? 'Evento operacional'}</strong><p>{text(entry, ['created_at', 'occurred_at', 'event_at', 'timestamp']) ?? ''}</p><p>{text(entry, ['detail', 'description', 'message']) ?? ''}</p></li>)}</ol> }}</AsyncStateView></article>}</section>
}
