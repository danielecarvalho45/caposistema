import { Link } from 'react-router-dom'

export function AdministrativeOperationalReport() {
  return <section className="reports-page" aria-label="Relações operacionais administrativas">
    <header className="reports-card reports-heading"><h1>Relações operacionais</h1><p>Acesse os registros operacionais atualizados nos módulos correspondentes.</p></header>
    <article className="reports-card"><h2>Pendências operacionais</h2>
      <Link to="/fila">Abrir relação de pendências e filas</Link>
    </article>
    <article className="reports-card"><h2>Faltosos para acompanhamento</h2>
      <Link to="/faltosos">Abrir relação de faltosos</Link>
    </article>
  </section>
}
