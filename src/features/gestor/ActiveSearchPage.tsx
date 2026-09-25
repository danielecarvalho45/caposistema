import { useCallback, useEffect, useState } from 'react'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'

function rows(value: unknown): readonly Record<string, unknown>[] {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
  const list = Array.isArray(value) ? value : source && [source.items, source.searches, source.rows, source.data].find(Array.isArray)
  return Array.isArray(list) ? list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}
function label(item: Record<string, unknown>, ...keys: string[]) {
  const value = keys.map((key) => item[key]).find((entry) => typeof entry === 'string' && entry.trim())
  return typeof value === 'string' ? value : '—'
}

export function ActiveSearchPage({ accessContext }: Readonly<{ accessContext: AccessContext }>) {
  const [filter, setFilter] = useState('ativo')
  const [state, setState] = useState<AsyncState<unknown>>(loadingState)
  const [query, setQuery] = useState('')
  const [patientResults, setPatientResults] = useState<readonly { patient_id: string; full_name: string; patient_number: string | null; cms: string | null }[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [contactMethod, setContactMethod] = useState('whatsapp')
  const [contactResult, setContactResult] = useState('')
  const [nextAction, setNextAction] = useState('')
  const [nextContactAt, setNextContactAt] = useState('')
  const [notes, setNotes] = useState('')
  const [closureReason, setClosureReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const canOperate = accessContext.roles.some((role) =>
    ['administrador', 'administrativo_operacional'].includes(role.code),
  )

  const load = useCallback(async () => {
    const result = await getRpcService().getActiveSearches(filter || null, 50, 0)
    setState(result)
    return result
  }, [filter])

  useEffect(() => {
    let active = true
    setState(loadingState())
    void getRpcService().getActiveSearches(filter || null, 50, 0).then((result) => {
      if (active) setState(result)
    })
    return () => { active = false }
  }, [filter])

  async function searchPatients() {
    const clean = query.trim()
    if (clean.length < 2) {
      setFeedback('Informe nome, Nº CAPO ou CMS com pelo menos dois caracteres.')
      return
    }
    const result = await getRpcService().searchReferralPatients(clean, 20, 0)
    if (result.status === 'success') {
      setPatientResults(result.data)
      setFeedback(result.data.length ? null : 'Nenhum paciente encontrado.')
    } else {
      setPatientResults([])
      setFeedback(result.status === 'error' ? result.error.message : 'Nenhum paciente encontrado.')
    }
  }

  async function registerAttempt() {
    if (!selectedPatientId || contactResult.trim().length < 2 || busy) return
    setBusy(true)
    setFeedback('Registrando tentativa no banco…')
    const result = await getRpcService().registerActiveSearchAttempt({
      patientId: selectedPatientId,
      contactMethod,
      contactResult: contactResult.trim(),
      nextAction: nextAction.trim() || null,
      notes: notes.trim() || null,
      nextContactAt: nextContactAt ? `${nextContactAt}:00-03:00` : null,
      closeFlow: false,
      closureReason: null,
    })
    if (result.status === 'success') {
      setFeedback('Tentativa de Busca Ativa registrada.')
      setContactResult('')
      setNextAction('')
      setNextContactAt('')
      setNotes('')
      await load()
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a tentativa.')
    }
    setBusy(false)
  }

  async function closeSearch(patientId: string) {
    if (closureReason.trim().length < 5 || busy) {
      setFeedback('Informe o motivo do encerramento com pelo menos cinco caracteres.')
      return
    }
    setBusy(true)
    setFeedback('Encerrando Busca Ativa no banco…')
    const result = await getRpcService().closeActiveSearch(patientId, closureReason.trim())
    if (result.status === 'success') {
      setFeedback('Busca Ativa encerrada.')
      setClosureReason('')
      await load()
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o encerramento.')
    }
    setBusy(false)
  }

  return (
    <section className="gestor-route" aria-labelledby="active-search-title">
      <header>
        <span>Atendimento e Acompanhamento</span>
        <h2 id="active-search-title">Busca Ativa</h2>
        <p>Reengajamento de pacientes que já pertenciam ao CAPO e perderam seguimento.</p>
      </header>

      {canOperate && (
        <article className="gestor-panel">
          <h3>Registrar tentativa / iniciar acompanhamento</h3>
          <label>Paciente
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, Nº CAPO ou CMS" />
          </label>
          <button type="button" onClick={() => void searchPatients()} disabled={query.trim().length < 2 || busy}>Buscar</button>
          {patientResults.length > 0 && (
            <label>Paciente encontrado
              <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
                <option value="">Selecionar</option>
                {patientResults.map((patient) => (
                  <option key={patient.patient_id} value={patient.patient_id}>
                    {patient.full_name}{patient.patient_number ? ` · Nº CAPO ${patient.patient_number}` : patient.cms ? ` · CMS ${patient.cms}` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>Meio de contato
            <select value={contactMethod} onChange={(event) => setContactMethod(event.target.value)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Telefone</option>
              <option value="in_person">Presencial</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label>Resultado
            <input value={contactResult} onChange={(event) => setContactResult(event.target.value)} />
          </label>
          <label>Próxima providência
            <textarea value={nextAction} onChange={(event) => setNextAction(event.target.value)} />
          </label>
          <label>Próximo contato
            <input type="datetime-local" value={nextContactAt} onChange={(event) => setNextContactAt(event.target.value)} />
          </label>
          <label>Observação administrativa
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <button type="button" disabled={!selectedPatientId || contactResult.trim().length < 2 || busy} onClick={() => void registerAttempt()}>
            {busy ? 'Registrando…' : 'Registrar tentativa'}
          </button>
        </article>
      )}

      <article className="gestor-panel">
        <label>Situação
          <select value={filter} onChange={(event) => { setState(loadingState()); setFilter(event.target.value) }}>
            <option value="ativo">Ativo</option>
            <option value="encerrado">Encerrado</option>
            <option value="">Todos</option>
          </select>
        </label>
        {feedback && <p role="status">{feedback}</p>}
        {state.status === 'loading' && <p>Carregando busca ativa…</p>}
        {state.status === 'error' && <p role="alert">{state.error.message}</p>}
        {state.status === 'empty' && <p>Nenhum fluxo retornado.</p>}
        {state.status === 'success' && (rows(state.data).length ? (
          <ul className="gestor-result-list">
            {rows(state.data).map((item, index) => {
              const patientId = label(item, 'patient_id')
              const active = label(item, 'flow_status', 'status') === 'ativo'
              return (
                <li key={label(item, 'latest_attempt_id', 'patient_id') + index}>
                  <strong>{label(item, 'patient_name', 'full_name')}</strong>
                  <small>{label(item, 'flow_status', 'status')} · {label(item, 'contact_result', 'next_action', 'contact_date')}</small>
                  {canOperate && active && (
                    <div>
                      <label>Motivo do encerramento
                        <input value={closureReason} onChange={(event) => setClosureReason(event.target.value)} />
                      </label>
                      <button type="button" disabled={closureReason.trim().length < 5 || busy} onClick={() => void closeSearch(patientId)}>
                        Encerrar Busca Ativa
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : <p>Nenhum fluxo retornado para este filtro.</p>)}
      </article>
    </section>
  )
}
