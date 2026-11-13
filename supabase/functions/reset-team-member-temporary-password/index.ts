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
const uuid = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
const validPassword = (value: string) =>
  value.length >= 8 && value.length <= 128 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)

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
  const professionalId = body?.professionalId
  const password = typeof body?.temporaryPassword === 'string' ? body.temporaryPassword : ''
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (!uuid(professionalId) || !validPassword(password) || reason.length > 500) {
    return reply({ error: 'Informe um profissional válido e senha de 8 a 128 caracteres (maiúscula, minúscula e número).' }, 400)
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const requester = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: requesterIdentity, error: identityError } = await requester.auth.getUser(jwt)
  if (identityError || !requesterIdentity.user) return reply({ error: 'Entre novamente no CAPO.' }, 401)
  const { data: caller, error: callerError } = await admin.from('user_accounts')
    .select('id').eq('auth_user_id', requesterIdentity.user.id).eq('is_active', true).maybeSingle()
  if (callerError) return reply({ error: 'Serviço indisponível.' }, 503)
  if (!caller) return reply({ error: 'Acesso não autorizado.' }, 403)
  const { data: isAdministrator, error: roleError } = await requester.rpc('has_app_role', {
    required_role: 'administrador',
  })
  if (roleError) return reply({ error: 'Serviço indisponível.' }, 503)
  if (!isAdministrator) return reply({ error: 'Somente o Gestor/Titular pode redefinir senhas provisórias.' }, 403)

  const { data: target, error: targetError } = await admin.from('user_accounts')
    .select('id,auth_user_id,professional_id,is_active')
    .eq('professional_id', professionalId).maybeSingle()
  if (targetError) return reply({ error: 'Serviço indisponível.' }, 503)
  if (!target || !uuid(target.auth_user_id)) {
    return reply({ error: 'Este profissional ainda não possui conta. Utilize Criar acesso.' }, 400)
  }
  if (target.auth_user_id === requesterIdentity.user.id) {
    return reply({ error: 'Use o fluxo de alteração da sua própria senha.' }, 403)
  }
  const { data: professional, error: professionalError } = await admin.from('professionals')
    .select('id,first_access_completed,must_change_password')
    .eq('id', professionalId).maybeSingle()
  if (professionalError || !professional) return reply({ error: 'Profissional indisponível.' }, 404)
  const { data: identity, error: authError } = await admin.auth.admin.getUserById(target.auth_user_id)
  if (authError || !identity.user) return reply({ error: 'Identidade Auth não localizada. Não foi feita alteração.' }, 409)

  // A existência de qualquer aceite anterior exige justificativa; nunca modificar o aceite.
  const { count, error: termError } = await admin.from('user_term_acceptances')
    .select('id', { count: 'exact', head: true }).eq('user_account_id', target.id)
  if (termError || count === null) return reply({ error: 'Não foi possível validar os aceites.' }, 503)
  const exceptional = count > 0
  if (exceptional && reason.length < 10) {
    return reply({ error: 'Após o aceite do termo, informe justificativa de 10 a 500 caracteres.' }, 400)
  }

  // A trava é colocada ANTES da troca em Auth: uma falha posterior não libera o acesso funcional.
  const { error: guardError } = await admin.from('professionals')
    .update({ must_change_password: true }).eq('id', professionalId)
  if (guardError) return reply({ error: 'Não foi possível ativar a troca obrigatória. A senha não foi alterada.' }, 503)
  const { error: updateError } = await admin.auth.admin.updateUserById(target.auth_user_id, { password })
  if (updateError) {
    // Falha segura: a trava permanece ligada até revisão/novo ajuste administrativo.
    return reply({ error: 'O Auth recusou a nova senha. A conta permanece bloqueada para troca obrigatória.' }, 400)
  }

  const { error: auditError } = await admin.from('audit_logs').insert({
    user_id: requesterIdentity.user.id,
    user_role: 'administrador',
    action: 'administrative_temporary_password_reset',
    entity_name: 'user_accounts',
    record_id: target.id,
    old_data: { first_access_completed: professional.first_access_completed, must_change_password: professional.must_change_password },
    new_data: { must_change_password: true, exceptional, reason: exceptional ? reason : null },
    description: exceptional ? 'Recuperação administrativa excepcional de acesso.' : 'Redefinição de senha provisória antes do aceite.',
  })
  if (auditError) return reply({ error: 'Senha redefinida e troca obrigatória ativada, mas a auditoria falhou. Contate a manutenção antes de repetir.' }, 500)
  return reply({ ok: true, mustChangePassword: true, exceptional })
})
