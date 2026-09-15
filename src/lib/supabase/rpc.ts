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
    getMyAccessContext: () =>
      execute({
        transport,
        operation: 'get_my_access_context',
        parse: parseAccessContext,
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
  }
}

function createSupabaseTransport(
  client: SupabaseClient<Database>,
): RpcTransport {
  return async (operation, args) => {
    switch (operation) {
      case 'accept_legal_term':
        return client.rpc(operation, {
          p_legal_term_id: String(args?.p_legal_term_id ?? ''),
        })
      case 'complete_first_access':
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
