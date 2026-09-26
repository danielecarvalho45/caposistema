import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotificationsPage } from '../../src/features/notifications/NotificationsPage'
import {
  createNotificationsService,
  type Notification,
} from '../../src/features/notifications/notifications-integration'
import { SupabaseOperationError } from '../../src/lib/supabase/errors'

const notification: Notification = {
  notification_id: 'notification-id',
  notification_type: 'administrative_request_completed',
  title: 'Solicitação concluída',
  message: 'Sua solicitação foi concluída.',
  priority: 'normal',
  status: 'unread',
  patient_id: null,
  entity_type: 'administrative_request',
  entity_id: 'request-id',
  created_at: '2026-09-17T12:00:00Z',
  read_at: null,
  resolved_at: null,
  total_count: 1,
}

function serviceWith(result: object) {
  return {
    getNotifications: vi.fn().mockResolvedValue(result),
    updateNotification: vi.fn().mockResolvedValue({
      status: 'success',
      data: {
        success: true,
        notification_id: notification.notification_id,
        action: 'lida',
      },
    }),
  }
}

afterEach(cleanup)

describe('notifications integration', () => {
  it('chama a leitura oficial com filtro e paginação', async () => {
    const transport = vi
      .fn()
      .mockResolvedValue({ data: [notification], error: null })
    const service = createNotificationsService(transport)

    const result = await service.getNotifications(true, 20, 40)

    expect(result.status).toBe('success')
    expect(transport).toHaveBeenCalledWith(
      'get_my_notifications_for_interface',
      {
        p_only_unread: true,
        p_limit: 20,
        p_offset: 40,
      },
    )
  })

  it('aceita o retorno JSON físico da atualização sem campo success', async () => {
    const transport = vi.fn().mockResolvedValue({
      data: {
        notification_id: 'notification-id',
        action: 'lida',
        read_at: '2026-09-17T12:05:00Z',
        resolved_at: null,
        resolved_by: null,
      },
      error: null,
    })
    const service = createNotificationsService(transport)

    const result = await service.updateNotification(
      'notification-id',
      'lida',
      '',
    )

    expect(result.status).toBe('success')
    if (result.status === 'success') {
      expect(result.data.success).toBe(true)
      expect(result.data.action).toBe('lida')
    }
  })

  it('normaliza erro do backend sem simular sucesso', async () => {
    const transport = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('falha real'),
    })
    const service = createNotificationsService(transport)

    const result = await service.updateNotification(
      'notification-id',
      'lida',
      '',
    )

    expect(result.status).toBe('error')
    expect(result).toEqual(
      expect.objectContaining({ error: expect.any(SupabaseOperationError) }),
    )
  })
})

describe('NotificationsPage', () => {
  it('exibe estado vazio, loading e erro do contrato', async () => {
    const emptyService = serviceWith({ status: 'empty' })
    render(<NotificationsPage service={emptyService} />)
    expect(
      await screen.findByText('Nenhuma notificação encontrada.'),
    ).toBeVisible()

    cleanup()
    const errorService = serviceWith({
      status: 'error',
      error: new SupabaseOperationError({
        operation: 'get_my_notifications_for_interface',
        kind: 'network',
        message: 'Não foi possível carregar notificações.',
      }),
    })
    render(<NotificationsPage service={errorService} />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar notificações.',
    )
  })

  it('filtra não lidas e recarrega do backend após marcar como lida', async () => {
    const user = userEvent.setup()
    const service = serviceWith({ status: 'success', data: [notification] })
    service.getNotifications
      .mockResolvedValueOnce({ status: 'success', data: [notification] })
      .mockResolvedValueOnce({ status: 'success', data: [notification] })
      .mockResolvedValueOnce({ status: 'empty' })

    render(<NotificationsPage service={service} />)
    await screen.findByText('Solicitação concluída')
    await user.selectOptions(
      screen.getByLabelText('Filtrar notificações'),
      'unread',
    )
    expect(service.getNotifications).toHaveBeenLastCalledWith(true, 20, 0)
    await user.click(screen.getByRole('button', { name: 'Marcar como lida' }))

    expect(service.updateNotification).toHaveBeenCalledWith(
      'notification-id',
      'lida',
      '',
    )
    expect(service.getNotifications).toHaveBeenCalledTimes(3)
    expect(
      await screen.findByText('Nenhuma notificação encontrada.'),
    ).toBeVisible()
  })

  it('exibe ação de resolução e mantém contexto quando não há rota mapeada', async () => {
    const service = serviceWith({ status: 'success', data: [notification] })
    render(<NotificationsPage service={service} />)

    expect(
      await screen.findByRole('button', { name: 'Marcar como resolvida' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('link', { name: 'Abrir contexto' }),
    ).not.toBeInTheDocument()
  })
})
