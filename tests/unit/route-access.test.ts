import { describe, expect, it } from 'vitest'
import { canAccessAppRoute, isKnownAppRoute } from '../../src/app/route-access'
import type { AccessContext } from '../../src/types/access'

const context: AccessContext = {
  user_account_id: 'account-id',
  username: 'usuario.capo',
  is_active: true,
  recovery_email: null,
  professional_id: null,
  full_name: 'Usuário autorizado',
  function_title: null,
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'administrativo_operacional', name: 'AO' }],
  capabilities: [],
  primary_context: {
    role_id: 'role-id',
    code: 'administrativo_operacional',
    name: 'AO',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: null,
    full_name: 'Usuário autorizado',
    function_title: null,
    roles: [{ code: 'administrativo_operacional', name: 'AO' }],
    primary_context: {
      role_id: 'role-id',
      code: 'administrativo_operacional',
      name: 'AO',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

describe('route access', () => {
  it('reconhece somente as rotas centrais registradas', () => {
    expect(isKnownAppRoute('/pacientes')).toBe(true)
    expect(isKnownAppRoute('/odontologia')).toBe(true)
    expect(isKnownAppRoute('/notificacoes')).toBe(true)
    expect(isKnownAppRoute('/rota-inexistente')).toBe(false)
  })

  it('mantém o escopo administrativo operacional', () => {
    expect(canAccessAppRoute(context, '/agenda')).toBe(true)
    expect(canAccessAppRoute(context, '/fila')).toBe(true)
    expect(canAccessAppRoute(context, '/faltosos')).toBe(true)
    expect(canAccessAppRoute(context, '/tecnica')).toBe(false)
    expect(canAccessAppRoute(context, '/notificacoes')).toBe(true)
  })

  it('autoriza módulos específicos somente pelas capabilities vigentes', () => {
    const authorized = {
      ...context,
      capabilities: [
        'preencher_solicitacao_transporte',
        'renovacao_receita',
        'emitir_encaminhamento_odontologico_externo',
      ],
    }

    expect(canAccessAppRoute(authorized, '/transporte')).toBe(true)
    expect(canAccessAppRoute(authorized, '/receita')).toBe(true)
    expect(canAccessAppRoute(authorized, '/odontologia')).toBe(true)
    expect(canAccessAppRoute(context, '/odontologia')).toBe(false)
  })

  it('exige vínculo profissional para atuação e relatórios', () => {
    const professional = {
      ...context,
      professional_id: 'professional-id',
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: {
        ...context.primary_context,
        code: 'profissional',
        name: 'Profissional',
      },
    }

    expect(canAccessAppRoute(professional, '/atuacao')).toBe(true)
    expect(canAccessAppRoute(professional, '/relatorios')).toBe(true)
    expect(canAccessAppRoute(context, '/atuacao')).toBe(false)
  })

  it('reconhece o perfil profissional da Nutrição e a rota específica', () => {
    const nutritionProfessional = {
      ...context,
      professional_id: 'nutrition-professional-id',
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: {
        ...context.primary_context,
        code: 'profissional',
        name: 'Profissional',
      },
    }

    expect(isKnownAppRoute('/nutricao')).toBe(true)
    expect(canAccessAppRoute(nutritionProfessional, '/nutricao')).toBe(true)
    expect(canAccessAppRoute({ ...nutritionProfessional, roles: [{ code: 'nutricao', name: 'Nutrição' }] }, '/nutricao')).toBe(false)
    expect(canAccessAppRoute(context, '/nutricao')).toBe(false)
  })

  it('restringe Assistência Social ao contexto profissional ativo real', () => {
    const professionalSocial = {
      ...context,
      professional_id: 'professional-id',
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: {
        ...context.primary_context,
        code: 'profissional',
        name: 'Profissional',
      },
    }
    const socialAppRole = {
      ...context,
      roles: [{ code: 'assistencia_social', name: 'Assistência Social' }],
      primary_context: {
        ...context.primary_context,
        code: 'assistencia_social',
        name: 'Assistência Social',
      },
    }

    expect(canAccessAppRoute(professionalSocial, '/assistencia-social')).toBe(
      true,
    )
    expect(canAccessAppRoute(context, '/assistencia-social')).toBe(false)
    expect(canAccessAppRoute(socialAppRole, '/assistencia-social')).toBe(false)
    expect(canAccessAppRoute(socialAppRole, '/encerramentos')).toBe(false)
  })

  it('aceita o contexto profissional assistencial com função médica sem criar papel de role_code', () => {
    const medicalClinician = {
      ...context,
      professional_id: 'doctor-id',
      function_title: 'Médico Clínico Geral',
      roles: [{ code: 'profissional', name: 'Profissional' }],
      primary_context: {
        ...context.primary_context,
        code: 'profissional',
        name: 'Profissional',
      },
    }

    expect(canAccessAppRoute(medicalClinician, '/agenda')).toBe(true)
    expect(canAccessAppRoute(medicalClinician, '/atuacao')).toBe(true)
    expect(canAccessAppRoute(medicalClinician, '/relatorios')).toBe(true)
    expect(canAccessAppRoute(medicalClinician, '/fila')).toBe(false)
    expect(canAccessAppRoute(medicalClinician, '/faltosos')).toBe(false)
  })

  it('permite o papel principal de coordenação acessar gestão e relatórios sem virar profissional assistencial', () => {
    const coordinator = {
      ...context,
      professional_id: null,
      roles: [{ code: 'coordenador', name: 'Coordenador' }],
      primary_context: {
        ...context.primary_context,
        code: 'coordenador',
        name: 'Coordenação',
      },
    }

    expect(canAccessAppRoute(coordinator, '/agenda')).toBe(true)
    expect(canAccessAppRoute(coordinator, '/faltosos')).toBe(true)
    expect(canAccessAppRoute(coordinator, '/solicitacoes')).toBe(true)
    expect(canAccessAppRoute(coordinator, '/relatorios')).toBe(true)
    expect(canAccessAppRoute(coordinator, '/atuacao')).toBe(false)
  })

  it('autoriza o Gestor a consultar pacientes administrativos sem abrir prontuário', () => {
    const gestor = {
      ...context,
      professional_id: null,
      roles: [{ code: 'administrador', name: 'Administrador' }],
      capabilities: ['preencher_solicitacao_transporte'],
      primary_context: {
        ...context.primary_context,
        code: 'administrador',
        name: 'Administrador',
      },
    }

    expect(canAccessAppRoute(gestor, '/pacientes')).toBe(true)
    expect(canAccessAppRoute(gestor, '/agenda')).toBe(true)
    expect(canAccessAppRoute(gestor, '/tecnica')).toBe(true)
    expect(canAccessAppRoute(gestor, '/gestor/equipe')).toBe(true)
    expect(canAccessAppRoute(gestor, '/gestor/administracao')).toBe(true)
    expect(canAccessAppRoute(gestor, '/gestor/auditoria')).toBe(true)
    expect(canAccessAppRoute(gestor, '/gestor/familiares')).toBe(true)
  })

  it('mantém as rotas exclusivas do Gestor fora do Administrativo Operacional', () => {
    expect(isKnownAppRoute('/gestor/equipe')).toBe(true)
    expect(isKnownAppRoute('/gestor/administracao')).toBe(true)
    expect(isKnownAppRoute('/gestor/familiares')).toBe(true)
    expect(canAccessAppRoute(context, '/gestor/equipe')).toBe(false)
    expect(canAccessAppRoute(context, '/gestor/administracao')).toBe(false)
    expect(canAccessAppRoute(context, '/gestor/familiares')).toBe(false)
  })

  it('preserva módulos acumulados pelo papel mesmo quando outro contexto é o principal', () => {
    const accumulated: AccessContext = {
      ...context,
      roles: [
        { code: 'profissional', name: 'Profissional' },
        { code: 'coordenador', name: 'Coordenador' },
        { code: 'administrador', name: 'Administrador' },
      ],
      primary_context: {
        ...context.primary_context,
        code: 'profissional',
        name: 'Profissional',
        is_configured: true,
      },
    }

    expect(isKnownAppRoute('/coordenacao')).toBe(true)
    expect(canAccessAppRoute(accumulated, '/coordenacao')).toBe(true)
    expect(canAccessAppRoute(accumulated, '/gestor/administracao')).toBe(true)
    expect(canAccessAppRoute(accumulated, '/gestor/equipe')).toBe(true)
    expect(canAccessAppRoute(accumulated, '/gestor/auditoria')).toBe(true)
  })
})
