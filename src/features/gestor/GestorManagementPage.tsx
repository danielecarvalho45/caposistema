import { ActiveSearchPage } from './ActiveSearchPage'
import { Link, useLocation } from 'react-router-dom'
import { GestorTeamPage } from './GestorTeamPage'
import { OperationalTimeline } from './OperationalTimeline'
import { AuditLogPage } from './AuditLogPage'
import type { AccessContext } from '../../types/access'

type ManagementView = 'equipe' | 'administracao' | 'timeline' | 'auditoria' | 'suporte' | 'fluxos' | 'busca-ativa'

const content: Record<ManagementView, Readonly<{ kicker: string; title: string; description: string }>> = {
  equipe: { kicker: 'Gestão do Serviço', title: 'Equipe e Agendas', description: 'Profissionais, especialidades, disponibilidade, agendas e situação de trabalho.' },
  administracao: { kicker: 'Administração do Sistema', title: 'Usuários e Contas', description: 'Cadastro de profissional, especialidades, agenda e permissões.' },
  timeline: { kicker: 'Governança e Gestão', title: 'Histórico Operacional do Paciente', description: 'Eventos administrativos e operacionais do paciente no CAPO.' },
  auditoria: { kicker: 'Governança e Gestão', title: 'Auditoria e Relatórios', description: 'Consulta de autoria, data/hora, alterações operacionais e indicadores.' },
  suporte: { kicker: 'Gestão do Serviço', title: 'Suporte', description: 'Solicitação e acompanhamento de suporte técnico.' },
  fluxos: { kicker: 'Atendimento e Acompanhamento', title: 'Fluxos e Acompanhamentos', description: 'Acompanhamento transversal dos fluxos autorizados do serviço.' },
  'busca-ativa': { kicker: 'Atendimento e Acompanhamento', title: 'Busca Ativa', description: 'Acompanhamento de pacientes com perda de seguimento.' },
}

export function GestorManagementPage({ view, accessContext }: Readonly<{ view: ManagementView; accessContext: AccessContext }>) {
  const page = content[view]
  const location = useLocation()
  const initialTeamTab = new URLSearchParams(location.search).get('aba') === 'agenda' ? 'agenda' : 'cadastro'
  if (view === 'equipe') return <GestorTeamPage mode="equipe" initialTab={initialTeamTab} />
  if (view === 'administracao') return <GestorTeamPage mode="administracao" />
  if (view === 'timeline') return <OperationalTimeline />
  if (view === 'auditoria') return <AuditLogPage />
  if (view === 'busca-ativa') return <ActiveSearchPage accessContext={accessContext} />
  if (view === 'suporte') return <section className="gestor-route" aria-labelledby="support-title"><header><span>Gestão do Serviço</span><h2 id="support-title">Suporte</h2><p>Consulte e acompanhe solicitações de suporte do CAPO.</p></header><article className="gestor-panel"><Link to="/tecnica">Abrir Área Técnica e chamados de suporte</Link></article></section>
  const flowShortcuts = [
    { to: '/gestor/operacional', icon: '▤', label: 'Pendências e Operacional', detail: 'Pendências, familiares e entregas nutricionais' },
    { to: '/gestor/social', icon: '❤', label: 'Acompanhamento Social', detail: 'Fluxo social autorizado' },
    { to: '/gestor/luto', icon: '✿', label: 'Luto', detail: 'Acompanhamento de familiares e cuidadores' },
    { to: '/gestor/familiares', icon: '♡', label: 'Familiar / Cuidador', detail: 'Vínculos e acompanhamento' },
    { to: '/transporte', icon: '↗', label: 'Transporte', detail: 'Solicitações e acompanhamento' },
    { to: '/encaminhamentos', icon: '⇢', label: 'Encaminhamentos', detail: 'Recebidos e enviados' },
    { to: '/odontologia', icon: '⚕', label: 'Odontologia', detail: 'Fluxo odontológico' },
    { to: '/receita', icon: '✚', label: 'Renovação de Receita', detail: 'Solicitações e acompanhamento' },
  ] as const

  return (
    <section className="gestor-route" aria-labelledby="gestor-route-title">
      <header><span>{page.kicker}</span><h2 id="gestor-route-title">{page.title}</h2><p>{page.description}</p></header>
      <article className="gestor-panel">
        <h3>Abrir módulos autorizados</h3>
        <nav className="gestor-flow-shortcuts" aria-label="Fluxos e acompanhamentos">
          {flowShortcuts.map((item) => (
            <Link className="gestor-flow-shortcut" key={item.to} to={item.to}>
              <span className="gestor-flow-shortcut-icon" aria-hidden="true">{item.icon}</span>
              <strong>{item.label}</strong>
              <small>{item.detail}</small>
            </Link>
          ))}
        </nav>
      </article>
    </section>
  )
}
