import { useState } from 'react'
import type { ReferralPatient } from '../../lib/supabase/rpc'
import { PatientSearch } from '../../components/forms/PatientSearch'
import {
  createFamilyCaregiverService,
  type FamilyContext,
  type FamilyCaregiverService,
} from '../social/family-caregiver-integration'

export function GestorFamilyPage({
  service = createFamilyCaregiverService(),
}: Readonly<{ service?: FamilyCaregiverService }>) {
  const [context, setContext] = useState<FamilyContext | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function selectPatient(patient: ReferralPatient) {
    const result = await service.getFamilyContext(patient.patient_id)
    if (result.status === 'success') {
      setContext(result.data)
      setFeedback(null)
      return
    }
    setContext(null)
    setFeedback(result.status === 'error' ? result.error.message : 'Nenhum vínculo familiar encontrado.')
  }

  return (
    <section className="gestor-route" aria-labelledby="gestor-family-title">
      <header><span>Fluxos e Acompanhamentos</span><h2 id="gestor-family-title">Familiares e Acompanhamentos</h2><p>Consulta administrativa de vínculos familiares autorizados pelo backend.</p></header>
      <article className="gestor-panel">
        <h3>Localizar paciente</h3>
        <PatientSearch loadPatients={(query, limit) => service.searchPatients(query, limit ?? 20)} onSelect={(patient) => void selectPatient(patient)} />
        {feedback && <p role="status">{feedback}</p>}
      </article>
      {context && <article className="gestor-panel">
        <h3>Contexto familiar</h3>
        <p>{context.active_link ? 'Vínculo familiar ativo localizado.' : 'Não há vínculo familiar ativo para este paciente.'}</p>
        <p>Histórico disponível: {context.history.length} registro(s).</p>
        <p>{context.can_admin_correct ? 'Correção administrativa autorizada pelo backend.' : 'Correção administrativa não autorizada para o contexto atual.'}</p>
      </article>}
    </section>
  )
}