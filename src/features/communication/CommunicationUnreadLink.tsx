import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { getSupabaseClient } from '../../lib/supabase/client'
import { COMMUNICATION_UPDATED_EVENT, hasIncomingCommunication, type IncomingCommunication } from './communication-inbox'

export function CommunicationUnreadLink({ accessContext }: Readonly<{ accessContext: AccessContext }>) {
  const [unread, setUnread] = useState(0)
  const allowed = accessContext.is_active && accessContext.roles.some(
    role => ['administrador','administrativo_operacional','profissional'].includes(role.code),
  )
  useEffect(() => {
    if (!allowed) return
    let active = true
    const refresh = async () => {
      try {
        const [who, messages] = await Promise.all([
          getSupabaseClient().rpc('get_my_internal_communication_identity_for_interface'),
          getSupabaseClient().rpc('get_internal_communications_for_interface', { p_limit: 200 }),
        ])
        if (who.error || messages.error) return
        const accountId = who.data && typeof who.data === 'object' && !Array.isArray(who.data) && typeof who.data.account_id === 'string'
          ? who.data.account_id : ''
        const rows = Array.isArray(messages.data) ? messages.data as IncomingCommunication[] : []
        if (active) setUnread(rows.filter(item => hasIncomingCommunication(item, accountId)).length)
      } catch { /* O acesso à caixa permanece disponível mesmo com contador indisponível. */ }
    }
    void refresh()
    const handleFocus = () => { void refresh() }
    const handleVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    globalThis.addEventListener(COMMUNICATION_UPDATED_EVENT, handleFocus)
    // Checagem frequente de respostas sem depender de foco ou recriar notificações gerais.
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 20000)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      globalThis.removeEventListener(COMMUNICATION_UPDATED_EVENT, handleFocus)
    }
  }, [allowed])
  if (!allowed) return null
  return <Link className="capo-communication-unread" to="/comunicacao" aria-label={unread ? `Comunicação Interna, ${unread} mensagens novas` : 'Abrir Comunicação Interna'}>
    <span aria-hidden="true">✉</span> <span>Mensagens</span>
    {unread > 0 && <strong aria-label={`${unread} novas`}>{unread > 99 ? '99+' : unread}</strong>}
  </Link>
}
