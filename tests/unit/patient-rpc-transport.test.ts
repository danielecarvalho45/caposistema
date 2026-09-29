import { describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ data: [], error: null }),
)

vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc }),
}))

import { getRpcService } from '../../src/lib/supabase/rpc'

describe('transporte físico das RPCs de paciente', () => {
  it('encaminha p_patient_id ao carregar cadastro para edição', async () => {
    await getRpcService().getPatientForEdit('patient-1')

    expect(rpc).toHaveBeenCalledWith(
      'get_patient_for_edit_for_interface',
      { p_patient_id: 'patient-1' },
    )
  })

  it('encaminha os argumentos completos ao atualizar paciente', async () => {
    await getRpcService().updatePatient({
      patientId: 'patient-1',
      fullName: 'Paciente Real',
      birthDate: '1956-10-21',
      cms: '87259',
      sex: 'feminino',
      phone: '35999999999',
      phoneSecondary: null,
      address: 'Endereço real',
      capoStartDate: '2026-09-29',
      operationalNotes: null,
      status: 'ativo',
      origin: 'CAPO',
    })

    expect(rpc).toHaveBeenCalledWith(
      'update_patient_for_interface',
      expect.objectContaining({
        p_patient_id: 'patient-1',
        p_full_name: 'Paciente Real',
        p_birth_date: '1956-10-21',
        p_cms: '87259',
        p_status: 'ativo',
      }),
    )
  })

  it('encaminha p_patient_id ao contato autorizado do paciente', async () => {
    await getRpcService().getPatientContact('patient-1')

    expect(rpc).toHaveBeenCalledWith(
      'get_patient_contact_for_interface',
      { p_patient_id: 'patient-1' },
    )
  })
})
