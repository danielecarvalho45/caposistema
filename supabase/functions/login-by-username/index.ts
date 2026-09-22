import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.116.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function authenticationFailure() {
  return response({ error: 'Usuário ou senha inválidos.' }, 401)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return response({ error: 'Método não permitido.' }, 405)
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return response({ error: 'Requisição inválida.' }, 400)
  }

  const body =
    typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : {}
  const username = String(body.username ?? '')
    .trim()
    .toLowerCase()
  const password = String(body.password ?? '')

  if (!/^[a-z0-9._-]{3,60}$/.test(username) || password.length < 6) {
    return authenticationFailure()
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return response({ error: 'Serviço de acesso indisponível.' }, 503)
  }

  try {
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: account, error: accountError } = await adminClient
      .from('user_accounts')
      .select('auth_user_id')
      .eq('username', username)
      .eq('is_active', true)
      .maybeSingle()

    if (accountError) {
      return response({ error: 'Serviço de acesso indisponível.' }, 503)
    }
    if (!account?.auth_user_id) return authenticationFailure()

    const { data: authData, error: authUserError } =
      await adminClient.auth.admin.getUserById(account.auth_user_id)
    const internalEmail = authData?.user?.email

    if (authUserError) {
      return response({ error: 'Serviço de acesso indisponível.' }, 503)
    }
    if (!internalEmail) return authenticationFailure()

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: loginData, error: loginError } =
      await authClient.auth.signInWithPassword({
        email: internalEmail,
        password,
      })

    if (loginError || !loginData.session) {
      if (loginError?.status === 429) {
        return response(
          {
            error:
              'Limite de tentativas atingido. Aguarde para tentar novamente.',
          },
          429,
        )
      }
      return authenticationFailure()
    }

    return response({
      access_token: loginData.session.access_token,
      refresh_token: loginData.session.refresh_token,
    })
  } catch {
    return response({ error: 'Serviço de acesso indisponível.' }, 503)
  }
})
