import { useMemo, useState } from 'react'
import type { AccessContext } from '../../types/access'
import {
  getRpcService,
  type HomologationOptions,
} from '../../lib/supabase/rpc'
import './homologation-selector.css'

const professionalRoleCodes = new Set([
  'assistencia_social',
  'assistente_social',
  'social',
  'nutricao',
  'medico_clinico_geral',
  'profissional',
])

const emptyOptions: HomologationOptions = {
  roles: [],
  professionals: [],
  specialties: [],
}

export function HomologationSelector({
  accessContext,
}: Readonly<{ accessContext: AccessContext }>) {
  const service = useMemo(() => getRpcService(), [])
  const [options, setOptions] = useState<HomologationOptions>(emptyOptions)
  const [roleCode, setRoleCode] = useState(
    accessContext.homologation_context?.role_code ?? '',
  )
  const [professionalId, setProfessionalId] = useState(
    accessContext.homologation_context?.professional_id ?? '',
  )
  const [specialtyId, setSpecialtyId] = useState(
    accessContext.homologation_context?.specialty_id ?? '',
  )
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  async function loadOptions() {
    if (optionsLoaded || busy) return
    setBusy(true)
    setFeedback('Carregando contextos reais…')
    const result = await service.getHomologationOptions()
    if (result.status === 'success') {
      setOptions(result.data)
      setOptionsLoaded(true)
      setFeedback('')
    } else {
      setFeedback(
        result.status === 'error'
          ? result.error.message
          : 'Nenhum contexto de homologação disponível.',
      )
    }
    setBusy(false)
  }

  const selectedRole = options.roles.find((role) => role.role_code === roleCode)
  const needsProfessional =
    selectedRole?.requires_professional === true ||
    professionalRoleCodes.has(roleCode)
  const needsSpecialty =
    selectedRole?.requires_specialty === true || needsProfessional
  const specialties = options.specialties.filter(
    (specialty) =>
      !specialty.professional_id || specialty.professional_id === professionalId,
  )

  async function reloadEffectiveContext() {
    const context = await service.getMyAccessContext()
    if (context.status !== 'success') {
      setFeedback(
        context.status === 'error'
          ? context.error.message
          : 'Não foi possível recarregar o contexto efetivo.',
      )
      return false
    }
    window.location.assign('/')
    return true
  }

  async function applyContext() {
    if (!roleCode || (needsProfessional && !professionalId) || (needsSpecialty && !specialtyId)) {
      setFeedback('Selecione o perfil e os vínculos reais exigidos.')
      return
    }
    setBusy(true)
    setFeedback('Aplicando contexto de homologação…')
    const result = await service.setHomologationContext({
      roleCode,
      professionalId: needsProfessional ? professionalId : null,
      specialtyId: needsSpecialty ? specialtyId : null,
      testPatientId: null,
      reason: 'Homologação de interface por contexto',
    })
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a troca de contexto.')
      setBusy(false)
      return
    }
    if (!(await reloadEffectiveContext())) setBusy(false)
  }

  async function finishHomologation() {
    setBusy(true)
    setFeedback('Encerrando homologação…')
    const result = await service.clearHomologationContext(
      'Encerramento do teste de homologação',
    )
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o encerramento.')
      setBusy(false)
      return
    }
    if (!(await reloadEffectiveContext())) setBusy(false)
  }

  return (
    <aside className="homologation-selector" aria-label="Conta de homologação">
      <div>
        <strong>Ambiente de homologação</strong>
        <span>
          {accessContext.homologation_context?.enabled
            ? `Atuação controlada${accessContext.homologation_context.role_name ? ` como ${accessContext.homologation_context.role_name}` : ''}.`
            : 'Selecione um contexto real para o teste.'}
        </span>
      </div>
      <label>
        Perfil
        <select value={roleCode} disabled={busy} onFocus={() => void loadOptions()} onChange={(event) => {
          setRoleCode(event.target.value)
          setProfessionalId('')
          setSpecialtyId('')
        }}>
          <option value="">Selecionar perfil</option>
          {options.roles.map((role) => <option value={role.role_code} key={role.role_code}>{role.role_name}</option>)}
        </select>
      </label>
      {needsProfessional && (
        <label>
          Profissional
          <select value={professionalId} disabled={busy} onChange={(event) => {
            setProfessionalId(event.target.value)
            setSpecialtyId('')
          }}>
            <option value="">Selecionar profissional</option>
            {options.professionals.map((professional) => (
              <option value={professional.professional_id} key={professional.professional_id}>
                {professional.professional_name}{professional.function_title ? ` — ${professional.function_title}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {needsSpecialty && (
        <label>
          Especialidade
          <select value={specialtyId} disabled={busy || !professionalId} onChange={(event) => setSpecialtyId(event.target.value)}>
            <option value="">Selecionar especialidade</option>
            {specialties.map((specialty) => <option value={specialty.specialty_id} key={specialty.specialty_id}>{specialty.specialty_name}</option>)}
          </select>
        </label>
      )}
      <div className="homologation-actions">
        <button type="button" disabled={busy || !roleCode} onClick={() => void applyContext()}>Aplicar contexto</button>
        <button type="button" className="homologation-finish" disabled={busy} onClick={() => void finishHomologation()}>ENCERRAR HOMOLOGAÇÃO</button>
      </div>
      {feedback && <p role="status">{feedback}</p>}
    </aside>
  )
}
