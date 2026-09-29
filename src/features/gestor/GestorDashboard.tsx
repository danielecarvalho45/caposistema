import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AsyncState, type AgendaAppointment, type BirthdayOverview } from '../../lib/supabase/rpc'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'


type AgendaChangeRow = Readonly<Record<string, unknown>>

function agendaChangeRows(value: unknown): readonly AgendaChangeRow[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is AgendaChangeRow =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item),
    )
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const source = value as Record<string, unknown>
  const list = [source.requests, source.items, source.rows, source.data].find(Array.isArray)
  return Array.isArray(list)
    ? list.filter(
        (item): item is AgendaChangeRow =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : []
}

function agendaChangeText(row: AgendaChangeRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return '—'
}

const quickAccess = [
  ['/pacientes', '👥', 'Pacientes', 'Cadastrar e consultar', 'blue'],
  ['/agenda', '▣', 'Agenda', 'Visualizar agendas', 'green'],
  ['/gestor/equipe?aba=agenda', '⏱', 'Ampliar horário', 'Abrir horário adicional na agenda', 'blue'],
  ['/fila', '≡', 'Filas', 'Pacientes e familiares', 'mint'],
  ['/faltosos', '◷', 'Faltosos', 'Acompanhar e remarcar', 'pink'],
  ['/solicitacoes', '▤', 'Solicitações', 'Analisar e encaminhar', 'purple'],
  ['/transporte', '▰', 'Transporte', 'Providências e acompanhamento', 'yellow'],
  ['/gestor/familiares', '♟', 'Familiares', 'Cadastro e vínculos', 'mint'],
  ['/encerramentos', '✓', 'Encerramentos', 'Por especialidade', 'slate'],
  ['/relatorios', '▥', 'Relatórios', 'Consultas e indicadores', 'violet'],
] as const

