import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AccessContext,
  AccessIdentity,
  AccessRole,
  HomologationContext,
  PrimaryContext,
} from '../../types/access'
import type { Database } from '../../types/database'
import { getSupabaseClient } from './client'
import {
  contractError,
  normalizeSupabaseError,
  SupabaseOperationError,
} from './errors'

export type AsyncState<T> =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'success'; data: T }>
  | Readonly<{ status: 'empty' }>
  | Readonly<{ status: 'error'; error: SupabaseOperationError }>

export const loadingState = <T>(): AsyncState<T> => ({ status: 'loading' })

export type HomologationRoleOption = Readonly<{
  role_code: string
  role_name: string
  requires_professional: boolean
  requires_specialty: boolean
}>

export type HomologationProfessionalOption = Readonly<{
  professional_id: string
  professional_name: string
  function_title: string | null
}>

export type HomologationSpecialtyOption = Readonly<{
  specialty_id: string
  specialty_name: string
  professional_id: string | null
}>

export type HomologationOptions = Readonly<{
  roles: readonly HomologationRoleOption[]
  professionals: readonly HomologationProfessionalOption[]
  specialties: readonly HomologationSpecialtyOption[]
}>

export type TeamMemberProfileInput = Readonly<{
  administrativeResponsibility: string | null
  authUserId: string | null
  birthDate: string | null
  fullName: string
  functionTitle: string | null
  isProfessional: boolean
  phone: string | null
  primarySpecialtyId: string | null
  professionalRegistration: string | null
  recoveryEmail: string | null
  roleCodes: readonly string[]
  specialtyIds: readonly string[]
  username: string | null
}>

function teamProfileArgs(input: TeamMemberProfileInput) {
  return {
    p_administrative_responsibility: input.administrativeResponsibility,
    p_birth_date: input.birthDate,
    p_full_name: input.fullName,
    p_function_title: input.functionTitle,
    p_is_professional: input.isProfessional,
    p_phone: input.phone,
    p_primary_specialty_id: input.primarySpecialtyId,
    p_professional_registration: input.professionalRegistration,
    p_recovery_email: input.recoveryEmail,
    p_role_codes: [...input.roleCodes],
    p_specialty_ids: [...input.specialtyIds],
    p_username: input.username,
  }
}

type ConfirmedJsonArgs = Readonly<Record<string, unknown>>

function parseConfirmedJson(value: unknown) {
  return value
}

export type LegalTerm = Readonly<{
  legal_term_id: string
  title: string
  version: string
  content: string
  effective_at: string
  requires_reacceptance: boolean
  accepted: boolean
  accepted_at: string | null
}>

export type LegalTermAcceptance = Readonly<{
  acceptance_id: string
  accepted_at: string
  already_accepted: boolean
}>

export type FirstAccessCompletion = Readonly<{
  professional_id: string
  first_access_completed: boolean
  must_change_password: boolean
  completed_at: string
}>

export type PendingItem = Readonly<{
  pending_type: string
  source_table: string
  source_id: string
  patient_id: string | null
  patient_name: string | null
  title: string
  status: string
  responsible_role: string
  created_at: string
  due_at: string | null
  context_module: string
  context_id: string
  priority: number | null
  total_count: number
}>

export type FamilyWaitingListItem = Readonly<Record<string, unknown>>
export type FamilyQueueCandidate = Readonly<Record<string, unknown>>
export type NutritionAdminDelivery = Readonly<Record<string, unknown>>

export type NoShowFollowup = Readonly<{
  followup_id: string
  appointment_id: string
  patient_id: string
  patient_name: string
  patient_number: string | null
  cms: string | null
  professional_id: string
  professional_name: string | null
  no_show_date: string
  active_search_status: string
  contact_attempts: number
  first_contact_at: string | null
  last_contact_at: string | null
  contact_result: string | null
  next_contact_date: string | null
  rescheduling_requested: boolean
  reschedule_request_id: string | null
  rescheduled_appointment_id: string | null
}>

export type NoShowContact = Readonly<{
  contact_id: string
  followup_id: string
  contact_method: string
  contact_result: string
  accepted_service: boolean | null
  next_action: string | null
  notes: string | null
  next_contact_date: string | null
  resulting_status: string
  created_at: string
}>

export type NoShowContactInput = Readonly<{
  followupId: string
  contactMethod: string
  contactResult: string
  acceptedService: boolean | null
  nextAction: string | null
  notes: string | null
  nextContactDate: string | null
  newStatus: string
}>

export type NoShowContactRegistration = Readonly<{
  success: boolean
  followup_id: string
  contact_id: string
  status: string
  contact_attempt_registered: boolean
  registered_at: string
}>

export type NoShowReschedulingRequest = Readonly<{
  success: boolean
  followup_id: string
  request_id: string
  status: string
  requested_at: string
}>

export type AdministrativeRequest = Readonly<{
  request_id: string
  patient_id: string | null
  patient_name: string | null
  patient_number: string | null
  cms: string | null
  requesting_professional_id: string
  requesting_professional_name: string
  subject: string
  description: string
  status: string
  administrative_response: string | null
  counter_reference: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  cancelled_at: string | null
  total_count: number
}>

export type AdministrativeRequestEvent = Readonly<{
  event_id: string
  request_id: string
  event_type: string
  from_status: string | null
  to_status: string
  detail: string | null
  counter_reference: string | null
  actor_name: string
  actor_role: string | null
  created_at: string
}>

export type AdministrativeRequestUpdate = Readonly<{
  success: boolean
  request_id: string
  action: string
  previous_status: string
  status: string
  updated_at: string
}>

export type AdministrativeRequestCreation = Readonly<{
  success: boolean
  request_id: string
  patient_id: string | null
  requesting_professional_id: string
  status: string
  created_at: string
}>

export type PrescriptionRenewalDoctor = Readonly<{
  doctor_id: string
  doctor_name: string
  function_title: string | null
  professional_registration: string | null
  has_active_account: boolean
}>

export type PrescriptionRenewal = Readonly<{
  renewal_id: string
  patient_id: string
  patient_name: string
  patient_number: string | null
  cms: string | null
  doctor_id: string
  doctor_name: string
  doctor_registration: string | null
  status: string
  request_note: string | null
  medical_feedback: string | null
  administrative_feedback: string | null
  pickup_location: string | null
  patient_contacted_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  total_count: number
}>

export type PrescriptionRenewalMutation = Readonly<{
  success: boolean
  renewal_id: string
  action?: string
  previous_status?: string
  status: string
  created_at?: string
  updated_at?: string
}>

export type BirthdayPatient = Readonly<{
  patient_id: string
  full_name: string
  patient_number: string | null
  cms: string | null
}>

export type BirthdayTeamMember = Readonly<{
  professional_id: string
  full_name: string
  function_title: string
}>

export type BirthdayOverview = Readonly<{
  reference_date: string
  time_zone: string
  patients: readonly BirthdayPatient[]
  team: readonly BirthdayTeamMember[]
}>

export type ReferralSpecialty = Readonly<{
  specialty_id: string
  specialty_name: string
}>

export type ReferralTarget = Readonly<{
  professional_id: string
  professional_name: string
}>

export type ReferralPatient = Readonly<{
  patient_id: string
  full_name: string
  patient_number: string | null
  cms: string | null
}>

export type InterprofessionalReferral = Readonly<{
  referral_id: string
  patient_id: string
  patient_name: string
  patient_number: string | null
  cms: string | null
  requesting_professional_id: string
  requesting_professional_name: string
  origin_specialty_id: string | null
  origin_specialty_name: string | null
  requested_specialty_id: string
  requested_specialty_name: string
  target_professional_id: string | null
  target_professional_name: string | null
  operational_reason: string
  response: string | null
  status: string
  direction: string
  source_appointment_id: string | null
  created_at: string
  updated_at: string
  approved_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  last_action: string | null
  total_count: number
}>

export type ReferralEvent = Readonly<{
  event_id: string
  referral_id: string
  event_type: string
  from_status: string | null
  to_status: string
  detail: string | null
  actor_name: string
  actor_role: string | null
  created_at: string
}>

export type ReferralMutation = Readonly<{
  success: boolean
  referral_id: string
  action?: string
  previous_status?: string
  status: string
  created_at?: string
  updated_at?: string
}>

export type DentistryAccessContext = Readonly<{
  professional_id: string | null
  professional_name: string | null
  can_issue: boolean
  can_manage: boolean
}>

export type DentistryPatient = Readonly<{
  patient_id: string
  full_name: string
  patient_number: string | null
  cms: string | null
}>

export type DentistryReferralHistory = Readonly<{
  event_id: string
  event_type: string
  from_status: string | null
  to_status: string
  detail: string | null
  actor_name: string
  actor_role: string | null
  created_at: string
}>

export type DentistryReferral = Readonly<{
  referral_id: string
  patient_id: string
  patient_name: string
  patient_number: string | null
  cms: string | null
  requesting_professional_id: string
  requesting_professional_name: string
  destination: string | null
  operational_reason: string
  response: string | null
  status: string
  created_at: string
  completed_at: string | null
  cancelled_at: string | null
  history: readonly DentistryReferralHistory[]
  total_count: number
}>

export type DentistryReferralMutation = Readonly<{
  success: boolean
  referral_id: string
  status: string
  previous_status?: string | null
  action?: string
  created_at?: string
  updated_at?: string
}>

export type AssistentialSpecialty = Readonly<{
  specialty_id: string
  specialty_name: string
  is_current_context: boolean
}>

export type AssistentialPatient = Readonly<{
  patient_id: string
  full_name: string
  patient_number: string | null
  cms: string | null
  status: string
  total_count: number
}>

export type AgendaAppointment = Readonly<{
  appointment_id: string
  patient_id: string
  patient_name: string
  patient_number: string | null
  professional_id: string
  professional_name: string
  specialty_name: string | null
  appointment_date: string
  appointment_end: string | null
  appointment_type: string
  attendance_status: string
  general_notes: string | null
  rescheduled_from_id: string | null
  reschedule_reason: string | null
  reschedule_origin: string | null
}>

export type CreatedPatient = Readonly<{
  patient_id: string
  patient_number: string
  full_name: string
  cms: string
  birth_date: string
  origin: string
  status: string
  created_at: string
}>

export type AvailableAppointmentSlot = Readonly<{
  professional_id: string
  slot_date: string
  slot_time: string
  slot_start: string
  slot_end: string
  duration_minutes: number
}>

export type ReschedulableAppointment = Readonly<{
  appointment_id: string
  patient_id: string
  patient_name: string
  patient_number: string
  cms: string
  professional_id: string
  professional_name: string
  appointment_date: string
  appointment_end: string
  appointment_type: string
  attendance_status: string
  total_count: number
}>

export type OperationalReportSection = Readonly<
  Record<string, string | number | boolean>
>

export type AssistentialOperationalReport = Readonly<{
  specialty_id: string
  specialty_name: string
  start_date: string
  end_date: string
  agenda: OperationalReportSection
  retornos: OperationalReportSection
  fila_especialidade: OperationalReportSection
  solicitacoes: OperationalReportSection
  encaminhamentos: OperationalReportSection
  encerramentos: OperationalReportSection
}>

export type TechnicalBreakdownItem = Readonly<{
  label: string
  count: number
}>

export type TechnicalRecentError = Readonly<{
  id: string
  occurred_at: string
  severity: string
  component: string
  operation_name: string | null
  event_code: string | null
  result: string
  technical_message: string | null
  correlation_id: string | null
  support_request_id: string | null
  duration_ms: number | null
}>

export type TechnicalDashboard = Readonly<{
  period: Readonly<{ start_at: string; end_at: string }>
  support: OperationalReportSection
  runtime: Readonly<{
    by_severity: OperationalReportSection
    by_component: readonly TechnicalBreakdownItem[]
    by_event_code: readonly TechnicalBreakdownItem[]
    by_result: readonly TechnicalBreakdownItem[]
    recent_errors: readonly TechnicalRecentError[]
  }>
}>

export type TechnicalSystemComponent = Readonly<{
  component: string
  label: string
  status: string
  verification: string
  detail: string
  checked_at: string
}>

export type TechnicalSystemStatus = Readonly<{
  checked_at: string
  components: readonly TechnicalSystemComponent[]
}>

export type TechnicalIntegration = Readonly<{
  technical_name: string
  type: string
  configured: boolean | null
  configuration_verifiable_from_database: boolean
  status: string
  last_success_at: string | null
  last_error_at: string | null
  last_error_code: string | null
  last_error_message: string | null
  evidence: string
  monitoring_source: string
}>

export type TechnicalIntegrationInventory = Readonly<{
  inventoried_at: string
  integrations: readonly TechnicalIntegration[]
}>

export type TechnicalRuntimeLog = Readonly<{
  id: string
  occurred_at: string
  severity: string
  component: string
  operation_name: string | null
  event_code: string | null
  result: string
  technical_message: string | null
  correlation_id: string | null
  actor_account_id: string | null
  support_request_id: string | null
  duration_ms: number | null
  total_count: number
}>

export type TechnicalSupportRequest = Readonly<{
  request_id: string
  requester_username: string
  assigned_username: string | null
  category: string
  subject: string
  description: string
  priority: string
  status: string
  technical_response: string | null
  requires_user_test: boolean
  user_test_result: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  resolved_at: string | null
  total_count: number
}>

export type TechnicalSupportHistoryEvent = Readonly<{
  audit_id: string
  occurred_at: string
  action: string
  actor_account_id: string | null
  previous_status: string | null
  new_status: string | null
  previous_assigned_account_id: string | null
  new_assigned_account_id: string | null
  resolved_by_account_id: string | null
  requires_user_test: boolean | null
  user_test_approved: boolean | null
  started_at: string | null
  resolved_at: string | null
  user_tested_at: string | null
}>

export type TechnicalSupportHistory = Readonly<{
  request_id: string
  events: readonly TechnicalSupportHistoryEvent[]
}>

type RpcResult = { data: unknown; error: unknown }

