import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AsyncState, type AgendaAppointment, type BirthdayOverview } from '../../lib/supabase/rpc'

const quickAccess = [
  ['/pacientes', '👥', 'Pacientes', 'Cadastrar e consultar', 'blue'],
  ['/agenda', '▣', 'Agenda', 'Visualizar agendas', 'green'],
  ['/faltosos', '◷', 'Faltosos', 'Acompanhar e remarcar', 'pink'],
  ['/solicitacoes', '▤', 'Solicitações', 'Analisar e encaminhar', 'purple'],
  ['/transporte', '▰', 'Transporte', 'Providências e acompanhamento', 'yellow'],
  ['/gestor/equipe', '♟', 'Equipe e Agendas', 'Profissionais e disponibilidade', 'mint'],
  ['/encerramentos', '✓', 'Encerramentos', 'Por especialidade', 'slate'],
  ['/gestor/auditoria', '▥', 'Auditoria e Relatórios', 'Consultas e indicadores', 'violet'],
] as const

export function GestorDashboard() {
  const [agenda, setAgenda] = useState<AsyncState<readonly AgendaAppointment[]>>(loadingState)
  const [birthdays, setBirthdays] = useState<AsyncState<BirthdayOverview>>(loadingState)
  useEffect(() => {
    let active = true
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const rpc = getRpcService()
    void rpc.getAgenda(date, date, null).then((result) => { if (active) setAgenda(result) })
    void rpc.getBirthdays().then((result) => { if (active) setBirthdays(result) })
    return () => { active = false }
  }, [])
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
          {birthdays.status === 'success' && <><h4>Pacientes</h4><ul>{birthdays.data.patients.map((item) => <li key={item.patient_id}>{item.full_name}</li>)}</ul><h4>Equipe CAPO</h4><ul>{birthdays.data.team.map((item) => <li key={item.professional_id}>{item.full_name}</li>)}</ul></>}
        </article></aside>
      </section>
      <section className="gestor-summary-grid" aria-label="Resumo do sistema">
        <Link className="gestor-panel" to="/gestor/administracao"><h3>👥 Cadastro de Profissional</h3><p>Gerenciar profissionais e permissões</p><b>›</b></Link>
        <Link className="gestor-panel" to="/relatorios"><h3>▥ Indicadores do Sistema</h3><p>Consultar indicadores reais no relatório gerencial</p></Link>
        <Link className="gestor-panel" to="/tecnica"><h3>⚙ TI / Manutenção</h3><p>Área Técnica e suporte autorizado.</p></Link>
      </section>
    </section>
  )
}