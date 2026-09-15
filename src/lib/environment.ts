type EnvironmentSource = Record<string, string | boolean | undefined>

export type PublicEnvironment = Readonly<{
  supabaseUrl: string
  supabasePublishableKey: string
}>

function readRequiredValue(source: EnvironmentSource, name: string): string {
  const value = source[name]

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Configuração obrigatória ausente: ${name}`)
  }

  return value.trim()
}

export function readPublicEnvironment(
  source: EnvironmentSource,
): PublicEnvironment {
  const supabaseUrl = readRequiredValue(source, 'VITE_SUPABASE_URL')
  const supabasePublishableKey = readRequiredValue(
    source,
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  )

  let parsedUrl: URL

  try {
    parsedUrl = new URL(supabaseUrl)
  } catch {
    throw new Error(
      'Configuração inválida: VITE_SUPABASE_URL não é uma URL válida.',
    )
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    !parsedUrl.hostname.endsWith('.supabase.co')
  ) {
    throw new Error(
      'Configuração inválida: VITE_SUPABASE_URL deve apontar para um projeto Supabase via HTTPS.',
    )
  }

  if (!supabasePublishableKey.startsWith('sb_publishable_')) {
    throw new Error(
      'Configuração inválida: VITE_SUPABASE_PUBLISHABLE_KEY deve usar uma chave publicável.',
    )
  }

  return Object.freeze({ supabaseUrl, supabasePublishableKey })
}