export function GestorDashboard() {
  const [agenda, setAgenda] = useState<AsyncState<readonly AgendaAppointment[]>>(loadingState)
  const [birthdays, setBirthdays] = useState<AsyncState<BirthdayOverview>>(loadingState)
  const [approvedAgendaChanges, setApprovedAgendaChanges] = useState<AsyncState<unknown>>(loadingState)
  const [agendaChangeBusyId, setAgendaChangeBusyId] = useState<string | null>(null)
  const [agendaChangeFeedback, setAgendaChangeFeedback] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const rpc = getRpcService()
    void rpc.getAgenda(date, date, null).then((result) => { if (active) setAgenda(result) })
    void rpc.getBirthdays().then((result) => { if (active) setBirthdays(result) })
    return () => { active = false }
  }, [])

  const reloadApprovedAgendaChanges = useCallback(async () => {
    setApprovedAgendaChanges(loadingState())
    setApprovedAgendaChanges(
      await getRpcService().getAgendaChangeRequests('aprovada', null, 50),
    )
  }, [])

  useEffect(() => {
    void reloadApprovedAgendaChanges()
  }, [reloadApprovedAgendaChanges])

  async function applyApprovedAgendaChange(requestId: string) {
    if (!requestId || agendaChangeBusyId) return
    setAgendaChangeBusyId(requestId)
    setAgendaChangeFeedback(null)
    const result = await getRpcService().applyAgendaChangeRequest(requestId)
    if (result.status !== 'success') {
      setAgendaChangeFeedback(
        result.status === 'error'
          ? result.error.message
          : 'O banco não confirmou a efetivação da alteração.',
      )
      setAgendaChangeBusyId(null)
      return
    }
    setAgendaChangeFeedback('Alteração de agenda efetivada e registrada pelo banco.')
    await reloadApprovedAgendaChanges()
    setAgendaChangeBusyId(null)
  }

  return (
    <section className="gestor-dashboard" aria-labelledby="gestor-dashboard-title">
      <h2 id="gestor-dashboard-title">Painel Geral do CAPO</h2>
      <section aria-labelledby="gestor-quick-title">
        <h3 id="gestor-quick-title">Acessos rápidos</h3>
        <div className="gestor-quick-grid">
          {quickAccess.map(([path, icon, title, note, tone]) => (
            <Link className={`gestor-quick-card gestor-quick-${tone}`} to={path} key={path}>
              <span aria-hidden="true">{icon}</span><strong>{title}</strong><small>{note}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="gestor-dashboard-grid" aria-label="Visão geral do sistema">
        <article className="gestor-panel"><header><h3>▣ Agenda do dia <em>— Todos os profissionais</em></h3></header>
          {agenda.status === 'loading' && <p>Carregando agenda…</p>}
          {agenda.status === 'error' && <p role="alert">{agenda.error.message}</p>}
          {agenda.status === 'empty' && <p>Nenhum agendamento encontrado.</p>}
          {agenda.status === 'success' && <ul>{agenda.data.map((item) => <li key={item.appointment_id}>{item.patient_name} · {item.professional_name} · {new Date(item.appointment_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</li>)}</ul>}
          <Link to="/agenda">Agenda geral do dia ›</Link>
        </article>
        <aside className="gestor-side-stack"><article className="gestor-panel"><h3>🎂 Aniversariantes de hoje</h3>
          {birthdays.status === 'loading' && <p>Carregando aniversariantes…</p>}
          {birthdays.status === 'error' && <p role="alert">{birthdays.error.message}</p>}
          {birthdays.status === 'empty' && <p>Nenhum aniversariante encontrado.</p>}
          {birthdays.status === 'success' && <><h4>Pacientes</h4><ul>{birthdays.data.patients.map((item) => <li key={item.patient_id}>{item.full_name}<PatientWhatsAppButton patientId={item.patient_id} message={`Olá, ${item.full_name}. 🎉 A equipe do CAPO deseja a você um feliz aniversário, com saúde, alegria e bons momentos. Receba nosso carinho e nossos melhores votos!`} /></li>)}</ul><h4>Equipe CAPO</h4><ul>{birthdays.data.team.map((item) => <li key={item.professional_id}>{item.full_name}</li>)}</ul></>}
        </article>
        <Link className="gestor-panel" to="/gestor/timeline"><h3>◷ Atividades Recentes</h3><p>Consultar os eventos operacionais registrados.</p></Link></aside>
      </section>
      <section className="gestor-summary-grid" aria-label="Resumo do sistema">
        <Link className="gestor-panel" to="/gestor/administracao"><h3>👥 Cadastro de Profissional</h3><p>Gerenciar profissionais e permissões</p><b>›</b></Link>
        <article className="gestor-panel gestor-approved-agenda-changes">
          <header>
            <div>
              <p className="eyebrow">Coordenação → Administrativo</p>
              <h3>Alterações estruturais aprovadas</h3>
              <p>Férias, mudanças permanentes de horário, turno, carga e outras alterações estruturais aguardando efetivação após anuência da Coordenação.</p>
            </div>
            <button type="button" disabled={approvedAgendaChanges.status === 'loading'} onClick={() => void reloadApprovedAgendaChanges()}>
              Atualizar solicitações
            </button>
          </header>
          {approvedAgendaChanges.status === 'loading' && <p>Carregando alterações aprovadas…</p>}
          {approvedAgendaChanges.status === 'error' && <p role="alert">{approvedAgendaChanges.error.message}</p>}
          {approvedAgendaChanges.status === 'empty' && <p>Nenhuma alteração estrutural aprovada aguarda efetivação.</p>}
          {approvedAgendaChanges.status === 'success' &&
            (agendaChangeRows(approvedAgendaChanges.data).length === 0 ? (
              <p>Nenhuma alteração estrutural aprovada aguarda efetivação.</p>
            ) : (
              <ul>
                {agendaChangeRows(approvedAgendaChanges.data).map((row, index) => {
                  const requestId = agendaChangeText(row, 'request_id', 'agenda_change_request_id')
                  return (
                    <li key={requestId + index}>
                      <div>
                        <strong>{agendaChangeText(row, 'professional_name', 'professional_id')}</strong>
                        <span> · {agendaChangeText(row, 'request_type', 'action_type', 'type')}</span>
                        <small> · {agendaChangeText(row, 'justification', 'reason', 'description')}</small>
                      </div>
                      <button type="button" disabled={requestId === '—' || agendaChangeBusyId === requestId} onClick={() => void applyApprovedAgendaChange(requestId)}>
                        {agendaChangeBusyId === requestId ? 'Efetivando…' : 'Efetivar alteração aprovada'}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ))}
          {agendaChangeFeedback && <p role="status">{agendaChangeFeedback}</p>}
        </article>
        <Link className="gestor-panel" to="/relatorios"><h3>▥ Indicadores do Sistema</h3><p>Consultar indicadores reais no relatório gerencial</p></Link>
        <Link className="gestor-panel" to="/tecnica"><h3>⚙ Status do Sistema</h3><p>Consultar estado técnico e integrações autorizadas.</p></Link>
      </section>
    </section>
  )
}