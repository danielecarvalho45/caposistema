import { canAccessAppRoute, type AppRoute } from '../../app/route-access'
import type { AccessContext } from '../../types/access'

// Base inicial, revisada contra Matriz Funcional e Documento Mestre de 26/11/2026.
// Orientações operacionais apenas; não inclui dados pessoais nem contratos privados.
export type HelpTopic = Readonly<{
  id: string; title: string; route: AppRoute; terms: string;
  steps: readonly string[]; source: string;
  roles?: readonly string[]; specialty?: string;
}>
const admin = ['administrador', 'administrativo_operacional']
const professional = ['profissional']
const matrix = 'Matriz Funcional de 12/09/2026'
const master = 'Documento Mestre de 26/11/2026'
export const helpTopics: readonly HelpTopic[] = [
  {id:'agenda-admin',title:'Agendar ou remarcar consulta',route:'/agenda',roles:admin,terms:'agenda agendamento marcar consulta remarcacao remarcar horario retorno',steps:['Abra a Agenda e selecione o profissional e a data.','Para agendar, escolha horário disponível e localize o paciente. Para remarcar, localize a consulta e utilize a ação de remarcação existente.','Confira os dados antes de concluir e siga a orientação de aviso apresentada pelo sistema.'],source:matrix+' §§6 e 8'},
  {id:'agenda-prof',title:'Iniciar atendimento e registrar retorno',route:'/agenda',roles:professional,terms:'presenca confirmado iniciar atendimento retorno falta paciente consulta',steps:['Na Minha Agenda, localize o atendimento.','Confirme a presença para iniciar o atendimento no contexto autorizado. Em caso de ausência, registre Falta, não presença.','Utilize as ações da especialidade e agende retorno quando necessário.'],source:matrix+' §§3–4'},
  {id:'transport-pdf',title:'Gerar PDF de Transporte',route:'/transporte',roles:admin,terms:'transporte pdf gerar documento confirmar solicitacao endereco embarque periodicidade assinatura',steps:['Localize a solicitação e confirme-a se estiver com status solicitado.','Confirme o endereço de embarque e a periodicidade. Se houver consulta vinculada, confira o endereço do atendimento.','Clique em Gerar PDF e depois Assinar PDF.','Se estiver em manuteste, confira se o paciente do protocolo corresponde ao selecionado no contexto de homologação.'],source:master+' — Transporte homologado'},
  {id:'transport-link',title:'Encaminhar documentos de Transporte',route:'/transporte',roles:admin,terms:'transporte link whatsapp gmail email enviar encaminhar documentos anexo',steps:['Após assinar o PDF, confira a documentação complementar.','Gere ou consulte o link e teste o acesso. O prazo é de 24 horas desde a emissão.','Selecione os canais institucionais cadastrados, confira a mensagem e envie manualmente.','Registre o encaminhamento somente após efetuar o envio.'],source:master+' — Transporte homologado'},
  {id:'transport-social',title:'Solicitar transporte pela Assistência Social',route:'/transporte',roles:professional,specialty:'Assistência Social',terms:'transporte justificativa solicitacao necessidade social',steps:['Localize o paciente autorizado.','Registre a necessidade e a justificativa da solicitação conforme os comandos disponíveis.','O Administrativo é responsável pelo processamento do PDF e encaminhamento externo.'],source:master+' — Transporte homologado'},
  {id:'group',title:'Agenda de grupos de Psicologia',route:'/agenda',roles:professional,specialty:'Psicologia',terms:'grupo psicologia arteterapia participante vaga presenca',steps:['Abra a agenda de Psicologia e localize a faixa de atendimento em grupo.','Confira participantes e vagas exibidos.','Use os controles do grupo para registrar a presença individual conforme disponíveis.'],source:master+' — grupos homologados em 26/11'},
  {id:'block',title:'Bloquear agenda com pacientes agendados',route:'/agenda',roles:admin,terms:'bloqueio bloquear agenda remanejar ferias afastamento',steps:['Na configuração da agenda, escolha o profissional e o período do bloqueio.','O período deve respeitar os dias de atendimento.','Se houver pacientes afetados, conclua o remanejamento antes de efetivar o bloqueio.'],source:master+' — bloqueios por período'},
  {id:'no-show',title:'Acompanhar pacientes faltosos',route:'/faltosos',roles:admin,terms:'faltosos falta ausencia remarcacao contato busca ativa',steps:['Abra Faltosos e localize a pendência.','Registre o contato e a providência conforme os controles existentes.','Quando necessário, utilize a ação de agendamento ou remarcação. Faltosos não é Busca Ativa.'],source:matrix+' §8.2'},
  {id:'requests',title:'Tratar solicitações recebidas',route:'/solicitacoes',roles:admin,terms:'solicitacao recebida aceite resolver concluir administrativo',steps:['Abra Solicitações e consulte as recebidas.','Aceite a solicitação quando aplicável e realize a providência.','Registre a resolução somente após concluir a atividade.'],source:matrix+' §8.3'},
  {id:'requests-prof',title:'Acompanhar solicitações profissionais',route:'/solicitacoes',roles:professional,terms:'solicitacao profissional administrativo resposta retorno aviso',steps:['Consulte as solicitações no contexto autorizado.','Informe a providência necessária usando os controles disponíveis.','Acompanhe os avisos de aceite e resolução pelo Administrativo.'],source:matrix+' §§4 e 8.3'},
  {id:'nutrition',title:'Planejamento alimentar',route:'/nutricao',roles:professional,specialty:'Nutrição',terms:'nutricao plano alimentar planejamento pdf dieta atendimento',steps:['Inicie o atendimento pela agenda e abra o planejamento alimentar no contexto do paciente.','Preencha ou atualize o planejamento e utilize os comandos de salvamento e geração de PDF disponíveis.','Se houver falha, não presuma que o documento foi salvo: confira a confirmação do sistema.'],source:matrix+' §10'},
  {id:'social',title:'Acompanhamento da Assistência Social',route:'/assistencia-social',roles:professional,specialty:'Assistência Social',terms:'social acompanhamento vulnerabilidade visita domiciliar atendimento',steps:['Confirme o atendimento na agenda e abra o contexto autorizado do paciente.','Utilize as ações de acompanhamento social pertinentes.','Registre providências, retorno e finalização conforme os controles disponíveis.'],source:matrix+' §9'},
  {id:'family',title:'Familiar cuidador',route:'/familiar-cuidador',roles:admin,terms:'familiar cuidador psicologia vinculo fila',steps:['Localize o paciente e o familiar vinculado.','Use o cadastro e a fila previstos para avaliação psicológica.','Respeite a regra de que o familiar não pode ser atendido pelo mesmo psicólogo que acompanha o paciente vinculado.'],source:master+' — familiar cuidador'},
  {id:'renewal',title:'Renovação de receita',route:'/receita',roles:admin,terms:'receita renovacao clinico medico medicamento',steps:['Abra a rotina de Renovação de Receita e localize a demanda.','Registre o pedido para o Clínico Geral conforme as ações disponíveis.','Acompanhe a conclusão antes de avisar o paciente.'],source:matrix+' §11.3'},
  {id:'report',title:'Relatórios de produção',route:'/relatorios',terms:'relatorio producao indicador periodo especialidade coordenacao',steps:['Abra Relatórios e selecione os filtros disponíveis ao seu perfil.','Confira o período e a especialidade antes de consultar ou exportar.','Os resultados devem representar somente os dados registrados e autorizados.'],source:matrix+' §5'},
  {id:'tech',title:'Acompanhar chamados técnicos',route:'/tecnica',roles:['administrador','administrador_tecnico'],terms:'ti manutencao chamado suporte tecnico painel historico',steps:['Abra o Painel Técnico e consulte os chamados.','Confira o histórico e a situação da ocorrência antes de realizar providências.','Respeite o fluxo de autorização, teste e feedback existente.'],source:master+' — quadro de manutenção'},
  {id:'coord',title:'Acompanhar a equipe e as agendas',route:'/coordenacao',roles:['administrador','coordenador'],terms:'coordenacao equipe agenda disponibilidade relatorio',steps:['Abra o painel da Coordenação.','Consulte a disponibilidade e as agendas da equipe nos controles autorizados.','O Administrativo operacionaliza agendamentos e remarcações.'],source:matrix+' §7'},
  {id:'notice',title:'Consultar notificações',route:'/notificacoes',terms:'notificacao aviso sininho lida resolvida',steps:['Abra as notificações e localize o aviso.','Confira a situação e o contexto autorizado antes de tomar providências.','Não confunda uma notificação com a solicitação operacional que a originou.'],source:master+' — notificações e solicitações'},
]
export function normalizeHelp(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').trim()
}
export function availableHelp(context: AccessContext) {
  return helpTopics.filter(t => canAccessAppRoute(context,t.route)
    && (!t.roles || context.roles.some(r=>t.roles!.includes(r.code)))
    && (!t.specialty || [context.primary_specialty_name,...(context.specialties ?? []).map(s=>s.specialty_name)].some(s=>normalizeHelp(s ?? '')===normalizeHelp(t.specialty!))))
}
const stop = new Set(['como','para','nao','consigo','estou','com','uma','que','qual','fazer','posso','meu','minha','problema','ajuda','esta','isso','quero','preciso'])
export function findHelp(context: AccessContext, route: string, query: string) {
  const terms = normalizeHelp(query).split(/\s+/).filter(t=>t.length>=3&&!stop.has(t))
  return availableHelp(context).map(topic=>{
    const words = normalizeHelp(topic.title+' '+topic.terms).split(/\s+/)
    const matches = terms.filter(term=>words.some(w=>w===term || (term.length>=5 && (w.startsWith(term)||term.startsWith(w))))).length
    return {topic,matches,score:matches*10+(topic.route===route?2:0)}
  }).filter(x=>!query.trim()||x.matches>0).sort((a,b)=>b.score-a.score).map(x=>x.topic)
}
