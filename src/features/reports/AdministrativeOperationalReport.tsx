import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, loadingState, type AsyncState, type NoShowFollowup, type PendingItem } from '../../lib/supabase/rpc'

export function AdministrativeOperationalReport() {
  const [pending, setPending] = useState<AsyncState<readonly PendingItem[]>>(loadingState)
  const [absences, setAbsences] = useState<AsyncState<readonly NoShowFollowup[]>>(loadingState)

  useEffect(() => {
    let active = true
    const service = getRpcService()
    void service.getPendingItems(50, 0).then((result) => { if (active) setPending(result) })
    void service.getNoShowFollowups(null, 50, 0).then((result) => { if (active) setAbsences(result) })
    return () => { active = false }
  }, [])

  return <section className="reports-page" aria-label="Relatórios operacionais administrativos">
    <header className="reports-card reports-heading"><h1>Relatórios Operacionais</h1><p>Relações operacionais autorizadas, consultadas no banco. Cada relação exibe até 50 registros.</p></header>
    <article className="reports-card"><h2>Pendências operacionais</h2>
      {pending.status === 'loading' && <p>Carregando…</p>}
      {pending.status === 'error' && <p role="alert">{pending.error.message}</p>}
      {pending.status === 'empty' && <p>Nenhuma pendência retornada.</p>}
      {pending.status === 'success' && <p>{pending.data.length} registros exibidos.</p>}
      <Link to="/fila">Abrir relação de pendências e filas</Link>
    </article>
    <article className="reports-card"><h2>Faltosos para acompanhamento</h2>
      {absences.status === 'loading' && <p>Carregando…</p>}
      {absences.status === 'error' && <p role="alert">{absences.error.message}</p>}
      {absences.status === 'empty' && <p>Nenhum acompanhamento retornado.</p>}
      {absences.status === 'success' && <p>{absences.data.length} registros exibidos.</p>}
      <Link to="/faltosos">Abrir relação de faltosos</Link>
    </article>
  </section>
}
