import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService } from '../../lib/supabase/rpc'
import { CapoDateInput } from '../../components/inputs/CapoDateInput'
import { CapoTimeInput } from '../../components/inputs/CapoTimeInput'

type Professional = { id: string; name: string }
type VisitPatient = { patient_id: string; patient_name: string; patient_number: string | null; visit_time: string | null; status: string }
type Visit = {
  block_id: string
  date: string
  start_time: string
  end_time: string
  description: string | null
  patients: VisitPatient[]
}
type Patient = { patient_id: string; full_name: string; patient_number: string | null }
type Response = {
  success: boolean
  message?: string
  requires_remanejamento?: boolean
  affected_appointments?: number
  visits?: Visit[]
  professionals?: Professional[]
  block_id?: string
}

function errorText(error: unknown) {
  return error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Não foi possível concluir a operação.'
}

// Uma única interface para Assistência Social real, manuteste e Administrativo.
// A autorização de cada ação e o isolamento de pacientes são revalidados no Supabase.
export function SocialHomeVisits({
  professionalId = null,
  administrative = false,
}: Readonly<{ professionalId?: string | null; administrative?: boolean }>) {
  const [target, setTarget] = useState(professionalId ?? '')
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [query, setQuery] = useState('')
  const [candidates, setCandidates] = useState<Patient[]>([])
  const [selected, setSelected] = useState('')
  const [visitTime, setVisitTime] = useState('')
  const [editingBlock, setEditingBlock] = useState('')

  const call = useCallback(async (action: string, args: Record<string, unknown> = {}): Promise<Response> => {
    const { data, error } = await getSupabaseClient().rpc('manage_social_home_visits_for_interface', {
      p_action: action,
      p_professional_id: target || professionalId || null,
      ...args,
    })
    if (error) throw error
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Resposta de visita domiciliar inválida.')
    return data as Response
  }, [target, professionalId])

  const reload = useCallback(async () => {
    if (!target && !professionalId) {
      setVisits([])
      return
    }
    try {
      const result = await call('list')
      if (!result.success) throw new Error(result.message ?? 'Falha ao consultar visitas.')
      setVisits(result.visits ?? [])
    } catch (error) {
      setFeedback(errorText(error))
    }
  }, [call, target, professionalId])

  useEffect(() => {
    if (!administrative) return
    let active = true
    void getSupabaseClient().rpc('manage_social_home_visits_for_interface', {
      p_action: 'professionals',
    }).then(({ data, error }) => {
      if (!active) return
      if (error) { setFeedback(error.message); return }
      const response = data as Response | null
      setProfessionals(response?.professionals ?? [])
    })
    return () => { active = false }
  }, [administrative])

  useEffect(() => { void reload() }, [reload])

  async function create() {
    if (busy) return
    if (!target && !professionalId) { setFeedback('Selecione a assistente social.'); return }
    if (!date || !startTime || !endTime || endTime <= startTime) {
      setFeedback('Informe data e horários válidos para a visita domiciliar.')
      return
    }
    setBusy(true)
    setFeedback('')
    try {
      const result = await call('create', {
        p_date: date, p_start_time: startTime, p_end_time: endTime,
        p_description: description.trim() || 'Visita Domiciliar',
      })
      if (!result.success) {
        setFeedback(result.requires_remanejamento
          ? `${result.message ?? 'Remanejamento necessário.'} ${result.affected_appointments ?? 0} consulta(s) atingida(s). O bloqueio não foi salvo.`
          : result.message ?? 'Não foi possível bloquear o período.')
      } else {
        setFeedback('Período bloqueado para Visita Domiciliar. Você pode adicionar pacientes agora ou posteriormente.')
        setDate(''); setStartTime(''); setEndTime(''); setDescription('')
        await reload()
      }
    } catch (error) { setFeedback(errorText(error)) }
    finally { setBusy(false) }
  }

  async function searchPatients() {
    if (query.trim().length < 2) {
      setFeedback('Informe pelo menos duas letras do nome ou número CAPO.')
      return
    }
    setBusy(true)
    try {
      const result = await getRpcService().searchReferralPatients(query.trim(), 20, 0)
      if (result.status === 'error') throw result.error
      setCandidates(result.status === 'success' ? [...result.data] : [])
      if (result.status === 'empty') setFeedback('Nenhum paciente localizado.')
    } catch (error) { setFeedback(errorText(error)) }
    finally { setBusy(false) }
  }

  async function changePatient(blockId: string, patientId: string, action: 'add' | 'remove') {
    if (busy || !patientId) return
    setBusy(true)
    setFeedback('')
    try {
      const result = await call(action, {
        p_block_id: blockId,
        p_patient_id: patientId,
        p_visit_time: action === 'add' ? visitTime || null : null,
      })
      if (!result.success) throw new Error(result.message ?? 'Não foi possível atualizar a programação.')
      setFeedback(action === 'add' ? 'Paciente adicionado à Visita Domiciliar.' : 'Paciente retirado da programação; o bloqueio permanece ativo.')
      setSelected(''); setQuery(''); setCandidates([]); setVisitTime('')
      await reload()
    } catch (error) { setFeedback(errorText(error)) }
    finally { setBusy(false) }
  }

  return (
    <section className="agenda-pointual-actions" aria-label="Visita Domiciliar — Assistência Social">
      <h3>Visita Domiciliar — Assistência Social</h3>
      <p>Bloqueie a agenda para visitas externas. <strong>Os pacientes são opcionais</strong> e podem ser vinculados ou retirados posteriormente, sem excluir o bloqueio.</p>
      {administrative && (
        <label>
          Assistente social
          <select value={target} onChange={(event) => { setTarget(event.target.value); setFeedback(''); setEditingBlock('') }}>
            <option value="">Selecione a profissional</option>
            {professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      )}
      {(!administrative || target) && (
        <>
          <div className="agenda-operation-heading">
            <label>Data <CapoDateInput value={date} onChange={setDate} /></label>
            <label>Início <CapoTimeInput value={startTime} onChange={setStartTime} /></label>
            <label>Fim <CapoTimeInput value={endTime} onChange={setEndTime} /></label>
          </div>
          <label>Observação operacional (opcional)
            <textarea rows={2} maxLength={800} value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button type="button" disabled={busy} onClick={() => void create()}>Bloquear para Visita Domiciliar</button>
          <h4>Visitas programadas e bloqueios existentes</h4>
          {visits.length === 0 && <p>Nenhum bloqueio de visita domiciliar neste contexto.</p>}
          {visits.map((visit) => (
            <article key={visit.block_id} className="assistential-card">
              <strong>Visita Domiciliar — {visit.date} · {String(visit.start_time).slice(0,5)}–{String(visit.end_time).slice(0,5)}</strong>
              <p>{visit.patients.length ? `${visit.patients.length} paciente(s) programado(s)` : 'Programação em aberto — sem pacientes'}</p>
              {visit.description && <p>{visit.description}</p>}
              {visit.patients.map((patient) => (
                <div key={patient.patient_id}>
                  {patient.patient_name} {patient.patient_number ? `— CAPO ${patient.patient_number}` : ''}
                  {patient.visit_time ? ` — ${String(patient.visit_time).slice(0,5)}` : ''}
                  <button type="button" disabled={busy} onClick={() => void changePatient(visit.block_id, patient.patient_id, 'remove')}>Retirar paciente</button>
                </div>
              ))}
              <button type="button" disabled={busy} onClick={() => { setEditingBlock(editingBlock === visit.block_id ? '' : visit.block_id); setCandidates([]); setSelected('') }}>
                {editingBlock === visit.block_id ? 'Fechar inclusão' : 'Adicionar pacientes'}
              </button>
              {editingBlock === visit.block_id && (
                <div>
                  <label>Buscar paciente CAPO
                    <input value={query} placeholder="Nome ou nº CAPO" onChange={(event) => setQuery(event.target.value)} />
                  </label>
                  <button type="button" disabled={busy} onClick={() => void searchPatients()}>Buscar paciente</button>
                  {candidates.length > 0 && (
                    <label>Paciente
                      <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                        <option value="">Selecione</option>
                        {candidates.map((item) => (
                          <option key={item.patient_id} value={item.patient_id}>
                            {item.full_name}{item.patient_number ? ` — CAPO ${item.patient_number}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>Horário previsto (opcional)
                    <CapoTimeInput value={visitTime} onChange={setVisitTime} />
                  </label>
                  <button type="button" disabled={busy || !selected} onClick={() => void changePatient(visit.block_id, selected, 'add')}>Vincular paciente</button>
                </div>
              )}
            </article>
          ))}
        </>
      )}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  )
}
