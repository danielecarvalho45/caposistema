import { useEffect, useMemo, useState } from 'react'
import {
  getRpcService,
  type AsyncState,
  type TeamMemberProfileInput,
} from '../../lib/supabase/rpc'
import { getSupabaseClient } from '../../lib/supabase/client'
import { normalizeSupabaseError } from '../../lib/supabase/errors'

type RecordValue = Readonly<Record<string, unknown>>

type TeamMember = Readonly<{
  professionalId: string
  userAccountId: string | null
  fullName: string
  functionTitle: string | null
  active: boolean
  profile: RecordValue
}>

type Option = Readonly<{ id: string; label: string }>

export type TeamManagementService = Readonly<{
  getContext: (query: string | null, status: string | null, limit: number, offset: number) => Promise<AsyncState<unknown>>
  create: (input: TeamMemberProfileInput, temporaryPassword: string, initiallyActive?: boolean, inactiveReason?: string, existingProfessionalId?: string) => Promise<AsyncState<unknown>>
  update: (professionalId: string, input: TeamMemberProfileInput) => Promise<AsyncState<unknown>>
  setActive: (professionalId: string, active: boolean, reason: string) => Promise<AsyncState<unknown>>
  setPrimaryContext: (userAccountId: string, roleCode: string) => Promise<AsyncState<unknown>>
  getCapabilities: (professionalId: string) => Promise<AsyncState<unknown>>
  setCapability: (professionalId: string, capabilityCode: string, isEnabled: boolean) => Promise<AsyncState<unknown>>
  removeCapability: (professionalId: string, capabilityCode: string) => Promise<AsyncState<unknown>>
  setSpecialtyCapability: (specialtyId: string, capabilityCode: string, isEnabled: boolean) => Promise<AsyncState<unknown>>
  createSpecialty?: (name: string) => Promise<AsyncState<unknown>>
}>

export function createTeamManagementService(): TeamManagementService {
  const rpc = getRpcService()
  return {
    getContext: (query, status, limit, offset) => rpc.getTeamManagementContext(query, status, limit, offset),
    create: async (input, temporaryPassword, initiallyActive = true, inactiveReason = '', existingProfessionalId) => {
      try {
        const { data, error } = await getSupabaseClient().functions.invoke('create-team-member', {
          body: { email: input.recoveryEmail, temporaryPassword, profile: input, initiallyActive, inactiveReason, existingProfessionalId },
        })
        if (error) {
          const body = 'context' in error && error.context instanceof Response
            ? await error.context.json().catch(() => null) as { error?: string } | null
            : null
          throw new Error(body?.error ?? error.message)
        }
        return { status: 'success', data }
      } catch (error) {
        return { status: 'error', error: normalizeSupabaseError('create-team-member', error) }
      }
    },
    update: async (professionalId, input) => {
      try {
        const { data, error } = await getSupabaseClient().functions.invoke('update-team-member-profile', {
          body: { professionalId, profile: input },
        })
        if (error) {
          const body = 'context' in error && error.context instanceof Response
            ? await error.context.json().catch(() => null) as { error?: string } | null
            : null
          throw new Error(body?.error ?? error.message)
        }
        return { status: 'success', data }
      } catch (error) {
        return { status: 'error', error: normalizeSupabaseError('update-team-member-profile', error) }
      }
    },
    setActive: async (professionalId, active, reason) => {
      try {
        const { data, error } = await getSupabaseClient().functions.invoke('set-team-member-active', {
          body: { professionalId, active, reason },
        })
        if (error) throw error
        return { status: 'success', data }
      } catch (error) {
        return { status: 'error', error: normalizeSupabaseError('set-team-member-active', error) }
      }
    },
    createSpecialty: (name) => rpc.createSpecialty(name),
    setPrimaryContext: (userAccountId, roleCode) => rpc.setTeamMemberPrimaryContext(userAccountId, roleCode),
    getCapabilities: (professionalId) => rpc.getEffectiveProfessionalCapabilities(professionalId),
    setCapability: (professionalId, capabilityCode, isEnabled) => rpc.setProfessionalCapability(professionalId, capabilityCode, isEnabled),
    removeCapability: (professionalId, capabilityCode) => rpc.removeProfessionalCapability(professionalId, capabilityCode),
    setSpecialtyCapability: (specialtyId, capabilityCode, isEnabled) => rpc.setSpecialtyCapabilityStatus(specialtyId, capabilityCode, isEnabled),
  }
}

