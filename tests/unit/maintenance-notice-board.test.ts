import { describe, expect, it } from 'vitest'
import { maintenancePendingRequests } from '../../src/features/technical/MaintenanceNoticeBoard'
import type { TechnicalSupportRequest } from '../../src/lib/supabase/rpc'

function request(id: string, status: string, createdAt: string): TechnicalSupportRequest {
  return {
    request_id: id, requester_username: 'profissional', assigned_username: null,
    category: 'erro_interface', subject: 'Falha de interface', description: 'Falha informada',
    priority: 'normal', status, technical_response: null, requires_user_test: false,
    user_test_result: null, created_at: createdAt, updated_at: createdAt,
    started_at: null, resolved_at: null, total_count: 1,
  }
}

describe('Avisos de Manutenção do Gestor e TI', () => {
  it('mantém apenas chamados pendentes, em atendimento ou aguardando teste', () => {
    const received = [
      request('resolvido', 'resolvida', '2026-11-19T13:00:00Z'),
      request('aguarda', 'aguardando_teste', '2026-11-19T14:00:00Z'),
      request('novo', 'pendente', '2026-11-19T15:00:00Z'),
      request('andamento', 'em_atendimento', '2026-11-19T14:30:00Z'),
      request('cancelado', 'cancelada', '2026-11-19T16:00:00Z'),
    ]
    expect(maintenancePendingRequests(received).map(item => item.request_id))
      .toEqual(['novo', 'andamento', 'aguarda'])
    expect(received.map(item => item.request_id)[0]).toBe('resolvido')
  })
  it('não cria aviso fictício quando o contexto retorna vazio', () => {
    expect(maintenancePendingRequests([])).toEqual([])
  })
})
