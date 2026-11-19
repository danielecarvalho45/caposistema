import { describe, expect, it } from 'vitest'
import { administrativeRequestRpcPatientId } from '../../src/lib/supabase/rpc'

describe('Contrato de criação de solicitação administrativa', () => {
  it('envia null explícito quando a solicitação geral não possui paciente', () => {
    expect(administrativeRequestRpcPatientId(null)).toBeNull()
    expect(administrativeRequestRpcPatientId(undefined)).toBeNull()
  })

  it('preserva o identificador quando a solicitação é vinculada ao paciente', () => {
    const id = '4e360289-e110-45c6-856c-8da4ce5d3b00'
    expect(administrativeRequestRpcPatientId(id)).toBe(id)
  })
})