export type RpcTransport = (
  operation: string,
  args?: Record<string, unknown>,
) => Promise<RpcResult>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  operation: string,
): string {
  const value = record[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw contractError(operation, `${key} deve ser texto não vazio.`)
  }
  return value
}

function nullableString(
  record: Record<string, unknown>,
  key: string,
  operation: string,
): string | null {
  const value = record[key]
  if (value !== null && typeof value !== 'string') {
    throw contractError(operation, `${key} deve ser texto ou null.`)
  }
  return value
}

function requiredBoolean(
  record: Record<string, unknown>,
  key: string,
  operation: string,
): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw contractError(operation, `${key} deve ser booleano.`)
  }
  return value
}

function nullableBoolean(
  record: Record<string, unknown>,
  key: string,
  operation: string,
): boolean | null {
  const value = record[key]
  if (value !== null && typeof value !== 'boolean') {
    throw contractError(operation, `${key} deve ser booleano ou null.`)
  }
  return value
}

function requiredNumber(
  record: Record<string, unknown>,
  key: string,
  operation: string,
): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw contractError(operation, `${key} deve ser numérico.`)
  }
  return value
}

function nullableNumber(
  record: Record<string, unknown>,
  key: string,
  operation: string,
): number | null {
  const value = record[key]
  if (
    value !== null &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw contractError(operation, `${key} deve ser numérico ou null.`)
  }
  return value
}

function parseRole(value: unknown, operation: string): AccessRole {
  if (!isRecord(value)) throw contractError(operation, 'papel inválido.')
  return {
    code: requiredString(value, 'code', operation),
    name: requiredString(value, 'name', operation),
  }
}

function parseRoles(value: unknown, operation: string): readonly AccessRole[] {
  if (!Array.isArray(value)) {
    throw contractError(operation, 'roles deve ser uma lista.')
  }
  return value.map((role) => parseRole(role, operation))
}

function parsePrimaryContext(
  value: unknown,
  operation: string,
): PrimaryContext {
  if (!isRecord(value)) {
    throw contractError(operation, 'primary_context deve ser um objeto.')
  }
  return {
    role_id: nullableString(value, 'role_id', operation),
    code: nullableString(value, 'code', operation),
    name: nullableString(value, 'name', operation),
    source: requiredString(value, 'source', operation),
    is_configured: requiredBoolean(value, 'is_configured', operation),
    requires_configuration: requiredBoolean(
      value,
      'requires_configuration',
      operation,
    ),
  }
}

function parseIdentity(value: unknown, operation: string): AccessIdentity {
  if (!isRecord(value)) {
    throw contractError(operation, 'real_identity deve ser um objeto.')
  }
  return {
    professional_id: nullableString(value, 'professional_id', operation),
    full_name: nullableString(value, 'full_name', operation),
    function_title: nullableString(value, 'function_title', operation),
    roles: parseRoles(value.roles, operation),
    primary_context: parsePrimaryContext(value.primary_context, operation),
  }
}

function parseHomologationContext(
  value: unknown,
  operation: string,
): HomologationContext | null {
  if (value === null) return null
  if (!isRecord(value)) {
    throw contractError(
      operation,
      'homologation_context deve ser objeto ou null.',
    )
  }
  return {
    enabled: requiredBoolean(value, 'enabled', operation),
    role_code: nullableString(value, 'role_code', operation),
    role_name: nullableString(value, 'role_name', operation),
    professional_id: nullableString(value, 'professional_id', operation),
    professional_name: nullableString(value, 'professional_name', operation),
    specialty_id: nullableString(value, 'specialty_id', operation),
    specialty_name: nullableString(value, 'specialty_name', operation),
    test_patient_id: nullableString(value, 'test_patient_id', operation),
    test_patient_name: nullableString(value, 'test_patient_name', operation),
    reason: nullableString(value, 'reason', operation),
    started_at: nullableString(value, 'started_at', operation),
  }
}

function optionString(
  record: Record<string, unknown>,
  keys: readonly string[],
  operation: string,
) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  throw contractError(operation, `${keys[0]} ausente ou inválido.`)
}

function optionArray(
  record: Record<string, unknown>,
  keys: readonly string[],
  operation: string,
) {
  for (const key of keys) {
    const value = record[key]
    if (Array.isArray(value)) return value
  }
  throw contractError(operation, `${keys[0]} deve ser uma lista.`)
}

function parseHomologationOptions(value: unknown): HomologationOptions {
  const operation = 'get_homologation_options_for_interface'
  const candidate = Array.isArray(value) && value.length === 1 ? value[0] : value
  if (!isRecord(candidate)) throw contractError(operation, 'objeto esperado.')

  return {
    roles: optionArray(candidate, ['roles', 'available_roles'], operation).map((item) => {
      if (!isRecord(item)) throw contractError(operation, 'papel inválido.')
      return {
        role_code: optionString(item, ['role_code', 'code'], operation),
        role_name: optionString(item, ['role_name', 'name'], operation),
        requires_professional: item.requires_professional === true,
        requires_specialty: item.requires_specialty === true,
      }
    }),
    professionals: optionArray(candidate, ['professionals', 'available_professionals'], operation).map((item) => {
      if (!isRecord(item)) throw contractError(operation, 'profissional inválido.')
      return {
        professional_id: optionString(item, ['professional_id', 'id'], operation),
        professional_name: optionString(item, ['professional_name', 'full_name', 'name'], operation),
        function_title: typeof item.function_title === 'string' ? item.function_title : null,
      }
    }),
    specialties: optionArray(candidate, ['specialties', 'available_specialties'], operation).map((item) => {
      if (!isRecord(item)) throw contractError(operation, 'especialidade inválida.')
      return {
        specialty_id: optionString(item, ['specialty_id', 'id'], operation),
        specialty_name: optionString(item, ['specialty_name', 'name'], operation),
        professional_id: typeof item.professional_id === 'string' ? item.professional_id : null,
      }
    }),
  }
}

function parseAccessContext(value: unknown): AccessContext {
  const operation = 'get_my_access_context'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  if (!Array.isArray(value.capabilities)) {
    throw contractError(operation, 'capabilities deve ser uma lista.')
  }
  const capabilities = value.capabilities.map((capability) => {
    if (typeof capability !== 'string' || capability.length === 0) {
      throw contractError(operation, 'capability inválida.')
    }
    return capability
  })

  return {
    user_account_id: requiredString(value, 'user_account_id', operation),
    username: requiredString(value, 'username', operation),
    is_active: requiredBoolean(value, 'is_active', operation),
    recovery_email: nullableString(value, 'recovery_email', operation),
    professional_id: nullableString(value, 'professional_id', operation),
    primary_specialty_name: value.primary_specialty_name === undefined
      ? null
      : nullableString(value, 'primary_specialty_name', operation),
    specialties: Array.isArray(value.specialties)
      ? value.specialties.map((item) => {
          if (!isRecord(item)) throw contractError(operation, 'especialidade inválida.')
          return {
            specialty_id: requiredString(item, 'specialty_id', operation),
            specialty_name: requiredString(item, 'specialty_name', operation),
            is_primary: requiredBoolean(item, 'is_primary', operation),
          }
        })
      : [],
    full_name: nullableString(value, 'full_name', operation),
    function_title: nullableString(value, 'function_title', operation),
    professional_registration: nullableString(
      value,
      'professional_registration',
      operation,
    ),
    administrative_responsibility: nullableString(
      value,
      'administrative_responsibility',
      operation,
    ),
    first_access_completed: nullableBoolean(
      value,
      'first_access_completed',
      operation,
    ),
    must_change_password: nullableBoolean(
      value,
      'must_change_password',
      operation,
    ),
    roles: parseRoles(value.roles, operation),
    capabilities,
    primary_context: parsePrimaryContext(value.primary_context, operation),
    is_homologation_account: requiredBoolean(
      value,
      'is_homologation_account',
      operation,
    ),
    real_identity: parseIdentity(value.real_identity, operation),
    homologation_context: parseHomologationContext(
      value.homologation_context,
      operation,
    ),
  }
}

function parseLegalTerm(value: unknown): LegalTerm {
  const operation = 'get_current_legal_term'
  if (!isRecord(value)) throw contractError(operation, 'linha inválida.')
  return {
    legal_term_id: requiredString(value, 'legal_term_id', operation),
    title: requiredString(value, 'title', operation),
    version: requiredString(value, 'version', operation),
    content: requiredString(value, 'content', operation),
    effective_at: requiredString(value, 'effective_at', operation),
    requires_reacceptance: requiredBoolean(
      value,
      'requires_reacceptance',
      operation,
    ),
    accepted: requiredBoolean(value, 'accepted', operation),
    accepted_at: nullableString(value, 'accepted_at', operation),
  }
}

function parseAcceptance(value: unknown): LegalTermAcceptance {
  const operation = 'accept_legal_term'
  if (!isRecord(value)) throw contractError(operation, 'linha inválida.')
  return {
    acceptance_id: requiredString(value, 'acceptance_id', operation),
    accepted_at: requiredString(value, 'accepted_at', operation),
    already_accepted: requiredBoolean(value, 'already_accepted', operation),
  }
}

function parseFirstAccess(value: unknown): FirstAccessCompletion {
  const operation = 'complete_first_access'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    professional_id: requiredString(value, 'professional_id', operation),
    first_access_completed: requiredBoolean(
      value,
      'first_access_completed',
      operation,
    ),
    must_change_password: requiredBoolean(
      value,
      'must_change_password',
      operation,
    ),
    completed_at: requiredString(value, 'completed_at', operation),
  }
}

function parsePendingItems(value: unknown): readonly PendingItem[] {
  const operation = 'get_pending_items_for_interface'
  if (!Array.isArray(value)) {
    throw contractError(operation, 'lista de pendências esperada.')
  }

  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      pending_type: requiredString(item, 'pending_type', operation),
      source_table: requiredString(item, 'source_table', operation),
      source_id: requiredString(item, 'source_id', operation),
      patient_id: nullableString(item, 'patient_id', operation),
      patient_name: nullableString(item, 'patient_name', operation),
      title: requiredString(item, 'title', operation),
      status: requiredString(item, 'status', operation),
      responsible_role: requiredString(item, 'responsible_role', operation),
      created_at: requiredString(item, 'created_at', operation),
      due_at: nullableString(item, 'due_at', operation),
      context_module: requiredString(item, 'context_module', operation),
      context_id: requiredString(item, 'context_id', operation),
      priority: nullableNumber(item, 'priority', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseNoShowFollowups(value: unknown): readonly NoShowFollowup[] {
  const operation = 'get_no_show_followups_for_interface'
  if (!Array.isArray(value)) {
    throw contractError(operation, 'lista de faltosos esperada.')
  }
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      followup_id: requiredString(item, 'followup_id', operation),
      appointment_id: requiredString(item, 'appointment_id', operation),
      patient_id: requiredString(item, 'patient_id', operation),
      patient_name: requiredString(item, 'patient_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
      professional_id: requiredString(item, 'professional_id', operation),
      professional_name: nullableString(item, 'professional_name', operation),
      no_show_date: requiredString(item, 'no_show_date', operation),
      active_search_status: requiredString(
        item,
        'active_search_status',
        operation,
      ),
      contact_attempts: requiredNumber(item, 'contact_attempts', operation),
      first_contact_at: nullableString(item, 'first_contact_at', operation),
      last_contact_at: nullableString(item, 'last_contact_at', operation),
      contact_result: nullableString(item, 'contact_result', operation),
      next_contact_date: nullableString(item, 'next_contact_date', operation),
      rescheduling_requested: requiredBoolean(
        item,
        'rescheduling_requested',
        operation,
      ),
      reschedule_request_id: nullableString(
        item,
        'reschedule_request_id',
        operation,
      ),
      rescheduled_appointment_id: nullableString(
        item,
        'rescheduled_appointment_id',
        operation,
      ),
    }
  })
}

function parseNoShowContacts(value: unknown): readonly NoShowContact[] {
  const operation = 'get_no_show_contacts_for_interface'
  if (!Array.isArray(value)) {
    throw contractError(operation, 'histórico de contatos esperado.')
  }
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      contact_id: requiredString(item, 'contact_id', operation),
      followup_id: requiredString(item, 'followup_id', operation),
      contact_method: requiredString(item, 'contact_method', operation),
      contact_result: requiredString(item, 'contact_result', operation),
      accepted_service: nullableBoolean(item, 'accepted_service', operation),
      next_action: nullableString(item, 'next_action', operation),
      notes: nullableString(item, 'notes', operation),
      next_contact_date: nullableString(item, 'next_contact_date', operation),
      resulting_status: requiredString(item, 'resulting_status', operation),
      created_at: requiredString(item, 'created_at', operation),
    }
  })
}

function parseNoShowContactRegistration(
  value: unknown,
): NoShowContactRegistration {
  const operation = 'register_no_show_contact_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    followup_id: requiredString(value, 'followup_id', operation),
    contact_id: requiredString(value, 'contact_id', operation),
    status: requiredString(value, 'status', operation),
    contact_attempt_registered: requiredBoolean(
      value,
      'contact_attempt_registered',
      operation,
    ),
    registered_at: requiredString(value, 'registered_at', operation),
  }
}

function parseNoShowReschedulingRequest(
  value: unknown,
): NoShowReschedulingRequest {
  const operation = 'request_no_show_rescheduling_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    followup_id: requiredString(value, 'followup_id', operation),
    request_id: requiredString(value, 'request_id', operation),
    status: requiredString(value, 'status', operation),
    requested_at: requiredString(value, 'requested_at', operation),
  }
}

