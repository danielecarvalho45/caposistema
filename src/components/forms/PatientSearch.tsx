import { useState } from 'react'
import type { AsyncState, ReferralPatient } from '../../lib/supabase/rpc'

export type PatientSearchLoader = (
  query: string,
  limit?: number,
  offset?: number,
) => Promise<AsyncState<readonly ReferralPatient[]>>

type Props = Readonly<{
  loadPatients: PatientSearchLoader
  onSelect: (patient: ReferralPatient) => void
  label?: string
}>

export function PatientSearch({
  loadPatients,
  onSelect,
  label = 'Localizar paciente',
}: Props) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<AsyncState<readonly ReferralPatient[]> | null>(null)

  async function search() {
    const value = query.trim()
    if (value.length < 2) {
      setState({ status: 'empty' })
      return
    }
    setState({ status: 'loading' })
    setState(await loadPatients(value, 20, 0))
  }

  return (
    <section aria-label={label}>
      <label>
        {label}
        <input
          value={query}
          placeholder="Nome, CMS ou Nº CAPO"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <button type="button" onClick={() => void search()}>Buscar</button>
      {state?.status === 'loading' && <p role="status">Buscando pacientes...</p>}
      {state?.status === 'empty' && <p role="status">Nenhum paciente encontrado.</p>}
      {state?.status === 'error' && <p role="alert">Não foi possível buscar pacientes. {state.error.message}</p>}
      {state?.status === 'success' && (
        <ul>
          {state.data.map((patient) => (
            <li key={patient.patient_id}>
              <button type="button" onClick={() => onSelect(patient)}>
                {patient.full_name}
                {patient.patient_number ? ` · Nº CAPO ${patient.patient_number}` : ''}
                {patient.cms ? ` · CMS ${patient.cms}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
