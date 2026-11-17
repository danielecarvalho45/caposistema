import { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService } from '../../lib/supabase/rpc'
import { CapoDateInput } from '../../components/inputs/CapoDateInput'
import { CapoTimeInput } from '../../components/inputs/CapoTimeInput'

type VisitPatient = { patient_id: string; patient_name: string; patient_number: string | null; address: string | null; phone: string | null; status: string }
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
  const [editingBlock, setEditingBlock] = useState('')
  const [outcomeKey, setOutcomeKey] = useState('')
  const [outcomeStatus, setOutcomeStatus] = useState('realizada')
  const [outcomeReason, setOutcomeReason] = useState('')

  useEffect(() => { setTarget(professionalId ?? '') }, [professionalId])

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
      const result = administrative
        ? await getRpcService().searchReferralPatients(query.trim(), 20, 0)
        : await getRpcService().searchProfessionalPatients(query.trim(), 20, 0)
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
        p_visit_time: null,
      })
      if (!result.success) throw new Error(result.message ?? 'Não foi possível atualizar a programação.')
      setFeedback(action === 'add' ? 'Paciente adicionado à Visita Domiciliar.' : 'Paciente retirado da programação; o bloqueio permanece ativo.')
      setSelected(''); setQuery(''); setCandidates([])
      await reload()
    } catch (error) { setFeedback(errorText(error)) }
    finally { setBusy(false) }
  }

  async function saveOutcome(blockId: string, patientId: string) {
    if (busy) return
    if (['nao_realizada', 'cancelada'].includes(outcomeStatus) && outcomeReason.trim().length < 5) {
      setFeedback('Informe a justificativa com pelo menos cinco caracteres.')
      return
    }
    setBusy(true)
    setFeedback('')
    try {
      const { data, error } = await getSupabaseClient().rpc(
        'set_social_home_visit_outcome_for_interface', {
          p_block_id: blockId, p_patient_id: patientId,
          p_status: outcomeStatus, p_reason: outcomeReason.trim() || null,
        },
      )
      if (error) throw error
      if (!data || (data as Response).success !== true) throw new Error('O banco não confirmou o resultado da visita.')
      setFeedback('Resultado da visita registrado com auditoria.')
      setOutcomeKey('')
      setOutcomeReason('')
      await reload()
    } catch (error) { setFeedback(errorText(error)) }
    finally { setBusy(false) }
  }

  return (
    <section className="agenda-pointual-actions" aria-label="Visita Domiciliar — Assistência Social">
      <h3>Visita Domiciliar — Assistência Social</h3>
      <p>Reserve o período para visitas externas na agenda oficial. Os pacientes não precisam de horário individual: o motorista organiza a rota.</p>
      {Boolean(target || professionalId) && (
        <>
          <div className="agenda-operation-heading">
            <label>Data <CapoDateInput value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Início <CapoTimeInput value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
            <label>Fim <CapoTimeInput value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
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
                <div key={patient.patient_id} className="capo-visit-patient">
                  <strong>{patient.patient_name}</strong>
                  {patient.patient_number && <small>CAPO {patient.patient_number}</small>}
                  <div className="capo-visit-contact">
                    <span>Endereço: {patient.address?.trim() || 'Não informado no cadastro'}</span>
                    <span>Telefone: {patient.phone?.trim() || 'Não informado no cadastro'}</span>
                  </div>
                  <small>Situação: {patient.status.replace(/_/g, ' ')}</small>
                  <button type="button" disabled={busy} onClick={() => {
                    const key = `${visit.block_id}:${patient.patient_id}`
                    setOutcomeKey(outcomeKey === key ? '' : key)
                    setOutcomeStatus(patient.status)
                    setOutcomeReason('')
                  }}>Registrar resultado</button>
                  <button type="button" disabled={busy} onClick={() => void changePatient(visit.block_id, patient.patient_id, 'remove')}>Retirar paciente</button>
                  {outcomeKey === `${visit.block_id}:${patient.patient_id}` && (
                    <div>
                      <label>Situação da visita
                        <select value={outcomeStatus} onChange={(event) => setOutcomeStatus(event.target.value)}>
                          <option value="programada">Programada</option>
                          <option value="realizada">Realizada</option>
                          <option value="nao_realizada">Não realizada</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </label>
                      {['nao_realizada', 'cancelada'].includes(outcomeStatus) && (
                        <label>Justificativa
                          <textarea value={outcomeReason} onChange={(event) => setOutcomeReason(event.target.value)} />
                        </label>
                      )}
                      <button type="button" disabled={busy} onClick={() => void saveOutcome(visit.block_id, patient.patient_id)}>Salvar resultado da visita</button>
                    </div>
                  )}
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