function parseAdministrativeRequests(
  value: unknown,
): readonly AdministrativeRequest[] {
  const operation = 'get_administrative_requests_for_interface'
  if (!Array.isArray(value))
    throw contractError(operation, 'lista de solicitações esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      request_id: requiredString(item, 'request_id', operation),
      patient_id: nullableString(item, 'patient_id', operation),
      patient_name: nullableString(item, 'patient_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
      requesting_professional_id: requiredString(
        item,
        'requesting_professional_id',
        operation,
      ),
      requesting_professional_name: requiredString(
        item,
        'requesting_professional_name',
        operation,
      ),
      subject: requiredString(item, 'subject', operation),
      description: requiredString(item, 'description', operation),
      status: requiredString(item, 'status', operation),
      administrative_response: nullableString(
        item,
        'administrative_response',
        operation,
      ),
      counter_reference: nullableString(item, 'counter_reference', operation),
      created_at: requiredString(item, 'created_at', operation),
      updated_at: requiredString(item, 'updated_at', operation),
      completed_at: nullableString(item, 'completed_at', operation),
      cancelled_at: nullableString(item, 'cancelled_at', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseAdministrativeRequestEvents(
  value: unknown,
): readonly AdministrativeRequestEvent[] {
  const operation = 'get_administrative_request_events_for_interface'
  if (!Array.isArray(value))
    throw contractError(operation, 'histórico de solicitações esperado.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      event_id: requiredString(item, 'event_id', operation),
      request_id: requiredString(item, 'request_id', operation),
      event_type: requiredString(item, 'event_type', operation),
      from_status: nullableString(item, 'from_status', operation),
      to_status: requiredString(item, 'to_status', operation),
      detail: nullableString(item, 'detail', operation),
      counter_reference: nullableString(item, 'counter_reference', operation),
      actor_name: requiredString(item, 'actor_name', operation),
      actor_role: nullableString(item, 'actor_role', operation),
      created_at: requiredString(item, 'created_at', operation),
    }
  })
}

function parseAdministrativeRequestUpdate(
  value: unknown,
): AdministrativeRequestUpdate {
  const operation = 'update_administrative_request_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    request_id: requiredString(value, 'request_id', operation),
    action: requiredString(value, 'action', operation),
    previous_status: requiredString(value, 'previous_status', operation),
    status: requiredString(value, 'status', operation),
    updated_at: requiredString(value, 'updated_at', operation),
  }
}

function parseAdministrativeRequestCreation(
  value: unknown,
): AdministrativeRequestCreation {
  const operation = 'create_administrative_request_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    request_id: requiredString(value, 'request_id', operation),
    patient_id: nullableString(value, 'patient_id', operation),
    requesting_professional_id: requiredString(
      value,
      'requesting_professional_id',
      operation,
    ),
    status: requiredString(value, 'status', operation),
    created_at: requiredString(value, 'created_at', operation),
  }
}

function parsePrescriptionRenewalDoctors(
  value: unknown,
): readonly PrescriptionRenewalDoctor[] {
  const operation = 'get_prescription_renewal_doctors_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      doctor_id: requiredString(item, 'professional_id', operation),
      doctor_name: requiredString(item, 'full_name', operation),
      function_title: nullableString(item, 'function_title', operation),
      professional_registration: nullableString(
        item,
        'professional_registration',
        operation,
      ),
      has_active_account: requiredBoolean(item, 'has_active_account', operation),
    }
  })
}

function parsePrescriptionRenewalCreation(
  value: unknown,
): PrescriptionRenewalMutation {
  const operation = 'create_prescription_renewal_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    renewal_id: requiredString(value, 'request_id', operation),
    action: typeof value.action === 'string' ? value.action : undefined,
    previous_status:
      typeof value.previous_status === 'string'
        ? value.previous_status
        : undefined,
    status: requiredString(value, 'status', operation),
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at:
      typeof value.updated_at === 'string' ? value.updated_at : undefined,
  }
}

function parsePrescriptionRenewals(
  value: unknown,
): readonly PrescriptionRenewal[] {
  const operation = 'get_prescription_renewals_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      renewal_id: requiredString(item, 'request_id', operation),
      patient_id: requiredString(item, 'patient_id', operation),
      patient_name: requiredString(item, 'patient_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
      doctor_id: requiredString(item, 'target_doctor_id', operation),
      doctor_name: requiredString(item, 'target_doctor_name', operation),
      doctor_registration: nullableString(item, 'target_doctor_registration', operation),
      status: requiredString(item, 'status', operation),
      request_note: nullableString(item, 'administrative_note', operation),
      medical_feedback: nullableString(item, 'medical_return', operation),
      administrative_feedback: nullableString(item, 'final_admin_note', operation),
      pickup_location: nullableString(item, 'pickup_location', operation),
      patient_contacted_at: nullableString(item, 'patient_contacted_at', operation),
      cancellation_reason: nullableString(item, 'cancellation_reason', operation),
      created_at: requiredString(item, 'requested_at', operation),
      updated_at: requiredString(item, 'updated_at', operation),
      reviewed_at: nullableString(item, 'medical_returned_at', operation),
      completed_at: nullableString(item, 'completed_at', operation),
      cancelled_at: nullableString(item, 'cancelled_at', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parsePrescriptionRenewalMutation(
  value: unknown,
): PrescriptionRenewalMutation {
  const operation = 'manage_prescription_renewal_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    renewal_id: requiredString(value, 'request_id', operation),
    action: typeof value.action === 'string' ? value.action : undefined,
    previous_status:
      typeof value.previous_status === 'string'
        ? value.previous_status
        : undefined,
    status: requiredString(value, 'status', operation),
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at:
      typeof value.updated_at === 'string' ? value.updated_at : undefined,
  }
}

function parseBirthdayOverview(value: unknown): BirthdayOverview {
  const operation = 'get_birthdays_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  if (!Array.isArray(value.patients) || !Array.isArray(value.team)) {
    throw contractError(operation, 'listas de aniversariantes esperadas.')
  }
  return {
    reference_date: requiredString(value, 'reference_date', operation),
    time_zone: requiredString(value, 'time_zone', operation),
    patients: value.patients.map((item) => {
      if (!isRecord(item)) throw contractError(operation, 'paciente inválido.')
      return {
        patient_id: requiredString(item, 'patient_id', operation),
        full_name: requiredString(item, 'full_name', operation),
        patient_number: nullableString(item, 'patient_number', operation),
        cms: nullableString(item, 'cms', operation),
      }
    }),
    team: value.team.map((item) => {
      if (!isRecord(item))
        throw contractError(operation, 'integrante inválido.')
      return {
        professional_id: requiredString(item, 'professional_id', operation),
        full_name: requiredString(item, 'full_name', operation),
        function_title: requiredString(item, 'function_title', operation),
      }
    }),
  }
}

function parseReferralSpecialties(
  value: unknown,
): readonly ReferralSpecialty[] {
  const operation = 'get_interprofessional_referral_specialties_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      specialty_id: requiredString(item, 'specialty_id', operation),
      specialty_name: requiredString(item, 'specialty_name', operation),
    }
  })
}

function parseReferralTargets(value: unknown): readonly ReferralTarget[] {
  const operation = 'get_interprofessional_referral_targets_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      professional_id: requiredString(item, 'professional_id', operation),
      professional_name: requiredString(item, 'professional_name', operation),
    }
  })
}

function parseReferralPatients(value: unknown): readonly ReferralPatient[] {
  const operation = 'search_patients_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      patient_id: requiredString(item, 'patient_id', operation),
      full_name: requiredString(item, 'full_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
    }
  })
}

function parseInterprofessionalReferrals(
  value: unknown,
): readonly InterprofessionalReferral[] {
  const operation = 'get_interprofessional_referrals_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      referral_id: requiredString(item, 'referral_id', operation),
      patient_id: requiredString(item, 'patient_id', operation),
      patient_name: requiredString(item, 'patient_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
      requesting_professional_id: requiredString(
        item,
        'requesting_professional_id',
        operation,
      ),
      requesting_professional_name: requiredString(
        item,
        'requesting_professional_name',
        operation,
      ),
      origin_specialty_id: nullableString(
        item,
        'origin_specialty_id',
        operation,
      ),
      origin_specialty_name: nullableString(
        item,
        'origin_specialty_name',
        operation,
      ),
      requested_specialty_id: requiredString(
        item,
        'requested_specialty_id',
        operation,
      ),
      requested_specialty_name: requiredString(
        item,
        'requested_specialty_name',
        operation,
      ),
      target_professional_id: nullableString(
        item,
        'target_professional_id',
        operation,
      ),
      target_professional_name: nullableString(
        item,
        'target_professional_name',
        operation,
      ),
      operational_reason: requiredString(item, 'operational_reason', operation),
      response: nullableString(item, 'response', operation),
      status: requiredString(item, 'status', operation),
      direction: requiredString(item, 'direction', operation),
      source_appointment_id: nullableString(
        item,
        'source_appointment_id',
        operation,
      ),
      created_at: requiredString(item, 'created_at', operation),
      updated_at: requiredString(item, 'updated_at', operation),
      approved_at: nullableString(item, 'approved_at', operation),
      completed_at: nullableString(item, 'completed_at', operation),
      cancelled_at: nullableString(item, 'cancelled_at', operation),
      last_action: nullableString(item, 'last_action', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseReferralEvents(value: unknown): readonly ReferralEvent[] {
  const operation = 'get_interprofessional_referral_events_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      event_id: requiredString(item, 'event_id', operation),
      referral_id: requiredString(item, 'referral_id', operation),
      event_type: requiredString(item, 'event_type', operation),
      from_status: nullableString(item, 'from_status', operation),
      to_status: requiredString(item, 'to_status', operation),
      detail: nullableString(item, 'detail', operation),
      actor_name: requiredString(item, 'actor_name', operation),
      actor_role: nullableString(item, 'actor_role', operation),
      created_at: requiredString(item, 'created_at', operation),
    }
  })
}

function parseReferralMutation(value: unknown): ReferralMutation {
  const operation = 'interprofessional_referral_mutation'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    success: requiredBoolean(value, 'success', operation),
    referral_id: requiredString(value, 'referral_id', operation),
    action: typeof value.action === 'string' ? value.action : undefined,
    previous_status:
      typeof value.previous_status === 'string'
        ? value.previous_status
        : undefined,
    status: requiredString(value, 'status', operation),
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at:
      typeof value.updated_at === 'string' ? value.updated_at : undefined,
  }
}

function parseDentistryAccessContext(value: unknown): DentistryAccessContext {
  const operation = 'get_dentistry_access_context_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')

  return {
    professional_id: nullableString(value, 'professional_id', operation),
    professional_name: nullableString(value, 'professional_name', operation),
    can_issue: requiredBoolean(value, 'can_issue', operation),
    can_manage: requiredBoolean(value, 'can_manage', operation),
  }
}

function parseDentistryPatients(value: unknown): readonly DentistryPatient[] {
  const operation = 'search_dentistry_patients_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')

  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      patient_id: requiredString(item, 'patient_id', operation),
      full_name: requiredString(item, 'full_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
    }
  })
}

function parseDentistryReferralHistory(
  value: unknown,
  operation: string,
): readonly DentistryReferralHistory[] {
  if (!Array.isArray(value)) {
    throw contractError(operation, 'history deve ser uma lista.')
  }

  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'evento inválido.')
    return {
      event_id: requiredString(item, 'event_id', operation),
      event_type: requiredString(item, 'event_type', operation),
      from_status: nullableString(item, 'from_status', operation),
      to_status: requiredString(item, 'to_status', operation),
      detail: nullableString(item, 'detail', operation),
      actor_name: requiredString(item, 'actor_name', operation),
      actor_role: nullableString(item, 'actor_role', operation),
      created_at: requiredString(item, 'created_at', operation),
    }
  })
}

function parseDentistryReferrals(value: unknown): readonly DentistryReferral[] {
  const operation = 'get_dentistry_referrals_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')

  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      referral_id: requiredString(item, 'referral_id', operation),
      patient_id: requiredString(item, 'patient_id', operation),
      patient_name: requiredString(item, 'patient_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
      requesting_professional_id: requiredString(
        item,
        'requesting_professional_id',
        operation,
      ),
      requesting_professional_name: requiredString(
        item,
        'requesting_professional_name',
        operation,
      ),
      destination: nullableString(item, 'destination', operation),
      operational_reason: requiredString(item, 'operational_reason', operation),
      response: nullableString(item, 'response', operation),
      status: requiredString(item, 'status', operation),
      created_at: requiredString(item, 'created_at', operation),
      completed_at: nullableString(item, 'completed_at', operation),
      cancelled_at: nullableString(item, 'cancelled_at', operation),
      history: parseDentistryReferralHistory(item.history, operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseDentistryReferralMutation(
  value: unknown,
): DentistryReferralMutation {
  const operation = 'dentistry_referral_mutation'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')

  return {
    success: requiredBoolean(value, 'success', operation),
    referral_id: requiredString(value, 'referral_id', operation),
    status: requiredString(value, 'status', operation),
    previous_status:
      value.previous_status === null ||
      typeof value.previous_status === 'string'
        ? value.previous_status
        : undefined,
    action: typeof value.action === 'string' ? value.action : undefined,
    created_at:
      typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at:
      typeof value.updated_at === 'string' ? value.updated_at : undefined,
  }
}

function parseAssistentialSpecialties(
  value: unknown,
): readonly AssistentialSpecialty[] {
  const operation = 'get_my_assistential_specialties_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      specialty_id: requiredString(item, 'specialty_id', operation),
      specialty_name: requiredString(item, 'specialty_name', operation),
      is_current_context: requiredBoolean(
        item,
        'is_current_context',
        operation,
      ),
    }
  })
}

