import { ActiveSearchPage } from './ActiveSearchPage'
import { Link } from 'react-router-dom'
import { GestorTeamPage } from './GestorTeamPage'
import { TechnicalSupportRequest } from '../../components/forms/TechnicalSupportRequest'
import { OperationalTimeline } from './OperationalTimeline'
import { AuditLogPage } from './AuditLogPage'
import type { AccessContext } from '../../types/access'

type ManagementView = 'equipe' | 'administracao' | 'timeline' | 'auditoria' | 'suporte' | 'fluxos' | 'busca-ativa'

const content: Record<ManagementView, Readonly<{ kicker: string; title: string; description: string }>> = {
  equipe: { kicker: 'Gestão do Serviço', title: 'Equipe e Agendas', description: 'Profissionais, especialidades, disponibilidade, agendas e situação de trabalho.' },
  administracao: { kicker: 'Administração do Sistema', title: 'Usuários e Contas', description: 'Cadastro de profissional, especialidades, agenda e permissões.' },
  timeline: { kicker: 'Governança e Gestão', title: 'Linha do Tempo Operacional', description: 'Sequência de eventos operacionais autorizados, distinta da auditoria.' },
  auditoria: { kicker: 'Governança e Gestão', title: 'Auditoria e Relatórios', description: 'Consulta de autoria, data/hora, alterações operacionais e indicadores.' },
  suporte: { kicker: 'Gestão do Serviço', title: 'Suporte', description: 'Solicitação e acompanhamento de suporte técnico.' },
  fluxos: { kicker: 'Atendimento e Acompanhamento', title: 'Fluxos e Acompanhamentos', description: 'Acompanhamento transversal dos fluxos autorizados do serviço.' },
  'busca-ativa': { kicker: 'Atendimento e Acompanhamento', title: 'Busca Ativa', description: 'Acompanhamento de pacientes com perda de seguimento.' },
}

export function GestorManagementPage({ view, accessContext }: Readonly<{ view: ManagementView; accessContext: AccessContext }>) {
  const page = content[view]
  if (view === 'equipe' || view === 'administracao') return <GestorTeamPage />
  if (view === 'timeline') return <OperationalTimeline />
  if (view === 'auditoria') return <AuditLogPage />
  if (view === 'busca-ativa') return <ActiveSearchPage accessContext={accessContext} />
  if (view === 'suporte') return <section className="gestor-route" aria-labelledby="support-title"><header><span>Gestão do Serviço</span><h2 id="support-title">Suporte</h2><p>Solicitação técnica registrada pelo backend CAPO.</p></header><article className="gestor-panel"><TechnicalSupportRequest affectedModule="gestor" /></article></section>
  return (
    <section className="gestor-route" aria-labelledby="gestor-route-title">
      <header><span>{page.kicker}</span><h2 id="gestor-route-title">{page.title}</h2><p>{page.description}</p></header>
      <article className="gestor-panel"><h3>Abrir módulos autorizados</h3><ul><li><Link to="/gestor/operacional">Pendências, familiares e entregas nutricionais</Link></li><li><Link to="/gestor/social">Acompanhamento Social</Link></li><li><Link to="/gestor/luto">Luto</Link></li><li><Link to="/gestor/familiares">Familiar / Cuidador</Link></li><li><Link to="/transporte">Transporte</Link></li><li><Link to="/encaminhamentos">Encaminhamentos</Link></li><li><Link to="/odontologia">Odontologia</Link></li><li><Link to="/receita">Renovação de Receita</Link></li></ul></article>
    </section>
  )
}