import { describe, expect, it } from 'vitest'
import { createCapoSupabaseClient } from '../../src/lib/supabase/client'

describe('cliente Supabase', () => {
  it('cria uma instância funcional com URL e chave publicável', () => {
    const client = createCapoSupabaseClient({
      supabaseUrl: 'https://project-ref.supabase.co',
      supabasePublishableKey: 'sb_publishable_example',
    })

    expect(client.auth.getSession).toBeTypeOf('function')
    expect(client.rpc).toBeTypeOf('function')
  })
})