function parseAssistentialPatients(
  value: unknown,
): readonly AssistentialPatient[] {
  const operation = 'search_my_patients_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      patient_id: requiredString(item, 'patient_id', operation),
      full_name: requiredString(item, 'full_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      cms: nullableString(item, 'cms', operation),
      status: requiredString(item, 'status', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseCreatedPatient(value: unknown): CreatedPatient {
  const operation = 'create_patient_for_interface'
  const item = Array.isArray(value) ? value[0] : value
  if (!isRecord(item)) throw contractError(operation, 'objeto esperado.')
  return {
    patient_id: requiredString(item, 'patient_id', operation),
    patient_number: requiredString(item, 'patient_number', operation),
    full_name: requiredString(item, 'full_name', operation),
    cms: requiredString(item, 'cms', operation),
    birth_date: requiredString(item, 'birth_date', operation),
    origin: requiredString(item, 'origin', operation),
    status: requiredString(item, 'status', operation),
    created_at: requiredString(item, 'created_at', operation),
  }
}

function parseAvailableAppointmentSlots(
  value: unknown,
): readonly AvailableAppointmentSlot[] {
  const operation = 'get_available_appointment_slots'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      professional_id: requiredString(item, 'professional_id', operation),
      slot_date: requiredString(item, 'slot_date', operation),
      slot_time: requiredString(item, 'slot_time', operation),
      slot_start: requiredString(item, 'slot_start', operation),
      slot_end: requiredString(item, 'slot_end', operation),
      duration_minutes: requiredNumber(item, 'duration_minutes', operation),
    }
  })
}

function parseReschedulableAppointments(
  value: unknown,
): readonly ReschedulableAppointment[] {
  const operation = 'get_reschedulable_appointments'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      appointment_id: requiredString(item, 'appointment_id', operation),
      patient_id: requiredString(item, 'patient_id', operation),
      patient_name: requiredString(item, 'patient_name', operation),
      patient_number: requiredString(item, 'patient_number', operation),
      cms: requiredString(item, 'cms', operation),
      professional_id: requiredString(item, 'professional_id', operation),
      professional_name: requiredString(item, 'professional_name', operation),
      appointment_date: requiredString(item, 'appointment_date', operation),
      appointment_end: requiredString(item, 'appointment_end', operation),
      appointment_type: requiredString(item, 'appointment_type', operation),
      attendance_status: requiredString(item, 'attendance_status', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseAgendaAppointments(value: unknown): readonly AgendaAppointment[] {
  const operation = 'get_agenda_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'linha inválida.')
    return {
      appointment_id: requiredString(item, 'appointment_id', operation),
      patient_id: requiredString(item, 'patient_id', operation),
      patient_name: requiredString(item, 'patient_name', operation),
      patient_number: nullableString(item, 'patient_number', operation),
      professional_id: requiredString(item, 'professional_id', operation),
      professional_name: requiredString(item, 'professional_name', operation),
      specialty_name: nullableString(item, 'specialty_name', operation),
      appointment_date: requiredString(item, 'appointment_date', operation),
      appointment_end: nullableString(item, 'appointment_end', operation),
      appointment_type: requiredString(item, 'appointment_type', operation),
      attendance_status: requiredString(item, 'attendance_status', operation),
      general_notes: nullableString(item, 'general_notes', operation),
      rescheduled_from_id: nullableString(
        item,
        'rescheduled_from_id',
        operation,
      ),
      reschedule_reason: nullableString(item, 'reschedule_reason', operation),
      reschedule_origin: nullableString(item, 'reschedule_origin', operation),
    }
  })
}

function parseOperationalReportSection(
  value: unknown,
  operation: string,
): OperationalReportSection {
  if (!isRecord(value)) throw contractError(operation, 'seção inválida.')
  const parsed: Record<string, string | number | boolean> = {}
  for (const [key, item] of Object.entries(value)) {
    if (
      typeof item !== 'string' &&
      typeof item !== 'number' &&
      typeof item !== 'boolean'
    ) {
      throw contractError(operation, `métrica ${key} inválida.`)
    }
    parsed[key] = item
  }
  return parsed
}

function parseAssistentialOperationalReport(
  value: unknown,
): AssistentialOperationalReport {
  const operation = 'get_my_specialty_operational_report_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  return {
    specialty_id: requiredString(value, 'specialty_id', operation),
    specialty_name: requiredString(value, 'specialty_name', operation),
    start_date: requiredString(value, 'start_date', operation),
    end_date: requiredString(value, 'end_date', operation),
    agenda: parseOperationalReportSection(value.agenda, operation),
    retornos: parseOperationalReportSection(value.retornos, operation),
    fila_especialidade: parseOperationalReportSection(
      value.fila_especialidade,
      operation,
    ),
    solicitacoes: parseOperationalReportSection(value.solicitacoes, operation),
    encaminhamentos: parseOperationalReportSection(
      value.encaminhamentos,
      operation,
    ),
    encerramentos: parseOperationalReportSection(
      value.encerramentos,
      operation,
    ),
  }
}

function parseTechnicalBreakdown(
  value: unknown,
  key: 'component' | 'event_code' | 'result',
  operation: string,
): readonly TechnicalBreakdownItem[] {
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'item inválido.')
    return {
      label: requiredString(item, key, operation),
      count: requiredNumber(item, 'count', operation),
    }
  })
}

function parseTechnicalRecentError(
  value: unknown,
  operation: string,
): TechnicalRecentError {
  if (!isRecord(value)) throw contractError(operation, 'evento inválido.')
  return {
    id: requiredString(value, 'id', operation),
    occurred_at: requiredString(value, 'occurred_at', operation),
    severity: requiredString(value, 'severity', operation),
    component: requiredString(value, 'component', operation),
    operation_name: nullableString(value, 'operation_name', operation),
    event_code: nullableString(value, 'event_code', operation),
    result: requiredString(value, 'result', operation),
    technical_message: nullableString(value, 'technical_message', operation),
    correlation_id: nullableString(value, 'correlation_id', operation),
    support_request_id: nullableString(value, 'support_request_id', operation),
    duration_ms: nullableNumber(value, 'duration_ms', operation),
  }
}

function parseTechnicalDashboard(value: unknown): TechnicalDashboard {
  const operation = 'get_technical_dashboard_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'objeto esperado.')
  if (!isRecord(value.period) || !isRecord(value.runtime)) {
    throw contractError(operation, 'seções obrigatórias ausentes.')
  }
  if (!Array.isArray(value.runtime.recent_errors)) {
    throw contractError(operation, 'recent_errors deve ser lista.')
  }
  return {
    period: {
      start_at: requiredString(value.period, 'start_at', operation),
      end_at: requiredString(value.period, 'end_at', operation),
    },
    support: parseOperationalReportSection(value.support, operation),
    runtime: {
      by_severity: parseOperationalReportSection(
        value.runtime.by_severity,
        operation,
      ),
      by_component: parseTechnicalBreakdown(
        value.runtime.by_component,
        'component',
        operation,
      ),
      by_event_code: parseTechnicalBreakdown(
        value.runtime.by_event_code,
        'event_code',
        operation,
      ),
      by_result: parseTechnicalBreakdown(
        value.runtime.by_result,
        'result',
        operation,
      ),
      recent_errors: value.runtime.recent_errors.map((item) =>
        parseTechnicalRecentError(item, operation),
      ),
    },
  }
}

function parseTechnicalSystemStatus(value: unknown): TechnicalSystemStatus {
  const operation = 'get_technical_system_status_for_interface'
  if (!isRecord(value) || !Array.isArray(value.components)) {
    throw contractError(operation, 'objeto de estado inválido.')
  }
  return {
    checked_at: requiredString(value, 'checked_at', operation),
    components: value.components.map((item) => {
      if (!isRecord(item))
        throw contractError(operation, 'componente inválido.')
      return {
        component: requiredString(item, 'component', operation),
        label: requiredString(item, 'label', operation),
        status: requiredString(item, 'status', operation),
        verification: requiredString(item, 'verification', operation),
        detail: requiredString(item, 'detail', operation),
        checked_at: requiredString(item, 'checked_at', operation),
      }
    }),
  }
}

function parseTechnicalIntegrations(
  value: unknown,
): TechnicalIntegrationInventory {
  const operation = 'get_technical_integrations_for_interface'
  if (!isRecord(value) || !Array.isArray(value.integrations)) {
    throw contractError(operation, 'inventário inválido.')
  }
  return {
    inventoried_at: requiredString(value, 'inventoried_at', operation),
    integrations: value.integrations.map((item) => {
      if (!isRecord(item))
        throw contractError(operation, 'integração inválida.')
      return {
        technical_name: requiredString(item, 'technical_name', operation),
        type: requiredString(item, 'type', operation),
        configured: nullableBoolean(item, 'configured', operation),
        configuration_verifiable_from_database: requiredBoolean(
          item,
          'configuration_verifiable_from_database',
          operation,
        ),
        status: requiredString(item, 'status', operation),
        last_success_at: nullableString(item, 'last_success_at', operation),
        last_error_at: nullableString(item, 'last_error_at', operation),
        last_error_code: nullableString(item, 'last_error_code', operation),
        last_error_message: nullableString(
          item,
          'last_error_message',
          operation,
        ),
        evidence: requiredString(item, 'evidence', operation),
        monitoring_source: requiredString(item, 'monitoring_source', operation),
      }
    }),
  }
}

