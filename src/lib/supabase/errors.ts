export type SupabaseFailureKind =
  'authorization' | 'network' | 'contract' | 'unknown'

export class SupabaseOperationError extends Error {
  readonly kind: SupabaseFailureKind
  readonly operation: string
  readonly code?: string
  readonly details?: string
  readonly hint?: string

  constructor(options: {
    operation: string
    kind: SupabaseFailureKind
    message: string
    code?: string
    details?: string
    hint?: string
    cause?: unknown
  }) {
    super(options.message, { cause: options.cause })
    this.name = 'SupabaseOperationError'
    this.operation = options.operation
    this.kind = options.kind
    this.code = options.code
    this.details = options.details
    this.hint = options.hint
  }
}

type ErrorShape = {
  message?: unknown
  code?: unknown
  details?: unknown
  hint?: unknown
  status?: unknown
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function normalizeSupabaseError(
  operation: string,
  cause: unknown,
): SupabaseOperationError {
  if (cause instanceof SupabaseOperationError) return cause

  const shaped =
    typeof cause === 'object' && cause !== null ? (cause as ErrorShape) : {}
  const code = optionalString(shaped.code)
  const status = typeof shaped.status === 'number' ? shaped.status : undefined
  const message =
    optionalString(shaped.message) ??
    (cause instanceof Error ? cause.message : 'Falha desconhecida no Supabase.')

  const isAuthorization =
    code === '42501' || code === 'PGRST301' || status === 401 || status === 403
  const isNetwork =
    cause instanceof TypeError || code === 'NETWORK_ERROR' || status === 0

  return new SupabaseOperationError({
    operation,
    kind: isAuthorization ? 'authorization' : isNetwork ? 'network' : 'unknown',
    message,
    code,
    details: optionalString(shaped.details),
    hint: optionalString(shaped.hint),
    cause,
  })
}

export function contractError(
  operation: string,
  message: string,
): SupabaseOperationError {
  return new SupabaseOperationError({
    operation,
    kind: 'contract',
    message: `Resposta inválida de ${operation}: ${message}`,
  })
}
