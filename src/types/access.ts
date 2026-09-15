export type AccessRole = Readonly<{
  code: string
  name: string
}>

// O código é deliberadamente string: os valores válidos pertencem ao contrato
// físico de resolve_user_primary_context(), não a uma prioridade do frontend.
export type PrimaryContext = Readonly<{
  role_id: string | null
  code: string | null
  name: string | null
  source: string
  is_configured: boolean
  requires_configuration: boolean
}>

export type AccessIdentity = Readonly<{
  professional_id: string | null
  full_name: string | null
  function_title: string | null
  roles: readonly AccessRole[]
  primary_context: PrimaryContext
}>

export type HomologationContext = Readonly<{
  enabled: boolean
  role_code: string | null
  role_name: string | null
  professional_id: string | null
  professional_name: string | null
  specialty_id: string | null
  specialty_name: string | null
  test_patient_id: string | null
  test_patient_name: string | null
  reason: string | null
  started_at: string | null
}>

export type AccessContext = Readonly<{
  user_account_id: string
  username: string
  is_active: boolean
  recovery_email: string | null
  professional_id: string | null
  full_name: string | null
  function_title: string | null
  professional_registration: string | null
  administrative_responsibility: string | null
  first_access_completed: boolean | null
  must_change_password: boolean | null
  roles: readonly AccessRole[]
  capabilities: readonly string[]
  primary_context: PrimaryContext
  is_homologation_account: boolean
  real_identity: AccessIdentity
  homologation_context: HomologationContext | null
}>
