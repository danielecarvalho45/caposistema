import { getSupabaseClient } from '../../lib/supabase/client'
import {
  contractError,
  normalizeSupabaseError,
} from '../../lib/supabase/errors'
import type { AsyncState } from '../../lib/supabase/rpc'

export type CareClosure = Readonly<Record<string, unknown>>
export type SocialFollowup = Readonly<Record<string, unknown>>
export type ClosureResult = Readonly<Record<string, unknown>>

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>
}

const client = () => getSupabaseClient() as unknown as RpcClient

function asRows<T>(
  operation: string,
  value: unknown,
): AsyncState<readonly T[]> {
  if (value === null || value === undefined) return { status: 'empty' }
  if (!Array.isArray(value)) {
    return {
      status: 'error',
      error: contractError(operation, 'lista esperada'),
    }
  }
  return value.length > 0
    ? { status: 'success', data: value as T[] }
    : { status: 'empty' }
}

async function readRows<T>(
  operation: string,
  name: string,
  args: Record<string, unknown>,
): Promise<AsyncState<readonly T[]>> {
  try {
    const { data, error } = await client().rpc(name, args)
    if (error) throw normalizeSupabaseError(operation, error)
    return asRows<T>(operation, data)
  } catch (error) {
    return { status: 'error', error: normalizeSupabaseError(operation, error) }
  }
}

async function write(
  operation: string,
  name: string,
  args: Record<string, unknown>,
): Promise<AsyncState<ClosureResult>> {
  try {
    const { data, error } = await client().rpc(name, args)
    if (error) throw normalizeSupabaseError(operation, error)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {
        status: 'error',
        error: contractError(operation, 'objeto esperado'),
      }
    }
    return { status: 'success', data: data as ClosureResult }
  } catch (error) {
    return { status: 'error', error: normalizeSupabaseError(operation, error) }
  }
}

export type ClosuresIntegration = Readonly<{
  loadClosures: (
    status: string | null,
  ) => Promise<AsyncState<readonly CareClosure[]>>
  requestOwnClosure: (
    patientId: string,
    specialtyId: string,
    reason: string,
  ) => Promise<AsyncState<ClosureResult>>
  closeClosure: (
    closureId: string,
    notes: string,
  ) => Promise<AsyncState<ClosureResult>>
  assignProfessional: (
    closureId: string,
    professionalId: string,
    createAdditional: boolean,
  ) => Promise<AsyncState<ClosureResult>>
  loadEligibleProfessionals: (
    closureId: string,
  ) => Promise<AsyncState<readonly CareClosure[]>>
  reopenClosure: (
    closureId: string,
    reason: string,
  ) => Promise<AsyncState<ClosureResult>>
  openReturnCycle: (
    patientId: string,
    reason: string,
  ) => Promise<AsyncState<ClosureResult>>
  startSocial: (
    cycleId: string,
    reason: string,
  ) => Promise<AsyncState<ClosureResult>>
  loadSocial: (
    status: string | null,
  ) => Promise<AsyncState<readonly SocialFollowup[]>>
  closeSocial: (
    cycleId: string,
    reason: string,
  ) => Promise<AsyncState<ClosureResult>>
}>

export function createClosuresIntegration(): ClosuresIntegration {
  return {
    loadClosures: (status) =>
      readRows(
        'get_care_closures_for_interface',
        'get_care_closures_for_interface',
        {
          p_status: status,
          p_limit: 100,
          p_offset: 0,
        },
      ),
    requestOwnClosure: (patientId, specialtyId, reason) =>
      write(
        'request_own_specialty_care_closure_for_interface',
        'request_own_specialty_care_closure_for_interface',
        {
          p_patient_id: patientId,
          p_specialty_id: specialtyId,
          p_reason: reason,
        },
      ),
    closeClosure: (closureId, notes) =>
      write(
        'close_care_closure_for_interface',
        'close_care_closure_for_interface',
        {
          p_closure_id: closureId,
          p_closure_notes: notes,
        },
      ),
    assignProfessional: (closureId, professionalId, createAdditional) =>
      write(
        'assign_care_closure_professional_for_interface',
        'assign_care_closure_professional_for_interface',
        {
          p_closure_id: closureId,
          p_professional_id: professionalId,
          p_create_additional: createAdditional,
        },
      ),
    loadEligibleProfessionals: (closureId) =>
      readRows(
        'get_eligible_care_closure_professionals_for_interface',
        'get_eligible_care_closure_professionals_for_interface',
        {
          p_closure_id: closureId,
        },
      ),
    reopenClosure: (closureId, reason) =>
      write(
        'reopen_care_closure_for_interface',
        'reopen_care_closure_for_interface',
        {
          p_closure_id: closureId,
          p_reason: reason,
        },
      ),
    openReturnCycle: (patientId, reason) =>
      write(
        'open_return_care_cycle_for_interface',
        'open_return_care_cycle_for_interface',
        {
          p_patient_id: patientId,
          p_opening_reason: reason,
        },
      ),
    startSocial: (cycleId, reason) =>
      write(
        'start_social_followup_for_interface',
        'start_social_followup_for_interface',
        {
          p_cycle_id: cycleId,
          p_opening_reason: reason,
        },
      ),
    loadSocial: (status) =>
      readRows(
        'get_social_followups_for_interface',
        'get_social_followups_for_interface',
        {
          p_status: status,
          p_limit: 100,
          p_offset: 0,
        },
      ),
    closeSocial: (cycleId, reason) =>
      write(
        'close_social_followup_for_interface',
        'close_social_followup_for_interface',
        {
          p_cycle_id: cycleId,
          p_closure_reason: reason,
        },
      ),
  }
}
