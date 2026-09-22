import { getSupabaseClient } from '../../lib/supabase/client'
import {
  contractError,
  normalizeSupabaseError,
} from '../../lib/supabase/errors'
import {
  getRpcService,
  type AsyncState,
  type ReferralPatient,
} from '../../lib/supabase/rpc'

export type FamilyMember = Readonly<Record<string, unknown>>
export type FamilyLink = Readonly<Record<string, unknown>>
export type FamilyContext = Readonly<{
  active_link: FamilyLink | null
  history: readonly FamilyLink[]
  can_admin_correct: boolean
  can_operate: boolean
}>

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>
}

const client = () => getSupabaseClient() as unknown as RpcClient

function parseContext(value: unknown): FamilyContext {
  if (!value || typeof value !== 'object')
    throw contractError('get_family_context_for_interface', 'objeto esperado.')
  const record = value as Record<string, unknown>
  const active = record.active_link
  const history = record.history
  if (active !== null && typeof active !== 'object')
    throw contractError(
      'get_family_context_for_interface',
      'active_link inválido.',
    )
  if (
    !Array.isArray(history) ||
    history.some((item) => !item || typeof item !== 'object')
  )
    throw contractError('get_family_context_for_interface', 'history inválido.')
  return {
    active_link: active as FamilyLink | null,
    history: history as FamilyLink[],
    can_admin_correct: record.can_admin_correct === true,
    can_operate: record.can_operate === true,
  }
}

async function call<T>(
  operation: string,
  name: string,
  args: Record<string, unknown>,
  parse: (value: unknown) => T,
): Promise<AsyncState<T>> {
  try {
    const { data, error } = await client().rpc(name, args)
    if (error) throw normalizeSupabaseError(operation, error)
    return { status: 'success', data: parse(data) }
  } catch (error) {
    return { status: 'error', error: normalizeSupabaseError(operation, error) }
  }
}

function parseMutation(value: unknown) {
  if (!value || typeof value !== 'object')
    throw contractError('family_link_mutation', 'objeto esperado.')
  return value as Readonly<Record<string, unknown>>
}

export type FamilyCaregiverService = Readonly<{
  getFamilyContext: (patientId: string) => Promise<AsyncState<FamilyContext>>
  createFamilyLink: (
    input: Record<string, unknown>,
  ) => Promise<AsyncState<Readonly<Record<string, unknown>>>>
  replaceFamilyLink: (
    input: Record<string, unknown>,
  ) => Promise<AsyncState<Readonly<Record<string, unknown>>>>
  closeFamilyLink: (
    linkId: string,
    reason: string,
  ) => Promise<AsyncState<Readonly<Record<string, unknown>>>>
  updateFamilyLinkOperational: (
    input: Record<string, unknown>,
  ) => Promise<AsyncState<Readonly<Record<string, unknown>>>>
  searchFamilyMembers: (
    query: string,
    limit: number,
  ) => Promise<AsyncState<readonly FamilyMember[]>>
  createPsychologyRequest: (
    linkId: string,
  ) => Promise<AsyncState<Readonly<Record<string, unknown>>>>
  searchPatients: (
    query: string,
    limit: number,
  ) => Promise<AsyncState<readonly ReferralPatient[]>>
}>

export function createFamilyCaregiverService(): FamilyCaregiverService {
  return {
    getFamilyContext: (patientId) =>
      call(
        'get_family_context_for_interface',
        'get_family_context_for_interface',
        { p_patient_id: patientId },
        parseContext,
      ),
    createFamilyLink: (input) =>
      call(
        'create_family_link_for_interface',
        'create_family_link_for_interface',
        input,
        parseMutation,
      ),
    replaceFamilyLink: (input) =>
      call(
        'replace_family_link_for_interface',
        'replace_family_link_for_interface',
        input,
        parseMutation,
      ),
    closeFamilyLink: (linkId, reason) =>
      call(
        'close_family_link_for_interface',
        'close_family_link_for_interface',
        { p_link_id: linkId, p_reason: reason },
        parseMutation,
      ),
    updateFamilyLinkOperational: (input) =>
      call(
        'update_family_link_operational_for_interface',
        'update_family_link_operational_for_interface',
        input,
        parseMutation,
      ),
    searchFamilyMembers: (query, limit) =>
      call(
        'search_family_members_for_interface',
        'search_family_members_for_interface',
        { p_query: query, p_limit: limit },
        (value) => {
          if (!Array.isArray(value))
            throw contractError(
              'search_family_members_for_interface',
              'lista esperada.',
            )
          return value as readonly FamilyMember[]
        },
      ),
    createPsychologyRequest: (linkId) =>
      call(
        'create_family_psychology_interest_request_for_interface',
        'create_family_psychology_interest_request_for_interface',
        { p_family_link_id: linkId },
        parseMutation,
      ),
    searchPatients: (query, limit) =>
      getRpcService().searchReferralPatients(query, limit, 0),
  }
}
