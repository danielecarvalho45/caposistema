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
  create: (input: TeamMemberProfileInput, temporaryPassword: string) => Promise<AsyncState<unknown>>
  update: (professionalId: string, input: TeamMemberProfileInput) => Promise<AsyncState<unknown>>
  setActive: (professionalId: string, active: boolean, reason: string) => Promise<AsyncState<unknown>>
  setPrimaryContext: (userAccountId: string, roleCode: string) => Promise<AsyncState<unknown>>
  getCapabilities: (professionalId: string) => Promise<AsyncState<unknown>>
  setCapability: (professionalId: string, capabilityCode: string, isEnabled: boolean) => Promise<AsyncState<unknown>>
  removeCapability: (professionalId: string, capabilityCode: string) => Promise<AsyncState<unknown>>
  setSpecialtyCapability: (specialtyId: string, capabilityCode: string, isEnabled: boolean) => Promise<AsyncState<unknown>>
}>

export function createTeamManagementService(): TeamManagementService {
  const rpc = getRpcService()
  return {
    getContext: (query, status, limit, offset) => rpc.getTeamManagementContext(query, status, limit, offset),
    create: async (input, temporaryPassword) => {
      try {
        const { data, error } = await getSupabaseClient().functions.invoke('create-team-member', {
          body: { email: input.recoveryEmail, temporaryPassword, profile: input },
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
    update: (professionalId, input) => rpc.updateTeamMemberProfile(professionalId, input),
    setActive: (professionalId, active, reason) => rpc.setTeamMemberActive(professionalId, active, reason),
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
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
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

  async function reload() {
    setLoading(true)
    const result = await service.getContext(nullable(query), nullable(status), 50, 0)
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
    void service.getContext(null, null, 50, 0).then((result) => {
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
    setFeedback(null)
  }

  function toggleCodes(field: 'roleCodes' | 'specialtyIds', code: string, checked: boolean) {
    setProfile((current) => ({ ...current, [field]: checked ? [...current[field], code] : current[field].filter((item) => item !== code) }))
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile.fullName.trim()) { setFeedback('Informe o nome completo.'); return }
    if (!selected && (!profile.recoveryEmail || temporaryPassword.length < 8)) { setFeedback('Informe o e-mail e uma senha provisória de pelo menos 8 caracteres.'); return }
    if (!selected && profile.isProfessional && !profile.primarySpecialtyId) { setFeedback('Selecione a especialidade principal do profissional.'); return }
    const result = selected
      ? await service.update(selected.professionalId, profile)
      : await service.create(profile, temporaryPassword)
    if (result.status !== 'success') { setFeedback(errorMessage(result) ?? 'A operação não retornou resultado.'); return }
    setFeedback(selected ? 'Profissional atualizado.' : 'Profissional cadastrado.')
    setSelected(null)
    setProfile(blankProfile())
    setTemporaryPassword('')
    await reload()
  }

  async function mutate(action: () => Promise<AsyncState<unknown>>, message: string) {
    const result = await action()
    if (result.status !== 'success') { setFeedback(errorMessage(result) ?? 'A operação não retornou resultado.'); return }
    setFeedback(message)
    await reload()
  }

  return <section className="gestor-route" aria-labelledby="gestor-team-title">
    <header><span>Gestão do Serviço</span><h2 id="gestor-team-title">Equipe e Permissões</h2><p>Profissionais e capacidades retornados e autorizados pelo backend CAPO.</p></header>
    <div className="gestor-team-layout">
      <article className="gestor-panel gestor-team-list">
        <div className="gestor-team-heading"><h3>Equipe</h3><button type="button" onClick={() => { setSelected(null); setProfile(blankProfile()) }}>Novo profissional</button></div>
        <div className="gestor-search-row"><input aria-label="Buscar equipe" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou usuário" /><select aria-label="Situação da equipe" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas as situações</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select><button type="button" onClick={() => void reload()}>Buscar</button></div>
        {loading ? <p role="status">Carregando equipe...</p> : team.length === 0 ? <p>Nenhum profissional retornado.</p> : <ul className="gestor-result-list">{team.map((member) => <li key={member.professionalId}><button type="button" className={selected?.professionalId === member.professionalId ? 'is-selected' : ''} onClick={() => chooseMember(member)}><strong>{member.fullName}</strong><small>{member.functionTitle ?? 'Sem função informada'} · {member.active ? 'Ativo' : 'Inativo'}</small></button></li>)}</ul>}
      </article>
      <form className="gestor-panel gestor-team-form" onSubmit={(event) => void saveProfile(event)}>
        <div className="gestor-team-heading"><h3>{selected ? 'Editar profissional' : 'Cadastrar profissional'}</h3>{selected && <button type="button" onClick={() => { setSelected(null); setProfile(blankProfile()) }}>Cancelar edição</button>}</div>
        <label>Nome completo<input required value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></label>
        {!selected && <label>Conta de acesso: senha provisória<input type="password" autoComplete="new-password" required minLength={8} value={temporaryPassword} onChange={(event) => setTemporaryPassword(event.target.value)} /><small>O e-mail de recuperação informado abaixo será usado para criar a conta de acesso junto com o cadastro.</small></label>}
        <div className="gestor-field-grid"><label>Função<input value={profile.functionTitle ?? ''} onChange={(event) => setProfile({ ...profile, functionTitle: nullable(event.target.value) })} /></label><label>Usuário<input value={profile.username ?? ''} onChange={(event) => setProfile({ ...profile, username: nullable(event.target.value) })} /></label><label>E-mail de recuperação<input type="email" value={profile.recoveryEmail ?? ''} onChange={(event) => setProfile({ ...profile, recoveryEmail: nullable(event.target.value) })} /></label><label>Telefone<input value={profile.phone ?? ''} onChange={(event) => setProfile({ ...profile, phone: nullable(event.target.value) })} /></label><label>Data de nascimento<input type="date" value={profile.birthDate ?? ''} onChange={(event) => setProfile({ ...profile, birthDate: nullable(event.target.value) })} /></label><label>Registro profissional<input value={profile.professionalRegistration ?? ''} onChange={(event) => setProfile({ ...profile, professionalRegistration: nullable(event.target.value) })} /></label><label>Responsabilidade administrativa<input value={profile.administrativeResponsibility ?? ''} onChange={(event) => setProfile({ ...profile, administrativeResponsibility: nullable(event.target.value) })} /></label><label>Especialidade principal<select value={profile.primarySpecialtyId ?? ''} onChange={(event) => setProfile({ ...profile, primarySpecialtyId: nullable(event.target.value) })}><option value="">Não definida</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.label}</option>)}</select></label></div>
        <label className="gestor-check"><input type="checkbox" checked={profile.isProfessional} onChange={(event) => setProfile({ ...profile, isProfessional: event.target.checked })} />Perfil profissional</label>
        <fieldset><legend>Papéis</legend>{roles.map((role) => <label className="gestor-check" key={role.id}><input type="checkbox" checked={profile.roleCodes.includes(role.id)} onChange={(event) => toggleCodes('roleCodes', role.id, event.target.checked)} />{role.label}</label>)}</fieldset>
        <fieldset><legend>Especialidades</legend>{specialties.map((specialty) => <label className="gestor-check" key={specialty.id}><input type="checkbox" checked={profile.specialtyIds.includes(specialty.id)} onChange={(event) => toggleCodes('specialtyIds', specialty.id, event.target.checked)} />{specialty.label}</label>)}</fieldset>
        <button className="gestor-primary-action" type="submit">{selected ? 'Salvar alterações' : 'Cadastrar profissional'}</button>
      </form>
    </div>
    {selected && <section className="gestor-team-actions" aria-label="Ações do profissional selecionado"><article className="gestor-panel"><h3>Situação e contexto</h3><label>Motivo da alteração de situação<input value={activeReason} onChange={(event) => setActiveReason(event.target.value)} /></label><div className="gestor-action-tabs"><button type="button" onClick={() => void mutate(() => service.setActive(selected.professionalId, !selected.active, activeReason), selected.active ? 'Profissional inativado.' : 'Profissional ativado.')}>{selected.active ? 'Inativar' : 'Ativar'}</button>{selected.userAccountId && <select aria-label="Contexto principal" defaultValue="" onChange={(event) => { if (event.target.value) void mutate(() => service.setPrimaryContext(selected.userAccountId!, event.target.value), 'Contexto principal atualizado.') }}><option value="">Definir contexto principal</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.label}</option>)}</select>}</div></article><article className="gestor-panel"><h3>Capabilities efetivas</h3>{capabilities.length === 0 ? <p>Nenhuma capability retornada para este profissional.</p> : <ul className="gestor-capability-list">{capabilities.map((capability) => { const code = text(capability, 'capability_code', 'code'); const name = text(capability, 'capability_name', 'name', 'capability_code'); return code && name ? <li key={code}><label className="gestor-check"><input type="checkbox" checked={enabled(capability)} onChange={(event) => void mutate(() => service.setCapability(selected.professionalId, code, event.target.checked), 'Capability atualizada.')} />{name}</label><button type="button" onClick={() => void mutate(() => service.removeCapability(selected.professionalId, code), 'Concessão de capability removida.')}>Remover concessão</button></li> : null })}</ul>}<label>Aplicar capability à especialidade<select value={specialtyForCapability} onChange={(event) => setSpecialtyForCapability(event.target.value)}><option value="">Selecione especialidade</option>{specialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.label}</option>)}</select></label>{specialtyForCapability && capabilities.map((capability) => { const code = text(capability, 'capability_code', 'code'); const name = text(capability, 'capability_name', 'name', 'capability_code'); return code && name ? <button key={code} type="button" onClick={() => void mutate(() => service.setSpecialtyCapability(specialtyForCapability, code, !enabled(capability)), 'Capability da especialidade atualizada.')}>{enabled(capability) ? `Desativar ${name}` : `Ativar ${name}`}</button> : null })}</article></section>}
    {feedback && <p className="gestor-feedback" role="status">{feedback}</p>}
  </section>
}
