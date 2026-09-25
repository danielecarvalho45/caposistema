import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
})

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return reply({ error: 'Método não permitido.' }, 405)
  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return reply({ error: 'Serviço indisponível.' }, 503)
  const jwt = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!jwt) return reply({ error: 'Entre novamente no CAPO.' }, 401)
  const body = await request.json().catch(() => null)
  const { professionalId, active, reason } = body ?? {}
  if (typeof professionalId !== 'string' || !/^[0-9a-f-]{36}$/i.test(professionalId) ||
      typeof active !== 'boolean' || typeof reason !== 'string' ||
      (!active && (reason.trim().length < 5 || reason.trim().length > 500))) {
    return reply({ error: 'Confira o profissional e informe o motivo da inativação (5 a 500 caracteres).' }, 400)
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const requester = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: identity, error: identityError } = await requester.auth.getUser(jwt)
  if (identityError || !identity.user) return reply({ error: 'Entre novamente no CAPO.' }, 401)
  const { data: account, error: accountError } = await admin.from('user_accounts')
    .select('id').eq('auth_user_id', identity.user.id).eq('is_active', true).maybeSingle()
  if (accountError || !account) return reply({ error: 'Acesso não autorizado.' }, 403)
  const { data: roles, error: rolesError } = await admin.from('user_roles')
    .select('app_roles!inner(code,is_active)').eq('user_account_id', account.id)
    .eq('app_roles.code', 'administrador').eq('app_roles.is_active', true).limit(1)
  if (rolesError || !roles?.length) return reply({ error: 'Somente o administrador pode alterar a equipe.' }, 403)
  const { data: target, error: targetError } = await admin.from('user_accounts')
    .select('auth_user_id,is_active').eq('professional_id', professionalId).maybeSingle()
  if (targetError) return reply({ error: 'Serviço indisponível.' }, 503)
  if (!target?.auth_user_id) {
    const { data, error } = await requester.rpc('set_unlinked_professional_active_for_interface', {
      p_professional_id: professionalId, p_active: active, p_reason: reason.trim() || null,
    })
    return error ? reply({ error: error.message }, 400) : reply(data)
  }
  if (!active && target.auth_user_id === identity.user.id) return reply({ error: 'O administrador não pode inativar a própria conta.' }, 400)
  if (target.is_active === active) return reply({ success: true, active })
  // A RPC é a autoridade para as regras de último administrador e auditoria;
  // o bloqueio Auth precisa ocorrer primeiro, conforme seu contrato.
  const { error: authError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
    ban_duration: active ? 'none' : '876000h',
  })
  if (authError) return reply({ error: authError.message }, 400)
  const { data, error } = await requester.rpc('set_team_member_active_for_interface', {
    p_professional_id: professionalId, p_active: active, p_reason: reason.trim() || null,
  })
  if (error) {
    const { error: rollbackError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
      ban_duration: active ? '876000h' : 'none',
    })
    return reply({ error: rollbackError
      ? 'A alteração não foi concluída e a situação da conta exige revisão técnica.'
      : error.message }, rollbackError ? 500 : 400)
  }
  return reply(data)
})
