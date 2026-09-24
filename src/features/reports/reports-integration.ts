import {
  getRpcService,
  type AssistentialOperationalReport,
  type AssistentialSpecialty,
  type AsyncState,
} from '../../lib/supabase/rpc'

export type CAPOReportsIntegration = Readonly<{
  loadSpecialties: () => Promise<AsyncState<readonly AssistentialSpecialty[]>>
  loadReport: (
    specialtyId: string,
    startDate: string,
    endDate: string,
  ) => Promise<AsyncState<AssistentialOperationalReport>>
  loadDashboard?: (
    startDate: string,
    endDate: string,
    specialtyId: string | null,
  ) => Promise<AsyncState<unknown>>
}>

export function createReportsIntegration(
  service = getRpcService(),
): CAPOReportsIntegration {
  return {
    loadSpecialties: () => service.getMyAssistentialSpecialties(),
    loadReport: (specialtyId, startDate, endDate) =>
      service.getMySpecialtyOperationalReport(specialtyId, startDate, endDate),
    loadDashboard: (startDate, endDate, specialtyId) =>
      service.getReportsDashboard(startDate, endDate, specialtyId),
  }
}
