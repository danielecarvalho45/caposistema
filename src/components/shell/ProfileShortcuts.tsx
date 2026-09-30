// CAPO — seletor de contexto da conta de homologação; alteração deste arquivo deve integrar o build publicado.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import {
  getRpcService,
  type HomologationOptions,
} from '../../lib/supabase/rpc'
import { getProfileShortcuts } from './profile-shortcuts'
import './profile-shortcuts.css'

type HomologationService = Pick<
  ReturnType<typeof getRpcService>,
  'getHomologationOptions' | 'setHomologationContext' | 'clearHomologationContext'
>

type ProfileShortcutsProps = Readonly<{
  accessContext: AccessContext
  activePath: string
  className: string
  profileLabel: string
  homologationService?: HomologationService
  onContextChange?: () => Promise<void>
}>

type HomologationTarget = Readonly<{
  key: string
  label: string
  roleCode: string | null
  specialtyName?: string
}>

const homologationTargets: readonly HomologationTarget[] = [
  {
    key: 'administrador_tecnico',
    label: 'TI / Manutenção',
    roleCode: null,
  },
  {
    key: 'coordenador',
    label: 'Coordenador',
    roleCode: 'coordenador',
  },
  {
    key: 'administrativo_operacional',
    label: 'Administrativo Operacional',
    roleCode: 'administrativo_operacional',
  },
  {
    key: 'medico',
    label: 'Médico Clínico Geral',
    roleCode: 'profissional',
    specialtyName: 'Clínica Geral',
  },
  {
    key: 'nutricao',
    label: 'Nutrição',
    roleCode: 'profissional',
    specialtyName: 'Nutrição',
  },
  {
    key: 'assistencia_social',
    label: 'Assistência Social',
    roleCode: 'profissional',
    specialtyName: 'Assistência Social',
  },
  {
    key: 'psicologia',
    label: 'Psicologia',
    roleCode: 'profissional',
    specialtyName: 'Psicologia',
  },
  {
    key: 'fisioterapia',
    label: 'Fisioterapia',
    roleCode: 'profissional',
    specialtyName: 'Fisioterapia',
  },
]

function homologationTargetActive(
  accessContext: AccessContext,
  target: HomologationTarget,
) {
  const current = accessContext.homologation_context
  if (target.roleCode === null) return !current?.enabled
  if (!current?.enabled || current.role_code !== target.roleCode) return false
  if (target.specialtyName && current.specialty_name !== target.specialtyName) {
    return false
  }
  return true
}

