import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
  | 'getPrescriptionRenewalOperationalContext'
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
  const roleCodes = useMemo(() => accessContext.roles.map((role) => role.code), [accessContext.roles])
  const isAdministrative = roleCodes.some((role) =>
    ['administrador', 'administrativo_operacional'].includes(role),
  )
  const authorized =
    isAdministrative ||
    accessContext.capabilities.includes('renovacao_receita')
  const canCreate = isAdministrative
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
  const [pickupLocation, setPickupLocation] = useState('')
  const [patientContacted, setPatientContacted] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [operationalContext, setOperationalContext] =
    useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const selected = items.find((item) => item.renewal_id === selectedId) ?? null

  async function loadItems() {
    setLoading(true)
    const result = await service.getPrescriptionRenewals(status || null, 100, 0)
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
      service.getPrescriptionRenewals(status || null, 100, 0),
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

  useEffect(() => {
    if (!authorized || !selectedId) {
      setOperationalContext(null)
      return
    }
    let active = true
    void service.getPrescriptionRenewalOperationalContext(selectedId).then((result) => {
      if (!active) return
      if (
        result.status === 'success' &&
        result.data &&
        typeof result.data === 'object' &&
        !Array.isArray(result.data)
      ) {
        setOperationalContext(result.data as Record<string, unknown>)
      } else {
        setOperationalContext(null)
      }
    })
    return () => {
      active = false
    }
  }, [authorized, selectedId, service])

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

  async function actMedical(action: 'start' | 'renewed' | 'needs_consult') {
    if (!selected || busy) return
    if (action !== 'start' && note.trim().length < 3) {
      setFeedback('Informe o retorno operacional com pelo menos 3 caracteres.')
      return
    }
    setBusy(true)
    const result = await service.managePrescriptionRenewalMedical(
      selected.renewal_id,
      action,
      action === 'start' ? null : note.trim(),
    )
    if (result.status === 'success') {
      setNote('')
      setFeedback(
        action === 'start'
          ? 'Avaliação médica iniciada.'
          : action === 'renewed'
            ? 'Receita renovada no sistema oficial. Retorno enviado ao Administrativo.'
            : 'Necessidade de consulta registrada. Retorno enviado ao Administrativo para agendamento.',
      )
      await loadItems()
    } else setFeedback(errorMessage(result))
    setBusy(false)
  }

  async function completeAdministrative() {
    if (!selected || busy) return
    if (!patientContacted) {
      setFeedback('Confirme que o paciente foi contatado/orientado antes de concluir.')
      return
    }
    setBusy(true)
    const result = await service.managePrescriptionRenewalAdmin({
      renewalId: selected.renewal_id,
      action: 'complete',
      pickupLocation: pickupLocation.trim() || null,
      finalAdminNote: note.trim() || null,
      patientContacted: true,
    })
    if (result.status === 'success') {
      setNote('')
      setPickupLocation('')
      setPatientContacted(false)
      setFeedback('Renovação concluída após orientação ao paciente.')
      await loadItems()
    } else setFeedback(errorMessage(result))
    setBusy(false)
  }

  async function cancelAdministrative() {
    if (!selected || busy) return
    if (note.trim().length < 5) {
      setFeedback('Informe o motivo do cancelamento com pelo menos 5 caracteres.')
      return
    }
    setBusy(true)
    const result = await service.managePrescriptionRenewalAdmin({
      renewalId: selected.renewal_id,
      action: 'cancel',
      reason: note.trim(),
    })
    if (result.status === 'success') {
      setNote('')
      setFeedback('Solicitação cancelada.')
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
        <label>Médico responsável<select value={doctorId} onChange={(event) => setDoctorId(event.target.value)}><option value="">Selecione</option>{doctors.map((doctor) => <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name}{doctor.function_title ? ` · ${doctor.function_title}` : ''}{doctor.professional_registration ? ` · ${doctor.professional_registration}` : ''}{doctor.has_active_account ? '' : ' · sem acesso ativo'}</option>)}</select></label>
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
          {selected && <><dl className="renewal-summary"><div><dt>Paciente</dt><dd>{selected.patient_name}</dd></div><div><dt>Médico</dt><dd>{selected.doctor_name}</dd></div><div><dt>Situação</dt><dd>{statusLabels[selected.status] ?? selected.status}</dd></div><div><dt>Atualizada em</dt><dd>{dateTime(selected.updated_at)}</dd></div></dl><div className="renewal-text"><strong>Solicitação</strong><p>{selected.request_note ?? 'Sem observação registrada.'}</p></div>{selected.medical_feedback && <div className="renewal-text"><strong>Retorno médico</strong><p>{selected.medical_feedback}</p></div>}{selected.administrative_feedback && <div className="renewal-text"><strong>Retorno administrativo</strong><p>{selected.administrative_feedback}</p></div>}{(canManageMedical && ['awaiting_medical', 'medical_in_progress'].includes(selected.status)) || (canManageAdmin && !['completed', 'cancelled'].includes(selected.status)) ? <div className="renewal-actions">
            {canManageMedical && selected.status === 'awaiting_medical' && <button type="button" onClick={() => void actMedical('start')} disabled={busy}>Iniciar avaliação médica</button>}
            {canManageMedical && selected.status === 'medical_in_progress' && <>
              <label>Retorno operacional<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <p>Registre somente a devolutiva operacional. O conteúdo da prescrição permanece no sistema oficial.</p>
              <button type="button" onClick={() => void actMedical('renewed')} disabled={busy || note.trim().length < 3}>Receita renovada</button>
              <button type="button" onClick={() => void actMedical('needs_consult')} disabled={busy || note.trim().length < 3}>Necessita consulta</button>
            </>}
            {canManageAdmin && selected.status === 'awaiting_admin' && <>
              {operationalContext?.medical_outcome === 'needs_consult' ? (
                <>
                  <p><strong>Decisão médica:</strong> necessita consulta.</p>
                  {operationalContext.consult_appointment_id ? (
                    <p>
                      Consulta vinculada:{' '}
                      {operationalContext.consult_appointment_date
                        ? new Date(String(operationalContext.consult_appointment_date)).toLocaleString('pt-BR')
                        : 'agendamento confirmado'}
                    </p>
                  ) : (
                    <Link
                      to="/agenda"
                      state={{
                        patientId: selected.patient_id,
                        patientName: selected.patient_name,
                        professionalId: selected.doctor_id,
                        renewalId: selected.renewal_id,
                        origin: 'prescription_renewal',
                      }}
                    >
                      Agendar consulta
                    </Link>
                  )}
                  <label>Observação administrativa final<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
                  <label><input type="checkbox" checked={patientContacted} onChange={(event) => setPatientContacted(event.target.checked)} /> Paciente contatado/orientado</label>
                  <button
                    type="button"
                    onClick={() => void completeAdministrative()}
                    disabled={busy || !operationalContext.consult_appointment_id || !patientContacted}
                  >
                    Concluir após agendamento e contato
                  </button>
                </>
              ) : (
                <>
                  <p><strong>Decisão médica:</strong> receita renovada no sistema oficial.</p>
                  <label>Local/orientação de retirada<input value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} /></label>
                  <label>Observação administrativa final<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
                  <label><input type="checkbox" checked={patientContacted} onChange={(event) => setPatientContacted(event.target.checked)} /> Paciente contatado/orientado</label>
                  <button type="button" onClick={() => void completeAdministrative()} disabled={busy || !patientContacted}>Concluir retorno</button>
                </>
              )}
            </>}
            {canManageAdmin && !['completed', 'cancelled'].includes(selected.status) && <>
              <label>Motivo do cancelamento<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label>
              <button type="button" onClick={() => void cancelAdministrative()} disabled={busy}>Cancelar solicitação</button>
            </>}
          </div> : null}</>}
        </section>
      </div>
    </section>
  )
}