function parseTechnicalRuntimeLogs(
  value: unknown,
): readonly TechnicalRuntimeLog[] {
  const operation = 'get_technical_runtime_logs_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    const base = parseTechnicalRecentError(item, operation)
    if (!isRecord(item)) throw contractError(operation, 'evento inválido.')
    return {
      ...base,
      actor_account_id: nullableString(item, 'actor_account_id', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseTechnicalSupportRequests(
  value: unknown,
): readonly TechnicalSupportRequest[] {
  const operation = 'get_technical_support_requests_for_interface'
  if (!Array.isArray(value)) throw contractError(operation, 'lista esperada.')
  return value.map((item) => {
    if (!isRecord(item)) throw contractError(operation, 'chamado inválido.')
    return {
      request_id: requiredString(item, 'request_id', operation),
      requester_username: requiredString(item, 'requester_username', operation),
      assigned_username: nullableString(item, 'assigned_username', operation),
      category: requiredString(item, 'category', operation),
      subject: requiredString(item, 'subject', operation),
      description: requiredString(item, 'description', operation),
      priority: requiredString(item, 'priority', operation),
      status: requiredString(item, 'status', operation),
      technical_response: nullableString(item, 'technical_response', operation),
      requires_user_test: requiredBoolean(
        item,
        'requires_user_test',
        operation,
      ),
      user_test_result: nullableString(item, 'user_test_result', operation),
      created_at: requiredString(item, 'created_at', operation),
      updated_at: requiredString(item, 'updated_at', operation),
      started_at: nullableString(item, 'started_at', operation),
      resolved_at: nullableString(item, 'resolved_at', operation),
      total_count: requiredNumber(item, 'total_count', operation),
    }
  })
}

function parseTechnicalSupportHistory(value: unknown): TechnicalSupportHistory {
  const operation = 'get_technical_support_history_for_interface'
  if (!isRecord(value) || !Array.isArray(value.events)) {
    throw contractError(operation, 'histórico inválido.')
  }
  return {
    request_id: requiredString(value, 'request_id', operation),
    events: value.events.map((item) => {
      if (!isRecord(item)) throw contractError(operation, 'evento inválido.')
      return {
        audit_id: requiredString(item, 'audit_id', operation),
        occurred_at: requiredString(item, 'occurred_at', operation),
        action: requiredString(item, 'action', operation),
        actor_account_id: nullableString(item, 'actor_account_id', operation),
        previous_status: nullableString(item, 'previous_status', operation),
        new_status: nullableString(item, 'new_status', operation),
        previous_assigned_account_id: nullableString(
          item,
          'previous_assigned_account_id',
          operation,
        ),
        new_assigned_account_id: nullableString(
          item,
          'new_assigned_account_id',
          operation,
        ),
        resolved_by_account_id: nullableString(
          item,
          'resolved_by_account_id',
          operation,
        ),
        requires_user_test: nullableBoolean(
          item,
          'requires_user_test',
          operation,
        ),
        user_test_approved: nullableBoolean(
          item,
          'user_test_approved',
          operation,
        ),
        started_at: nullableString(item, 'started_at', operation),
        resolved_at: nullableString(item, 'resolved_at', operation),
        user_tested_at: nullableString(item, 'user_tested_at', operation),
      }
    }),
  }
}

async function execute<T>(options: {
  transport: RpcTransport
  operation: string
  args?: Record<string, unknown>
  parse: (value: unknown) => T
  selectFirst?: boolean
}): Promise<AsyncState<T>> {
  try {
    const { data, error } = await options.transport(
      options.operation,
      options.args,
    )
    if (error) throw error
    if (data === null || data === undefined) return { status: 'empty' }

    const selected = options.selectFirst
      ? Array.isArray(data)
        ? data[0]
        : undefined
      : data
    if (selected === null || selected === undefined) return { status: 'empty' }

    return { status: 'success', data: options.parse(selected) }
  } catch (error) {
    return {
      status: 'error',
      error: normalizeSupabaseError(options.operation, error),
    }
  }
}

export function createRpcService(transport: RpcTransport) {
  return {
    createTechnicalSupportRequest: (input: {
      subject: string
      category: string
      description: string
      priority: string
      affectedModule: string
    }) =>
      execute({
        transport,
        operation: 'create_technical_support_request_for_interface',
        args: {
          p_subject: input.subject,
          p_category: input.category,
          p_description: input.description,
          p_priority: input.priority,
          p_affected_module: input.affectedModule,
        },
        parse: parseConfirmedJson,
      }),
    updateAppointmentAttendance: (input: {
      appointmentId: string
      action: string
      notes: string
      reason: string
    }) =>
      execute({
        transport,
        operation: 'update_appointment_attendance_for_interface',
        args: {
          p_appointment_id: input.appointmentId,
          p_action: input.action,
          p_notes: input.notes,
          p_reason: input.reason,
        },
        parse: parseConfirmedJson,
      }),
    getWaitingList: (specialtyId: string | null = null, status: string | null = 'waiting', limit = 50, offset = 0) =>
      execute({
        transport,
        operation: 'get_waiting_list_for_interface',
        args: { p_specialty_id: specialtyId, p_status: status, p_limit: limit, p_offset: offset },
        parse: (value) => value,
      }),
    addPatientToWaitingList: (patientId: string, specialtyId: string, priority = 3, notes: string | null = null) =>
      execute({
        transport,
        operation: 'add_patient_to_waiting_list_for_interface',
        args: { p_patient_id: patientId, p_specialty_id: specialtyId, p_priority: priority, p_notes: notes },
        parse: parseConfirmedJson,
      }),
    completeWaitingListScheduling: (
      waitingListId: string,
      appointmentId: string,
    ) =>
      execute({
        transport,
        operation: 'complete_waiting_list_scheduling_for_interface',
        args: {
          p_waiting_list_id: waitingListId,
          p_appointment_id: appointmentId,
        },
        parse: parseConfirmedJson,
      }),
    updateWaitingListStatus: (waitingListId: string, action: string, notes: string | null = null) =>
      execute({
        transport,
        operation: 'update_waiting_list_status_for_interface',
        args: { p_waiting_list_id: waitingListId, p_action: action, p_notes: notes },
        parse: parseConfirmedJson,
      }),
    getInitialActiveSearches: (status: string | null = null, limit = 50, offset = 0) =>
      execute({ transport, operation: 'get_initial_active_searches_for_interface', args: { p_flow_status: status, p_limit: limit, p_offset: offset }, parse: (value) => value }),
    registerInitialActiveSearchAttempt: (input: {
      patientId: string
      contactMethod: string
      contactResult: string
      acceptedService: boolean | null
      nextAction: string | null
      notes: string | null
      nextContactAt: string | null
      closeFlow: boolean
      closureReason: string | null
    }) =>
      execute({
        transport,
        operation: 'register_initial_active_search_attempt_for_interface',
        args: {
          p_patient_id: input.patientId,
          p_contact_method: input.contactMethod,
          p_contact_result: input.contactResult,
          p_accepted_service: input.acceptedService,
          p_next_action: input.nextAction,
          p_notes: input.notes,
          p_next_contact_at: input.nextContactAt,
          p_close_flow: input.closeFlow,
          p_closure_reason: input.closureReason,
        },
        parse: parseConfirmedJson,
      }),
    getActiveSearches: (status: string | null = null, limit = 50, offset = 0) =>
      execute({ transport, operation: 'get_active_searches_for_interface', args: { p_flow_status: status, p_limit: limit, p_offset: offset }, parse: (value) => value }),
    registerActiveSearchAttempt: (input: {
      patientId: string
      contactMethod: string
      contactResult: string
      nextAction: string | null
      notes: string | null
      nextContactAt: string | null
      closeFlow: boolean
      closureReason: string | null
    }) =>
      execute({
        transport,
        operation: 'register_active_search_attempt_for_interface',
        args: {
          p_patient_id: input.patientId,
          p_contact_method: input.contactMethod,
          p_contact_result: input.contactResult,
          p_next_action: input.nextAction,
          p_notes: input.notes,
          p_next_contact_at: input.nextContactAt,
          p_close_flow: input.closeFlow,
          p_closure_reason: input.closureReason,
        },
        parse: parseConfirmedJson,
      }),
    closeActiveSearch: (patientId: string, closureReason: string) =>
      execute({
        transport,
        operation: 'close_active_search_for_interface',
        args: { p_patient_id: patientId, p_closure_reason: closureReason },
        parse: parseConfirmedJson,
      }),
    getCoordinatorTeamOverview: (query: string | null, specialtyId: string | null, status: string | null, startDate: string | null, endDate: string | null, limit = 50, offset = 0) =>
      execute({ transport, operation: 'get_coordinator_team_overview_for_interface', args: { p_query: query, p_specialty_id: specialtyId, p_status: status, p_start_date: startDate, p_end_date: endDate, p_limit: limit, p_offset: offset }, parse: (value) => value }),
    getCoordinatorAgendaOverview: (startDate: string, endDate: string, specialtyId: string | null = null, professionalId: string | null = null) =>
      execute({ transport, operation: 'get_coordinator_agenda_overview_for_interface', args: { p_start_date: startDate, p_end_date: endDate, p_specialty_id: specialtyId, p_professional_id: professionalId }, parse: (value) => value }),
    getAgendaChangeRequests: (status: string | null = null, professionalId: string | null = null, limit = 50) =>
      execute({ transport, operation: 'get_agenda_change_requests_for_interface', args: { p_status: status, p_professional_id: professionalId, p_limit: limit }, parse: (value) => value }),
    createAgendaChangeRequest: (configId: string, changes: { is_active: boolean; effective_date: string }, justification: string) =>
      execute({ transport, operation: 'create_agenda_change_request_for_interface', args: { p_agenda_config_id: configId, p_request_type: 'status', p_requested_changes: changes, p_justification: justification }, parse: parseConfirmedJson }),
    getPatientCareSpecialties: (patientId: string) =>
      execute({ transport, operation: 'get_patient_care_specialties_for_professional_interface', args: { p_patient_id: patientId }, parse: (value) => value }),
    decideAgendaChangeRequest: (requestId: string, decision: 'aprovar' | 'rejeitar', reason: string | null) =>
      execute({ transport, operation: 'decide_agenda_change_request_for_interface', args: { p_request_id: requestId, p_decision: decision, p_reason: reason }, parse: parseConfirmedJson }),
    applyAgendaChangeRequest: (requestId: string) =>
      execute({ transport, operation: 'apply_agenda_change_request_for_interface', args: { p_request_id: requestId }, parse: parseConfirmedJson }),
    registerCoordinationTeamDecision: (professionalId: string, actionType: string, startDate: string, endDate: string, reason: string, decision: 'aprovar' | 'devolver', sourceRequestId: string | null = null) =>
      execute({ transport, operation: 'register_coordination_team_decision_for_interface', args: { p_professional_id: professionalId, p_action_type: actionType, p_start_date: startDate, p_end_date: endDate, p_reason: reason, p_decision: decision, p_source_agenda_change_request_id: sourceRequestId }, parse: parseConfirmedJson }),
    getCoordinationTeamDecisions: (status: string | null = null, professionalId: string | null = null, limit = 50, offset = 0) =>
      execute({ transport, operation: 'get_coordination_team_decisions_for_interface', args: { p_status: status, p_professional_id: professionalId, p_limit: limit, p_offset: offset }, parse: (value) => value }),
    getReportsDashboard: (
      startDate: string,
      endDate: string,
      specialtyId: string | null,
    ) =>
      execute({
        transport,
        operation: 'get_reports_dashboard_for_interface',
        args: {
          p_start_date: startDate,
          p_end_date: endDate,
          p_specialty_id: specialtyId,
        },
        parse: parseConfirmedJson,
      }),
    getPatientTimeline: (
      patientId: string,
      beforeAt: string | null = null,
      beforeKey: string | null = null,
      limit = 50,
    ) =>
      execute({
        transport,
        operation: 'get_patient_timeline_for_interface',
        args: {
          p_patient_id: patientId,
          p_before_at: beforeAt,
          p_before_key: beforeKey,
          p_limit: limit,
        },
        parse: parseConfirmedJson,
      }),
    getAuditLogs: (input: {
      startAt: string
      endAt: string
      entityName?: string | null
      action?: string | null
      actorAccountId?: string | null
      recordId?: string | null
      beforeCreatedAt?: string | null
      beforeId?: string | null
      limit?: number
    }) =>
      execute({
        transport,
        operation: 'get_audit_logs_for_interface',
        args: {
          p_start_at: input.startAt,
          p_end_at: input.endAt,
          p_entity_name: input.entityName ?? null,
          p_action: input.action ?? null,
          p_actor_account_id: input.actorAccountId ?? null,
          p_record_id: input.recordId ?? null,
          p_before_created_at: input.beforeCreatedAt ?? null,
          p_before_id: input.beforeId ?? null,
          p_limit: input.limit ?? 50,
        },
        parse: parseConfirmedJson,
      }),
    getTeamManagementContext: (
      query: string | null = null,
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_team_management_context_for_interface',
        args: { p_query: query, p_status: status, p_limit: limit, p_offset: offset },
        parse: parseConfirmedJson,
      }),
    createSpecialty: (name: string) =>
      execute({
        transport,
        operation: 'create_specialty_for_interface',
        args: { p_name: name },
        parse: parseConfirmedJson,
      }),
    createTeamMemberProfile: (input: TeamMemberProfileInput) =>
      execute({
        transport,
        operation: 'create_team_member_profile_for_interface',
        args: { ...teamProfileArgs(input), p_auth_user_id: input.authUserId },
        parse: parseConfirmedJson,
      }),
    updateTeamMemberProfile: (professionalId: string, input: TeamMemberProfileInput) =>
      execute({
        transport,
        operation: 'update_team_member_profile_for_interface',
        args: { p_professional_id: professionalId, ...teamProfileArgs(input) },
        parse: parseConfirmedJson,
      }),
    setTeamMemberActive: (professionalId: string, active: boolean, reason: string) =>
      execute({
        transport,
        operation: 'set_team_member_active_for_interface',
        args: { p_professional_id: professionalId, p_active: active, p_reason: reason },
        parse: parseConfirmedJson,
      }),
    setTeamMemberPrimaryContext: (userAccountId: string, roleCode: string) =>
      execute({
        transport,
        operation: 'set_team_member_primary_context_for_interface',
        args: { p_user_account_id: userAccountId, p_role_code: roleCode },
        parse: parseConfirmedJson,
      }),
    getCapabilityCatalog: () =>
      execute({
        transport,
        operation: 'get_capability_catalog_for_interface',
        parse: parseConfirmedJson,
      }),
    getEffectiveProfessionalCapabilities: (professionalId: string) =>
      execute({
        transport,
        operation: 'get_effective_professional_capabilities',
        args: { p_professional_id: professionalId },
        parse: parseConfirmedJson,
      }),
    setProfessionalCapability: (professionalId: string, capabilityCode: string, isEnabled: boolean) =>
      execute({
        transport,
        operation: 'set_professional_capability_for_interface',
        args: { p_professional_id: professionalId, p_capability_code: capabilityCode, p_is_enabled: isEnabled },
        parse: parseConfirmedJson,
      }),
    removeProfessionalCapability: (professionalId: string, capabilityCode: string) =>
      execute({
        transport,
        operation: 'remove_professional_capability_for_interface',
        args: { p_professional_id: professionalId, p_capability_code: capabilityCode },
        parse: parseConfirmedJson,
      }),
    setSpecialtyCapabilityStatus: (specialtyId: string, capabilityCode: string, isEnabled: boolean) =>
      execute({
        transport,
        operation: 'set_specialty_capability_status_for_interface',
        args: { p_specialty_id: specialtyId, p_capability_code: capabilityCode, p_is_enabled: isEnabled },
        parse: parseConfirmedJson,
      }),
    getMyAccessContext: () =>
      execute({
        transport,
        operation: 'get_my_access_context',
        parse: parseAccessContext,
      }),
    getHomologationOptions: () =>
      execute({
        transport,
        operation: 'get_homologation_options_for_interface',
        parse: parseHomologationOptions,
      }),
    setHomologationContext: (args: {
      roleCode: string
      professionalId: string | null
      specialtyId: string | null
      testPatientId: string | null
      reason: string
    }) =>
      execute({
        transport,
        operation: 'set_homologation_context_for_interface',
        args: {
          p_role_code: args.roleCode,
          p_professional_id: args.professionalId,
          p_specialty_id: args.specialtyId,
          p_test_patient_id: args.testPatientId,
          p_reason: args.reason,
        },
        parse: parseConfirmedJson,
      }),
    getHomologationContext: () =>
      execute({
        transport,
        operation: 'get_homologation_context_for_interface',
        parse: parseConfirmedJson,
      }),
    clearHomologationContext: (reason: string) =>
      execute({
        transport,
        operation: 'clear_homologation_context_for_interface',
        args: { p_reason: reason },
        parse: parseConfirmedJson,
      }),
    getCurrentLegalTerm: () =>
      execute({
        transport,
        operation: 'get_current_legal_term',
        parse: parseLegalTerm,
        selectFirst: true,
      }),
    acceptLegalTerm: (legalTermId: string) =>
      execute({
        transport,
        operation: 'accept_legal_term',
        args: { p_legal_term_id: legalTermId },
        parse: parseAcceptance,
        selectFirst: true,
      }),
    completeFirstAccess: () =>
      execute({
        transport,
        operation: 'complete_first_access',
        parse: parseFirstAccess,
      }),
    getPendingItems: (limit = 50, offset = 0) =>
      execute({
        transport,
        operation: 'get_pending_items_for_interface',
        args: { p_limit: limit, p_offset: offset },
        parse: parsePendingItems,
      }),
    getFamilyWaitingList: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_family_waiting_list_for_interface',
        args: { p_status: status, p_limit: limit, p_offset: offset },
        parse: parseConfirmedJson as (value: unknown) => readonly FamilyWaitingListItem[],
      }),
    getFamilyQueueCandidatesForSlot: (
      professionalId: string,
      slotStart: string,
      limit = 50,
    ) =>
      execute({
        transport,
        operation: 'get_family_queue_candidates_for_slot',
        args: {
          p_professional_id: professionalId,
          p_slot_start: slotStart,
          p_limit: limit,
        },
        parse: parseConfirmedJson as (value: unknown) => readonly FamilyQueueCandidate[],
      }),
    createFamilyPsychologyAppointment: (input: {
      waitingListId: string
      professionalId: string
      slotStart: string
      generalNotes: string | null
    }) =>
      execute({
        transport,
        operation: 'create_family_psychology_appointment_for_interface',
        args: {
          p_waiting_list_id: input.waitingListId,
          p_professional_id: input.professionalId,
          p_slot_start: input.slotStart,
          p_general_notes: input.generalNotes,
        },
        parse: parseConfirmedJson,
      }),
    getFamilyPsychologyRequestContext: (requestId: string) =>
      execute({
        transport,
        operation: 'get_family_psychology_request_context_for_interface',
        args: { p_request_id: requestId },
        parse: parseConfirmedJson,
      }),
    addFamilyToWaitingList: (familyLinkId: string, priority: number, notes: string | null) =>
      execute({
        transport,
        operation: 'add_family_to_waiting_list_for_interface',
        args: { p_family_link_id: familyLinkId, p_priority: priority, p_notes: notes },
        parse: parseConfirmedJson,
      }),
    updateFamilyWaitingListStatus: (
      waitingListId: string,
      action: 'pause' | 'resume' | 'call' | 'cancel' | 'remove',
      notes: string | null,
    ) =>
      execute({
        transport,
        operation: 'update_family_waiting_list_status_for_interface',
        args: {
          p_waiting_list_id: waitingListId,
          p_action: action,
          p_notes: notes,
        },
        parse: parseConfirmedJson,
      }),
    registerPatientDeath: (input: {
      patientId: string
      deathDate: string
      deathTime: string | null
      source: 'family_caregiver' | 'health_service' | 'official_document' | 'other_authorized_institution'
      notes: string | null
    }) =>
      execute({
        transport,
        operation: 'register_patient_death_for_interface',
        args: {
          p_patient_id: input.patientId,
          p_death_date: input.deathDate,
          p_death_time: input.deathTime,
          p_source: input.source,
          p_notes: input.notes,
        },
        parse: parseConfirmedJson,
      }),
    getNoShowFollowups: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_no_show_followups_for_interface',
        args: { p_status: status, p_limit: limit, p_offset: offset },
        parse: parseNoShowFollowups,
      }),
    getNoShowContacts: (followupId: string, limit = 100, offset = 0) =>
      execute({
        transport,
        operation: 'get_no_show_contacts_for_interface',
        args: {
          p_followup_id: followupId,
          p_limit: limit,
          p_offset: offset,
        },
        parse: parseNoShowContacts,
      }),
    registerNoShowContact: (input: NoShowContactInput) =>
      execute({
        transport,
        operation: 'register_no_show_contact_for_interface',
        args: {
          p_followup_id: input.followupId,
          p_contact_method: input.contactMethod,
          p_contact_result: input.contactResult,
          p_accepted_service: input.acceptedService,
          p_next_action: input.nextAction,
          p_notes: input.notes,
          p_next_contact_date: input.nextContactDate,
          p_new_status: input.newStatus,
        },
        parse: parseNoShowContactRegistration,
      }),
    requestNoShowRescheduling: (followupId: string, notes: string) =>
      execute({
        transport,
        operation: 'request_no_show_rescheduling_for_interface',
        args: { p_followup_id: followupId, p_notes: notes },
        parse: parseNoShowReschedulingRequest,
      }),
    getAdministrativeRequests: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_administrative_requests_for_interface',
        args: { p_status: status, p_limit: limit, p_offset: offset },
        parse: parseAdministrativeRequests,
      }),
    getDentistryAccessContextForInterface: () =>
      execute({
        transport,
        operation: 'get_dentistry_access_context_for_interface',
        parse: parseDentistryAccessContext,
      }),
    searchDentistryPatientsForInterface: (
      query: string,
      limit = 10,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'search_dentistry_patients_for_interface',
        args: { p_query: query, p_limit: limit, p_offset: offset },
        parse: parseDentistryPatients,
      }),
    createDentistryReferralForInterface: (
      patientId: string,
      operationalReason: string,
    ) =>
      execute({
        transport,
        operation: 'create_dentistry_referral_for_interface',
        args: {
          p_patient_id: patientId,
          p_operational_reason: operationalReason,
        },
        parse: parseDentistryReferralMutation,
      }),
    getDentistryReferralsForInterface: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_dentistry_referrals_for_interface',
        args: { p_status: status, p_limit: limit, p_offset: offset },
        parse: parseDentistryReferrals,
      }),
    manageDentistryReferralForInterface: (
      referralId: string,
      action: string,
      response: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'manage_dentistry_referral_for_interface',
        args: {
          p_referral_id: referralId,
          p_action: action,
          p_response: response,
        },
        parse: parseDentistryReferralMutation,
      }),
    registerDentistryPdfForInterface: (
      referralId: string,
      storagePath: string,
    ) =>
      execute({
        transport,
        operation: 'register_dentistry_pdf_for_interface',
        args: {
          p_referral_id: referralId,
          p_storage_path: storagePath,
        },
        parse: parseConfirmedJson,
      }),
    getDentistryReferralDocumentForInterface: (referralId: string) =>
      execute({
        transport,
        operation: 'get_dentistry_referral_document_for_interface',
        args: { p_referral_id: referralId },
        parse: parseConfirmedJson,
      }),
    getPatientContact: (patientId: string) =>
      execute({
        transport,
        operation: 'get_patient_contact_for_interface',
        args: { p_patient_id: patientId },
        parse: parseConfirmedJson,
      }),
    getBirthdays: () =>
      execute({
        transport,
        operation: 'get_birthdays_for_interface',
        parse: parseBirthdayOverview,
      }),
    createAdministrativeRequest: (
      patientId: string | null,
      subject: string,
      description: string,
    ) =>
      execute({
        transport,
        operation: 'create_administrative_request_for_interface',
        args: {
          p_patient_id: patientId,
          p_subject: subject,
          p_description: description,
        },
        parse: parseAdministrativeRequestCreation,
      }),
    getPrescriptionRenewalDoctors: () =>
      execute({
        transport,
        operation: 'get_prescription_renewal_doctors_for_interface',
        parse: parsePrescriptionRenewalDoctors,
      }),
    createPrescriptionRenewal: (
      patientId: string,
      doctorId: string,
      administrativeNote: string | null,
    ) =>
      execute({
        transport,
        operation: 'create_prescription_renewal_for_interface',
        args: {
          p_patient_id: patientId,
          p_target_doctor_id: doctorId,
          p_administrative_note: administrativeNote,
        },
        parse: parsePrescriptionRenewalCreation,
      }),
    getPrescriptionRenewals: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_prescription_renewals_for_interface',
        args: {
          p_status: status,
          p_limit: limit,
          p_offset: offset,
        },
        parse: parsePrescriptionRenewals,
      }),
    managePrescriptionRenewalMedical: (
      renewalId: string,
      action: 'start' | 'renewed' | 'needs_consult',
      operationalReturn: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'manage_prescription_renewal_medical_for_interface',
        args: {
          p_request_id: renewalId,
          p_action: action,
          p_operational_return: operationalReturn,
        },
        parse: parsePrescriptionRenewalMutation,
      }),
    getPrescriptionRenewalOperationalContext: (renewalId: string) =>
      execute({
        transport,
        operation: 'get_prescription_renewal_operational_context_for_interface',
        args: { p_request_id: renewalId },
        parse: parseConfirmedJson,
      }),
    linkPrescriptionRenewalConsultAppointment: (
      renewalId: string,
      appointmentId: string,
    ) =>
      execute({
        transport,
        operation: 'link_prescription_renewal_consult_appointment_for_interface',
        args: {
          p_request_id: renewalId,
          p_appointment_id: appointmentId,
        },
        parse: parseConfirmedJson,
      }),
    managePrescriptionRenewalAdmin: (input: {
      renewalId: string
      action: 'retarget' | 'complete' | 'cancel'
      targetDoctorId?: string | null
      pickupLocation?: string | null
      finalAdminNote?: string | null
      patientContacted?: boolean
      reason?: string | null
    }) =>
      execute({
        transport,
        operation: 'manage_prescription_renewal_admin_for_interface',
        args: {
          p_request_id: input.renewalId,
          p_action: input.action,
          p_target_doctor_id: input.targetDoctorId ?? null,
          p_pickup_location: input.pickupLocation ?? null,
          p_final_admin_note: input.finalAdminNote ?? null,
          p_patient_contacted: input.patientContacted ?? false,
          p_reason: input.reason ?? null,
        },
        parse: parsePrescriptionRenewalMutation,
      }),
    getAdministrativeRequestEvents: (
      requestId: string,
      limit = 100,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_administrative_request_events_for_interface',
        args: { p_request_id: requestId, p_limit: limit, p_offset: offset },
        parse: parseAdministrativeRequestEvents,
      }),
    updateAdministrativeRequest: (
      requestId: string,
      action: string,
      response: string | null,
      counterReference: string | null,
    ) =>
      execute({
        transport,
        operation: 'update_administrative_request_for_interface',
        args: {
          p_request_id: requestId,
          p_action: action,
          p_response: response,
          p_counter_reference: counterReference,
        },
        parse: parseAdministrativeRequestUpdate,
      }),
    getReferralSpecialties: () =>
      execute({
        transport,
        operation: 'get_interprofessional_referral_specialties_for_interface',
        parse: parseReferralSpecialties,
      }),
    getReferralTargets: (specialtyId: string) =>
      execute({
        transport,
        operation: 'get_interprofessional_referral_targets_for_interface',
        args: { p_specialty_id: specialtyId },
        parse: parseReferralTargets,
      }),
    getPatientForEdit: (patientId: string) =>
      execute({
        transport,
        operation: 'get_patient_for_edit_for_interface',
        args: { p_patient_id: patientId },
        parse: (value) => value,
      }),
    updatePatient: (input: {
      patientId: string
      fullName: string
      birthDate: string
      cms: string | null
      sex: string | null
      phone: string | null
      phoneSecondary: string | null
      address: string | null
      capoStartDate: string | null
      operationalNotes: string | null
      status: 'ativo' | 'inativo'
      origin: string | null
    }) =>
      execute({
        transport,
        operation: 'update_patient_for_interface',
        args: {
          p_patient_id: input.patientId,
          p_full_name: input.fullName,
          p_birth_date: input.birthDate,
          p_cms: input.cms,
          p_sex: input.sex,
          p_phone: input.phone,
          p_phone_secondary: input.phoneSecondary,
          p_address: input.address,
          p_capo_start_date: input.capoStartDate,
          p_operational_notes: input.operationalNotes,
          p_status: input.status,
          p_origin: input.origin,
        },
        parse: (value) => value,
      }),
    searchReferralPatients: (query: string, limit = 20, offset = 0) =>
      execute({
        transport,
        operation: 'search_patients_for_interface',
        args: { p_query: query, p_limit: limit, p_offset: offset },
        parse: parseReferralPatients,
      }),
    getInterprofessionalReferrals: (
      direction = 'all',
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_interprofessional_referrals_for_interface',
        args: {
          p_direction: direction,
          p_status: status,
          p_limit: limit,
          p_offset: offset,
        },
        parse: parseInterprofessionalReferrals,
      }),
    getReferralEvents: (referralId: string, limit = 100, offset = 0) =>
      execute({
        transport,
        operation: 'get_interprofessional_referral_events_for_interface',
        args: {
          p_referral_id: referralId,
          p_limit: limit,
          p_offset: offset,
        },
        parse: parseReferralEvents,
      }),
    createInterprofessionalReferral: (
      patientId: string,
      specialtyId: string,
      reason: string,
      sourceAppointmentId: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'create_interprofessional_referral_for_interface',
        args: {
          p_patient_id: patientId,
          p_target_specialty_id: specialtyId,
          p_operational_reason: reason,
          p_source_appointment_id: sourceAppointmentId,
        },
        parse: parseReferralMutation,
      }),
    updateInterprofessionalReferral: (
      referralId: string,
      action: string,
      detail: string | null,
      targetProfessionalId: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'update_interprofessional_referral_for_interface',
        args: {
          p_referral_id: referralId,
          p_action: action,
          p_detail: detail,
          p_target_professional_id: targetProfessionalId,
        },
        parse: parseReferralMutation,
      }),
    getMyAssistentialSpecialties: () =>
      execute({
        transport,
        operation: 'get_my_assistential_specialties_for_interface',
        parse: parseAssistentialSpecialties,
      }),
    searchMyAssistentialPatients: (query: string, limit = 20, offset = 0) =>
      execute({
        transport,
        operation: 'search_my_patients_for_interface',
        args: { p_query: query, p_limit: limit, p_offset: offset },
        parse: parseAssistentialPatients,
      }),
    getAgenda: (
      startDate: string,
      endDate: string,
      professionalId: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'get_agenda_for_interface',
        args: {
          p_start_date: startDate,
          p_end_date: endDate,
          p_professional_id: professionalId,
        },
        parse: parseAgendaAppointments,
      }),
    createPatient: (input: {
      fullName: string
      birthDate: string
      cms: string | null
      sex: string | null
      phone: string | null
      phoneSecondary: string | null
      address: string | null
      capoStartDate: string | null
      operationalNotes: string | null
      origin: string | null
    }) =>
      execute({
        transport,
        operation: 'create_patient_for_interface',
        args: {
          p_full_name: input.fullName,
          p_birth_date: input.birthDate,
          p_cms: input.cms,
          p_sex: input.sex,
          p_phone: input.phone,
          p_phone_secondary: input.phoneSecondary,
          p_address: input.address,
          p_capo_start_date: input.capoStartDate,
          p_operational_notes: input.operationalNotes,
          p_origin: input.origin,
        },
        parse: parseCreatedPatient,
        selectFirst: true,
      }),
    getAvailableAppointmentSlots: (professionalId: string, date: string) =>
      execute({
        transport,
        operation: 'get_available_appointment_slots',
        args: { p_professional_id: professionalId, p_date: date },
        parse: parseAvailableAppointmentSlots,
      }),
    createAppointment: (input: {
      patientId: string
      professionalId: string
      slotStart: string
      appointmentType: string
      generalNotes: string | null
      operationalOrigin: string | null
    }) =>
      execute({
        transport,
        operation: 'create_appointment_for_interface',
        args: {
          p_patient_id: input.patientId,
          p_professional_id: input.professionalId,
          p_slot_start: input.slotStart,
          p_appointment_type: input.appointmentType,
          p_general_notes: input.generalNotes,
          p_operational_origin: input.operationalOrigin,
        },
        parse: (value) => value,
      }),
    getReschedulableAppointments: (
      patientId: string | null,
      professionalId: string | null,
      date: string | null,
      limit = 50,
    ) =>
      execute({
        transport,
        operation: 'get_reschedulable_appointments',
        args: {
          p_patient_id: patientId,
          p_professional_id: professionalId,
          p_date: date,
          p_limit: limit,
        },
        parse: parseReschedulableAppointments,
      }),
    rescheduleAppointment: (input: {
      appointmentId: string
      newProfessionalId: string
      newSlotStart: string
      reason: string
      origin: string
      newNotes: string
    }) =>
      execute({
        transport,
        operation: 'reschedule_appointment_for_interface',
        args: {
          p_appointment_id: input.appointmentId,
          p_new_professional_id: input.newProfessionalId,
          p_new_slot_start: input.newSlotStart,
          p_reason: input.reason,
          p_origin: input.origin,
          p_new_notes: input.newNotes,
        },
        parse: (value) => value,
      }),
    createAgendaBlock: (input: {
      agendaConfigId: string
      weekday: number | null
      specificDate: string | null
      startTime: string
      endTime: string
      blockType: string
      description: string
      confirmOverlap: boolean
      confirmAffected: boolean
      rescheduleInstructions: string
    }) =>
      execute({
        transport,
        operation: 'create_agenda_block_for_interface',
        args: {
          p_agenda_config_id: input.agendaConfigId,
          p_weekday: input.weekday,
          p_specific_date: input.specificDate,
          p_start_time: input.startTime,
          p_end_time: input.endTime,
          p_block_type: input.blockType,
          p_description: input.description,
          p_confirm_overlap: input.confirmOverlap,
          p_confirm_affected: input.confirmAffected,
          p_reschedule_instructions: input.rescheduleInstructions,
        },
        parse: (value) => value,
      }),
    createAgendaException: (input: {
      agendaConfigId: string
      exceptionDate: string
      exceptionType: string
      startTime: string
      endTime: string
      description: string
      confirmConflict: boolean
    }) =>
      execute({
        transport,
        operation: 'create_agenda_exception_for_interface',
        args: {
          p_agenda_config_id: input.agendaConfigId,
          p_exception_date: input.exceptionDate,
          p_exception_type: input.exceptionType,
          p_start_time: input.startTime,
          p_end_time: input.endTime,
          p_description: input.description,
          p_confirm_conflict: input.confirmConflict,
        },
        parse: (value) => value,
      }),
    getSchedulingCatalog: () =>
      execute({
        transport,
        operation: 'get_scheduling_catalog',
        parse: (value) => value,
      }),
    getAgendaConfiguration: (professionalId: string) =>
      execute({
        transport,
        operation: 'get_agenda_configuration_for_interface',
        args: { p_professional_id: professionalId },
        parse: (value) => value,
      }),
    getSocialVulnerabilityIndicator: (patientId: string) =>
      execute({
        transport,
        operation: 'get_social_vulnerability_indicator_for_interface',
        args: { p_patient_id: patientId },
        parse: parseConfirmedJson,
      }),
    setSocialVulnerabilityIndicator: (
      patientId: string,
      level: 'verde' | 'amarelo' | 'vermelho',
    ) =>
      execute({
        transport,
        operation: 'set_social_vulnerability_indicator_for_interface',
        args: { p_patient_id: patientId, p_level: level },
        parse: parseConfirmedJson,
      }),
    getNutritionContext: (patientId: string) =>
      execute({ transport, operation: 'get_nutrition_context_for_interface', args: { p_patient_id: patientId }, parse: parseConfirmedJson }),
    saveNutritionPlan: (args: ConfirmedJsonArgs) =>
      execute({ transport, operation: 'save_nutrition_plan_for_interface', args, parse: parseConfirmedJson }),
    createNutritionDocument: (patientId: string) =>
      execute({ transport, operation: 'create_nutrition_document_for_interface', args: { p_patient_id: patientId }, parse: parseConfirmedJson }),
    registerNutritionPdf: (documentId: string, storagePath: string) =>
      execute({ transport, operation: 'register_nutrition_pdf_for_interface', args: { p_document_id: documentId, p_storage_path: storagePath }, parse: parseConfirmedJson }),
    getNutritionDocument: (documentId: string) =>
      execute({ transport, operation: 'get_nutrition_document_for_interface', args: { p_document_id: documentId }, parse: parseConfirmedJson }),
    registerNutritionDelivery: (documentId: string, mode: string) =>
      execute({ transport, operation: 'register_nutrition_delivery_for_interface', args: { p_document_id: documentId, p_mode: mode }, parse: parseConfirmedJson }),
    getNutritionDocumentsForManagement: (limit = 50, offset = 0) =>
      execute({
        transport,
        operation: 'get_nutrition_documents_for_management',
        args: { p_limit: limit, p_offset: offset },
        parse: parseConfirmedJson as (value: unknown) => readonly NutritionAdminDelivery[],
      }),
    getNutritionAdminDeliveries: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_nutrition_admin_deliveries_for_interface',
        args: { p_status: status, p_limit: limit, p_offset: offset },
        parse: parseConfirmedJson as (value: unknown) => readonly NutritionAdminDelivery[],
      }),
    manageNutritionAdminDelivery: (
      deliveryId: string,
      action: 'start' | 'complete' | 'cancel' | 'reopen',
      reason: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'manage_nutrition_admin_delivery_for_interface',
        args: { p_delivery_id: deliveryId, p_action: action, p_reason: reason },
        parse: parseConfirmedJson,
      }),
    searchBereavementFamilyMembers: (query: string, limit = 20) =>
      execute({
        transport,
        operation: 'search_bereavement_family_members_for_interface',
        args: { p_query: query, p_limit: limit },
        parse: (value) => Array.isArray(value) ? value as readonly Record<string, unknown>[] : [],
      }),
    startFamilyBereavement: (familyMemberId: string, notes: string | null = null) =>
      execute({ transport, operation: 'start_family_bereavement_for_interface', args: { p_family_member_id: familyMemberId, p_notes: notes }, parse: parseConfirmedJson }),
    getFamilyBereavement: (status: string | null = null, limit = 50, offset = 0) =>
      execute({ transport, operation: 'get_family_bereavement_for_interface', args: { p_status: status, p_limit: limit, p_offset: offset }, parse: parseConfirmedJson }),
    closeFamilyBereavement: (familyMemberId: string, notes: string) =>
      execute({ transport, operation: 'close_family_bereavement_for_interface', args: { p_family_member_id: familyMemberId, p_notes: notes }, parse: parseConfirmedJson }),
    recognizeTransportNeed: (patientId: string) =>
      execute({
        transport,
        operation: 'recognize_transport_need_for_interface',
        args: { p_patient_id: patientId },
        parse: parseConfirmedJson,
      }),
    getTransportNeedQueue: (limit = 100, offset = 0) =>
      execute({
        transport,
        operation: 'get_transport_need_queue_for_interface',
        args: { p_limit: limit, p_offset: offset },
        parse: (value) => value,
      }),
    manageTransportNeed: (cycleId: string, action: 'request_cancel' | 'cancel', reason: string) =>
      execute({
        transport,
        operation: 'manage_transport_need_for_interface',
        args: { p_cycle_id: cycleId, p_action: action, p_reason: reason },
        parse: parseConfirmedJson,
      }),
    getTransportContext: (patientId: string) =>
      execute({ transport, operation: 'get_transport_context_for_interface', args: { p_patient_id: patientId }, parse: parseConfirmedJson }),
    createTransportRequest: (args: ConfirmedJsonArgs) =>
      execute({ transport, operation: 'create_transport_request_for_interface', args, parse: parseConfirmedJson }),
    registerTransportPdf: (requestId: string, storagePath: string) =>
      execute({ transport, operation: 'register_transport_pdf_for_interface', args: { p_request_id: requestId, p_storage_path: storagePath }, parse: parseConfirmedJson }),
    signTransportPdf: (requestId: string) =>
      execute({ transport, operation: 'sign_transport_pdf_for_interface', args: { p_request_id: requestId }, parse: parseConfirmedJson }),
    getTransportDocument: (requestId: string) =>
      execute({ transport, operation: 'get_transport_document_for_interface', args: { p_request_id: requestId }, parse: parseConfirmedJson }),
    manageTransportRequest: (args: ConfirmedJsonArgs) =>
      execute({ transport, operation: 'manage_transport_request_for_interface', args, parse: parseConfirmedJson }),
    getMySpecialtyOperationalReport: (
      specialtyId: string,
      startDate: string,
      endDate: string,
    ) =>
      execute({
        transport,
        operation: 'get_my_specialty_operational_report_for_interface',
        args: {
          p_specialty_id: specialtyId,
          p_start_date: startDate,
          p_end_date: endDate,
        },
        parse: parseAssistentialOperationalReport,
      }),
    getTechnicalDashboard: (startAt: string, endAt: string, recentLimit = 10) =>
      execute({
        transport,
        operation: 'get_technical_dashboard_for_interface',
        args: {
          p_start_at: startAt,
          p_end_at: endAt,
          p_recent_limit: recentLimit,
        },
        parse: parseTechnicalDashboard,
      }),
    getTechnicalSystemStatus: () =>
      execute({
        transport,
        operation: 'get_technical_system_status_for_interface',
        parse: parseTechnicalSystemStatus,
      }),
    getTechnicalIntegrations: () =>
      execute({
        transport,
        operation: 'get_technical_integrations_for_interface',
        parse: parseTechnicalIntegrations,
      }),
    getTechnicalRuntimeLogs: (
      startAt: string,
      endAt: string,
      severity: string | null = null,
      component: string | null = null,
      eventCode: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_technical_runtime_logs_for_interface',
        args: {
          p_start_at: startAt,
          p_end_at: endAt,
          p_severity: severity,
          p_component: component,
          p_event_code: eventCode,
          p_correlation_id: null,
          p_support_request_id: null,
          p_limit: limit,
          p_offset: offset,
        },
        parse: parseTechnicalRuntimeLogs,
      }),
    getTechnicalSupportRequests: (
      status: string | null = null,
      limit = 50,
      offset = 0,
    ) =>
      execute({
        transport,
        operation: 'get_technical_support_requests_for_interface',
        args: { p_status: status, p_limit: limit, p_offset: offset },
        parse: parseTechnicalSupportRequests,
      }),
    getTechnicalSupportHistory: (requestId: string) =>
      execute({
        transport,
        operation: 'get_technical_support_history_for_interface',
        args: { p_request_id: requestId },
        parse: parseTechnicalSupportHistory,
      }),
    processTechnicalSupportRequest: (
      requestId: string,
      action: 'iniciar' | 'solicitar_teste' | 'resolver' | 'cancelar',
      response: string | null = null,
    ) =>
      execute({
        transport,
        operation: 'process_technical_support_request_for_interface',
        args: {
          p_request_id: requestId,
          p_action: action,
          p_response: response,
        },
        parse: parseConfirmedJson,
      }),
  }
}

