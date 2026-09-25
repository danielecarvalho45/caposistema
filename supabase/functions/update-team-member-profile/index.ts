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
  const professionalId = body?.professionalId
  const profile = body?.profile
  if (typeof professionalId !== 'string' || !/^[0-9a-f-]{36}$/i.test(professionalId) ||
      !profile || typeof profile !== 'object' || Array.isArray(profile)) return reply({ error: 'Dados inválidos.' }, 400)
  const fields = profile as Record<string, unknown>
  const email = typeof fields.recoveryEmail === 'string' ? fields.recoveryEmail.trim().toLowerCase() : ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof fields.fullName !== 'string' || typeof fields.username !== 'string' ||
      !Array.isArray(fields.roleCodes) || !Array.isArray(fields.specialtyIds)) {
    return reply({ error: 'Confira nome, usuário, e-mail, papéis e especialidades.' }, 400)
  }
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const requester = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: requesterIdentity, error: identityError } = await requester.auth.getUser(jwt)
  if (identityError || !requesterIdentity.user) return reply({ error: 'Entre novamente no CAPO.' }, 401)
  const { data: caller } = await admin.from('user_accounts').select('id')
    .eq('auth_user_id', requesterIdentity.user.id).eq('is_active', true).maybeSingle()
  if (!caller) return reply({ error: 'Acesso não autorizado.' }, 403)
  const { data: isAdministrator, error: roleError } = await requester.rpc('has_app_role', {
    required_role: 'administrador',
  })
  if (roleError) return reply({ error: 'Serviço indisponível.' }, 503)
  if (!isAdministrator) return reply({ error: 'Somente o administrador pode editar a equipe.' }, 403)
  const { data: target, error: accountError } = await admin.from('user_accounts')
    .select('auth_user_id').eq('professional_id', professionalId).maybeSingle()
  if (accountError || !target?.auth_user_id) return reply({ error: 'Conta não vinculada ao profissional.' }, 404)
  const { data: identity, error: getError } = await admin.auth.admin.getUserById(target.auth_user_id)
  if (getError || !identity.user?.email) return reply({ error: 'Identidade de acesso indisponível.' }, 503)
  const previousEmail = identity.user.email.toLowerCase()
  if (previousEmail !== email) {
    const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, { email, email_confirm: true })
    if (error) return reply({ error: error.message }, 400)
  }
  const { data, error } = await requester.rpc('update_team_member_profile_for_interface', {
    p_professional_id: professionalId,
    p_full_name: fields.fullName,
    p_username: fields.username,
    p_recovery_email: email,
    p_phone: fields.phone,
    p_professional_registration: fields.professionalRegistration,
    p_function_title: fields.functionTitle,
    p_administrative_responsibility: fields.administrativeResponsibility,
    p_is_professional: fields.isProfessional,
    p_role_codes: fields.roleCodes,
    p_specialty_ids: fields.specialtyIds,
    p_primary_specialty_id: fields.primarySpecialtyId,
    p_birth_date: fields.birthDate,
  })
  if (error) {
    if (previousEmail !== email) {
      const { error: rollbackError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
        email: previousEmail, email_confirm: true,
      })
      if (rollbackError) return reply({ error: 'O e-mail precisa de revisão técnica antes de tentar novamente.' }, 500)
    }
    return reply({ error: error.message }, 400)
  }
  return reply(data)
})
