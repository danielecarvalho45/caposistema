import { describe, expect, it, vi } from 'vitest'
import { createRpcService } from '../../src/lib/supabase/rpc'

describe('team management RPC contracts', () => {
  it('encaminha os argumentos oficiais de cadastro ao RPC central', async () => {
    const transport = vi.fn().mockResolvedValue({ data: {}, error: null })
    const service = createRpcService(transport)

    await service.createTeamMemberProfile({
      administrativeResponsibility: null,
      authUserId: 'account-1',
      birthDate: null,
      fullName: 'Ana Silva',
      functionTitle: 'Médica',
      isProfessional: true,
      phone: null,
      primarySpecialtyId: 'specialty-1',
      professionalRegistration: null,
      recoveryEmail: null,
      roleCodes: ['medico'],
      specialtyIds: ['specialty-1'],
      username: 'ana.silva',
    })

    expect(transport).toHaveBeenCalledWith(
      'create_team_member_profile_for_interface',
      expect.objectContaining({
        p_auth_user_id: 'account-1',
        p_full_name: 'Ana Silva',
        p_role_codes: ['medico'],
        p_specialty_ids: ['specialty-1'],
      }),
    )
  })

  it('encaminha os contratos transversais oficiais pelo adaptador central', async () => {
    const transport = vi.fn().mockResolvedValue({ data: {}, error: null })
    const service = createRpcService(transport)

    await service.createTechnicalSupportRequest({ subject: 'Falha', category: 'erro', description: 'Descrição válida', priority: 'normal', affectedModule: '/agenda' })
    await service.updateAppointmentAttendance({ appointmentId: 'appointment-1', action: 'confirmar', notes: '', reason: '' })
    await service.getReportsDashboard('2026-09-01', '2026-09-30', null)
    await service.getPatientTimeline('patient-1', null, null, 50)
    await service.getAuditLogs({ startAt: '2026-09-01T00:00:00.000Z', endAt: '2026-09-30T23:59:59.999Z' })

    expect(transport.mock.calls.map(([operation]) => operation)).toEqual([
      'create_technical_support_request_for_interface',
      'update_appointment_attendance_for_interface',
      'get_reports_dashboard_for_interface',
      'get_patient_timeline_for_interface',
      'get_audit_logs_for_interface',
    ])
  })
})