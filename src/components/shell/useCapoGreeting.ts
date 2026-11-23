import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService } from '../../lib/supabase/rpc'

export type GreetingTreatment = 'feminino' | 'masculino' | null

export function capoGreeting(treatment: GreetingTreatment, now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now))
  const salutation = hour < 12 ? 'Bom dia!' : hour < 18 ? 'Boa tarde!' : 'Boa noite!'
  if (treatment === 'feminino') return `${salutation} Seja bem-vinda ao CAPO.`
  if (treatment === 'masculino') return `${salutation} Seja bem-vindo ao CAPO.`
  return `${salutation} Boas-vindas ao CAPO.`
}

/** A forma de tratamento é resolvida pelo backend para o perfil efetivo,
 * inclusive o contexto simulado do manuteste, nunca pelo nome cadastrado. */
export function useCapoGreeting(accessContext: AccessContext): string {
  const [treatment, setTreatment] = useState<GreetingTreatment>(null)
  const [now, setNow] = useState(() => new Date())
  const effectiveId = accessContext.homologation_context?.enabled
    ? accessContext.homologation_context.professional_id
    : accessContext.professional_id

  useEffect(() => {
    let active = true
    setTreatment(null)
    void getRpcService().getProfessionalGreetingTreatment().then((result) => {
      if (!active) return
      if (result.status !== 'success' || !result.data ||
        typeof result.data !== 'object' || Array.isArray(result.data)) return
      const value = (result.data as Record<string, unknown>).greeting_treatment
      setTreatment(value === 'feminino' || value === 'masculino' ? value : null)
    }).catch(() => { if (active) setTreatment(null) })
    return () => { active = false }
  }, [accessContext.user_account_id, effectiveId])

  useEffect(() => {
    const refresh = () => setNow(new Date())
    const timer = setInterval(refresh, 60_000)
    return () => clearInterval(timer)
  }, [])

  return capoGreeting(treatment, now)
}
