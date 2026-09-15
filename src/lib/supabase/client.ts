import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readPublicEnvironment, type PublicEnvironment } from '../environment'
import type { Database } from '../../types/database'

let client: SupabaseClient<Database> | undefined

export function createCapoSupabaseClient(
  environment: PublicEnvironment,
): SupabaseClient<Database> {
  return createClient<Database>(
    environment.supabaseUrl,
    environment.supabasePublishableKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  )
}

export function getSupabaseClient(): SupabaseClient<Database> {
  client ??= createCapoSupabaseClient(readPublicEnvironment(import.meta.env))
  return client
}
