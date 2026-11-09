// Endpoint público por token opaco, sem aceitar IDs de pacientes ou agendamentos.
// A chave service_role nunca é enviada ao navegador.
import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const endpoint = Deno.env.get('SUPABASE_URL') ?? ''
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function allowedOrigin(value: string | null) {
  if (!value) return null
  return /^https:\/\/(?:[a-z0-9-]+\.administrativo-capo\.workers\.dev|caposistema\.pages\.dev)$/.test(value)
    || /^http:\/\/localhost:\d+$/.test(value) ? value : null
}

function headers(origin: string | null) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  }
}

function json(value: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(value), { status, headers: headers(origin) })
}

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const origin = allowedOrigin(request.headers.get('Origin'))
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, origin)
  if (request.headers.get('Origin') && !origin) return json({ error: 'Origem não permitida.' }, 403, null)
  if (!endpoint || !serviceKey) return json({ error: 'Serviço indisponível.' }, 503, origin)
  let payload: unknown
  try {
    const source = await request.text()
    if (source.length > 2048) return json({ error: 'Requisição inválida.' }, 400, origin)
    payload = JSON.parse(source)
  } catch {
    return json({ error: 'Requisição inválida.' }, 400, origin)
  }
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown> : {}
  if (typeof body.token !== 'string' || !/^[0-9a-f]{64}$/.test(body.token)) {
    return json({ error: 'Link inválido ou expirado.' }, 400, origin)
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(body.token)))
  const tokenHash = toHex(digest)
  const client = createClient(endpoint, serviceKey, { auth: { persistSession: false } })
  const operation = body.action === 'read' ? 'read_appointment_confirmation_link'
    : body.action === 'respond' ? 'respond_appointment_confirmation_link' : null
  if (!operation) return json({ error: 'Operação inválida.' }, 400, origin)
  if (operation === 'respond_appointment_confirmation_link'
    && !['comparecera', 'nao_comparecera'].includes(String(body.decision))) {
    return json({ error: 'Resposta inválida.' }, 400, origin)
  }
  const args = operation === 'read_appointment_confirmation_link'
    ? { p_token_hash: tokenHash }
    : { p_token_hash: tokenHash, p_decision: body.decision }
  const { data, error } = await client.rpc(operation, args)
  if (error) {
    console.error('CAPO confirmation operation failed', operation, error.code)
    return json({ error: 'Não foi possível concluir agora. Tente novamente.' }, 503, origin)
  }
  return json(data, 200, origin)
})
