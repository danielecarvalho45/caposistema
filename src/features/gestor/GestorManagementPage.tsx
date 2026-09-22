import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import type { AppRoute } from '../../app/route-access'
import { getRpcService } from '../../lib/supabase/rpc'

type ManagementView = 'equipe' | 'administracao' | 'timeline' | 'auditoria' | 'suporte' | 'fluxos' | 'busca-ativa'

type ManagementPage = Readonly<{
  kicker: string
  title: string
  description: string
  actions: readonly string[]
  modules: readonly [string, string][]
  flowModules?: readonly {
    icon: string
    title: string
    description: string
    route?: AppRoute
  }[]
}>

const content: Record<ManagementView, ManagementPage> = {
  equipe: {
    kicker: 'Gestão do Serviço',
    title: 'Coordenação do Sistema',
    description: 'Equipe, especialidades, disponibilidade, agendas e situação de trabalho.',
    actions: [],
    modules: [
      ['Painel da Coordenação do Sistema', 'Resumo gerencial da equipe, agendas, filas, pendências, indicadores e situações que exigem decisão.'],
      ['Equipe e cadastro', 'Nenhum profissional ou agenda disponível no contexto atual.'],
      ['Agendas da equipe', 'Consulta gerencial das agendas, disponibilidade, ocupação, bloqueios, alterações e impactos.'],
      ['Gestão de Agenda', 'Disponibilidade, férias, afastamentos, carga, turno, bloqueios, exceções e impactos.'],
      ['Relatórios e indicadores', 'Produção, serviço, agenda, absenteísmo, filas e demais dados reais do CAPO.'],
      ['Linha do Tempo Operacional', 'Sequência operacional completa autorizada, distinta da Auditoria.'],
      ['Auditoria Operacional', 'Eventos necessários à gestão, supervisão e rastreabilidade funcional.'],
      ['Suporte', 'Solicitar e acompanhar suporte técnico, sem receber ferramentas próprias de TI.'],
    ],
  },
  administracao: {
    kicker: 'Administração do Sistema',
    title: 'Usuários e Contas',
    description: 'Cadastro de profissional, especialidades, agenda e permissões.',
    actions: ['Cadastrar Profissional', 'Permissões', 'Administração do Sistema'],
    modules: [
      ['Cadastrar Profissional', 'O contrato de criação de profissional não está exposto no cliente React atual.'],
      ['Permissões', 'O Gestor/Titular é responsável por atribuir papéis e capacidades conforme a função aprovada.'],
    ],
  },
  timeline: {
    kicker: 'Governança e Gestão',
    title: 'Linha do Tempo Operacional',
    description: 'Sequência de eventos operacionais autorizados, distinta da auditoria.',
    actions: ['Todos', 'Agenda', 'Solicitações', 'Encaminhamentos'],
    modules: [['Atividades recentes', 'Nenhuma atividade registrada no período.']],
  },
  auditoria: {
    kicker: 'Governança e Gestão',
    title: 'Auditoria e Relatórios',
    description: 'Consulta de autoria, data/hora, alterações operacionais e indicadores.',
    actions: ['Indicadores', 'Auditoria', 'Exportação'],
    modules: [['Registros autorizados', 'Nenhum registro de auditoria disponível no contexto atual.']],
  },
  suporte: {
    kicker: 'Gestão do Serviço',
    title: 'Suporte',
    description: 'Solicitação e acompanhamento de suporte técnico.',
    actions: ['Abrir chamado', 'Chamados ativos', 'Histórico'],
    modules: [['Chamados de suporte', 'Nenhum chamado disponível no contexto atual.']],
  },
  fluxos: {
    kicker: 'Atendimento e Acompanhamento',
    title: 'Fluxos e Acompanhamentos',
    description: 'Acompanhamento transversal dos fluxos autorizados do serviço.',
    actions: ['Todos os fluxos', 'Ativos', 'Encerrados'],
    modules: [
      ['Acompanhamento Social', 'Visão operacional autorizada; conteúdo profissional permanece protegido.'],
      ['Familiar / Cuidador', 'Vínculo ativo, histórico e providências administrativas.'],
      ['Nutrição', 'Consulta operacional e documentos permitidos, sem edição profissional pelo Gestor.'],
      ['Encaminhamentos', 'Recebidos e enviados conforme autorização.'],
      ['Transporte', 'Solicitação, documento e acompanhamento conforme competência vigente.'],
      ['Odontologia', 'Providência administrativa; autoria do documento permanece profissional.'],
    ],
    flowModules: [
      { icon: '♡', title: 'Acompanhamento Social', description: 'Visão operacional autorizada; conteúdo profissional permanece protegido.', route: '/assistencia-social' },
      { icon: '◌', title: 'Luto', description: 'Continuidade autorizada do familiar/cuidador preservando histórico.', route: '/luto' },
      { icon: '♧', title: 'Familiar / Cuidador', description: 'Vínculo ativo, histórico e providências administrativas.', route: '/familiar-cuidador' },
      { icon: '✚', title: 'Nutrição', description: 'Consulta operacional e documentos permitidos, sem edição profissional pelo Gestor.', route: '/nutricao' },
      { icon: '↗', title: 'Encaminhamentos', description: 'Recebidos e enviados.', route: '/encaminhamentos' },
      { icon: '⇄', title: 'Transporte', description: 'Solicitação, documento e acompanhamento conforme competência vigente.', route: '/transporte' },
      { icon: '◌', title: 'Odontologia', description: 'Providência administrativa; autoria do documento permanece profissional.', route: '/odontologia' },
      { icon: '▣', title: 'Renovação de Receita', description: 'Fluxo Administrativo → Clínico Geral → retorno operacional.', route: '/receita' },
    ],
  },
  'busca-ativa': {
    kicker: 'Atendimento e Acompanhamento',
    title: 'Busca Ativa',
    description: 'Fila própria para reengajar pacientes que pertenciam ao CAPO e perderam seguimento.',
    actions: ['Fila de Busca Ativa', 'Tentativas de contato', 'Histórico'],
    modules: [
      ['Fila de Busca Ativa', 'Nenhum acompanhamento de busca ativa encontrado.'],
      ['Tentativa de contato', 'Selecione um acompanhamento para registrar uma providência.'],
    ],
  },
}

