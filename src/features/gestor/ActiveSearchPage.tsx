import { CapoDateTimeInput } from '../../components/inputs/CapoDateTimeInput'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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

function offerHistory(item: Record<string, unknown>) {
  return rows(item.history).slice().sort((a, b) => {
    const first = typeof a.contact_date === 'string' ? Date.parse(a.contact_date) : 0
    const second = typeof b.contact_date === 'string' ? Date.parse(b.contact_date) : 0
    return first - second
  })
}

function offerElapsed(item: Record<string, unknown>) {
  const first = offerHistory(item)[0]?.contact_date ?? item.contact_date
  if (typeof first !== 'string') return 'Tempo não informado'
  const timestamp = Date.parse(first)
  if (!Number.isFinite(timestamp)) return 'Tempo não informado'
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 60) return `Há ${minutes} min`
  if (minutes < 1440) return `Há ${Math.floor(minutes / 60)} h`
  return `Há ${Math.floor(minutes / 1440)} dia(s)`
}

function offerDate(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : 'Data não informada'
}

export function ActiveSearchPage({ accessContext }: Readonly<{ accessContext: AccessContext }>) {
  const location = useLocation()
  const navigate = useNavigate()
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
  const [initialPatientId, setInitialPatientId] = useState('')
  const [expandedOfferPatientId, setExpandedOfferPatientId] = useState('')
  const [initialOutcome, setInitialOutcome] = useState<'' | 'aceitou' | 'novo_contato' | 'sem_resposta' | 'recusou'>('')
  const [initialNotes, setInitialNotes] = useState('')
  const [initialNextAt, setInitialNextAt] = useState('')
  const [rescuePatientId, setRescuePatientId] = useState('')
  const [rescueResult, setRescueResult] = useState('')
  const [rescueMethod, setRescueMethod] = useState('whatsapp')
  const [rescueOutcome, setRescueOutcome] = useState<'sem_resposta' | 'aceitou' | 'recusou'>('sem_resposta')

  const canOperate = accessContext.roles.some((role) =>
    ['administrador', 'administrativo_operacional'].includes(role.code),
  )

  const load = useCallback(async () => {
    const result = mode === 'oferta'
      ? await getRpcService().getInitialActiveSearches('ativo', 100, 0)
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
      ? getRpcService().getInitialActiveSearches('ativo', 100, 0)
      : mode === 'resgate'
        ? getRpcService().getOfferRescueSearches(filter || null, 100, 0)
        : getRpcService().getActiveSearches(filter || null, 50, 0)
    void pending.then((result) => {
      if (active) setState(result)
    })
    return () => { active = false }
  }, [filter, mode])

  async function registerInitialOutcome() {
    if (busy || !initialPatientId || !initialOutcome) return
    if (initialOutcome === 'novo_contato' && !initialNextAt) {
      setFeedback('Informe a data e o horário do próximo contato.')
      return
    }
    if ((initialOutcome === 'aceitou' || initialOutcome === 'recusou') &&
      !window.confirm(`Confirma que o paciente ${initialOutcome === 'aceitou' ? 'aceitou' : 'recusou'} expressamente a Oferta CAPO?`)) return
    const accepted = initialOutcome === 'aceitou'
    const declined = initialOutcome === 'recusou'
    const closed = accepted || declined
    const resultText = {
      aceitou: 'Aceitou a Oferta CAPO',
      novo_contato: 'Novo contato necessário',
      sem_resposta: 'Sem resposta / contato não conseguido',
      recusou: 'Recusou a Oferta CAPO',
    }[initialOutcome]

    // O prazo de 72 horas começa no PRIMEIRO contato da oferta, não no
    // registro mais recente. A transferência é uma única operação no banco.
    const patient = rows(state.status === 'success' ? state.data : null)
      .find((item) => item.patient_id === initialPatientId)
    const firstContact = patient && offerHistory(patient)[0]?.contact_date
    const initialContact = typeof firstContact === 'string' ? Date.parse(firstContact) : NaN
    const canTransferToRescue = initialOutcome === 'sem_resposta' &&
      Number.isFinite(initialContact) && Date.now() >= initialContact + 72 * 60 * 60 * 1000

    if (canTransferToRescue) {
      const contactResult = initialNotes.trim()
        ? `${resultText} — ${initialNotes.trim()}`
        : resultText
      if (contactResult.length > 500) {
        setFeedback('O resultado e a observação do segundo contato devem ter até 500 caracteres.')
        return
      }
      setBusy(true)
      setFeedback('Registrando o segundo contato e transferindo para Resgate…')
      const transfer = await getRpcService().registerOfferRescueContact({
        patientId: initialPatientId,
        contactMethod: 'whatsapp',
        contactResult,
        outcome: 'sem_resposta',
      })
      setBusy(false)
      if (transfer.status !== 'success') {
        setFeedback(transfer.status === 'error' ? transfer.error.message
          : 'O banco não confirmou a transferência para Resgate.')
        return
      }
      setInitialPatientId('')
      setInitialOutcome('')
      setInitialNotes('')
      setInitialNextAt('')
      setExpandedOfferPatientId('')
      setFeedback('Segundo contato sem resposta registrado. Paciente transferido para a fila Resgate da Oferta CAPO.')
      setMode('resgate')
      return
    }

    const nextContactAt = closed ? null : initialNextAt
      ? new Date(initialNextAt).toISOString()
      : new Date(initialOutcome === 'sem_resposta' && Number.isFinite(initialContact)
          ? Math.max(Date.now() + 60000, initialContact + 72 * 60 * 60 * 1000)
          : Date.now() + 72 * 60 * 60 * 1000).toISOString()

    setBusy(true)
    setFeedback('Registrando a resposta no banco…')
    const response = await getRpcService().registerInitialActiveSearchAttempt({
      patientId: initialPatientId,
      contactMethod: 'whatsapp',
      contactResult: resultText,
      acceptedService: accepted ? true : declined ? false : null,
      nextAction: closed ? null : 'Acompanhar resposta e realizar novo contato administrativo.',
      notes: initialNotes.trim() || null,
      nextContactAt,
      closeFlow: closed,
      closureReason: accepted
        ? 'Oferta CAPO aceita expressamente pelo paciente.'
        : declined ? 'Oferta CAPO recusada expressamente pelo paciente.' : null,
    })
    setBusy(false)
    if (response.status === 'success') {
      const acceptedPatientId = initialPatientId
      const acceptedPatient = rows(state.status === 'success' ? state.data : null)
        .find((item) => item.patient_id === acceptedPatientId)
      setFeedback(accepted
        ? 'Aceite registrado pelo administrativo. Verifique o vínculo CAPO confirmado no banco.'
        : declined ? 'Recusa expressa registrada e Oferta Inicial encerrada.'
          : 'Contato/observação registrado. A Oferta Inicial continua em acompanhamento.')
      setInitialPatientId('')
      setInitialOutcome('')
      setInitialNotes('')
      setInitialNextAt('')
      if (accepted) {
        navigate('/agenda', {
          state: {
            patientId: acceptedPatientId,
            patientName: acceptedPatient ? label(acceptedPatient, 'patient_name', 'full_name') : '',
            origin: 'patient_record',
          },
        })
      } else {
        void load()
      }
    } else {
      setFeedback(response.status === 'error' ? response.error.message : 'O banco não confirmou a resposta.')
    }
  }

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
            <CapoDateTimeInput  value={nextContactAt} onChange={(event) => setNextContactAt(event.target.value)} />
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
        {mode !== 'oferta' && (
          <label>Situação
            <select value={filter} onChange={(event) => { setState(loadingState()); setFilter(event.target.value) }}>
              <option value="ativo">Ativo</option>
              <option value="encerrado">Encerrado</option>
              <option value="">Todos</option>
            </select>
          </label>
        )}
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
                <li key={label(item, 'latest_attempt_id', 'patient_id') + index}
                  className={mode === 'oferta' ? 'capo-initial-offer-item' : undefined}>
                  {mode === 'oferta' ? (
                    <div className="capo-initial-offer-summary" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                      <span className="capo-initial-offer-name" style={{ fontWeight: 600, flex: "1 1 12rem" }}>{label(item, 'patient_name', 'full_name')}</span>
                      <small>{offerElapsed(item)}</small>
                      <button type="button" className="capo-initial-offer-button" style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
                        aria-expanded={expandedOfferPatientId === patientId}
                        onClick={() => {
                          setExpandedOfferPatientId(expandedOfferPatientId === patientId ? '' : patientId)
                          setInitialPatientId('')
                          setRescuePatientId('')
                        }}>
                        Oferta CAPO
                      </button>
                    </div>
                  ) : (
                    <>
                      <strong>{mode === 'resgate' && patientId !== '—'
                        ? <Link to={`/pacientes?patientId=${encodeURIComponent(patientId)}`}>{label(item, 'patient_name', 'full_name')}</Link>
                        : label(item, 'patient_name', 'full_name')}</strong>
                      <small>{label(item, 'flow_status', 'status')} · {label(item, 'contact_result', 'next_action', 'contact_date')}</small>
                    </>
                  )}
                  {mode === 'oferta' && expandedOfferPatientId === patientId && (
                    <div className="capo-initial-offer-detail" style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #dbe5ee" }}>
                      {patientId !== '—' && (
                        <Link to={`/pacientes?patientId=${encodeURIComponent(patientId)}`}>Abrir Oferta CAPO e mensagem do WhatsApp</Link>
                      )}
                      <h4>Registro das ofertas e contatos</h4>
                      {offerHistory(item).length > 0 ? (
                        <ol className="capo-initial-offer-history" style={{ margin: "0.5rem 0 1rem", paddingLeft: "1.25rem" }}>
                          {offerHistory(item).map((attempt, attemptIndex) => (
                            <li key={String(attempt.id ?? attemptIndex)}>
                              <time>{offerDate(attempt.contact_date)}</time>
                              <span>{label(attempt, 'contact_result', 'next_action')}</span>
                              {typeof attempt.notes === 'string' && attempt.notes.trim() && (
                                <small>Observação: {attempt.notes}</small>
                              )}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p>Registro inicial: {offerDate(item.contact_date)}. Sem outros contatos no histórico retornado.</p>
                      )}
                      <div>
                      <small>Próximo contato: {typeof item.next_contact_at === 'string' && item.next_contact_at
                        ? new Date(item.next_contact_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                        : 'Ainda não programado'}</small>
                      <small>Nº CAPO {label(item, 'patient_number')} · {label(item, 'next_action')}</small>
                      {typeof item.next_contact_at === 'string' && new Date(item.next_contact_at).getTime() <= Date.now() && (
                        <strong role="status">Lembrete administrativo: 72 horas sem resposta — realizar segundo contato.</strong>
                      )}
                      {canOperate && active && patientId !== '—' && (
                        <div>
                          <button type="button" disabled={busy}
                            onClick={() => {
                              setInitialPatientId(initialPatientId === patientId ? '' : patientId)
                              setInitialOutcome('')
                              setInitialNotes('')
                              setInitialNextAt('')
                            }}>
                            {initialPatientId === patientId ? 'Fechar resposta' : 'Registrar resposta / observação'}
                          </button>
                          {initialPatientId === patientId && (
                            <div className="gestor-panel">
                              <label>Desfecho do contato
                                <select value={initialOutcome}
                                  onChange={(event) => setInitialOutcome(event.target.value as typeof initialOutcome)}>
                                  <option value="">Selecionar resposta</option>
                                  <option value="aceitou">Aceitou expressamente</option>
                                  <option value="novo_contato">Novo contato necessário</option>
                                  <option value="sem_resposta">Sem resposta / contato não conseguido</option>
                                  <option value="recusou">Recusou expressamente</option>
                                </select>
                              </label>
                              {(initialOutcome === 'novo_contato' || initialOutcome === 'sem_resposta') && (
                                <label>Próximo contato
                                  <CapoDateTimeInput  value={initialNextAt}
                                    onChange={(event) => setInitialNextAt(event.target.value)} />
                                </label>
                              )}
                              <label>Observação administrativa (opcional)
                                <textarea rows={2} value={initialNotes}
                                  onChange={(event) => setInitialNotes(event.target.value)} />
                              </label>
                              <button type="button" disabled={busy || !initialOutcome}
                                onClick={() => void registerInitialOutcome()}>
                                {busy ? 'Salvando…' : 'Salvar resposta'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                  {(mode === 'resgate' || (mode === 'oferta' && expandedOfferPatientId === patientId)) && canOperate && active && patientId !== '—' && (
                    <div>
                      {mode === 'resgate' && typeof item.next_contact_at === 'string'
                        && new Date(item.next_contact_at).getTime() <= Date.now() && (
                        <strong role="status">Lembrete administrativo: tentativa de resgate após 15 dias.</strong>
                      )}
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
