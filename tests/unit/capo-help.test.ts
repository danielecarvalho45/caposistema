import { describe, expect, it } from 'vitest'
import { availableHelp, findHelp } from '../../src/features/help/help-knowledge'
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


describe('Assistente CAPO: orientação por contexto',()=>{
  it('prioriza PDF de transporte e reconhece acentos',()=>{
    expect(findHelp(context,'/transporte','Não consigo gerar PDF de transporte')[0]?.id).toBe('transport-pdf')
  })
  it('não mostra orientações técnicas ou clínicas ao AO',()=>{
    const ids=availableHelp(context).map(t=>t.id)
    expect(ids).not.toContain('tech')
    expect(ids).not.toContain('nutrition')
    expect(ids).not.toContain('agenda-prof')
  })
  it('mantém orientações profissionais comuns para especialidades futuras',()=>{
    const p={...context,professional_id:'professional-id',roles:[{code:'profissional',name:'Profissional'}],primary_specialty_name:'Especialidade futura',primary_context:{...context.primary_context,code:'profissional'}}
    const ids=availableHelp(p).map(t=>t.id)
    expect(ids).toContain('agenda-prof')
    expect(ids).not.toContain('transport-pdf')
    expect(ids).not.toContain('nutrition')
    expect(ids).not.toContain('group')
  })
  it('não inventa resposta para termos desconhecidos',()=>{
    expect(findHelp(context,'/transporte','xyzabc')).toEqual([])
  })
})
