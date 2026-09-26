import { getSupabaseClient } from '../../lib/supabase/client'
import type { AsyncState } from '../../lib/supabase/rpc'
import type { Database } from '../../types/database'
import {
  contractError,
  normalizeSupabaseError,
  SupabaseOperationError,
} from '../../lib/supabase/errors'

export type Notification = Readonly<{
  notification_id: string
  notification_type: string
  title: string
  message: string
  priority: string | null
  status: string
  patient_id: string | null
  entity_type: string | null
  entity_id: string | null
  created_at: string
  read_at: string | null
  resolved_at: string | null
  total_count: number
}>

export type NotificationActionResult = Readonly<{
  success: boolean
  notification_id: string
  action: string
}>

export type NotificationRpcTransport = (
  operation: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(
  record: Record<string, unknown>,
  key: string,
  operation: string,
) {
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
) {
  const value = record[key]
  if (value !== null && typeof value !== 'string') {
    throw contractError(operation, `${key} deve ser texto ou null.`)
  }
  return value as string | null
}

function numberValue(
  record: Record<string, unknown>,
  key: string,
  operation: string,
) {
  const value = record[key]
  if (typeof value !== 'number') {
    throw contractError(operation, `${key} deve ser número.`)
  }
  return value
}

function parseNotification(value: unknown, operation: string): Notification {
  if (!isRecord(value)) throw contractError(operation, 'linha inválida.')
  return {
    notification_id: stringValue(value, 'notification_id', operation),
    notification_type: stringValue(value, 'notification_type', operation),
    title: stringValue(value, 'title', operation),
    message: stringValue(value, 'message', operation),
    priority: nullableString(value, 'priority', operation),
    status: stringValue(value, 'status', operation),
    patient_id: nullableString(value, 'patient_id', operation),
    entity_type: nullableString(value, 'entity_type', operation),
    entity_id: nullableString(value, 'entity_id', operation),
    created_at: stringValue(value, 'created_at', operation),
    read_at: nullableString(value, 'read_at', operation),
    resolved_at: nullableString(value, 'resolved_at', operation),
    total_count: numberValue(value, 'total_count', operation),
  }
}

function parseNotifications(value: unknown): readonly Notification[] {
  const operation = 'get_my_notifications_for_interface'
  if (!Array.isArray(value)) {
    throw contractError(operation, 'lista de notificações esperada.')
  }
  return value.map((item) => parseNotification(item, operation))
}

function parseAction(value: unknown): NotificationActionResult {
  const operation = 'update_my_notification_for_interface'
  if (!isRecord(value)) throw contractError(operation, 'resultado inválido.')
  return {
    success: true,
    notification_id: stringValue(value, 'notification_id', operation),
    action: stringValue(value, 'action', operation),
  }
}

async function execute<T>(
  transport: NotificationRpcTransport,
  operation: string,
  args: Record<string, unknown> | undefined,
  parse: (value: unknown) => T,
): Promise<AsyncState<T>> {
  try {
    const { data, error } = await transport(operation, args)
    if (error) throw error
    if (data === null || data === undefined) return { status: 'empty' }
    const parsed = parse(data)
    if (Array.isArray(parsed) && parsed.length === 0) return { status: 'empty' }
    return { status: 'success', data: parsed }
  } catch (error) {
    return {
      status: 'error',
      error: normalizeSupabaseError(operation, error),
    }
  }
}

export function createNotificationsService(
  transport: NotificationRpcTransport,
) {
  return {
    getNotifications: (onlyUnread: boolean, limit: number, offset: number) =>
      execute(
        transport,
        'get_my_notifications_for_interface',
        {
          p_only_unread: onlyUnread,
          p_limit: limit,
          p_offset: offset,
        },
        parseNotifications,
      ),
    updateNotification: (
      notificationId: string,
      action: 'lida' | 'resolvida',
      notes: string,
    ) =>
      execute(
        transport,
        'update_my_notification_for_interface',
        {
          p_notification_id: notificationId,
          p_action: action,
          p_notes: notes,
        },
        parseAction,
      ),
  }
}

async function supabaseTransport(
  operation: string,
  args?: Record<string, unknown>,
) {
  return (getSupabaseClient() as ReturnType<typeof getSupabaseClient> & {
    rpc: <Name extends keyof Database['public']['Functions']>(
      operation: Name,
      args: Database['public']['Functions'][Name]['Args'],
    ) => Promise<{ data: unknown; error: unknown }>
  }).rpc(
    operation as 'get_my_notifications_for_interface' | 'update_my_notification_for_interface',
    args as
      | Database['public']['Functions']['get_my_notifications_for_interface']['Args']
      | Database['public']['Functions']['update_my_notification_for_interface']['Args'],
  )
}

let service: ReturnType<typeof createNotificationsService> | undefined

export function getNotificationsService() {
  service ??= createNotificationsService(supabaseTransport)
  return service
}

export type NotificationsService = ReturnType<typeof createNotificationsService>
export type NotificationError = SupabaseOperationError