const blankProfile = (): TeamMemberProfileInput => ({
  administrativeResponsibility: null,
  authUserId: null,
  birthDate: null,
  fullName: '',
  functionTitle: null,
  isProfessional: true,
  phone: null,
  primarySpecialtyId: null,
  professionalRegistration: null,
  recoveryEmail: null,
  roleCodes: [],
  specialtyIds: [],
  username: null,
})

function asRecord(value: unknown): RecordValue | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as RecordValue
    : null
}

function records(value: unknown, keys: readonly string[]): readonly RecordValue[] {
  if (Array.isArray(value))
    return value.filter((item): item is RecordValue => asRecord(item) !== null)
  const source = asRecord(value)
  if (!source) return []
  for (const key of keys) {
    if (Array.isArray(source[key]))
      return source[key].filter((item): item is RecordValue => asRecord(item) !== null)
  }
  return []
}

function text(source: RecordValue, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function enabled(source: RecordValue): boolean {
  return source.is_active !== false && source.active !== false && source.is_enabled !== false
}

function optionList(value: unknown, collections: readonly string[], ids: readonly string[], labels: readonly string[]): readonly Option[] {
  return records(value, collections).flatMap((item) => {
    const id = text(item, ...ids)
    const label = text(item, ...labels)
    return id && label ? [{ id, label }] : []
  })
}

function selectedCodes(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function selectedField(value: unknown, key: string): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item]
    const record = asRecord(item)
    return record ? [text(record, key)].filter((code): code is string => code !== null) : []
  })
}

function memberInput(member: TeamMember): TeamMemberProfileInput {
  const profile = member.profile
  return {
    administrativeResponsibility: text(profile, 'administrative_responsibility'),
    authUserId: member.userAccountId,
    birthDate: text(profile, 'birth_date'),
    fullName: member.fullName,
    functionTitle: member.functionTitle,
    isProfessional: profile.is_professional !== false,
    phone: text(profile, 'phone'),
    primarySpecialtyId: text(asRecord(profile.primary_context) ?? profile, 'primary_specialty_id') ??
      selectedField(profile.specialties, 'specialty_id')[0] ?? null,
    professionalRegistration: text(profile, 'professional_registration'),
    recoveryEmail: text(profile, 'recovery_email'),
    roleCodes: selectedCodes(profile.role_codes).length ? selectedCodes(profile.role_codes) : selectedField(profile.roles, 'code'),
    specialtyIds: selectedCodes(profile.specialty_ids).length ? selectedCodes(profile.specialty_ids) : selectedField(profile.specialties, 'specialty_id'),
    username: text(profile, 'username'),
  }
}

function nullable(value: string): string | null {
  return value.trim() || null
}

function errorMessage(result: AsyncState<unknown>): string | null {
  return result.status === 'error' ? result.error.message : null
}

