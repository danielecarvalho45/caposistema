import {
  getRpcService,
  type AsyncState,
  type TechnicalDashboard,
  type TechnicalIntegrationInventory,
  type TechnicalRuntimeLog,
  type TechnicalSupportHistory,
  type TechnicalSupportRequest,
  type TechnicalSystemStatus,
} from '../../lib/supabase/rpc'

export type CAPOTechnicalIntegration = Readonly<{
  loadDashboard: (
    startAt: string,
    endAt: string,
    recentLimit?: number,
  ) => Promise<AsyncState<TechnicalDashboard>>
  loadSystemStatus: () => Promise<AsyncState<TechnicalSystemStatus>>
  loadIntegrations: () => Promise<AsyncState<TechnicalIntegrationInventory>>
  loadRuntimeLogs: (
    startAt: string,
    endAt: string,
    severity?: string | null,
    component?: string | null,
    eventCode?: string | null,
    limit?: number,
    offset?: number,
  ) => Promise<AsyncState<readonly TechnicalRuntimeLog[]>>
  loadSupportRequests: (
    status?: string | null,
    limit?: number,
    offset?: number,
  ) => Promise<AsyncState<readonly TechnicalSupportRequest[]>>
  loadSupportHistory: (
    requestId: string,
  ) => Promise<AsyncState<TechnicalSupportHistory>>
}>

export function createTechnicalIntegration(
  service = getRpcService(),
): CAPOTechnicalIntegration {
  return {
    loadDashboard: (startAt, endAt, recentLimit = 10) =>
      service.getTechnicalDashboard(startAt, endAt, recentLimit),
    loadSystemStatus: () => service.getTechnicalSystemStatus(),
    loadIntegrations: () => service.getTechnicalIntegrations(),
    loadRuntimeLogs: (
      startAt,
      endAt,
      severity = null,
      component = null,
      eventCode = null,
      limit = 50,
      offset = 0,
    ) =>
      service.getTechnicalRuntimeLogs(
        startAt,
        endAt,
        severity,
        component,
        eventCode,
        limit,
        offset,
      ),
    loadSupportRequests: (status = null, limit = 50, offset = 0) =>
      service.getTechnicalSupportRequests(status, limit, offset),
    loadSupportHistory: (requestId) =>
      service.getTechnicalSupportHistory(requestId),
  }
}
