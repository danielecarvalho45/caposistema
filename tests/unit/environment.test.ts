import { describe, expect, it } from 'vitest'
import { readPublicEnvironment } from '../../src/lib/environment'

const validEnvironment = {
  VITE_SUPABASE_URL: 'https://project-ref.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
}

describe('readPublicEnvironment', () => {
  it('aceita a configuração pública esperada', () => {
    expect(readPublicEnvironment(validEnvironment)).toEqual({
      supabaseUrl: validEnvironment.VITE_SUPABASE_URL,
      supabasePublishableKey: validEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY,
    })
  })

  it.each(['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'])(
    'bloqueia a inicialização quando %s está ausente',
    (name) => {
      const environment = { ...validEnvironment, [name]: '' }

      expect(() => readPublicEnvironment(environment)).toThrow(
        `Configuração obrigatória ausente: ${name}`,
      )
    },
  )

  it('recusa uma chave que não seja publicável', () => {
    expect(() =>
      readPublicEnvironment({
        ...validEnvironment,
        VITE_SUPABASE_PUBLISHABLE_KEY: 'valor-inadequado',
      }),
    ).toThrow('deve usar uma chave publicável')
  })
})
