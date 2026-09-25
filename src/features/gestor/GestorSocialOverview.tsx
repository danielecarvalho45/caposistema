import { useEffect, useState } from 'react'
import { createClosuresIntegration, type SocialFollowup } from '../closures/closures-integration'
import { loadingState, type AsyncState } from '../../lib/supabase/rpc'
function field(item: SocialFollowup, ...keys: string[]) {
  const result = keys.map((key) => item[key]).find((value) => typeof value === 'string' && value.trim())
  return typeof result === 'string' ? result : '—'
}
export function GestorSocialOverview() {
  const [state, setState] = useState<AsyncState<readonly SocialFollowup[]>>(loadingState)
  useEffect(() => {
    let active = true
    void createClosuresIntegration().loadSocial(null).then((result) => { if (active) setState(result) })
    return () => { active = false }
  }, [])
  return <section className="gestor-route"><header><span>Fluxos e Acompanhamentos</span><h2>Acompanhamento Social</h2><p>Consulta gerencial do fluxo social autorizado.</p></header><article className="gestor-panel">
    {state.status === 'loading' && <p>Carregando acompanhamentos…</p>}
    {state.status === 'error' && <p role="alert">{state.error.message}</p>}
    {state.status === 'empty' && <p>Nenhum acompanhamento retornado.</p>}
    {state.status === 'success' && <ul>{state.data.map((item, index) => <li key={field(item, 'cycle_id', 'id') + index}><strong>{field(item, 'patient_name', 'full_name')}</strong> · {field(item, 'status', 'social_status')}</li>)}</ul>}
  </article></section>
}
