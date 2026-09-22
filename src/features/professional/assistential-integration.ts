import {
  getRpcService,
  type AgendaAppointment,
  type AssistentialOperationalReport,
  type AssistentialPatient,
  type AssistentialSpecialty,
  type AsyncState,
} from '../../lib/supabase/rpc'

export type CAPOProfissionalAssistencialIntegration = Readonly<{
  loadSpecialties: () => Promise<AsyncState<readonly AssistentialSpecialty[]>>
  searchPatients: (
    query: string,
    limit?: number,
    offset?: number,
  ) => Promise<AsyncState<readonly AssistentialPatient[]>>
  loadAgenda: (
    startDate: string,
    endDate: string,
    professionalId?: string | null,
  ) => Promise<AsyncState<readonly AgendaAppointment[]>>
  loadReport: (
    specialtyId: string,
    startDate: string,
    endDate: string,
  ) => Promise<AsyncState<AssistentialOperationalReport>>
}>

export function createAssistentialIntegration(
  service = getRpcService(),
): CAPOProfissionalAssistencialIntegration {
  return {
    loadSpecialties: () => service.getMyAssistentialSpecialties(),
    searchPatients: (query, limit = 20, offset = 0) =>
      service.searchMyAssistentialPatients(query, limit, offset),
    loadAgenda: (startDate, endDate, professionalId = null) =>
      service.getAgenda(startDate, endDate, professionalId),
    loadReport: (specialtyId, startDate, endDate) =>
      service.getMySpecialtyOperationalReport(specialtyId, startDate, endDate),
  }
}
