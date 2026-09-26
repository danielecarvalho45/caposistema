import { useEffect, useState } from 'react'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'

type Specialty = Readonly<{ specialty_id: string; specialty_name: string }>

export function PatientCareSpecialties({ patientId }: Readonly<{ patientId: string }>) {
  const [state, setState] = useState<AsyncState<readonly Specialty[]>>(loadingState)
  useEffect(() => {
    let active = true
    void getRpcService().getPatientCareSpecialties(patientId).then((result) => {
      if (!active) return
      if (result.status === 'success') {
        const names = Array.isArray(result.data)
          ? result.data.filter((item): item is Specialty => Boolean(item) && typeof item === 'object' && typeof item.specialty_name === 'string')
          : []
        setState(names.length ? { status: 'success', data: names } : { status: 'empty' })
      } else setState(result)
    })
    return () => { active = false }
  }, [patientId])
  return <div>
    <strong>Especialidades que acompanham o paciente</strong>
    {state.status === 'loading' && <p>Consultando especialidades…</p>}
    {state.status === 'error' && <p role="alert">{state.error.message}</p>}
    {state.status === 'empty' && <p>Nenhuma especialidade retornada.</p>}
    {state.status === 'success' && <ul>{state.data.map((item) => <li key={item.specialty_id}>{item.specialty_name}</li>)}</ul>}
  </div>
}
