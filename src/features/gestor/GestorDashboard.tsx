import { Link } from 'react-router-dom'

const quickAccess = [
  ['/pacientes', '👥', 'Pacientes', 'Cadastrar e consultar', 'blue'],
  ['/agenda', '▣', 'Agenda', 'Visualizar agendas', 'green'],
  ['/faltosos', '◷', 'Faltosos', 'Acompanhar e remarcar', 'pink'],
  ['/solicitacoes', '▤', 'Solicitações', 'Analisar e encaminhar', 'purple'],
  ['/transporte', '▰', 'Transporte', 'Providências e acompanhamento', 'yellow'],
  ['/familiar-cuidador', '♟', 'Familiares', 'Cadastro e vínculos', 'mint'],
  ['/encerramentos', '✓', 'Encerramentos', 'Por especialidade', 'slate'],
  ['/relatorios', '▥', 'Relatórios', 'Consultas e indicadores', 'violet'],
] as const

export function GestorDashboard() {
  return (
    <section className="gestor-dashboard" aria-labelledby="gestor-dashboard-title">
      <section className="gestor-welcome" aria-label="Boas-vindas">
        <div>
          <h1>Olá, seja bem-vinda ao CAPO.</h1>
          <p>Tenha um ótimo dia de trabalho.</p>
        </div>
        <div className="gestor-slogan" aria-label="Mensagem institucional">
          <span>Cuidar hoje.</span>
          <strong>Mais possibilidades amanhã.</strong>
        </div>
      </section>
      <section aria-labelledby="gestor-quick-title">
        <h2 id="gestor-quick-title">Acessos rápidos</h2>
        <div className="gestor-quick-grid">
          {quickAccess.map(([path, icon, title, note, tone]) => (
            <Link className={`gestor-quick-card gestor-quick-${tone}`} to={path} key={path}>
              <span aria-hidden="true">{icon}</span><strong>{title}</strong><small>{note}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="gestor-dashboard-grid" aria-label="Visão geral do sistema">
        <article className="gestor-panel"><header><h2>▣ <span>Agenda do dia</span> <em>— Todos os profissionais</em></h2><small>Visão geral diária</small></header><div className="gestor-table">Nenhum agendamento disponível.</div><Link to="/agenda">Agenda geral do dia <span aria-hidden="true">›</span></Link></article>
        <aside className="gestor-side-stack">
          <article className="gestor-panel"><header><h2>🎂 <span>Aniversariantes de hoje</span></h2></header><div className="gestor-tabs"><span>Pacientes</span><span>Equipe CAPO</span></div><p className="gestor-empty-state">Nenhum aniversariante disponível entre os pacientes.</p></article>
          <article className="gestor-panel"><header><h2>◷ <span>Atividades Recentes</span></h2></header><p className="gestor-empty-state">Nenhuma atividade registrada.</p></article>
        </aside>
      </section>
      <section className="gestor-summary-grid" aria-label="Resumo do sistema">
        <article className="gestor-panel gestor-register-card"><header><h2>👥 <span>Cadastro de Profissional</span></h2></header><p>Gerenciar profissionais e permissões</p><b>›</b></article>
        <Link className="gestor-panel" to="/relatorios"><header><h2>▥ <span>Indicadores do Sistema</span></h2></header><div className="gestor-metrics"><span>—<small>Pacientes ativos</small></span><span>—<small>Consultas realizadas</small></span><span>—<small>Faltosos</small></span><span>—<small>Solicitações em andamento</small></span></div></Link>
        <Link className="gestor-panel" to="/tecnica"><header><h2>⚙ <span>Status do Sistema</span></h2></header><div className="gestor-system-status"><span /> <strong>—</strong></div><small>Nenhum estado técnico registrado.</small></Link>
      </section>
    </section>
  )
}