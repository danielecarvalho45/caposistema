import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
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

function renderPage(element: ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>)
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
    renderPage(<NotificationsPage service={emptyService} />)
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
    renderPage(<NotificationsPage service={errorService} />)
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

    renderPage(<NotificationsPage service={service} />)
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

  it('não permite resolver notificação ligada a solicitação sem concluir o fluxo', async () => {
    const service = serviceWith({ status: 'success', data: [notification] })
    renderPage(<NotificationsPage service={service} />)

    expect(
      await screen.findByText('Solicitação concluída'),
    ).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Marcar como resolvida' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Abrir contexto' }),
    ).not.toBeInTheDocument()
  })

  it('marca a notificação como lida antes de abrir o contexto por navegação interna', async () => {
    const user = userEvent.setup()
    const service = serviceWith({ status: 'success', data: [notification] })
    renderPage(
      <NotificationsPage
        service={service}
        getContextHref={() => '/transporte'}
      />,
    )

    const open = await screen.findByRole('button', { name: 'Abrir solicitação no Administrativo' })
    await user.click(open)
    expect(service.updateNotification).toHaveBeenCalledWith(
      'notification-id',
      'lida',
      '',
    )
  })
  it('abre a solicitação administrativa pelo ID sem confundir leitura com atendimento', async () => {
    const user = userEvent.setup()
    const service = serviceWith({ status: 'success', data: [notification] })
    function Destination() {
      const location = useLocation()
      return <output data-testid="destination">{location.pathname}:{String(location.state?.contextId ?? '')}</output>
    }
    renderPage(
      <>
        <NotificationsPage service={service} getContextHref={() => '/solicitacoes'} />
        <Destination />
      </>,
    )
    await user.click(await screen.findByRole('button', { name: 'Abrir solicitação no Administrativo' }))
    expect(await screen.findByTestId('destination')).toHaveTextContent('/solicitacoes:request-id')
    expect(service.updateNotification).toHaveBeenCalledWith('notification-id', 'lida', '')
  })

})