export function GestorTeamPage({ service: providedService }: Readonly<{ service?: TeamManagementService }>) {
  const service = useMemo(() => providedService ?? createTeamManagementService(), [providedService])
  const [context, setContext] = useState<unknown>(null)
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [profile, setProfile] = useState<TeamMemberProfileInput>(blankProfile)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [initiallyActive, setInitiallyActive] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [showInactiveSearch, setShowInactiveSearch] = useState(false)
  const [newSpecialty, setNewSpecialty] = useState('')
  const [activeReason, setActiveReason] = useState('')
  const [capabilities, setCapabilities] = useState<readonly RecordValue[]>([])
  const [specialtyForCapability, setSpecialtyForCapability] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const team = records(context, ['team', 'team_members', 'professionals', 'members', 'items']).flatMap((item) => {
    const professionalId = text(item, 'professional_id')
    const fullName = text(item, 'full_name', 'professional_name', 'name')
    return professionalId && fullName ? [{ professionalId, fullName, userAccountId: text(item, 'user_account_id', 'auth_user_id'), functionTitle: text(item, 'function_title'), active: item.status === 'ativo' || (item.status == null && enabled(item)), profile: item }] : []
  })
  const roles = optionList(context, ['roles', 'available_roles', 'role_options'], ['role_code', 'code'], ['role_name', 'name', 'role_code'])
  const specialties = optionList(context, ['specialties', 'available_specialties', 'specialty_options'], ['specialty_id', 'id'], ['specialty_name', 'name'])

  async function reload(search = query, filter = status) {
    setLoading(true)
    const result = await service.getContext(nullable(search), filter || 'ativo', 50, 0)
    if (result.status === 'success') {
      setContext(result.data)
      setFeedback(null)
    } else if (result.status === 'empty') {
      setContext(null)
      setFeedback('Nenhum profissional retornado pelo backend.')
    } else {
      setFeedback(errorMessage(result))
    }
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    void service.getContext(null, 'ativo', 50, 0).then((result) => {
      if (!active) return
      if (result.status === 'success') { setContext(result.data); setFeedback(null) }
      else if (result.status === 'empty') { setContext(null); setFeedback('Nenhum profissional retornado pelo backend.') }
      else setFeedback(errorMessage(result))
      setLoading(false)
    })
    return () => { active = false }
  }, [service])

  useEffect(() => {
    const professionalId = selected?.professionalId
    if (!professionalId) return
    let active = true
    void (async () => {
      const result = await service.getCapabilities(professionalId)
      if (!active) return
      if (result.status === 'success') setCapabilities(records(result.data, ['effective_capabilities', 'capabilities', 'items']))
      else if (result.status === 'error') setFeedback(result.error.message)
    })()
    return () => { active = false }
  }, [selected?.professionalId, service])

  function chooseMember(member: TeamMember) {
    setCapabilities([])
    setSelected(member)
    setProfile(memberInput(member))
    setActiveReason(text(member.profile, 'deactivation_reason') ?? '')
    setFeedback(null)
  }

  function toggleCodes(field: 'roleCodes' | 'specialtyIds', code: string, checked: boolean) {
    setProfile((current) => {
      const values = checked ? [...current[field], code] : current[field].filter((item) => item !== code)
      if (field === 'specialtyIds') {
        return {
          ...current,
          specialtyIds: values,
          primarySpecialtyId: values.includes(current.primarySpecialtyId ?? '')
            ? current.primarySpecialtyId
            : values[0] ?? null,
        }
      }
      return { ...current, roleCodes: values }
    })
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile.fullName.trim()) { setFeedback('Informe o nome completo.'); return }
    if (!profile.functionTitle?.trim()) { setFeedback('Informe a função exercida.'); return }
    if (!profile.username?.trim()) { setFeedback('Informe o nome de usuário.'); return }
    if (!profile.recoveryEmail?.trim()) { setFeedback('Informe o e-mail.'); return }
    if (!profile.roleCodes.length) { setFeedback('Selecione pelo menos um papel de acesso.'); return }
    if (profile.isProfessional && !profile.specialtyIds.length) { setFeedback('Selecione ou cadastre pelo menos uma especialidade.'); return }
    if ((!selected || !selected.userAccountId) && (!/^\d{6}$/.test(temporaryPassword) || temporaryPassword === '123456')) {
      setFeedback('A senha provisória deve ter exatamente 6 números e ser diferente de 123456.')
      return
    }
    if ((!selected && !initiallyActive || selected && !selected.userAccountId && !selected.active) && activeReason.trim().length < 5) {
      setFeedback('Informe o motivo da inativação com pelo menos 5 caracteres.'); return
    }
    const result = selected?.userAccountId
      ? await service.update(selected.professionalId, profile)
      : selected ? await service.create(profile, temporaryPassword, selected.active, activeReason, selected.professionalId)
        : await service.create(profile, temporaryPassword, initiallyActive, activeReason)
    if (result.status !== 'success') { setFeedback(errorMessage(result) ?? 'A operação não retornou resultado.'); return }
    setFeedback(selected?.userAccountId ? 'Profissional atualizado.' : selected ? 'Conta vinculada ao profissional.' : 'Profissional cadastrado.')
    setSelected(null)
    setProfile(blankProfile())
    setTemporaryPassword('')
    setInitiallyActive(true)
    setActiveReason('')
    await reload()
  }

  async function mutate(action: () => Promise<AsyncState<unknown>>, message: string) {
    const result = await action()
    if (result.status !== 'success') { setFeedback(errorMessage(result) ?? 'A operação não retornou resultado.'); return }
    setFeedback(message)
    await reload()
  }

  async function addSpecialty() {
    const name = newSpecialty.trim()
    if (!name || !service.createSpecialty) return
    const result = await service.createSpecialty(name)
    if (result.status !== 'success') { setFeedback(errorMessage(result) ?? 'Não foi possível cadastrar a especialidade.'); return }
    const data = asRecord(result.data)
    const id = data && text(data, 'specialty_id')
    setNewSpecialty('')
    await reload()
    if (id) setProfile((current) => ({ ...current,
      specialtyIds: [...current.specialtyIds, id],
      primarySpecialtyId: current.primarySpecialtyId ?? id,
    }))
    setFeedback('Especialidade cadastrada e vinculada ao formulário. Salve o profissional para concluir o vínculo.')
  }

  return <section className="gestor-route" aria-labelledby="gestor-team-title">
    <header><span>Gestão do Serviço</span><h2 id="gestor-team-title">Equipe e Permissões</h2><p>Profissionais e capacidades retornados e autorizados pelo backend CAPO.</p></header>
    <div className="gestor-team-layout">
      <article className="gestor-panel gestor-team-list">
        <div className="gestor-team-heading"><h3>Equipe</h3><button type="button" onClick={() => { setSelected(null); setProfile(blankProfile()) }}>Novo profissional</button></div>
        <div className="gestor-search-row"><input aria-label="Buscar equipe" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou usuário" /><button type="button" onClick={() => void reload()}>Buscar</button><button type="button" aria-label={showInactiveSearch ? 'Voltar à lista de ativos' : 'Buscar profissionais inativos'} title={showInactiveSearch ? 'Voltar à lista de ativos' : 'Buscar profissionais inativos'} onClick={() => { const next = showInactiveSearch ? 'ativo' : 'inativo'; setShowInactiveSearch(!showInactiveSearch); setStatus(next); setQuery(''); setSelected(null); void reload('', next) }}>⌕</button></div>
        {showInactiveSearch && <label>Buscar profissionais inativos <select aria-label="Situação da equipe" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select></label>}
        {loading ? <p role="status">Carregando equipe...</p> : team.length === 0 ? <p>Nenhum profissional retornado.</p> : <ul className="gestor-result-list">{team.map((member) => <li key={member.professionalId}><button type="button" className={selected?.professionalId === member.professionalId ? 'is-selected' : ''} onClick={() => chooseMember(member)}><strong>{member.fullName}</strong><small>{member.functionTitle ?? 'Sem função informada'} · {member.active ? 'Ativo' : 'Inativo'}</small></button></li>)}</ul>}
      </article>
      <form className="gestor-panel gestor-team-form" onSubmit={(event) => void saveProfile(event)}>
        <div className="gestor-team-heading"><h3>{selected ? 'Editar profissional' : 'Cadastrar profissional'}</h3>{selected && <button type="button" onClick={() => { setSelected(null); setProfile(blankProfile()) }}>Cancelar edição</button>}</div>
        <label>Nome completo<input required value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></label>
        {(!selected || !selected.userAccountId) && <label>Conta de acesso: senha provisória<input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" required value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} /><small>Critérios: exatamente 6 números, diferente de 123456. No primeiro acesso, o profissional terá de criar outra senha de 6 números. O e-mail informado abaixo será usado na conta.</small></label>}
        {!selected && <fieldset><legend>Situação inicial do profissional e do acesso</legend><label className="gestor-check"><input type="checkbox" checked={initiallyActive} onChange={(event) => setInitiallyActive(event.target.checked)} />Ativo após o cadastro</label>{!initiallyActive && <label>Motivo da inativação<input value={activeReason} onChange={(event) => setActiveReason(event.target.value)} required minLength={5} maxLength={500} /></label>}</fieldset>}
        <div className="gestor-field-grid"><label>Função<input value={profile.functionTitle ?? ''} onChange={(event) => setProfile({ ...profile, functionTitle: nullable(event.target.value) })} /></label><label>Usuário<input value={profile.username ?? ''} onChange={(event) => setProfile({ ...profile, username: nullable(event.target.value) })} /></label><label>E-mail de recuperação<input type="email" value={profile.recoveryEmail ?? ''} onChange={(event) => setProfile({ ...profile, recoveryEmail: nullable(event.target.value) })} /></label><label>Telefone<input value={profile.phone ?? ''} onChange={(event) => setProfile({ ...profile, phone: nullable(event.target.value) })} /></label><label>Data de nascimento<input type="date" value={profile.birthDate ?? ''} onChange={(event) => setProfile({ ...profile, birthDate: nullable(event.target.value) })} /></label><label>Registro profissional<input value={profile.professionalRegistration ?? ''} onChange={(event) => setProfile({ ...profile, professionalRegistration: nullable(event.target.value) })} /></label><label>Responsabilidade administrativa<input value={profile.administrativeResponsibility ?? ''} onChange={(event) => setProfile({ ...profile, administrativeResponsibility: nullable(event.target.value) })} /></label><label>Especialidade principal<select value={profile.primarySpecialtyId ?? ''} onChange={(event) => setProfile({ ...profile, primarySpecialtyId: nullable(event.target.value) })}><option value="">Não definida</option>{specialties.filter((specialty) => profile.specialtyIds.includes(specialty.id)).map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.label}</option>)}</select></label></div>
        <label className="gestor-check"><input type="checkbox" checked={profile.isProfessional} onChange={(event) => setProfile({ ...profile, isProfessional: event.target.checked })} />Perfil profissional</label>
        {selected && <fieldset><legend>Situação do profissional e da conta</legend><p>{selected.active ? 'Ativo' : 'Inativo'}</p>{selected.userAccountId ? <><label>Motivo da inativação<input value={activeReason} onChange={(event) => setActiveReason(event.target.value)} placeholder="Informe pelo menos 5 caracteres para inativar" /></label><button type="button" onClick={() => void mutate(() => service.setActive(selected.professionalId, !selected.active, activeReason), selected.active ? 'Profissional e acesso inativados.' : 'Profissional e acesso reativados.')}>{selected.active ? 'Inativar profissional e acesso' : 'Ativar profissional e acesso'}</button></> : <><p>Este profissional já está cadastrado, mas ainda não possui conta de acesso. Informe o e-mail, os papéis e a senha provisória para vinculá-la, sem duplicar o cadastro.</p>{!selected.active && <label>Motivo da inativação<input value={activeReason} onChange={(event) => setActiveReason(event.target.value)} required minLength={5} maxLength={500} /></label>}</>}</fieldset>}
        <fieldset><legend>Papéis</legend>{roles.map((role) => <label className="gestor-check" key={role.id}><input type="checkbox" checked={profile.roleCodes.includes(role.id)} onChange={(event) => toggleCodes('roleCodes', role.id, event.target.checked)} />{role.label}</label>)}</fieldset>
        <fieldset><legend>Especialidades</legend>{specialties.map((specialty) => <label className="gestor-check" key={specialty.id}><input type="checkbox" checked={profile.specialtyIds.includes(specialty.id)} onChange={(event) => toggleCodes('specialtyIds', specialty.id, event.target.checked)} />{specialty.label}</label>)}</fieldset>
        {service.createSpecialty && <div className="gestor-search-row"><label>Nova especialidade<input value={newSpecialty} onChange={(event) => setNewSpecialty(event.target.value)} placeholder="Digite uma especialidade ainda não cadastrada" /></label><button type="button" onClick={() => void addSpecialty()} disabled={!newSpecialty.trim()}>Cadastrar especialidade</button></div>}
        <button className="gestor-primary-action" type="submit">{selected?.userAccountId ? 'Salvar alterações' : selected ? 'Criar acesso e salvar perfil' : 'Cadastrar profissional'}</button>
      </form>
    </div>
    {selected && <section className="gestor-team-actions" aria-label="Ações do profissional selecionado"><article className="gestor-panel"><h3>Contexto principal</h3>{selected.userAccountId && <select aria-label="Contexto principal" defaultValue="" onChange={(event) => { if (event.target.value) void mutate(() => service.setPrimaryContext(selected.userAccountId!, event.target.value), 'Contexto principal atualizado.') }}><option value="">Definir contexto principal</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>}</article><article className="gestor-panel"><h3>Permissões do profissional</h3>{capabilities.length === 0 ? <p>Nenhuma permissão específica encontrada para este profissional.</p> : <ul className="gestor-capability-list">{capabilities.map((capability) => { const code = text(capability, 'capability_code', 'code'); return code ? <li key={code}><label className="gestor-check"><input type="checkbox" checked={enabled(capability)} onChange={(event) => void mutate(() => service.setCapability(selected.professionalId, code, event.target.checked), 'Permissão atualizada.')} />{code}</label><button type="button" onClick={() => void mutate(() => service.removeCapability(selected.professionalId, code), 'Permissão individual removida.')}>Remover permissão individual</button></li> : null })}</ul>}<p>As permissões individuais complementam os papéis e as especialidades. Alterar uma permissão da especialidade afeta todos os profissionais vinculados a ela.</p><label>Alterar permissão da especialidade<select value={specialtyForCapability} onChange={(event) => setSpecialtyForCapability(event.target.value)}><option value="">Selecione especialidade</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.label}</option>)}</select></label>{specialtyForCapability && capabilities.map((capability) => { const code = text(capability, 'capability_code', 'code'); return code ? <button key={code} type="button" onClick={() => void mutate(() => service.setSpecialtyCapability(specialtyForCapability, code, !enabled(capability)), 'Permissão da especialidade atualizada.')}>{enabled(capability) ? `Desativar ${code}` : `Ativar ${code}`}</button> : null })}</article></section>}
    {feedback && <p className="gestor-feedback" role="status">{feedback}</p>}
  </section>
}
