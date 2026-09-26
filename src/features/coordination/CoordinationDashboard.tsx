import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'
import { canAccessAppRoute } from '../../app/route-access'
import type { AccessContext } from '../../types/access'
import { BirthdayPanel } from '../../components/birthdays/BirthdayPanel'

type Row = Record<string, unknown>
function rows(value: unknown): readonly Row[] {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null
  const list = Array.isArray(value) ? value : source && [source.items, source.rows, source.data, source.requests].find(Array.isArray)
  return Array.isArray(list) ? list.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : []
}
function value(row: Row, ...keys: string[]) {
  const found = keys.map((key) => row[key]).find((item) => typeof item === 'string' || typeof item === 'number')
  return found === undefined ? '—' : String(found)
}
function specialtyNames(row: Row) {
  const specialties = row.specialties
  if (!Array.isArray(specialties)) return '—'
  return specialties.flatMap((item) => {
    if (typeof item === 'string') return [item]
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const name = (item as Row).name ?? (item as Row).specialty_name
      return typeof name === 'string' ? [name] : []
    }
    return []
  }).join(', ') || '—'
}
const links = [
  ['/pacientes', 'Pacientes em Acompanhamento'], ['/agenda', 'Agenda Geral'], ['/fila', 'Filas e Pendências'],
  ['/faltosos', 'Faltosos'], ['/coordenacao/busca-ativa', 'Busca Ativa'], ['/solicitacoes', 'Solicitações'], ['/encaminhamentos', 'Encaminhamentos'],
  ['/relatorios', 'Relatórios e Indicadores'], ['/coordenacao/timeline', 'Linha do Tempo Operacional'], ['/coordenacao/auditoria', 'Auditoria Operacional'], ['/notificacoes', 'Notificações'], ['/suporte', 'Suporte'],
] as const
function Panel({ title, state, fields }: { title: string; state: AsyncState<unknown>; fields: readonly string[] }) {
  return <article className="home-profile"><h2>{title}</h2>
    {state.status === 'loading' && <p>Carregando…</p>}
    {state.status === 'error' && <p role="alert">{state.error.message}</p>}
    {state.status === 'empty' && <p>Nenhum registro retornado.</p>}
    {state.status === 'success' && (rows(state.data).length ? <ul>{rows(state.data).map((row, index) => <li key={value(row, 'professional_id', 'request_id', 'source_id') + index}>{fields.map((field) => value(row, field)).join(' · ')}</li>)}</ul> : <p>Nenhum registro retornado.</p>)}
  </article>
}
export function CoordinationDashboard({ accessContext }: { accessContext: AccessContext }) {
  const [team, setTeam] = useState<AsyncState<unknown>>(loadingState)
  const [agenda, setAgenda] = useState<AsyncState<unknown>>(loadingState)
  const [requests, setRequests] = useState<AsyncState<unknown>>(loadingState)
  const [pending, setPending] = useState<AsyncState<unknown>>(loadingState)
  const [decisions, setDecisions] = useState<AsyncState<unknown>>(loadingState)
  const [reason, setReason] = useState('')
  const [professionalId, setProfessionalId] = useState('')
  const [actionType, setActionType] = useState('mudanca_horario')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const reloadRequests = useCallback(async () => setRequests(await getRpcService().getAgendaChangeRequests(null, null, 50)), [])
  useEffect(() => {
    let active = true
    const rpc = getRpcService()
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    void rpc.getCoordinatorTeamOverview(null, null, null, null, null, 50, 0).then((result) => { if (active) setTeam(result) })
    void rpc.getCoordinatorAgendaOverview(date, date).then((result) => { if (active) setAgenda(result) })
    void rpc.getCoordinationTeamDecisions(null, null, 50, 0).then((result) => { if (active) setDecisions(result) })
    void rpc.getPendingItems(50, 0).then((result) => { if (active) setPending(result) })
    void rpc.getAgendaChangeRequests(null, null, 50).then((result) => { if (active) setRequests(result) })
    return () => { active = false }
  }, [])
  async function decide(requestId: string, action: 'aprovar' | 'rejeitar' | 'efetivar') {
    if (!requestId || busy || (action === 'rejeitar' && reason.trim().length < 5)) return
    setBusy(true); setFeedback('')
    const rpc = getRpcService()
    const result = action === 'efetivar' ? await rpc.applyAgendaChangeRequest(requestId) : await rpc.decideAgendaChangeRequest(requestId, action, reason.trim() || null)
    if (result.status !== 'success') { setFeedback(result.status === 'error' ? result.error.message : 'O backend não confirmou a operação.'); setBusy(false); return }
    setRequests(loadingState())
    await reloadRequests()
    setFeedback('Decisão confirmada pelo banco; solicitações recarregadas.')
    setBusy(false)
  }
  async function register(decision: 'aprovar' | 'devolver') {
    if (busy || !professionalId || !startDate || endDate < startDate || decisionReason.trim().length < 5) return
    setBusy(true); setFeedback('')
    const result = await getRpcService().registerCoordinationTeamDecision(professionalId, actionType, startDate, endDate, decisionReason.trim(), decision)
    if (result.status !== 'success') { setFeedback(result.status === 'error' ? result.error.message : 'O backend não confirmou a decisão.'); setBusy(false); return }
    setDecisions(loadingState())
    const reloaded = await getRpcService().getCoordinationTeamDecisions(null, null, 50, 0)
    setDecisions(reloaded)
    setFeedback(reloaded.status === 'error' ? 'Decisão confirmada, mas a recarga falhou.' : 'Decisão confirmada e histórico recarregado do banco.')
    setBusy(false)
  }
  return <div className="home-page"><header className="home-welcome"><p className="eyebrow">Coordenação</p><h1>Painel da Coordenação</h1><p>Visão gerencial da equipe e dos fluxos autorizados.</p></header>
    <section className="home-profile"><h2>Acessos rápidos</h2><div className="home-profile-grid">{links.filter(([path]) => canAccessAppRoute(accessContext, path)).map(([path, title]) => <Link className="home-profile-card" to={path} key={path}><strong>{title}</strong></Link>)}</div></section>
    <section className="home-profile"><h2>Equipe e Profissionais</h2>
      {team.status === 'loading' && <p>Carregando…</p>}
      {team.status === 'error' && <p role="alert">{team.error.message}</p>}
      {team.status === 'empty' && <p>Nenhum registro retornado.</p>}
      {team.status === 'success' && (rows(team.data).length ? <ul>{rows(team.data).map((row, index) => <li key={value(row, 'professional_id') + index}>
        <strong>{value(row, 'full_name')}</strong> · {value(row, 'function_title')} · Especialidades: {specialtyNames(row)} · Situação: {value(row, 'work_status')} · Atividades: {value(row, 'activity_count')} · Atendimentos realizados: {value(row, 'productivity_count')} · Dias com disponibilidade: {value(row, 'available_slots_count')}
      </li>)}</ul> : <p>Nenhum registro retornado.</p>)}
    </section>
    <Panel title="Agendas da Equipe" state={agenda} fields={['agenda_date', 'professional_name', 'specialty_name', 'occupied_count', 'configured_capacity', 'agenda_status']} />
    <BirthdayPanel title="Aniversariantes de hoje" />
    <section className="home-profile"><h2>Registrar decisão da equipe</h2>
      <label>Profissional<select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}><option value="">Selecione da equipe</option>{team.status === 'success' && rows(team.data).map((row) => <option key={value(row, 'professional_id')} value={value(row, 'professional_id')}>{value(row, 'full_name')}</option>)}</select></label>
      <label>Tipo<select value={actionType} onChange={(event) => setActionType(event.target.value)}>{['mudanca_horario', 'ferias', 'afastamento', 'mudanca_turno', 'carga', 'bloqueio', 'substituicao', 'outra'].map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
      <label>Início<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
      <label>Fim<input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
      <label>Justificativa<textarea value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} /></label>
      <button type="button" disabled={busy || !professionalId || !startDate || !endDate || endDate < startDate || decisionReason.trim().length < 5} onClick={() => void register('aprovar')}>Aprovar</button>
      <button type="button" disabled={busy || !professionalId || !startDate || !endDate || endDate < startDate || decisionReason.trim().length < 5} onClick={() => void register('devolver')}>Devolver</button>
    </section>
    <Panel title="Decisões da Coordenação" state={decisions} fields={['professional_name', 'action_type', 'status', 'reason']} />
    <Panel title="Pendências" state={pending} fields={['title', 'patient_name', 'status', 'priority']} />
    <section className="home-profile"><h2>Solicitações de alteração de agenda</h2>
      <label>Justificativa para rejeição<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {feedback && <p role="status">{feedback}</p>}
      {requests.status === 'loading' && <p>Carregando solicitações…</p>}
      {requests.status === 'error' && <p role="alert">{requests.error.message}</p>}
      {requests.status === 'empty' && <p>Nenhuma solicitação retornada.</p>}
      {requests.status === 'success' && (rows(requests.data).length ? <ul>{rows(requests.data).map((row, index) => {
        const id = value(row, 'request_id', 'agenda_change_request_id')
        const status = value(row, 'status')
        return <li key={id + index}><strong>{value(row, 'professional_name', 'professional_id')}</strong> · {status} · {value(row, 'justification', 'reason', 'description')}
          {status === 'pendente' && <><button disabled={busy || id === '—'} onClick={() => void decide(id, 'aprovar')}>Aprovar</button><button disabled={busy || id === '—' || reason.trim().length < 5} onClick={() => void decide(id, 'rejeitar')}>Rejeitar</button></>}
          {status === 'aprovada' && <button disabled={busy || id === '—'} onClick={() => void decide(id, 'efetivar')}>Efetivar alteração</button>}
        </li>
      })}</ul> : <p>Nenhuma solicitação retornada.</p>)}
    </section>
  </div>
}
