import { useCallback, useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getSupabaseClient } from '../../lib/supabase/client'
import { getRpcService, type ReferralPatient } from '../../lib/supabase/rpc'
import './internal-communication.css'

type Recipient = { account_id: string; name: string; function_title: string; can_receive_admin_demand: boolean }
type Message = { id: string; author_id: string; body: string; created_at: string }
type Thread = {
  id: string; kind: 'recado' | 'demanda_administrativa'; subject: string; body: string
  status: string; sender_id: string; recipient_id: string; sender_name: string
  recipient_name: string; patient_id: string | null; patient_name: string | null
  updated_at: string; unread: boolean; recipient_read_at: string | null; messages: Message[]
}
type View = 'recebidas' | 'enviadas'
function rows<T>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : [] }
function stamp(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}
export function InternalCommunicationPage({ accessContext }: Readonly<{ accessContext: AccessContext }>) {
  const [myAccountId, setMyAccountId] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [view, setView] = useState<View>('recebidas')
  const [selectedId, setSelectedId] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [kind, setKind] = useState<'recado' | 'demanda_administrativa'>('recado')
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<ReferralPatient[]>([])
  const [patient, setPatient] = useState<ReferralPatient | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const isAdmin = accessContext.roles.some(r => r.code === 'administrador' || r.code === 'administrativo_operacional')
  const permitted = isAdmin || accessContext.roles.some(r => r.code === 'profissional')
  const selected = threads.find(t => t.id === selectedId)
  const inbox = threads.filter(t => view === 'recebidas' ? t.recipient_id === myAccountId : t.sender_id === myAccountId)
  const unread = threads.filter(t => t.recipient_id === myAccountId && t.unread).length

  const reload = useCallback(async () => {
    const [{ data, error }, { data: people, error: directoryError }] = await Promise.all([
      getSupabaseClient().rpc('get_internal_communications_for_interface', { p_limit: 200 }),
      getSupabaseClient().rpc('get_internal_communication_recipients_for_interface'),
    ])
    if (error || directoryError) throw error ?? directoryError
    setThreads(rows<Thread>(data))
    setRecipients(rows<Recipient>(people))
  }, [])

  useEffect(() => {
    if (!permitted) { setLoading(false); return }
    let active = true
    void (async () => {
      try {
        const { data: userResult, error: authError } = await getSupabaseClient().auth.getUser()
        if (authError) throw authError
        const authId = userResult.user?.id
        if (!authId) throw new Error('Sessão indisponível.')
        // O identificador da conta interna é obtido de RPC, não por consulta direta à tabela protegida.
        const { data: who, error: whoError } = await getSupabaseClient().rpc('get_my_internal_communication_identity_for_interface')
        if (whoError) throw whoError
        const id = who && typeof who === 'object' && !Array.isArray(who) && typeof who.account_id === 'string' ? who.account_id : ''
        if (!id) throw new Error('Conta CAPO não identificada.')
        if (active) setMyAccountId(id)
        const [{ data, error }, { data: people, error: directoryError }] = await Promise.all([
          getSupabaseClient().rpc('get_internal_communications_for_interface', { p_limit: 200 }),
          getSupabaseClient().rpc('get_internal_communication_recipients_for_interface'),
        ])
        if (error || directoryError) throw error ?? directoryError
        if (active) { setThreads(rows<Thread>(data)); setRecipients(rows<Recipient>(people)) }
      } catch (error) {
        if (active) setFeedback(error instanceof Error ? error.message : 'Falha ao carregar a comunicação interna.')
      } finally { if (active) setLoading(false) }
    })()
    return () => { active = false }
  }, [permitted])

  useEffect(() => {
    if (!search.trim() || search.trim().length < 2) { setPatients([]); return }
    let active = true
    const service = getRpcService()
    const lookup = accessContext.roles.some(r => r.code === 'profissional') && !isAdmin
      ? service.searchProfessionalPatients(search.trim(), 15, 0)
      : service.searchReferralPatients(search.trim(), 15, 0)
    void lookup.then(result => {
      if (active) setPatients(result.status === 'success' ? [...result.data] : [])
    })
    return () => { active = false }
  }, [search, accessContext.roles, isAdmin])

  async function send() {
    if (busy || !recipientIds.length || subject.trim().length < 3 || body.trim().length < 3) {
      setFeedback('Selecione destinatários e preencha assunto e mensagem.'); return
    }
    setBusy(true); setFeedback('')
    try {
      const { data, error } = await getSupabaseClient().rpc('create_internal_communication_for_interface', {
        p_recipient_ids: recipientIds, p_kind: kind, p_subject: subject.trim(), p_body: body.trim(),
        p_patient_id: patient?.patient_id ?? null,
      })
      if (error) throw error
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.success !== true) throw new Error('Envio não confirmado pelo CAPO.')
      await reload()
      setNewOpen(false); setRecipientIds([]); setSubject(''); setBody(''); setPatient(null); setSearch('')
      setView('enviadas'); setFeedback('Comunicação enviada e registrada no histórico.')
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Não foi possível enviar.') }
    finally { setBusy(false) }
  }

  async function act(action: 'ler' | 'responder' | 'iniciar' | 'concluir') {
    if (!selected || busy) return
    if (action === 'responder' && !reply.trim()) { setFeedback('Escreva sua resposta.'); return }
    setBusy(true); setFeedback('')
    try {
      const { data, error } = await getSupabaseClient().rpc('update_internal_communication_for_interface', {
        p_communication_id: selected.id, p_action: action, p_body: action === 'responder' ? reply.trim() : null,
      })
      if (error) throw error
      if (!data || typeof data !== 'object' || Array.isArray(data) || data.success !== true) throw new Error('Ação não confirmada pelo CAPO.')
      if (action === 'responder') setReply('')
      await reload()
      if (action !== 'ler') setFeedback('Atualização registrada no histórico da comunicação.')
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha ao atualizar comunicação.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    if (!selected || !selected.unread || busy) return
    // Abertura do item registra ciência individual sem concluí-lo.
    void getSupabaseClient().rpc('update_internal_communication_for_interface', {
      p_communication_id: selected.id, p_action: 'ler', p_body: null,
    }).then(({ error }) => { if (!error) setThreads(current => current.map(t => t.id === selected.id ? { ...t, unread: false } : t)) })
  }, [selectedId, selected?.unread, selected?.id, busy])

  if (!permitted) return <section className="capo-comm-page"><h2>Comunicação Interna</h2><p>Perfil não autorizado.</p></section>
  return (
    <section className="capo-comm-page" aria-labelledby="comm-title">
      <header className="capo-comm-heading">
        <div><p className="eyebrow">Comunicação da equipe</p><h2 id="comm-title">Comunicação Interna</h2>
          <p>Recados entre profissionais. Demandas oficiais somente pelo Administrativo.</p></div>
        <button type="button" onClick={() => setNewOpen(v => !v)}>{newOpen ? 'Fechar' : 'Nova mensagem'}</button>
      </header>
      {feedback && <p className="capo-comm-feedback" role="status">{feedback}</p>}
      {newOpen && <div className="capo-comm-compose">
        <h3>Nova comunicação</h3>
        <label>Tipo
          <select value={kind} onChange={e => { setKind(e.target.value as typeof kind); setRecipientIds([]) }}>
            <option value="recado">Mensagem ou recado</option>
            {isAdmin && <option value="demanda_administrativa">Demanda oficial do Administrativo</option>}
          </select>
        </label>
        {!isAdmin && <p className="capo-comm-hint">Para solicitar providências ao Administrativo, utilize o módulo Solicitações. Mensagens entre profissionais não representam pedidos oficiais.</p>}
        <p className="capo-comm-hint">{kind === 'recado'
          ? 'Recados não geram solicitações nem autorizam mudanças de agenda.'
          : 'Somente o Administrativo pode direcionar uma demanda oficial; o destinatário registra resposta e o Administrativo conclui.'}</p>
        <fieldset><legend>Destinatários (respostas individuais)</legend>
          <div className="capo-comm-people">
            {recipients.filter(r => kind === 'recado' || r.can_receive_admin_demand).map(r => <label key={r.account_id}>
              <input type="checkbox" checked={recipientIds.includes(r.account_id)}
                onChange={e => setRecipientIds(ids => e.target.checked ? [...ids,r.account_id] : ids.filter(id=>id!==r.account_id))} />
              <span>{r.name} <small>· {r.function_title}</small></span>
            </label>)}
          </div>
          {!recipients.length && <p>Nenhum destinatário ativo disponível neste ambiente.</p>}
        </fieldset>
        <label>Assunto<input value={subject} maxLength={150} onChange={e => setSubject(e.target.value)} /></label>
        <label>Mensagem<textarea value={body} maxLength={2000} rows={3} onChange={e => setBody(e.target.value)} /></label>
        <label>Paciente vinculado (opcional)
          <input value={search} placeholder={patient?.full_name ?? 'Pesquisar paciente, se necessário'}
            onChange={e => { setSearch(e.target.value); setPatient(null) }} />
        </label>
        {patient && <button type="button" className="capo-comm-clear" onClick={() => { setPatient(null); setSearch('') }}>Paciente: {patient.full_name} · remover vínculo</button>}
        {patients.length > 0 && <div className="capo-comm-patients">{patients.map(p=>
          <button type="button" key={p.patient_id} onClick={() => { setPatient(p); setSearch(''); setPatients([]) }}>{p.full_name}{p.patient_number ? ' · '+p.patient_number : ''}</button>
        )}</div>}
        <button type="button" disabled={busy || !recipientIds.length} onClick={() => void send()}>{busy ? 'Enviando…' : 'Enviar comunicação'}</button>
      </div>}
      <nav className="capo-comm-tabs" aria-label="Caixas de comunicação">
        <button type="button" aria-current={view === 'recebidas' ? 'page' : undefined} onClick={() => { setView('recebidas'); setSelectedId('') }}>Recebidas {unread ? '· '+unread+' novas' : ''}</button>
        <button type="button" aria-current={view === 'enviadas' ? 'page' : undefined} onClick={() => { setView('enviadas'); setSelectedId('') }}>Enviadas</button>
        <button type="button" disabled={loading || busy} onClick={() => void reload().catch(e=>setFeedback(String(e)))}>Atualizar</button>
      </nav>
      {loading && <p>Carregando comunicações…</p>}
      <div className="capo-comm-layout">
        <div className="capo-comm-list" aria-label={view === 'recebidas' ? 'Mensagens recebidas' : 'Mensagens enviadas'}>
          {!loading && !inbox.length && <p>Nenhuma comunicação nesta caixa.</p>}
          {inbox.map(t => <button type="button" key={t.id} className={selectedId === t.id ? 'is-selected' : ''}
            onClick={() => { setSelectedId(t.id); setReply('') }}>
            <strong>{t.unread ? '● ' : ''}{t.subject}</strong>
            <span>{view === 'recebidas' ? t.sender_name : t.recipient_name}</span>
            <small>{t.kind === 'recado' ? 'Recado' : 'Demanda administrativa'} · {stamp(t.updated_at)}{t.kind !== 'recado' ? ' · '+t.status.replace('_',' ') : ''}</small>
          </button>)}
        </div>
        <article className="capo-comm-detail">
          {!selected ? <p>Selecione uma comunicação para ler e responder.</p> : <>
            <h3>{selected.subject}</h3>
            <p><strong>De:</strong> {selected.sender_name} · <strong>Para:</strong> {selected.recipient_name}</p>
            <p><strong>Tipo:</strong> {selected.kind === 'recado' ? 'Recado' : 'Demanda do Administrativo'}
              {selected.patient_name ? ' · Paciente: '+selected.patient_name : ''}</p>
            {selected.sender_id === myAccountId && <p><strong>Leitura pelo destinatário:</strong> {selected.recipient_read_at ? 'Visualizada em '+stamp(selected.recipient_read_at) : 'Aguardando leitura'}</p>}
            {selected.kind === 'demanda_administrativa' && <p><strong>Situação:</strong> {selected.status.replace('_',' ')}</p>}
            <div className="capo-comm-conversation">
              {selected.messages.map(m => <div key={m.id} className={m.author_id === myAccountId ? 'is-own' : ''}>
                <small>{m.author_id === myAccountId ? 'Você' : m.author_id === selected.sender_id ? selected.sender_name : selected.recipient_name} · {stamp(m.created_at)}</small>
                <p>{m.body}</p>
              </div>)}
            </div>
            <label>Responder<textarea value={reply} rows={3} maxLength={2000} onChange={e => setReply(e.target.value)} /></label>
            <div className="capo-comm-actions">
              <button type="button" disabled={busy || !reply.trim()} onClick={() => void act('responder')}>Enviar resposta</button>
              {selected.kind === 'demanda_administrativa' && selected.recipient_id === myAccountId && selected.status === 'pendente' &&
                <button type="button" disabled={busy} onClick={() => void act('iniciar')}>Iniciar atendimento da demanda</button>}
              {selected.kind === 'demanda_administrativa' && isAdmin && selected.sender_id === myAccountId && selected.status === 'respondida' &&
                <button type="button" disabled={busy} onClick={() => void act('concluir')}>Concluir demanda</button>}
            </div>
          </>}
        </article>
      </div>
    </section>
  )
}
