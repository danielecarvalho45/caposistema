import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceKey) return json({ error: 'Serviço indisponível.' }, 503)

  const jwt = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1]
  if (!jwt) return json({ error: 'Entre novamente no CAPO.' }, 401)

  let payload: Record<string, unknown>
  try {
    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('body')
    payload = body as Record<string, unknown>
  } catch {
    return json({ error: 'Dados inválidos.' }, 400)
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const password = typeof payload.temporaryPassword === 'string' ? payload.temporaryPassword : ''
  const initiallyActive = payload.initiallyActive !== false
  const inactiveReason = typeof payload.inactiveReason === 'string' ? payload.inactiveReason.trim() : ''
  const existingProfessionalId = typeof payload.existingProfessionalId === 'string' ? payload.existingProfessionalId : null
  const profile = payload.profile
  const passwordIsValid = password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !passwordIsValid ||
      !profile || typeof profile !== 'object' || Array.isArray(profile)) {
    return json({ error: 'Informe e-mail, senha com pelo menos 8 caracteres, uma letra maiúscula, uma minúscula e um número, e os dados do profissional.' }, 400)
  }
  if (existingProfessionalId && !/^[0-9a-f-]{36}$/i.test(existingProfessionalId)) {
    return json({ error: 'Profissional inválido.' }, 400)
  }

  const fields = profile as Record<string, unknown>
  if (typeof fields.recoveryEmail !== 'string' || fields.recoveryEmail.trim().toLowerCase() !== email ||
      typeof fields.fullName !== 'string' || typeof fields.username !== 'string' ||
      !Array.isArray(fields.roleCodes) || !Array.isArray(fields.specialtyIds) ||
      fields.roleCodes.some((role) => typeof role !== 'string') ||
      fields.specialtyIds.some((id) => typeof id !== 'string')) {
    return json({ error: 'Confira o nome, usuário, papéis e e-mail de recuperação.' }, 400)
  }
  if (!initiallyActive && (inactiveReason.length < 5 || inactiveReason.length > 500)) {
    return json({ error: 'Informe o motivo da inativação com 5 a 500 caracteres.' }, 400)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const requester = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: authError } = await requester.auth.getUser(jwt)
  if (authError || !userData.user) return json({ error: 'Entre novamente no CAPO.' }, 401)

  // Verifica o papel antes de usar a chave de serviço para criar uma identidade Auth.
  const { data: account, error: accountError } = await admin.from('user_accounts')
    .select('id').eq('auth_user_id', userData.user.id).eq('is_active', true).maybeSingle()
  if (accountError) return json({ error: 'Serviço indisponível.' }, 503)
  if (!account) return json({ error: 'Acesso não autorizado.' }, 403)

  const { data: isAdministrator, error: roleError } = await requester.rpc('has_app_role', {
    required_role: 'administrador',
  })
  if (roleError) return json({ error: 'Serviço indisponível.' }, 503)
  if (!isAdministrator) return json({ error: 'Somente o administrador pode cadastrar a equipe.' }, 403)

  if (existingProfessionalId) {
    const { data: existing, error: existingError } = await admin.from('professionals')
      .select('status').eq('id', existingProfessionalId).maybeSingle()
    if (existingError || !existing || initiallyActive !== (existing.status === 'ativo')) {
      return json({ error: 'Confira a situação atual do profissional antes de criar o acesso.' }, 400)
    }
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createError || !created.user) {
    return json({ error: createError?.message ?? 'Não foi possível criar a conta de acesso.' }, 400)
  }

  if (!initiallyActive) {
    const { error: banError } = await admin.auth.admin.updateUserById(created.user.id, { ban_duration: '876000h' })
    if (banError) {
      await admin.auth.admin.deleteUser(created.user.id)
      return json({ error: 'Não foi possível manter a conta inicialmente inativa.' }, 400)
    }
  }

  const operation = existingProfessionalId
    ? 'link_existing_professional_account_for_interface'
    : 'create_team_member_with_status_for_interface'
  const args = existingProfessionalId ? {
    p_professional_id: existingProfessionalId, p_auth_user_id: created.user.id, p_profile: fields,
  } : {
      p_auth_user_id: created.user.id,
      p_full_name: fields.fullName,
      p_username: fields.username,
      p_recovery_email: email,
      p_phone: fields.phone,
      p_function_title: fields.functionTitle,
      p_professional_registration: fields.professionalRegistration,
      p_administrative_responsibility: fields.administrativeResponsibility,
      p_is_professional: fields.isProfessional,
      p_role_codes: fields.roleCodes,
      p_specialty_ids: fields.specialtyIds,
      p_primary_specialty_id: fields.primarySpecialtyId,
      p_birth_date: fields.birthDate,
      p_initially_active: initiallyActive,
      p_inactive_reason: initiallyActive ? null : inactiveReason,
    }
  const { data: result, error: profileError } = await requester.rpc(operation, args)

  if (profileError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(created.user.id)
    if (cleanupError) {
      return json({ error: 'Cadastro incompleto. Procure o administrador técnico antes de tentar novamente.' }, 500)
    }
    return json({ error: profileError.message }, 400)
  }

  return json(result)
})