export function ProfileShortcuts({
  accessContext,
  activePath,
  className,
  profileLabel,
  homologationService,
  onContextChange,
}: ProfileShortcutsProps) {
  const navigate = useNavigate()
  const [openedAtPath, setOpenedAtPath] = useState<string | null>(null)
  const [homologationOptions, setHomologationOptions] =
    useState<HomologationOptions | null>(null)
  const [loadingHomologation, setLoadingHomologation] = useState(false)
  const [switchingHomologation, setSwitchingHomologation] = useState(false)
  const [homologationError, setHomologationError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shortcuts = getProfileShortcuts(accessContext)
  const open = openedAtPath === activePath
  const isHomologation = accessContext.is_homologation_account
  const service = homologationService ?? getRpcService()

  useEffect(() => {
    if (!open) return
    function closeMenu(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenedAtPath(null)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenedAtPath(null)
        containerRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  async function loadHomologationOptions() {
    if (!isHomologation || homologationOptions || loadingHomologation) return
    setLoadingHomologation(true)
    setHomologationError(null)
    const result = await service.getHomologationOptions()
    setLoadingHomologation(false)
    if (result.status === 'success') {
      setHomologationOptions(result.data)
      return
    }
    setHomologationError('Não foi possível carregar os perfis de homologação.')
  }

  async function switchHomologation(target: HomologationTarget) {
    if (switchingHomologation) return
    setSwitchingHomologation(true)
    setHomologationError(null)

    if (target.roleCode === null) {
      if (!accessContext.homologation_context?.enabled) {
        setOpenedAtPath(null)
        navigate('/')
        setSwitchingHomologation(false)
        return
      }
      const result = await service.clearHomologationContext(
        'Retorno ao contexto técnico da conta de homologação.',
      )
      if (result.status === 'success') {
        await onContextChange?.()
        setOpenedAtPath(null)
        navigate('/')
        setSwitchingHomologation(false)
        return
      }
      setSwitchingHomologation(false)
      setHomologationError('Não foi possível retornar ao contexto de TI / Manutenção.')
      return
    }

    let professionalId: string | null = null
    let specialtyId: string | null = null

    if (target.specialtyName) {
      if (!homologationOptions) {
        setSwitchingHomologation(false)
        setHomologationError('Os perfis profissionais ainda não foram carregados.')
        return
      }

      specialtyId =
        homologationOptions.specialties.find(
          (specialty) => specialty.specialty_name === target.specialtyName,
        )?.specialty_id ?? null

      if (!specialtyId) {
        setSwitchingHomologation(false)
        setHomologationError(
          `Especialidade de homologação não encontrada: ${target.label}.`,
        )
        return
      }

      const homologationProfessional = homologationOptions.professionals.find(
        (professional) =>
          professional.is_homologation_stub &&
          professional.specialties.some(
            (specialty) => specialty.specialty_id === specialtyId,
          ),
      )

      professionalId = homologationProfessional?.professional_id ?? null

      if (!professionalId) {
        setSwitchingHomologation(false)
        setHomologationError(
          `Perfil técnico de homologação não encontrado para ${target.label}.`,
        )
        return
      }
    }

    const testPatient =
      homologationOptions?.test_patients.find(
        (patient) => patient.patient_number === 'TESTE-CAPO-0001',
      ) ?? homologationOptions?.test_patients[0] ?? null

    if (!testPatient) {
      setSwitchingHomologation(false)
      setHomologationError('Paciente oficial de homologação não encontrado.')
      return
    }

    const result = await service.setHomologationContext({
      roleCode: target.roleCode,
      professionalId,
      specialtyId,
      testPatientId: testPatient.patient_id,
      reason: `Homologação controlada do perfil ${target.label} com paciente teste.`,
    })

    if (result.status === 'success') {
      await onContextChange?.()
      setOpenedAtPath(null)
      navigate('/')
      setSwitchingHomologation(false)
      return
    }

    setSwitchingHomologation(false)
    setHomologationError(
      `Não foi possível abrir o perfil de homologação ${target.label}.`,
    )
  }

  if (shortcuts.length === 0 && !isHomologation) {
    return <span className={`${className} profile-shortcuts-static`} title={profileLabel}>
      <span aria-hidden="true">👤</span><span>Perfil: {profileLabel}</span>
    </span>
  }

  return <div className="profile-shortcuts" ref={containerRef}>
    <button
      className={className}
      type="button"
      aria-expanded={open}
      aria-controls="profile-shortcuts-menu"
      onClick={() => {
        const willOpen = !open
        setOpenedAtPath(willOpen ? activePath : null)
        if (willOpen) void loadHomologationOptions()
      }}
    >
      <span aria-hidden="true">👤</span><span>Perfil: {profileLabel}</span><span aria-hidden="true">⌄</span>
    </button>
    {open && <nav id="profile-shortcuts-menu" className="profile-shortcuts-menu" aria-label={isHomologation ? 'Perfis de homologação' : 'Atalhos das funções autorizadas'}>
      {isHomologation ? (
        <>
          <p className="profile-shortcuts-heading">Perfis para conferência</p>
          {homologationTargets.map((target) => {
            const active = homologationTargetActive(accessContext, target)
            return (
              <button
                type="button"
                key={target.key}
                disabled={switchingHomologation || loadingHomologation || active}
                aria-current={active ? 'page' : undefined}
                onClick={() => void switchHomologation(target)}
              >
                <span>{target.label}</span>
                {active && <small>Atual</small>}
              </button>
            )
          })}
          {loadingHomologation && <p className="profile-shortcuts-state">Carregando perfis…</p>}
          {homologationError && <p className="profile-shortcuts-error" role="alert">{homologationError}</p>}
        </>
      ) : (
        <>
          <Link to="/" onClick={() => setOpenedAtPath(null)}>Início — contexto principal</Link>
          {shortcuts.map(({ path, label }) => <Link key={path} to={path} onClick={() => setOpenedAtPath(null)}>{label}</Link>)}
        </>
      )}
    </nav>}
  </div>
}
