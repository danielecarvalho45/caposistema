import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClosuresIntegration } from '../../src/features/closures/closures-integration'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc }),
}))

describe('Encerramento administrativo — aguardando início', () => {
  beforeEach(() => rpc.mockReset())

  it('usa a RPC canônica com paciente e motivo, sem alterar cadastro pelo cliente', async () => {
    rpc.mockResolvedValue({
      data: { success: true, cycle_status: 'encerrado', patient_registration_status: 'ativo', operational_status: 'aguardando_inicio' },
      error: null,
    })
    const result = await createClosuresIntegration().closeUnstartedAcceptedCycle(
      'paciente-id', 'Paciente aceitou a oferta, mas deseja aguardar o início.',
    )
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith(
      'close_unstarted_accepted_care_cycle_for_interface',
      { p_patient_id: 'paciente-id', p_reason: 'Paciente aceitou a oferta, mas deseja aguardar o início.' },
    )
    expect(result).toMatchObject({ status: 'success', data: { patient_registration_status: 'ativo' } })
  })

  it('não apresenta encerramento concluído quando o banco bloqueia uma consulta ativa', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Existe consulta ativa no ciclo.', code: '22023' } })
    const result = await createClosuresIntegration().closeUnstartedAcceptedCycle(
      'paciente-id', 'Paciente deseja aguardar o início.',
    )
    expect(result.status).toBe('error')
  })
})
