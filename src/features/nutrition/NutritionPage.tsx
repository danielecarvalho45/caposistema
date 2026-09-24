import { useEffect, useState } from 'react'
import { getRpcService } from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { AgendaPage } from '../agenda/AgendaPage'

type NutritionRecord = Readonly<Record<string, unknown>>

function field(record: NutritionRecord | null, ...keys: string[]) {
  if (!record) return null
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export function NutritionPage({
  accessContext,
}: Readonly<{ accessContext: AccessContext }>) {
  const isNutritionProfessional =
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some((role) => role.code === 'nutricao')
  const isAdmin = ['administrador', 'administrativo_operacional', 'coordenador'].includes(
    accessContext.primary_context.code ?? '',
  )
  const [patientId, setPatientId] = useState('')
  const [patientQuery, setPatientQuery] = useState('')
  const [patients, setPatients] = useState<readonly { patient_id: string; full_name: string; patient_number: string | null }[]>([])
  const [plan, setPlan] = useState({ breakfast: '', lunch: '', snack: '', dinner: '', hydration: '', supplement: '', other: '' })
  const [document, setDocument] = useState<NutritionRecord | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deliveries, setDeliveries] = useState<readonly NutritionRecord[]>([])
  const [deliveriesFeedback, setDeliveriesFeedback] = useState<string | null>(null)

  async function loadDeliveries() {
    const result = await getRpcService().getNutritionAdminDeliveries()
    if (result.status === 'success') setDeliveries(result.data as readonly NutritionRecord[])
    else if (result.status === 'empty') setDeliveries([])
    else setDeliveriesFeedback(result.status === 'error' ? result.error.message : 'Entregas não retornaram dados.')
  }

  useEffect(() => {
    if (isAdmin) void loadDeliveries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  async function searchPatients() {
    if (patientQuery.trim().length < 2) return
    const result = await getRpcService().searchMyAssistentialPatients(patientQuery.trim(), 20, 0)
    setPatients(result.status === 'success' ? result.data : [])
  }

  async function savePlan() {
    if (!patientId) {
      setFeedback('Selecione um paciente real da Nutrição.')
      return
    }
    const result = await getRpcService().saveNutritionPlan({
      p_patient_id: patientId,
      p_breakfast: plan.breakfast,
      p_lunch: plan.lunch,
      p_snack: plan.snack,
      p_dinner: plan.dinner,
      p_hydration: plan.hydration,
      p_nutritional_supplement: plan.supplement,
      p_other_guidance: plan.other,
    })
    setFeedback(result.status === 'success' ? 'Plano alimentar salvo pelo banco.' : result.status === 'error' ? result.error.message : 'Plano não retornou confirmação.')
  }

  async function generateDocument() {
    if (!patientId || busy) {
      setFeedback('Selecione um paciente real da Nutrição.')
      return
    }
    setBusy(true)
    const result = await getRpcService().createNutritionDocument(patientId)
    if (result.status === 'success') {
      setDocument(result.data as NutritionRecord)
      setFeedback('Documento nutricional gerado pelo banco.')
    } else setFeedback(result.status === 'error' ? result.error.message : 'Documento não retornou confirmação.')
    setBusy(false)
  }

  async function manageDelivery(deliveryId: string, action: 'confirm') {
    setDeliveriesFeedback(null)
    const result = await getRpcService().manageNutritionAdminDelivery(deliveryId, action)
    if (result.status === 'success') {
      setDeliveriesFeedback('Entrega atualizada pelo banco.')
      await loadDeliveries()
    } else setDeliveriesFeedback(result.status === 'error' ? result.error.message : 'Entrega não retornou confirmação.')
  }

  if (!isNutritionProfessional && !isAdmin) {
    return (
      <section className="home-page" aria-labelledby="nutrition-blocked-title">
        <div className="home-welcome">
          <p className="eyebrow">Nutrição</p>
          <h1 id="nutrition-blocked-title">Área de Nutrição indisponível</h1>
          <p>É necessário um vínculo profissional ativo da especialidade.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="home-page" aria-labelledby="nutrition-title">
      {isNutritionProfessional && (
        <>
          <section className="home-welcome" aria-labelledby="nutrition-title">
            <p className="eyebrow">Nutrição</p>
            <h1 id="nutrition-title">Minha Agenda</h1>
            <p>
              A rotina de Nutrição abre diretamente na agenda profissional, com o
              contexto da própria atuação e os registros da especialidade.
            </p>
            <p className="home-slogan">
              Agenda · pacientes vinculados · plano alimentar · relatórios
            </p>
          </section>

          <AgendaPage accessContext={accessContext} showSpecialty={false} />

          <section className="home-profile" aria-labelledby="nutrition-plan-title">
            <p className="eyebrow">Planejamento Alimentar</p>
            <h2 id="nutrition-plan-title">Plano Alimentar e PDF oficial</h2>
            <label>Paciente vinculado
              <input value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} onBlur={() => void searchPatients()} placeholder="Nome, Nº CAPO ou CMS" />
            </label>
            {patients.length > 0 && <select value={patientId} onChange={(event) => setPatientId(event.target.value)}><option value="">Selecionar paciente</option>{patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.full_name} · {patient.patient_number ?? 'Nº CAPO não informado'}</option>)}</select>}
            <div className="home-profile-grid">
              {Object.entries({ breakfast: 'Desjejum', lunch: 'Almoço', snack: 'Lanche', dinner: 'Jantar', hydration: 'Hidratação', supplement: 'Suplemento nutricional', other: 'Outras orientações' }).map(([planField, label]) => <label key={planField}>{label}<textarea rows={2} value={plan[planField as keyof typeof plan]} onChange={(event) => setPlan((current) => ({ ...current, [planField]: event.target.value }))} /></label>)}
            </div>
            <button type="button" disabled={!patientId} onClick={() => void savePlan()}>Salvar / atualizar plano</button>
            <button type="button" disabled={!patientId || busy} onClick={() => void generateDocument()}>Gerar documento nutricional oficial</button>
            {feedback && <p role="status">{feedback}</p>}
            {document && (
              <p>Documento gerado: {field(document, 'document_id', 'id') ?? 'confirmado pelo banco'}</p>
            )}
          </section>
        </>
      )}

      {isAdmin && (
        <section className="home-profile" aria-labelledby="nutrition-admin-title">
          <p className="eyebrow">Gestão administrativa</p>
          <h2 id="nutrition-admin-title">Entregas nutricionais</h2>
          {deliveriesFeedback && <p role="status">{deliveriesFeedback}</p>}
          {deliveries.length === 0 && <p>Nenhuma entrega nutricional pendente.</p>}
          {deliveries.length > 0 && (
            <ul>
              {deliveries.map((delivery, index) => {
                const id = field(delivery, 'delivery_id', 'id')
                return (
                  <li key={id ?? index}>
                    <strong>{field(delivery, 'patient_name') ?? 'Paciente'}</strong>
                    <span>{field(delivery, 'status') ?? 'Situação não informada'}</span>
                    {id && <button type="button" onClick={() => void manageDelivery(id, 'confirm')}>Confirmar entrega</button>}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section className="home-profile" aria-labelledby="nutrition-actions-title">
        <div>
          <p className="eyebrow">Acessos rápidos</p>
          <h2 id="nutrition-actions-title">Fluxos da Nutrição</h2>
        </div>
        <div className="home-profile-grid">
          <article className="home-profile-card">
            <strong>Pacientes vinculados</strong>
            <span>Buscar pacientes sob a própria atuação.</span>
          </article>
          <article className="home-profile-card">
            <strong>Planejamento Alimentar</strong>
            <span>Plano alimentar e PDF oficial, conforme contrato autorizado.</span>
          </article>
          <article className="home-profile-card">
            <strong>Solicitar ao Coordenador</strong>
            <span>Encaminhar necessidade estrutural da agenda.</span>
          </article>
          <article className="home-profile-card">
            <strong>Encerramento próprio</strong>
            <span>Encerrar somente o acompanhamento nutricional.</span>
          </article>
          <article className="home-profile-card">
            <strong>Relatórios</strong>
            <span>Indicadores operacionais da Nutrição.</span>
          </article>
        </div>
      </section>

      <section className="home-profile" aria-labelledby="nutrition-overview-title">
        <div>
          <p className="eyebrow">Contexto</p>
          <h2 id="nutrition-overview-title">Fluxos da especialidade</h2>
        </div>
        <div className="home-profile-grid">
          <article className="home-profile-card">
            <strong>Agenda</strong>
            <span>Dia, semana e mês com os atendimentos reais da Nutrição.</span>
          </article>
          <article className="home-profile-card">
            <strong>Pacientes vinculados</strong>
            <span>Consulta restrita ao acompanhamento autorizado da especialidade.</span>
          </article>
          <article className="home-profile-card">
            <strong>Plano alimentar</strong>
            <span>Autoria profissional e controle do PDF nutricional oficial.</span>
          </article>
        </div>
      </section>

    </section>
  )
}