const coordinationRouteByTitle: Readonly<Record<string, AppRoute>> = {
  'Equipe e cadastro': '/gestor/equipe',
  'Agendas da equipe': '/agenda',
  'Pacientes em acompanhamento': '/pacientes',
  'Faltosos — visão gerencial': '/faltosos',
  'Busca Ativa — visão gerencial': '/gestor/busca-ativa',
  'Solicitações — visão gerencial': '/solicitacoes',
  'Relatórios e indicadores': '/relatorios',
  'Linha do Tempo Operacional': '/gestor/timeline',
  'Auditoria Operacional': '/gestor/auditoria',
  Suporte: '/gestor/suporte',
}

export function GestorManagementPage({ view }: Readonly<{ view: ManagementView }>) {
  const page = content[view]
  const [professionalForm, setProfessionalForm] = useState({
    name: '',
    birthDate: '',
    phone: '',
    username: '',
    recoveryEmail: '',
    functionTitle: '',
    registration: '',
    responsibility: '',
    specialty: '',
    agendaStart: '',
    agendaEnd: '',
    hourStart: '',
    hourEnd: '',
    days: '',
  })
  const [professionalFeedback, setProfessionalFeedback] = useState<string | null>(null)
  const [agendaConfigId, setAgendaConfigId] = useState('')
  const [agendaProfessionalId, setAgendaProfessionalId] = useState('')
  const [agendaProfessionals, setAgendaProfessionals] = useState<readonly { id: string; name: string }[]>([])
  const [blockForm, setBlockForm] = useState({ date: '', start: '', end: '', type: '', description: '', weekday: '0', instructions: '', overlap: false, affected: false })
  const [exceptionForm, setExceptionForm] = useState({ date: '', start: '', end: '', type: '', description: '', conflict: false })
  const [agendaStructureFeedback, setAgendaStructureFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (view !== 'equipe') return
    void getRpcService().getSchedulingCatalog().then((result) => {
      if (result.status !== 'success') return
      const value = result.data
      const rows = Array.isArray(value)
        ? value
        : typeof value === 'object' && value !== null && Array.isArray((value as { professionals?: unknown[] }).professionals)
          ? (value as { professionals: unknown[] }).professionals
          : []
      setAgendaProfessionals(
        rows.flatMap((item) => {
          if (typeof item !== 'object' || item === null) return []
          const row = item as Record<string, unknown>
          const id = row.professional_id ?? row.id
          const name = row.professional_name ?? row.full_name ?? row.name
          return typeof id === 'string' && typeof name === 'string' ? [{ id, name }] : []
        }),
      )
    })
  }, [view])

  async function selectAgendaProfessional(professionalId: string) {
    setAgendaProfessionalId(professionalId)
    setAgendaConfigId('')
    if (!professionalId) return
    const result = await getRpcService().getAgendaConfiguration(professionalId)
    if (result.status !== 'success') {
      setAgendaStructureFeedback(result.status === 'error' ? result.error.message : 'Configuração de agenda não encontrada.')
      return
    }
    const value = result.data
    const row = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
    const configId = row.agenda_config_id ?? row.config_id ?? row.id
    if (typeof configId === 'string') setAgendaConfigId(configId)
    else setAgendaStructureFeedback('A configuração real da agenda não retornou identificador.')
  }

  function updateProfessionalField(field: keyof typeof professionalForm, value: string) {
    setProfessionalForm((current) => ({ ...current, [field]: value }))
  }

  function validateProfessionalForm() {
    const required = [
      professionalForm.name,
      professionalForm.birthDate,
      professionalForm.username,
      professionalForm.recoveryEmail,
      professionalForm.functionTitle,
    ]
    setProfessionalFeedback(
      required.every((value) => value.trim())
        ? 'Dados obrigatórios conferidos. A gravação depende do contrato oficial de criação de profissional.'
        : 'Preencha nome, nascimento, usuário, e-mail de recuperação e função.',
    )
  }

  const professionalField = (
    field: keyof typeof professionalForm,
    label: string,
    type = 'text',
    required = false,
  ) => (
    <label>
      {label}{required ? ' *' : ''}
      <input
        type={type}
        value={professionalForm[field]}
        required={required}
        onChange={(event) => updateProfessionalField(field, event.target.value)}
      />
    </label>
  )

  async function saveBlock() {
    if (!agendaConfigId || !blockForm.date || !blockForm.start || !blockForm.end || !blockForm.type || !blockForm.description || !blockForm.overlap || !blockForm.affected) {
      setAgendaStructureFeedback('Informe a configuração real da agenda, os campos do bloqueio e confirme sobreposição/impactados.')
      return
    }
    const result = await getRpcService().createAgendaBlock({
      agendaConfigId,
      weekday: Number(blockForm.weekday),
      specificDate: blockForm.date,
      startTime: blockForm.start,
      endTime: blockForm.end,
      blockType: blockForm.type,
      description: blockForm.description,
      confirmOverlap: blockForm.overlap,
      confirmAffected: blockForm.affected,
      rescheduleInstructions: blockForm.instructions,
    })
    if (result.status === 'success') {
      await getRpcService().getAgendaConfiguration(agendaProfessionalId)
      const today = new Date().toISOString().slice(0, 10)
      await getRpcService().getAgenda(today, today, agendaProfessionalId)
      setAgendaStructureFeedback('Bloqueio salvo pelo banco. Configuração e agenda recarregadas.')
    } else setAgendaStructureFeedback(result.status === 'error' ? result.error.message : 'Bloqueio não retornou confirmação.')
  }

  async function saveException() {
    if (!agendaConfigId || !exceptionForm.date || !exceptionForm.start || !exceptionForm.end || !exceptionForm.type || !exceptionForm.description || !exceptionForm.conflict) {
      setAgendaStructureFeedback('Informe a configuração real da agenda, os campos da exceção e confirme o conflito.')
      return
    }
    const result = await getRpcService().createAgendaException({
      agendaConfigId,
      exceptionDate: exceptionForm.date,
      exceptionType: exceptionForm.type,
      startTime: exceptionForm.start,
      endTime: exceptionForm.end,
      description: exceptionForm.description,
      confirmConflict: exceptionForm.conflict,
    })
    if (result.status === 'success') {
      await getRpcService().getAgendaConfiguration(agendaProfessionalId)
      const today = new Date().toISOString().slice(0, 10)
      await getRpcService().getAgenda(today, today, agendaProfessionalId)
      setAgendaStructureFeedback('Exceção salva pelo banco. Configuração e agenda recarregadas.')
    } else setAgendaStructureFeedback(result.status === 'error' ? result.error.message : 'Exceção não retornou confirmação.')
  }

  return (
    <section className="gestor-route" aria-labelledby="gestor-route-title">
      <header className="gestor-route-head"><span>{page.kicker}</span><h2 id="gestor-route-title">{page.title}</h2><p>{page.description}</p></header>
      {page.actions.length > 0 && (
        <div className="gestor-action-tabs" role="tablist" aria-label={`Seções de ${page.title}`}>
          {page.actions.map((action, index) => <button type="button" role="tab" aria-selected={index === 0} key={action}>{action}</button>)}
        </div>
      )}
      {view === 'equipe' ? (
        <div className="gestor-agenda-structure">
          <article className="gestor-panel">
            <h3>Agenda profissional</h3>
            <select value={agendaProfessionalId} onChange={(event) => void selectAgendaProfessional(event.target.value)}>
              <option value="">Selecionar profissional real</option>
              {agendaProfessionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
            </select>
            <p className="gestor-work-note">A configuração da agenda é carregada automaticamente pelo banco. O identificador técnico não é exibido.</p>
          </article>
          <article className="gestor-panel">
            <h3>Bloqueio de agenda</h3>
            <div className="gestor-professional-form">
              <input type="date" value={blockForm.date} onChange={(event) => setBlockForm({...blockForm,date:event.target.value})} />
              <input type="time" value={blockForm.start} onChange={(event) => setBlockForm({...blockForm,start:event.target.value})} />
              <input type="time" value={blockForm.end} onChange={(event) => setBlockForm({...blockForm,end:event.target.value})} />
              <input placeholder="Tipo do bloqueio" value={blockForm.type} onChange={(event) => setBlockForm({...blockForm,type:event.target.value})} />
              <textarea placeholder="Descrição" value={blockForm.description} onChange={(event) => setBlockForm({...blockForm,description:event.target.value})} />
              <textarea placeholder="Instruções de remarcação" value={blockForm.instructions} onChange={(event) => setBlockForm({...blockForm,instructions:event.target.value})} />
            </div>
            <label><input type="checkbox" checked={blockForm.overlap} onChange={(event) => setBlockForm({...blockForm,overlap:event.target.checked})} /> Confirmo sobreposição</label>
            <label><input type="checkbox" checked={blockForm.affected} onChange={(event) => setBlockForm({...blockForm,affected:event.target.checked})} /> Confirmo profissionais/pacientes impactados</label>
            <button type="button" onClick={() => void saveBlock()}>Salvar bloqueio</button>
          </article>
          <article className="gestor-panel">
            <h3>Exceção de agenda</h3>
            <div className="gestor-professional-form">
              <input type="date" value={exceptionForm.date} onChange={(event) => setExceptionForm({...exceptionForm,date:event.target.value})} />
              <input type="time" value={exceptionForm.start} onChange={(event) => setExceptionForm({...exceptionForm,start:event.target.value})} />
              <input type="time" value={exceptionForm.end} onChange={(event) => setExceptionForm({...exceptionForm,end:event.target.value})} />
              <input placeholder="Tipo da exceção" value={exceptionForm.type} onChange={(event) => setExceptionForm({...exceptionForm,type:event.target.value})} />
              <textarea placeholder="Descrição" value={exceptionForm.description} onChange={(event) => setExceptionForm({...exceptionForm,description:event.target.value})} />
            </div>
            <label><input type="checkbox" checked={exceptionForm.conflict} onChange={(event) => setExceptionForm({...exceptionForm,conflict:event.target.checked})} /> Confirmo conflitos</label>
            <button type="button" onClick={() => void saveException()}>Salvar exceção</button>
          </article>
          {agendaStructureFeedback && <p className="gestor-inline-feedback" role="status">{agendaStructureFeedback}</p>}
        </div>
      ) : view === 'administracao' ? (
        <div className="gestor-professional-registration">
          <article className="gestor-panel">
            <h3>Cadastrar Profissional</h3>
            <p className="gestor-work-note">Novo profissional → cadastro → função/especialidade → permissões → agenda.</p>
            <div className="gestor-professional-form">
              {professionalField('name', 'Nome completo', 'text', true)}
              {professionalField('birthDate', 'Data de nascimento', 'date', true)}
              {professionalField('phone', 'Telefone')}
              {professionalField('username', 'Usuário de acesso', 'text', true)}
              {professionalField('recoveryEmail', 'E-mail de recuperação', 'email', true)}
              {professionalField('functionTitle', 'Função no CAPO', 'text', true)}
              {professionalField('registration', 'Registro profissional')}
              {professionalField('responsibility', 'Responsabilidade administrativa')}
              {professionalField('specialty', 'Especialidade(s)')}
            </div>
          </article>
          <article className="gestor-panel">
            <h3>Agenda e disponibilidade</h3>
            <div className="gestor-professional-form">
              {professionalField('agendaStart', 'Vigência inicial', 'date')}
              {professionalField('agendaEnd', 'Vigência final', 'date')}
              {professionalField('hourStart', 'Horário inicial', 'time')}
              {professionalField('hourEnd', 'Horário final', 'time')}
              {professionalField('days', 'Dias de atendimento')}
            </div>
            {professionalFeedback && <p className="gestor-inline-feedback" role="status">{professionalFeedback}</p>}
            <button type="button" onClick={validateProfessionalForm}>Validar cadastro</button>
            <p className="gestor-work-note">O cadastro será gravado somente quando o contrato oficial de criação de profissional estiver disponível na camada RPC.</p>
          </article>
          <article className="gestor-panel">
            <h3>Papéis, capacidades e permissões</h3>
            <p className="gestor-work-note"><strong>Estrutura do projeto:</strong> a função, a especialidade e as permissões compõem o cadastro; o backend resolve o contexto principal.</p>
            <div className="gestor-capability-list">
              <label><input type="checkbox" /> Profissional assistencial</label>
              <label><input type="checkbox" /> Especialidade principal definida</label>
              <label><input type="checkbox" /> Rotina administrativa operacional</label>
              <label><input type="checkbox" /> Administração do Sistema</label>
              <label><input type="checkbox" /> Coordenação</label>
              <label><input type="checkbox" /> TI / Manutenção</label>
              <label><input type="checkbox" /> Capacidade de encaminhamento</label>
            </div>
          </article>
        </div>
      ) : view === 'fluxos' && page.flowModules ? (
        <div className="gestor-management-grid gestor-flow-grid">
          {page.flowModules.map((module) => {
            const content = <><span className="gestor-flow-icon" aria-hidden="true">{module.icon}</span><h3>{module.title}</h3><p>{module.description}</p><span className="gestor-empty-label">Abrir módulo</span></>
            return module.route ? <Link className="gestor-panel gestor-module-card gestor-flow-card" to={module.route} key={module.title}>{content}</Link> : <article className="gestor-panel gestor-module-card gestor-flow-card" key={module.title}>{content}</article>
          })}
        </div>
      ) : (
        <div className={`gestor-management-grid${page.modules.length > 2 ? ' is-dense' : ''}`}>
          {page.modules.map(([title, description]) => {
            const content = <><h3>{title}</h3><p>{description}</p><span className="gestor-empty-label">Nenhum registro real encontrado.</span></>
            return <article className="gestor-panel gestor-module-card" key={title}>{content}</article>
          })}
        </div>
      )}
    </section>
  )
}
