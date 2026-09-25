import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'

type Row = Record<string, unknown>
function record(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : null
}
function rows(value: unknown, field: string): Row[] {
  const source = record(value)
  const list = Array.isArray(value) ? value : source?.[field]
  return Array.isArray(list) ? list.map(record).filter((item): item is Row => item !== null) : []
}
function string(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
function today() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) }

type Service = Pick<ReturnType<typeof getRpcService>, 'getAgendaConfiguration' | 'getAgendaChangeRequests' | 'createAgendaChangeRequest'>
export function AgendaChangeRequestPage({ accessContext, service = getRpcService() }: { accessContext: AccessContext; service?: Service }) {
  const professionalId = accessContext.professional_id
  const [configuration, setConfiguration] = useState<AsyncState<unknown>>(loadingState)
  const [requests, setRequests] = useState<AsyncState<unknown>>(loadingState)
  const [configId, setConfigId] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(today)
  const [justification, setJustification] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const authorized = accessContext.is_active && Boolean(professionalId) && accessContext.roles.some((role) => role.code === 'profissional')

  useEffect(() => {
    if (!authorized || !professionalId) return
    let active = true
    void service.getAgendaConfiguration(professionalId).then((result) => { if (active) setConfiguration(result) })
    void service.getAgendaChangeRequests(null, professionalId, 50).then((result) => { if (active) setRequests(result) })
    return () => { active = false }
  }, [authorized, professionalId, service])

  async function submit() {
    if (!authorized || !professionalId || !configId || !effectiveDate || justification.trim().length < 5 || justification.trim().length > 1000 || busy) return
    setBusy(true); setFeedback('')
    const result = await service.createAgendaChangeRequest(configId, { is_active: isActive, effective_date: effectiveDate }, justification.trim())
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O backend não confirmou a solicitação.'); setBusy(false); return
    }
    setRequests(loadingState())
    const reloaded = await service.getAgendaChangeRequests(null, professionalId, 50)
    setRequests(reloaded)
    const requestId = string(record(result.data)?.request_id)
    if (reloaded.status === 'success' && requestId && rows(reloaded.data, 'requests').some((item) => item.request_id === requestId)) {
      setJustification('')
      setFeedback('Solicitação registrada e lista recarregada do banco.')
    } else {
      setFeedback(reloaded.status === 'error' ? `Solicitação registrada, mas a recarga falhou: ${reloaded.error.message}` : 'Solicitação registrada, mas ainda não apareceu na lista consultada.')
    }
    setBusy(false)
  }
  if (!authorized) return <section className="home-page"><h1>Solicitação de agenda indisponível</h1><p>É necessário vínculo profissional ativo e autorizado.</p></section>
  const configs = configuration.status === 'success' ? rows(configuration.data, 'configurations') : []
  const pending = requests.status === 'success' ? rows(requests.data, 'requests') : []
  return <section className="home-page" aria-labelledby="agenda-change-title">
    <header className="home-welcome"><p className="eyebrow">Minha agenda</p><h1 id="agenda-change-title">Solicitar ao Coordenador</h1><p>Pedido de alteração da própria agenda sujeito à decisão da Coordenação.</p></header>
    <section className="home-profile"><h2>Alterar situação da configuração</h2>
      {configuration.status === 'loading' && <p>Carregando configurações…</p>}
      {configuration.status === 'error' && <p role="alert">{configuration.error.message}</p>}
      {configuration.status === 'empty' && <p>Nenhuma configuração retornada.</p>}
      {configuration.status === 'success' && configs.length === 0 && <p>Não há configuração de agenda disponível para solicitar alteração de situação.</p>}
      {configs.length > 0 && <><label>Configuração<select value={configId} onChange={(event) => setConfigId(event.target.value)}><option value="">Selecione</option>{configs.map((item) => <option key={string(item.config_id)} value={string(item.config_id)}>{string(item.start_date)} · {string(item.start_time)}–{string(item.end_time)}</option>)}</select></label>
        <label>Situação solicitada<select value={isActive ? 'ativa' : 'inativa'} onChange={(event) => setIsActive(event.target.value === 'ativa')}><option value="inativa">Inativar</option><option value="ativa">Ativar</option></select></label>
        <label>Data de vigência<input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} /></label>
        <label>Justificativa<textarea minLength={5} maxLength={1000} value={justification} onChange={(event) => setJustification(event.target.value)} /></label>
        <button type="button" disabled={busy || !configId || !effectiveDate || justification.trim().length < 5} onClick={() => void submit()}>{busy ? 'Enviando…' : 'Enviar solicitação'}</button></>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
    <section className="home-profile"><h2>Solicitações da própria agenda</h2>
      {requests.status === 'loading' && <p>Carregando solicitações…</p>}
      {requests.status === 'error' && <p role="alert">{requests.error.message}</p>}
      {requests.status === 'empty' && <p>Nenhuma solicitação retornada.</p>}
      {requests.status === 'success' && (pending.length ? <ul>{pending.map((item) => <li key={string(item.request_id)}>{string(item.request_type)} · {string(item.status)} · {string(item.justification)}</li>)}</ul> : <p>Nenhuma solicitação retornada.</p>)}
    </section>
  </section>
}
