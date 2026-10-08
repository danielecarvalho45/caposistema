import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AgendaScheduleSlot, type AsyncState } from '../../lib/supabase/rpc'
import { canAccessAppRoute } from '../../app/route-access'
import type { AccessContext } from '../../types/access'
import { BirthdayPanel } from '../../components/birthdays/BirthdayPanel'
import { TeamDayAgendaPanel } from '../home/TeamDayAgendaPanel'
import '../../styles/quick-access.css'

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
function requestedChanges(row: Row) {
  const changes = row.requested_changes
  return changes && typeof changes === 'object' && !Array.isArray(changes) ? changes as Row : null
}
function changeValue(row: Row, ...keys: string[]) {
  const changes = requestedChanges(row)
  if (!changes) return '—'
  const found = keys.map((key) => changes[key]).find((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
  if (found === undefined) return '—'
  if (typeof found === 'boolean') return found ? 'Sim' : 'Não'
  return String(found)
}
function requestSummary(row: Row) {
  const type = value(row, 'request_type', 'action_type')
  const startDate = changeValue(row, 'start_date', 'effective_date', 'date')
  const endDate = changeValue(row, 'end_date')
  const startTime = changeValue(row, 'start_time')
  const endTime = changeValue(row, 'end_time')
  const weekdays = requestedChanges(row)?.weekdays
  const weekdayText = Array.isArray(weekdays) ? weekdays.join(', ') : '—'
  const parts = [
    type !== '—' ? `Tipo: ${type.replaceAll('_', ' ')}` : null,
    startDate !== '—' ? `Início/vigência: ${startDate}` : null,
    endDate !== '—' ? `Fim: ${endDate}` : null,
    startTime !== '—' ? `Horário: ${startTime}${endTime !== '—' ? `–${endTime}` : ''}` : null,
    weekdayText !== '—' ? `Dias: ${weekdayText}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Detalhes estruturais conforme solicitação registrada.'
}
const links = [
  { path: '/pacientes', title: 'Pacientes em Acompanhamento', description: 'Consultar pacientes autorizados', icon: '👥', tone: 'quick-blue' },
  { path: '/agenda', title: 'Agenda Geral', description: 'Visualizar agendas da equipe', icon: '▣', tone: 'quick-green' },
  { path: '/fila', title: 'Filas e Pendências', description: 'Acompanhar demandas', icon: '≡', tone: 'quick-mint' },
  { path: '/faltosos', title: 'Faltosos', description: 'Acompanhar o fluxo', icon: '◷', tone: 'quick-pink' },
  { path: '/coordenacao/busca-ativa', title: 'Busca Ativa', description: 'Consultar o acompanhamento', icon: '⌕', tone: 'quick-violet' },
  { path: '/solicitacoes', title: 'Solicitações', description: 'Analisar e encaminhar', icon: '▤', tone: 'quick-purple' },
  { path: '/encaminhamentos', title: 'Encaminhamentos', description: 'Acompanhar os destinos', icon: '↗', tone: 'quick-yellow' },
  { path: '/relatorios', title: 'Relatórios e Indicadores', description: 'Consultar resultados', icon: '▥', tone: 'quick-violet' },
  { path: '/coordenacao/timeline', title: 'Linha do Tempo Operacional', description: 'Consultar o histórico', icon: '◉', tone: 'quick-slate' },
  { path: '/coordenacao/auditoria', title: 'Auditoria Operacional', description: 'Verificar alterações', icon: '✓', tone: 'quick-blue' },
  { path: '/notificacoes', title: 'Notificações', description: 'Ler avisos autorizados', icon: '●', tone: 'quick-yellow' },
  { path: '/suporte', title: 'Suporte', description: 'Acompanhar chamados', icon: '?', tone: 'quick-mint' },
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
  const [agenda, setAgenda] = useState<AsyncState<readonly AgendaScheduleSlot[]>>(loadingState)
  const [requests, setRequests] = useState<AsyncState<unknown>>(loadingState)
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const reloadRequests = useCallback(async () => setRequests(await getRpcService().getAgendaChangeRequests(null, null, 50)), [])
  useEffect(() => {
    let active = true
    const rpc = getRpcService()
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    void rpc.getCoordinatorTeamOverview(null, null, null, null, null, 50, 0).then((result) => { if (active) setTeam(result) })
    void rpc.getAgendaScheduleGrid(date, date, null).then((result) => { if (active) setAgenda(result) })
    void rpc.getAgendaChangeRequests(null, null, 50).then((result) => { if (active) setRequests(result) })
    return () => { active = false }
  }, [])
  async function decide(requestId: string, action: 'aprovar' | 'rejeitar') {
    const decisionReason = rejectionReasons[requestId]?.trim() ?? ''
    if (!requestId || busy || (action === 'rejeitar' && decisionReason.length < 5)) return
    setBusy(true); setFeedback('')
    const rpc = getRpcService()
    const result = await rpc.decideAgendaChangeRequest(requestId, action, action === 'rejeitar' ? decisionReason : null)
    if (result.status !== 'success') { setFeedback(result.status === 'error' ? result.error.message : 'O backend não confirmou a operação.'); setBusy(false); return }
    setRequests(loadingState())
    await reloadRequests()
    setFeedback(action === 'aprovar' ? 'Anuência registrada. A alteração aguarda efetivação administrativa.' : 'Solicitação rejeitada com justificativa e devolvida ao profissional.')
    if (action === 'rejeitar') setRejectionReasons((current) => ({ ...current, [requestId]: '' }))
    setBusy(false)
  }
  return <div className="home-page home-mobile-standard"><header className="home-welcome"><p className="eyebrow">Coordenação</p><h1>Painel da Coordenação</h1><p>Visão gerencial da equipe e dos fluxos autorizados.</p></header>
    <section className="home-profile home-profile-standard"><h2>Acessos rápidos</h2><div className="home-profile-grid">{links.filter(({ path }) => canAccessAppRoute(accessContext, path)).map(({ path, title, description, icon, tone }) => <Link className={`home-profile-card ${tone}`} to={path} key={path}><span className="home-profile-icon" aria-hidden="true">{icon}</span><strong>{title}</strong><span>{description}</span></Link>)}</div></section>
    <section className="home-profile"><h2>Equipe e Profissionais</h2>
      {team.status === 'loading' && <p>Carregando…</p>}
      {team.status === 'error' && <p role="alert">{team.error.message}</p>}
      {team.status === 'empty' && <p>Nenhum registro retornado.</p>}
      {team.status === 'success' && (rows(team.data).length ? <ul>{rows(team.data).map((row, index) => <li key={value(row, 'professional_id') + index}>
        <strong>{value(row, 'full_name')}</strong> · {value(row, 'function_title')} · Especialidades: {specialtyNames(row)} · Situação: {value(row, 'work_status')} · Atividades: {value(row, 'activity_count')} · Atendimentos realizados: {value(row, 'productivity_count')} · Dias com disponibilidade: {value(row, 'available_slots_count')}
      </li>)}</ul> : <p>Nenhum registro retornado.</p>)}
    </section>
    <TeamDayAgendaPanel agenda={agenda} />
    <BirthdayPanel title="Aniversariantes de hoje" />
    <section className="home-profile" aria-labelledby="agenda-change-review-title"><h2 id="agenda-change-review-title">Solicitações de alteração de agenda</h2>
      {feedback && <p role="status">{feedback}</p>}
      {requests.status === 'loading' && <p>Carregando solicitações…</p>}
      {requests.status === 'error' && <p role="alert">{requests.error.message}</p>}
      {requests.status === 'empty' && <p>Nenhuma solicitação retornada.</p>}
      {requests.status === 'success' && (rows(requests.data).length ? <div className="coordination-agenda-requests">{rows(requests.data).map((row, index) => {
        const id = value(row, 'request_id', 'agenda_change_request_id')
        const status = value(row, 'status')
        const justification = value(row, 'justification', 'description')
        return <article className="coordination-agenda-request" key={id + index}>
          <h3>{value(row, 'professional_name', 'professional_id')}</h3>
          <p><strong>Solicitação:</strong> {requestSummary(row)}</p>
          <p><strong>Justificativa do profissional:</strong> {justification}</p>
          <p><strong>Situação:</strong> {status}</p>
          {status === 'pendente' && <div className="coordination-agenda-decision">
            <button disabled={busy || id === '—'} onClick={() => void decide(id, 'aprovar')}>Aprovar e encaminhar ao Administrativo</button>
            <label>Justificativa da rejeição
              <textarea
                value={rejectionReasons[id] ?? ''}
                minLength={5}
                maxLength={1000}
                onChange={(event) => setRejectionReasons((current) => ({ ...current, [id]: event.target.value }))}
                placeholder="Obrigatória somente para rejeitar"
              />
            </label>
            <button disabled={busy || id === '—' || (rejectionReasons[id]?.trim().length ?? 0) < 5} onClick={() => void decide(id, 'rejeitar')}>Rejeitar e devolver ao profissional</button>
          </div>}
          {status === 'aprovada' && <p><strong>Fluxo:</strong> Aprovada pela Coordenação · aguardando efetivação administrativa.</p>}
          {['rejeitada', 'devolvida'].includes(status) && <p><strong>Fluxo:</strong> Rejeitada pela Coordenação · devolvida ao profissional com justificativa.</p>}
        </article>
      })}</div> : <p>Nenhuma solicitação retornada.</p>)}
    </section>
  </div>
}
