import { useEffect, useMemo, useState } from 'react'
import type { AccessContext } from '../../types/access'
import {
  getRpcService,
  type AsyncState,
  type PrescriptionRenewal,
  type PrescriptionRenewalDoctor,
  type ReferralPatient,
} from '../../lib/supabase/rpc'
import './renewal-prescription-page.css'

type Service = Pick<
  ReturnType<typeof getRpcService>,
  | 'getPrescriptionRenewalDoctors'
  | 'createPrescriptionRenewal'
  | 'getPrescriptionRenewals'
  | 'managePrescriptionRenewalMedical'
  | 'managePrescriptionRenewalAdmin'
  | 'searchReferralPatients'
>

type Props = Readonly<{
  accessContext: AccessContext
  service?: Service
}>

const statusLabels: Record<string, string> = {
  awaiting_medical: 'Aguardando avaliação médica',
  medical_in_progress: 'Avaliação médica em andamento',
  awaiting_admin: 'Aguardando processamento administrativo',
  completed: 'Concluída',
  cancelled: 'Cancelada',
}

function errorMessage<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function RenewalPrescriptionPage({ accessContext, service = getRpcService() }: Props) {
  const authorized =
    accessContext.primary_context.code === 'administrador' ||
    accessContext.capabilities.includes('renovacao_receita')
  const roleCodes = useMemo(() => accessContext.roles.map((role) => role.code), [accessContext.roles])
  const canCreate = Boolean(accessContext.professional_id) && accessContext.capabilities.includes('renovacao_receita')
  const canManageMedical = Boolean(accessContext.professional_id) && roleCodes.includes('profissional') && accessContext.capabilities.includes('renovacao_receita')
  const canManageAdmin = roleCodes.some((role) => ['administrador', 'administrativo_operacional'].includes(role))
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<readonly PrescriptionRenewal[]>([])
  const [doctors, setDoctors] = useState<readonly PrescriptionRenewalDoctor[]>([])
  const [patients, setPatients] = useState<readonly ReferralPatient[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [patientQuery, setPatientQuery] = useState('')
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [note, setNote] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const selected = items.find((item) => item.renewal_id === selectedId) ?? null

  async function loadItems() {
    setLoading(true)
    const result = await service.getPrescriptionRenewals(status || null, null, 100, 0)
    if (result.status === 'success') {
      setItems(result.data)
      setSelectedId((current) => current && result.data.some((item) => item.renewal_id === current) ? current : null)
    } else if (result.status === 'empty') {
      setItems([])
      setSelectedId(null)
    } else setFeedback(errorMessage(result))
    setLoading(false)
  }

  useEffect(() => {
    if (!authorized) return
    let active = true
    void Promise.all([
      service.getPrescriptionRenewals(status || null, null, 100, 0),
      service.getPrescriptionRenewalDoctors(),
    ]).then(([renewals, availableDoctors]) => {
      if (!active) return
      if (renewals.status === 'success') setItems(renewals.data)
      else if (renewals.status === 'empty') setItems([])
      else setFeedback(errorMessage(renewals))
      if (availableDoctors.status === 'success') setDoctors(availableDoctors.data)
      else if (availableDoctors.status === 'error') setFeedback(availableDoctors.error.message)
      setLoading(false)
    })
    return () => { active = false }
  }, [authorized, service, status])

  async function searchPatients() {
    if (patientQuery.trim().length < 2) {
      setFeedback('Informe ao menos dois caracteres para buscar o paciente.')
      return
    }
    const result = await service.searchReferralPatients(patientQuery.trim(), 20, 0)
    setPatients(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setFeedback(result.error.message)
  }

  async function createRenewal() {
    if (!patientId || !doctorId || note.trim().length < 5) {
      setFeedback('Selecione paciente e médico e informe o motivo da renovação.')
      return
    }
    setBusy(true)
    const result = await service.createPrescriptionRenewal(patientId, doctorId, note.trim())
    if (result.status === 'success') {
      setPatientId('')
      setPatientQuery('')
      setPatients([])
      setDoctorId('')
      setNote('')
      setFeedback('Solicitação enviada para avaliação médica.')
      await loadItems()
      setSelectedId(result.data.renewal_id)
    } else setFeedback(errorMessage(result))
    setBusy(false)
  }

  async function act(action: string) {
    if (!selected || busy) return
    if (note.trim().length < 5) {
      setFeedback('Informe uma observação com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    const result = canManageMedical && ['awaiting_medical', 'medical_in_progress'].includes(selected.status)
      ? await service.managePrescriptionRenewalMedical(selected.renewal_id, action, note.trim())
      : await service.managePrescriptionRenewalAdmin(selected.renewal_id, action, note.trim())
    if (result.status === 'success') {
      setNote('')
      setFeedback('Renovação atualizada conforme o fluxo institucional.')
      await loadItems()
    } else setFeedback(errorMessage(result))
    setBusy(false)
  }

  if (!authorized) {
    return (
      <section className="home-page" aria-labelledby="renewal-blocked-title">
        <div className="home-ops">
          <p className="eyebrow">Renovação de Receita</p>
          <h1 id="renewal-blocked-title">Renovação de Receita indisponível</h1>
          <p>
            O contexto atual não possui autorização para consultar esta área.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="renewals-page" aria-labelledby="renewal-title">
      <header className="renewals-header">
        <div>
          <p className="eyebrow">Fluxo operacional</p>
          <h1 id="renewal-title">Renovação de Receita</h1>
          <p>Solicitação administrativa, avaliação médica e retorno registrado no CAPO.</p>
        </div>
        <label>
          Situação
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todas</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </header>
      {feedback && <p className="renewals-feedback" role="status">{feedback}</p>}
      {canCreate && <section className="renewals-card renewal-create" aria-labelledby="renewal-create-title">
        <h2 id="renewal-create-title">Nova solicitação</h2>
        <div className="patient-search">
          <label>Buscar paciente<input value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} /></label>
          <button type="button" onClick={() => void searchPatients()} disabled={busy}>Buscar</button>
        </div>
        {patients.length > 0 && <div className="patient-results">{patients.map((patient) => <button key={patient.patient_id} type="button" className={patient.patient_id === patientId ? 'is-selected' : ''} onClick={() => setPatientId(patient.patient_id)}>{patient.full_name}<small>{patient.patient_number ?? patient.cms ?? 'Identificação disponível no cadastro'}</small></button>)}</div>}
        <label>Médico responsável<select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Selecione</option>{doctors.filter((doctor) => doctor.is_active).map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name} · {doctor.specialty_name ?? 'Especialidade não informada'}</option>)}</select></label>
        <label>Motivo operacional<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
        <button type="button" onClick={() => void createRenewal()} disabled={busy}>Enviar para avaliação</button>
      </section>}
      <div className="renewals-layout">
        <section className="renewals-card" aria-labelledby="renewal-list-title">
          <h2 id="renewal-list-title">Solicitações</h2>
          {loading && <p>Carregando solicitações...</p>}
          {!loading && items.length === 0 && <p>Nenhuma solicitação encontrada neste contexto.</p>}
          <div className="renewals-list">{items.map((item) => <button key={item.renewal_id} type="button" className={item.renewal_id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(item.renewal_id)}><strong>{item.patient_name}</strong><span>{statusLabels[item.status] ?? item.status}</span><small>{item.doctor_name} · {dateTime(item.updated_at)}</small></button>)}</div>
        </section>
        <section className="renewals-card" aria-labelledby="renewal-detail-title">
          <h2 id="renewal-detail-title">Detalhes</h2>
          {!selected && <p>Selecione uma solicitação para consultar seus dados operacionais.</p>}
          {selected && <><dl className="renewal-summary"><div><dt>Paciente</dt><dd>{selected.patient_name}</dd></div><div><dt>Médico</dt><dd>{selected.doctor_name}</dd></div><div><dt>Situação</dt><dd>{statusLabels[selected.status] ?? selected.status}</dd></div><div><dt>Atualizada em</dt><dd>{dateTime(selected.updated_at)}</dd></div></dl><div className="renewal-text"><strong>Solicitação</strong><p>{selected.request_note ?? 'Sem observação registrada.'}</p></div>{selected.medical_feedback && <div className="renewal-text"><strong>Retorno médico</strong><p>{selected.medical_feedback}</p></div>}{selected.administrative_feedback && <div className="renewal-text"><strong>Retorno administrativo</strong><p>{selected.administrative_feedback}</p></div>}{(canManageMedical && ['awaiting_medical', 'medical_in_progress'].includes(selected.status)) || (canManageAdmin && selected.status === 'awaiting_admin') ? <div className="renewal-actions"><label>Observação da ação<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label><div>{canManageMedical && ['awaiting_medical', 'medical_in_progress'].includes(selected.status) && <><button type="button" onClick={() => void act('authorize')} disabled={busy}>Autorizar e enviar ao administrativo</button><button type="button" onClick={() => void act('cancel')} disabled={busy}>Recusar</button></>}{canManageAdmin && selected.status === 'awaiting_admin' && <button type="button" onClick={() => void act('complete')} disabled={busy}>Concluir retorno</button>}</div></div> : null}</>}
        </section>
      </div>
    </section>
  )
}
