import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AccessContext } from '../../types/access'
import { getSupabaseClient } from '../../lib/supabase/client'

type UnreadThread = { recipient_id?: string; unread?: boolean }
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
        const rows = Array.isArray(messages.data) ? messages.data as UnreadThread[] : []
        if (active) setUnread(rows.filter(item => item.recipient_id === accountId && item.unread === true).length)
      } catch { /* O acesso à caixa permanece disponível mesmo com contador indisponível. */ }
    }
    void refresh()
    const handleFocus = () => { void refresh() }
    window.addEventListener('focus', handleFocus)
    const interval = window.setInterval(() => { void refresh() }, 60000)
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', handleFocus) }
  }, [allowed])
  if (!allowed) return null
  return <Link className="capo-communication-unread" to="/comunicacao" aria-label={unread ? `Comunicação Interna, ${unread} mensagens novas` : 'Abrir Comunicação Interna'}>
    <span aria-hidden="true">✉</span> <span>Mensagens</span>
    {unread > 0 && <strong aria-label={`${unread} novas`}>{unread > 99 ? '99+' : unread}</strong>}
  </Link>
}