function createSupabaseTransport(
  client: SupabaseClient<Database>,
): RpcTransport {
  // SupabaseClient.rpc uses `this.rest` internally. Bind it before passing it
  // through the transport so calls keep their client instance.
  const confirmedRpc = client.rpc.bind(client) as unknown as (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>
  return async (operation, args) => {
    switch (operation) {
      case 'get_social_vulnerability_indicator_for_interface':
      case 'set_social_vulnerability_indicator_for_interface':
      case 'get_nutrition_context_for_interface':
      case 'save_nutrition_plan_for_interface':
      case 'create_nutrition_document_for_interface':
      case 'register_nutrition_pdf_for_interface':
      case 'get_nutrition_document_for_interface':
      case 'register_nutrition_delivery_for_interface':
      case 'get_nutrition_documents_for_management':
      case 'get_nutrition_admin_deliveries_for_interface':
      case 'manage_nutrition_admin_delivery_for_interface':
      case 'search_bereavement_family_members_for_interface':
      case 'start_family_bereavement_for_interface':
      case 'get_family_bereavement_for_interface':
      case 'close_family_bereavement_for_interface':
      case 'recognize_transport_need_for_interface':
      case 'get_transport_need_queue_for_interface':
      case 'manage_transport_need_for_interface':
      case 'get_transport_context_for_interface':
      case 'create_transport_request_for_interface':
      case 'register_transport_pdf_for_interface':
      case 'sign_transport_pdf_for_interface':
      case 'get_transport_document_for_interface':
      case 'manage_transport_request_for_interface':
      case 'get_homologation_options_for_interface':
      case 'set_homologation_context_for_interface':
      case 'get_homologation_context_for_interface':
      case 'clear_homologation_context_for_interface':
      case 'create_technical_support_request_for_interface':
      case 'update_appointment_attendance_for_interface':
      case 'get_reports_dashboard_for_interface':
      case 'get_patient_timeline_for_interface':
      case 'get_audit_logs_for_interface':
      case 'create_team_member_profile_for_interface':
      case 'get_team_management_context_for_interface':
      case 'update_team_member_profile_for_interface':
      case 'set_team_member_active_for_interface':
      case 'set_team_member_primary_context_for_interface':
      case 'get_capability_catalog_for_interface':
      case 'get_effective_professional_capabilities':
      case 'set_professional_capability_for_interface':
      case 'remove_professional_capability_for_interface':
      case 'set_specialty_capability_status_for_interface':
      case 'get_family_psychology_request_context_for_interface':
      case 'add_family_to_waiting_list_for_interface':
      case 'get_family_waiting_list_for_interface':
      case 'get_family_queue_candidates_for_slot':
      case 'create_family_psychology_appointment_for_interface':
      case 'update_family_waiting_list_status_for_interface':
      case 'register_patient_death_for_interface':
      case 'complete_waiting_list_scheduling_for_interface':
      case 'get_waiting_list_for_interface':
      case 'add_patient_to_waiting_list_for_interface':
      case 'update_waiting_list_status_for_interface':
      case 'get_initial_active_searches_for_interface':
      case 'register_initial_active_search_attempt_for_interface':
      case 'close_initial_active_search_for_interface':
      case 'get_active_searches_for_interface':
      case 'register_active_search_attempt_for_interface':
      case 'close_active_search_for_interface':
        return confirmedRpc(operation, args)
      case 'accept_legal_term':
        return client.rpc(operation, {
          p_legal_term_id: String(args?.p_legal_term_id ?? ''),
        })
      case 'get_pending_items_for_interface':
        return client.rpc(operation, {
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_no_show_followups_for_interface':
        return client.rpc(operation, {
          p_status:
            typeof args?.p_status === 'string' ? args.p_status : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_no_show_contacts_for_interface':
        return client.rpc(operation, {
          p_followup_id: String(args?.p_followup_id ?? ''),
          p_limit: Number(args?.p_limit ?? 100),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'register_no_show_contact_for_interface':
        return client.rpc(operation, {
          p_followup_id: String(args?.p_followup_id ?? ''),
          p_contact_method: String(args?.p_contact_method ?? ''),
          p_contact_result: String(args?.p_contact_result ?? ''),
          p_accepted_service:
            typeof args?.p_accepted_service === 'boolean'
              ? args.p_accepted_service
              : undefined,
          p_next_action:
            typeof args?.p_next_action === 'string'
              ? args.p_next_action
              : undefined,
          p_notes: typeof args?.p_notes === 'string' ? args.p_notes : undefined,
          p_next_contact_date:
            typeof args?.p_next_contact_date === 'string'
              ? args.p_next_contact_date
              : undefined,
          p_new_status: String(args?.p_new_status ?? 'contatado'),
        })
      case 'request_no_show_rescheduling_for_interface':
        return client.rpc(operation, {
          p_followup_id: String(args?.p_followup_id ?? ''),
          p_notes: String(args?.p_notes ?? ''),
        })
      case 'get_administrative_requests_for_interface':
        return client.rpc(operation, {
          p_status:
            typeof args?.p_status === 'string' ? args.p_status : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_dentistry_access_context_for_interface':
        return client.rpc(operation)
      case 'search_dentistry_patients_for_interface':
        return client.rpc(operation, {
          p_query: String(args?.p_query ?? ''),
          p_limit: Number(args?.p_limit ?? 10),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'create_dentistry_referral_for_interface':
        return client.rpc(operation, {
          p_patient_id: String(args?.p_patient_id ?? ''),
          p_operational_reason: String(args?.p_operational_reason ?? ''),
        })
      case 'get_dentistry_referrals_for_interface':
        return client.rpc(operation, {
          p_status:
            typeof args?.p_status === 'string' ? args.p_status : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'manage_dentistry_referral_for_interface':
        return client.rpc(operation, {
          p_referral_id: String(args?.p_referral_id ?? ''),
          p_action: String(args?.p_action ?? ''),
          p_response:
            typeof args?.p_response === 'string' ? args.p_response : undefined,
        })
      case 'register_dentistry_pdf_for_interface':
        return client.rpc(operation, {
          p_referral_id: String(args?.p_referral_id ?? ''),
          p_storage_path: String(args?.p_storage_path ?? ''),
        })
      case 'get_dentistry_referral_document_for_interface':
        return client.rpc(operation, {
          p_referral_id: String(args?.p_referral_id ?? ''),
        })
      case 'create_administrative_request_for_interface':
        return client.rpc(operation, {
          p_patient_id:
            typeof args?.p_patient_id === 'string'
              ? args.p_patient_id
              : undefined,
          p_subject: String(args?.p_subject ?? ''),
          p_description: String(args?.p_description ?? ''),
        })
      case 'get_administrative_request_events_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
          p_limit: Number(args?.p_limit ?? 100),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'update_administrative_request_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
          p_action: String(args?.p_action ?? ''),
          p_response:
            typeof args?.p_response === 'string' ? args.p_response : undefined,
          p_counter_reference:
            typeof args?.p_counter_reference === 'string'
              ? args.p_counter_reference
              : undefined,
        })
      case 'search_patients_for_interface':
        return client.rpc(operation, {
          p_query: String(args?.p_query ?? ''),
          p_limit: Number(args?.p_limit ?? 20),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_interprofessional_referral_targets_for_interface':
        return client.rpc(operation, {
          p_specialty_id: String(args?.p_specialty_id ?? ''),
        })
      case 'get_interprofessional_referrals_for_interface':
        return client.rpc(operation, {
          p_direction: String(args?.p_direction ?? 'all'),
          p_status:
            typeof args?.p_status === 'string' ? args.p_status : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_interprofessional_referral_events_for_interface':
        return client.rpc(operation, {
          p_referral_id: String(args?.p_referral_id ?? ''),
          p_limit: Number(args?.p_limit ?? 100),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'create_interprofessional_referral_for_interface':
        return client.rpc(operation, {
          p_patient_id: String(args?.p_patient_id ?? ''),
          p_target_specialty_id: String(args?.p_target_specialty_id ?? ''),
          p_operational_reason: String(args?.p_operational_reason ?? ''),
          p_source_appointment_id:
            typeof args?.p_source_appointment_id === 'string'
              ? args.p_source_appointment_id
              : undefined,
        })
      case 'update_interprofessional_referral_for_interface':
        return client.rpc(operation, {
          p_referral_id: String(args?.p_referral_id ?? ''),
          p_action: String(args?.p_action ?? ''),
          p_detail:
            typeof args?.p_detail === 'string' ? args.p_detail : undefined,
          p_target_professional_id:
            typeof args?.p_target_professional_id === 'string'
              ? args.p_target_professional_id
              : undefined,
        })
      case 'search_my_patients_for_interface':
        return client.rpc(operation, {
          p_query: String(args?.p_query ?? ''),
          p_limit: Number(args?.p_limit ?? 20),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_agenda_for_interface':
        return client.rpc(operation, {
          p_start_date: String(args?.p_start_date ?? ''),
          p_end_date: String(args?.p_end_date ?? ''),
          p_professional_id:
            typeof args?.p_professional_id === 'string'
              ? args.p_professional_id
              : undefined,
        })
      case 'create_patient_for_interface':
        return client.rpc(operation, {
          p_full_name: String(args?.p_full_name ?? ''),
          p_birth_date: String(args?.p_birth_date ?? ''),
          p_cms: typeof args?.p_cms === 'string' ? args.p_cms : null,
          p_sex: typeof args?.p_sex === 'string' ? args.p_sex : null,
          p_phone: typeof args?.p_phone === 'string' ? args.p_phone : null,
          p_phone_secondary:
            typeof args?.p_phone_secondary === 'string'
              ? args.p_phone_secondary
              : null,
          p_address:
            typeof args?.p_address === 'string' ? args.p_address : null,
          p_capo_start_date:
            typeof args?.p_capo_start_date === 'string'
              ? args.p_capo_start_date
              : null,
          p_operational_notes:
            typeof args?.p_operational_notes === 'string'
              ? args.p_operational_notes
              : null,
          p_origin: typeof args?.p_origin === 'string' ? args.p_origin : null,
        })
      case 'get_available_appointment_slots':
        return client.rpc(operation, {
          p_professional_id: String(args?.p_professional_id ?? ''),
          p_date: String(args?.p_date ?? ''),
        })
      case 'create_appointment_for_interface':
        return client.rpc(operation, {
          p_patient_id: String(args?.p_patient_id ?? ''),
          p_professional_id: String(args?.p_professional_id ?? ''),
          p_slot_start: String(args?.p_slot_start ?? ''),
          p_appointment_type: String(args?.p_appointment_type ?? ''),
          p_general_notes:
            typeof args?.p_general_notes === 'string'
              ? args.p_general_notes
              : null,
          p_operational_origin:
            typeof args?.p_operational_origin === 'string'
              ? args.p_operational_origin
              : null,
        })
      case 'get_reschedulable_appointments':
        return client.rpc(operation, {
          p_patient_id:
            typeof args?.p_patient_id === 'string' ? args.p_patient_id : null,
          p_professional_id:
            typeof args?.p_professional_id === 'string' ? args.p_professional_id : null,
          p_date: typeof args?.p_date === 'string' ? args.p_date : null,
          p_limit: Number(args?.p_limit ?? 50),
        })
      case 'reschedule_appointment_for_interface':
        return client.rpc(operation, {
          p_appointment_id: String(args?.p_appointment_id ?? ''),
          p_new_professional_id: String(args?.p_new_professional_id ?? ''),
          p_new_slot_start: String(args?.p_new_slot_start ?? ''),
          p_reason: String(args?.p_reason ?? ''),
          p_origin: String(args?.p_origin ?? ''),
          p_new_notes: String(args?.p_new_notes ?? ''),
        })
      case 'create_agenda_block_for_interface':
        return client.rpc(operation, {
          p_agenda_config_id: String(args?.p_agenda_config_id ?? ''),
          p_weekday:
            typeof args?.p_weekday === 'number' ? args.p_weekday : null,
          p_specific_date:
            typeof args?.p_specific_date === 'string' ? args.p_specific_date : null,
          p_start_time: String(args?.p_start_time ?? ''),
          p_end_time: String(args?.p_end_time ?? ''),
          p_block_type: String(args?.p_block_type ?? ''),
          p_description: String(args?.p_description ?? ''),
          p_confirm_overlap: args?.p_confirm_overlap === true,
          p_confirm_affected: args?.p_confirm_affected === true,
          p_reschedule_instructions: String(args?.p_reschedule_instructions ?? ''),
        })
      case 'create_agenda_exception_for_interface':
        return client.rpc(operation, {
          p_agenda_config_id: String(args?.p_agenda_config_id ?? ''),
          p_exception_date: String(args?.p_exception_date ?? ''),
          p_exception_type: String(args?.p_exception_type ?? ''),
          p_start_time: String(args?.p_start_time ?? ''),
          p_end_time: String(args?.p_end_time ?? ''),
          p_description: String(args?.p_description ?? ''),
          p_confirm_conflict: args?.p_confirm_conflict === true,
        })
      case 'get_scheduling_catalog':
        return client.rpc(operation)
      case 'get_agenda_configuration_for_interface':
        return client.rpc(operation, {
          p_professional_id: String(args?.p_professional_id ?? ''),
        })
      case 'get_my_specialty_operational_report_for_interface':
        return client.rpc(operation, {
          p_specialty_id: String(args?.p_specialty_id ?? ''),
          p_start_date: String(args?.p_start_date ?? ''),
          p_end_date: String(args?.p_end_date ?? ''),
        })
      case 'get_technical_dashboard_for_interface':
        return client.rpc(operation, {
          p_start_at: String(args?.p_start_at ?? ''),
          p_end_at: String(args?.p_end_at ?? ''),
          p_recent_limit: Number(args?.p_recent_limit ?? 10),
        })
      case 'get_technical_runtime_logs_for_interface':
        return client.rpc(operation, {
          p_start_at: String(args?.p_start_at ?? ''),
          p_end_at: String(args?.p_end_at ?? ''),
          p_severity:
            typeof args?.p_severity === 'string' ? args.p_severity : undefined,
          p_component:
            typeof args?.p_component === 'string'
              ? args.p_component
              : undefined,
          p_event_code:
            typeof args?.p_event_code === 'string'
              ? args.p_event_code
              : undefined,
          p_correlation_id:
            typeof args?.p_correlation_id === 'string'
              ? args.p_correlation_id
              : undefined,
          p_support_request_id:
            typeof args?.p_support_request_id === 'string'
              ? args.p_support_request_id
              : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_technical_support_requests_for_interface':
        return client.rpc(operation, {
          p_status:
            typeof args?.p_status === 'string' ? args.p_status : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'get_technical_support_history_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
        })
      case 'process_technical_support_request_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
          p_action: String(args?.p_action ?? ''),
          p_response:
            typeof args?.p_response === 'string' ? args.p_response : undefined,
        })
      case 'get_prescription_renewal_doctors_for_interface':
        return client.rpc(operation)
      case 'create_prescription_renewal_for_interface':
        return client.rpc(operation, {
          p_patient_id: String(args?.p_patient_id ?? ''),
          p_target_doctor_id: String(args?.p_target_doctor_id ?? ''),
          p_administrative_note:
            typeof args?.p_administrative_note === 'string'
              ? args.p_administrative_note
              : null,
        })
      case 'get_prescription_renewals_for_interface':
        return client.rpc(operation, {
          p_status:
            typeof args?.p_status === 'string' ? args.p_status : undefined,
          p_limit: Number(args?.p_limit ?? 50),
          p_offset: Number(args?.p_offset ?? 0),
        })
      case 'manage_prescription_renewal_medical_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
          p_action: String(args?.p_action ?? ''),
          p_operational_return:
            typeof args?.p_operational_return === 'string'
              ? args.p_operational_return
              : null,
        })
      case 'get_prescription_renewal_operational_context_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
        })
      case 'link_prescription_renewal_consult_appointment_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
          p_appointment_id: String(args?.p_appointment_id ?? ''),
        })
      case 'manage_prescription_renewal_admin_for_interface':
        return client.rpc(operation, {
          p_request_id: String(args?.p_request_id ?? ''),
          p_action: String(args?.p_action ?? ''),
          p_target_doctor_id:
            typeof args?.p_target_doctor_id === 'string'
              ? args.p_target_doctor_id
              : null,
          p_pickup_location:
            typeof args?.p_pickup_location === 'string'
              ? args.p_pickup_location
              : null,
          p_final_admin_note:
            typeof args?.p_final_admin_note === 'string'
              ? args.p_final_admin_note
              : null,
          p_patient_contacted: args?.p_patient_contacted === true,
          p_reason:
            typeof args?.p_reason === 'string' ? args.p_reason : null,
        })
      case 'complete_first_access':
      case 'get_patient_for_edit_for_interface':
      case 'update_patient_for_interface':
      case 'get_patient_contact_for_interface':
      case 'get_birthdays_for_interface':
      case 'get_interprofessional_referral_specialties_for_interface':
      case 'get_my_assistential_specialties_for_interface':
      case 'get_technical_system_status_for_interface':
      case 'get_technical_integrations_for_interface':
      case 'get_current_legal_term':
      case 'get_my_access_context':
        return client.rpc(operation)
      default:
        throw contractError(operation, 'RPC não cadastrada na camada CAPO.')
    }
  }
}

let service: ReturnType<typeof createRpcService> | undefined

export function getRpcService(): ReturnType<typeof createRpcService> {
  service ??= createRpcService(createSupabaseTransport(getSupabaseClient()))
  return service
}
