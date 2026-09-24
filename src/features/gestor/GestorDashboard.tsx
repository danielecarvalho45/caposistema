import { Link } from 'react-router-dom'

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
        <article className="gestor-panel"><header><h3>▣ Agenda do dia <em>— Todos os profissionais</em></h3><small>Visão geral diária</small></header><div className="gestor-table">Nenhum agendamento disponível.</div><Link to="/agenda">Agenda geral do dia ›</Link></article>
        <aside className="gestor-side-stack">
          <article className="gestor-panel"><h3>🎂 Aniversariantes de hoje</h3><div className="gestor-tabs"><span>Pacientes</span><span>Equipe CAPO</span></div><p>Nenhum aniversariante disponível.</p></article>
          <article className="gestor-panel"><h3>◷ Atividades Recentes</h3><p>Nenhuma atividade registrada.</p></article>
        </aside>
      </section>
      <section className="gestor-summary-grid" aria-label="Resumo do sistema">
        <Link className="gestor-panel" to="/gestor/administracao"><h3>👥 Cadastro de Profissional</h3><p>Gerenciar profissionais e permissões</p><b>›</b></Link>
        <Link className="gestor-panel" to="/gestor/auditoria"><h3>▥ Indicadores do Sistema</h3><div className="gestor-metrics"><span>—<small>Pacientes ativos</small></span><span>—<small>Consultas realizadas</small></span><span>—<small>Faltosos</small></span><span>—<small>Solicitações</small></span></div></Link>
        <Link className="gestor-panel" to="/tecnica"><h3>⚙ TI / Manutenção</h3><p>Área Técnica e suporte autorizado.</p></Link>
      </section>
    </section>
  )
}