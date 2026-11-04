import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  const location = useLocation()
  const [mode, setMode] = useState<'seguimento' | 'oferta' | 'resgate'>(
    () => new URLSearchParams(location.search).get('tipo') === 'oferta' ? 'oferta' : 'seguimento',
  )
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
  const [rescuePatientId, setRescuePatientId] = useState('')
  const [rescueResult, setRescueResult] = useState('')
  const [rescueMethod, setRescueMethod] = useState('whatsapp')
  const [rescueOutcome, setRescueOutcome] = useState<'sem_resposta' | 'aceitou' | 'recusou'>('sem_resposta')

  const canOperate = accessContext.roles.some((role) =>
    ['administrador', 'administrativo_operacional'].includes(role.code),
  )

  const load = useCallback(async () => {
    const result = mode === 'oferta'
      ? await getRpcService().getInitialActiveSearches(filter || null, 100, 0)
      : mode === 'resgate'
        ? await getRpcService().getOfferRescueSearches(filter || null, 100, 0)
        : await getRpcService().getActiveSearches(filter || null, 50, 0)
    setState(result)
    return result
  }, [filter, mode])

  useEffect(() => {
    let active = true
    setState(loadingState())
    const pending = mode === 'oferta'
      ? getRpcService().getInitialActiveSearches(filter || null, 100, 0)
      : mode === 'resgate'
        ? getRpcService().getOfferRescueSearches(filter || null, 100, 0)
        : getRpcService().getActiveSearches(filter || null, 50, 0)
    void pending.then((result) => {
      if (active) setState(result)
    })
    return () => { active = false }
  }, [filter, mode])

  async function registerRescueContact() {
    if (busy || !rescuePatientId || rescueResult.trim().length < 2) {
      setFeedback('Informe o resultado real do contato antes de registrar.')
      return
    }
    if (rescueOutcome !== 'sem_resposta' &&
      !window.confirm(`Confirma que o paciente ${rescueOutcome === 'aceitou' ? 'aceitou' : 'recusou'} a Oferta CAPO?`)) return
    setBusy(true)
    setFeedback('Registrando contato de resgate no banco…')
    const response = await getRpcService().registerOfferRescueContact({
      patientId: rescuePatientId,
      contactMethod: rescueMethod,
      contactResult: rescueResult.trim(),
      outcome: rescueOutcome,
    })
    setBusy(false)
    if (response.status === 'success') {
      setFeedback(rescueOutcome === 'sem_resposta'
        ? 'Segundo contato/tentativa registrado. Próxima tentativa em 15 dias.'
        : 'Resposta do paciente registrada e confirmada pelo banco.')
      setRescuePatientId('')
      setRescueResult('')
      setRescueOutcome('sem_resposta')
      if (mode === 'oferta') setMode('resgate')
      else void load()
    } else {
      setFeedback(response.status === 'error' ? response.error.message : 'O banco não confirmou o contato.')
    }
  }

  async function searchPatients() {
    const clean = query.trim()
    if (clean.length < 2 && !/^\d$/.test(clean)) {
      setFeedback('Informe ao menos dois caracteres ou o Nº CAPO exato.')
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
    if (busy) return
    if (!selectedPatientId) {
      setFeedback('Selecione o paciente antes de registrar a tentativa.')
      return
    }
    if (contactResult.trim().length < 2) {
      setFeedback('Informe o resultado do contato com pelo menos dois caracteres.')
      return
    }
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
        <p>{mode === 'oferta'
          ? 'Oferta CAPO aguardando resposta ou segundo contato após 72 horas.'
          : mode === 'resgate'
            ? 'Segundo contato registrado; novas tentativas a cada 15 dias até resposta expressa.'
            : 'Reengajamento de pacientes que já pertenciam ao CAPO e perderam seguimento.'}</p>
      </header>
      <nav className="gestor-active-search-modes" aria-label="Tipo de Busca Ativa">
        <button type="button" aria-pressed={mode === 'oferta'}
          onClick={() => { setMode('oferta'); setFeedback(null) }}>Oferta Inicial</button>
        <button type="button" aria-pressed={mode === 'resgate'}
          onClick={() => { setMode('resgate'); setFeedback(null); setRescuePatientId('') }}>Resgate da Oferta CAPO</button>
        <button type="button" aria-pressed={mode === 'seguimento'}
          onClick={() => { setMode('seguimento'); setFeedback(null); setRescuePatientId('') }}>Perda de Seguimento</button>
      </nav>

      {mode === 'seguimento' && canOperate && (
        <article className="gestor-panel">
          <h3>Registrar tentativa / iniciar acompanhamento</h3>
          <label>Paciente
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome, Nº CAPO ou CMS" />
          </label>
          <button type="button" onClick={() => void searchPatients()} disabled={busy}>Buscar</button>
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
          <button type="button" disabled={busy} onClick={() => void registerAttempt()}>
            {busy ? 'Registrando…' : 'Registrar tentativa'}
          </button>
        </article>
      )}

      <article className="gestor-panel">
        <h3>{mode === 'oferta' ? 'Pendências da Oferta Inicial' : mode === 'resgate' ? 'Resgate da Oferta CAPO' : 'Acompanhamento da Perda de Seguimento'}</h3>
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
                  <strong>{(mode === 'oferta' || mode === 'resgate') && patientId !== '—'
                    ? <Link to={`/pacientes?patientId=${encodeURIComponent(patientId)}`}>{label(item, 'patient_name', 'full_name')}</Link>
                    : label(item, 'patient_name', 'full_name')}</strong>
                  <small>{label(item, 'flow_status', 'status')} · {label(item, 'contact_result', 'next_action', 'contact_date')}</small>
                  {mode === 'oferta' && (
                    <div>
                      <small>Próximo contato: {typeof item.next_contact_at === 'string' && item.next_contact_at
                        ? new Date(item.next_contact_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                        : 'Ainda não programado'}</small>
                      <small>Nº CAPO {label(item, 'patient_number')} · {label(item, 'next_action')}</small>
                      {canOperate && active && patientId !== '—' && (
                        <Link to={`/pacientes?patientId=${encodeURIComponent(patientId)}`}>
                          Continuar oferta / registrar resposta
                        </Link>
                      )}
                    </div>
                  )}
                  {(mode === 'oferta' || mode === 'resgate') && canOperate && active && patientId !== '—' && (
                    <div>
                      {mode === 'resgate' && (
                        <small>Próxima tentativa: {typeof item.next_contact_at === 'string'
                          ? new Date(item.next_contact_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                          : 'Não programada'}</small>
                      )}
                      <button type="button" disabled={busy || (
                        typeof item.next_contact_at === 'string' && new Date(item.next_contact_at).getTime() > Date.now()
                      )} onClick={() => { setRescuePatientId(patientId); setRescueResult(''); setRescueOutcome('sem_resposta') }}>
                        {mode === 'oferta' ? 'Registrar segundo contato (após 72h)' : 'Registrar nova tentativa (15 dias)'}
                      </button>
                      {rescuePatientId === patientId && (
                        <div className="gestor-panel">
                          <label>Meio de contato
                            <select value={rescueMethod} onChange={(event) => setRescueMethod(event.target.value)}>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="phone">Telefone</option>
                              <option value="in_person">Presencial</option>
                              <option value="other">Outro</option>
                            </select>
                          </label>
                          <label>Resultado real do contato
                            <textarea value={rescueResult} onChange={(event) => setRescueResult(event.target.value)} />
                          </label>
                          <label>Resposta informada pelo paciente
                            <select value={rescueOutcome} onChange={(event) => setRescueOutcome(event.target.value as 'sem_resposta' | 'aceitou' | 'recusou')}>
                              <option value="sem_resposta">Sem resposta — continuar resgate</option>
                              <option value="aceitou">Aceitou expressamente</option>
                              <option value="recusou">Recusou expressamente</option>
                            </select>
                          </label>
                          <button type="button" disabled={busy || rescueResult.trim().length < 2} onClick={() => void registerRescueContact()}>
                            {busy ? 'Registrando…' : 'Salvar contato real'}
                          </button>
                          <button type="button" disabled={busy} onClick={() => setRescuePatientId('')}>Cancelar</button>
                        </div>
                      )}
                    </div>
                  )}
                  {mode === 'seguimento' && canOperate && active && (
                    <div>
                      <label>Motivo do encerramento
                        <input value={closureReason} onChange={(event) => setClosureReason(event.target.value)} />
                      </label>
                      <button type="button" disabled={busy} onClick={() => void closeSearch(patientId)}>
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
