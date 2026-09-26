import { beforeEach, expect, it, vi } from 'vitest'
import { createClosuresIntegration } from '../../src/features/closures/closures-integration'

const transport = vi.hoisted(() => vi.fn())
vi.mock('../../src/lib/supabase/client', () => ({ getSupabaseClient: () => ({ rpc: transport }) }))
beforeEach(() => transport.mockReset())

it.each([
  [['ativo'], ['active']],
  [['encerrado'], ['closed']],
  [['ativo', 'encerrado'], ['active', 'closed']],
  [[], []],
] as const)('consulta os estados válidos sem descartar registros: %j', async (available, expected) => {
  transport.mockImplementation(async (_name: string, args: { p_status: string }) => ({
    data: args && available.includes(args.p_status as never)
      ? [{ cycle_id: args.p_status === 'ativo' ? 'active' : 'closed', status: args.p_status, total_count: 1 }]
      : [],
    error: null,
  }))
  const result = await createClosuresIntegration().loadSocial(null)
  expect(result.status).toBe(expected.length ? 'success' : 'empty')
  if (result.status === 'success') expect(result.data.map((row) => row.cycle_id)).toEqual(expected)
  expect(transport.mock.calls.map(([, args]) => args.p_status)).toEqual(['ativo', 'encerrado'])
  expect(transport.mock.calls.every(([, args]) => args.p_limit === 100 && args.p_offset === 0)).toBe(true)
})

it('pagina por status e não duplica ciclos entre páginas', async () => {
  transport.mockImplementation(async (_name: string, args: { p_status: string; p_offset: number }) => ({
    data: !args || args.p_status === 'encerrado' ? [] : args.p_offset === 0
      ? Array.from({ length: 100 }, (_, i) => ({ cycle_id: `cycle-${i}`, status: 'ativo', total_count: 101 }))
      : [{ cycle_id: 'cycle-100', status: 'ativo', total_count: 101 }],
    error: null,
  }))
  const result = await createClosuresIntegration().loadSocial(null)
  expect(result.status).toBe('success')
  if (result.status === 'success') expect(result.data).toHaveLength(101)
  expect(transport.mock.calls.map(([, args]) => [args.p_status, args.p_offset])).toEqual([
    ['ativo', 0], ['ativo', 100], ['encerrado', 0],
  ])
})

it('propaga o erro de autorização sem expor resultado parcial', async () => {
  transport.mockImplementation(async (_name: string, args: { p_status: string }) => args?.p_status === 'ativo'
    ? { data: [{ cycle_id: 'active', status: 'ativo' }], error: null }
    : { data: null, error: { message: 'Perfil sem autorização para consultar acompanhamentos sociais.', code: '42501' } })
  const result = await createClosuresIntegration().loadSocial(null)
  expect(result.status).toBe('error')
  if (result.status === 'error') expect(result.error.message).toMatch(/autorização/i)
})

it('mantém consulta específica a um status, sem alterar o contrato de filtros', async () => {
  transport.mockResolvedValue({ data: [{ cycle_id: 'closed', status: 'encerrado' }], error: null })
  const result = await createClosuresIntegration().loadSocial('encerrado')
  expect(result.status).toBe('success')
  expect(transport).toHaveBeenCalledOnce()
  expect(transport).toHaveBeenCalledWith('get_social_followups_for_interface', {
    p_status: 'encerrado', p_limit: 100, p_offset: 0,
  })
})
