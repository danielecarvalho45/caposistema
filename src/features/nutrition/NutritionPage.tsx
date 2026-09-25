import { useEffect, useState } from 'react'
import { getRpcService, loadingState, type AsyncState, type BirthdayOverview, type AgendaAppointment } from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { AgendaPage } from '../agenda/AgendaPage'
import { Link } from 'react-router-dom'

type NutritionRecord = Readonly<Record<string, unknown>>
type NutritionDeliveryAction = 'start' | 'complete' | 'cancel' | 'reopen'
type NutritionPlan = { breakfast: string; lunch: string; snack: string; dinner: string; hydration: string; supplement: string; other: string }
const emptyPlan = (): NutritionPlan => ({ breakfast: '', lunch: '', snack: '', dinner: '', hydration: '', supplement: '', other: '' })
function asRecord(value: unknown): NutritionRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as NutritionRecord : null
}
function planFromContext(value: unknown): { plan: NutritionPlan; canEdit: boolean } {
  const current = asRecord(asRecord(value)?.current_plan)
  const read = (key: string) => typeof current?.[key] === 'string' ? current[key] as string : ''
  return { plan: { breakfast: read('breakfast'), lunch: read('lunch'), snack: read('snack'), dinner: read('dinner'), hydration: read('hydration'), supplement: read('nutritional_supplement'), other: read('other_guidance') }, canEdit: !current || current.owned_by_me === true }
}

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
  const [specialtyResult, setSpecialtyResult] = useState<{ professionalId: string; hasNutritionSpecialty: boolean } | null>(null)
  const eligibleForSpecialty = accessContext.is_active && Boolean(accessContext.professional_id) && accessContext.roles.some((role) => role.code === 'profissional')
  const hasNutritionSpecialty = !eligibleForSpecialty ? false : specialtyResult?.professionalId === accessContext.professional_id ? specialtyResult.hasNutritionSpecialty : null
  const isNutritionProfessional =
    accessContext.is_active && hasNutritionSpecialty === true &&
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some((role) => role.code === 'profissional')
  const isAdmin = accessContext.roles.some((role) => ['administrador', 'administrativo_operacional', 'coordenador'].includes(role.code))
  const [patientId, setPatientId] = useState('')
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [birthdays, setBirthdays] = useState<AsyncState<BirthdayOverview>>(loadingState)
  const [patientQuery, setPatientQuery] = useState('')
  const [patients, setPatients] = useState<readonly { patient_id: string; full_name: string; patient_number: string | null }[]>([])
  const [patientSearchFeedback, setPatientSearchFeedback] = useState('')
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [plan, setPlan] = useState<NutritionPlan>(emptyPlan)
  const [planLoaded, setPlanLoaded] = useState(false)
  const [canEditPlan, setCanEditPlan] = useState(false)
  const [document, setDocument] = useState<NutritionRecord | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deliveries, setDeliveries] = useState<readonly NutritionRecord[]>([])
  const [deliveriesFeedback, setDeliveriesFeedback] = useState<string | null>(null)
  const [deliveryReason, setDeliveryReason] = useState('')

  useEffect(() => {
    if (!eligibleForSpecialty || !accessContext.professional_id) return
    const professionalId = accessContext.professional_id
    let active = true
    void getRpcService().getMyAssistentialSpecialties().then((result) => {
      if (!active) return
      setSpecialtyResult({ professionalId, hasNutritionSpecialty: result.status === 'success' && result.data.some((item) => item.specialty_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() === 'nutricao') })
      if (result.status === 'error') setFeedback(result.error.message)
    })
    return () => { active = false }
  }, [eligibleForSpecialty, accessContext.professional_id])

  async function loadDeliveries() {
    const result = await getRpcService().getNutritionAdminDeliveries()
    if (result.status === 'success') setDeliveries(result.data as readonly NutritionRecord[])
    else if (result.status === 'empty') setDeliveries([])
    else setDeliveriesFeedback(result.status === 'error' ? result.error.message : 'Entregas não retornaram dados.')
    return result.status === 'success' || result.status === 'empty'
  }

  useEffect(() => {
    if (!isAdmin) return
    let active = true
    void getRpcService().getNutritionAdminDeliveries().then((result) => {
      if (!active) return
      if (result.status === 'success') setDeliveries(result.data as readonly NutritionRecord[])
      else if (result.status === 'empty') setDeliveries([])
      else setDeliveriesFeedback(result.status === 'error' ? result.error.message : 'Entregas não retornaram dados.')
    })
    return () => { active = false }
  }, [isAdmin])

  useEffect(() => {
    if (!isNutritionProfessional) return
    let active = true
    void getRpcService().getBirthdays().then((result) => { if (active) setBirthdays(result) })
    return () => { active = false }
  }, [isNutritionProfessional])

  async function openConfirmedPatient(appointment: AgendaAppointment) {
    await selectNutritionPatient(appointment.patient_id, appointment.patient_name)
  }

  async function selectNutritionPatient(id: string, name: string) {
    setFeedback(null); setPatientId(''); setPlanLoaded(false); setDocument(null)
    const result = await getRpcService().getNutritionContext(id)
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O contexto nutricional do paciente não foi retornado.')
      return
    }
    const loaded = planFromContext(result.data)
    setPlan(loaded.plan); setCanEditPlan(loaded.canEdit); setPlanLoaded(true)
    setPatientId(id); setSelectedPatientName(name)
    globalThis.document.getElementById('nutrition-plan-title')?.scrollIntoView?.({ block: 'start' })
  }

  async function searchPatients() {
    if (patientQuery.trim().length < 2) return
    setSearchingPatients(true); setPatientSearchFeedback('')
    const result = await getRpcService().searchMyAssistentialPatients(patientQuery.trim(), 20, 0)
    setPatients(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setPatientSearchFeedback(result.error.message)
    else if (result.status === 'empty' || (result.status === 'success' && result.data.length === 0)) setPatientSearchFeedback('Nenhum paciente autorizado encontrado.')
    setSearchingPatients(false)
  }

  async function savePlan() {
    if (!patientId || !planLoaded || !canEditPlan || busy) {
      setFeedback('Selecione um paciente real da Nutrição.')
      return
    }
    setBusy(true); setFeedback(null)
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
    if (result.status === 'success') {
      const reloaded = await getRpcService().getNutritionContext(patientId)
      if (reloaded.status === 'success') {
        const loaded = planFromContext(reloaded.data)
        setPlan(loaded.plan); setCanEditPlan(loaded.canEdit)
      }
      setFeedback(reloaded.status === 'success' ? 'Plano alimentar salvo e contexto recarregado do banco.' : reloaded.status === 'error' ? `Plano salvo, mas a recarga falhou: ${reloaded.error.message}` : 'Plano salvo, mas o contexto não foi retornado.')
    } else setFeedback(result.status === 'error' ? result.error.message : 'Plano não retornou confirmação.')
    setBusy(false)
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

  async function manageDelivery(deliveryId: string, action: NutritionDeliveryAction) {
    if (busy || (['cancel', 'reopen'].includes(action) && deliveryReason.trim().length < 5)) return
    setBusy(true)
    setDeliveriesFeedback(null)
    const result = await getRpcService().manageNutritionAdminDelivery(
      deliveryId,
      action,
      ['cancel', 'reopen'].includes(action) ? deliveryReason.trim() : null,
    )
    if (result.status === 'success') {
      const reloaded = await loadDeliveries()
      setDeliveriesFeedback(reloaded ? 'Entrega atualizada e lista recarregada do banco.' : 'Entrega atualizada, mas a recarga da lista falhou.')
    } else setDeliveriesFeedback(result.status === 'error' ? result.error.message : 'Entrega não retornou confirmação.')
    setBusy(false)
  }

  if (!isNutritionProfessional && !isAdmin && hasNutritionSpecialty === null) {
    return <section className="home-page"><p>Verificando especialidade autorizada…</p></section>
  }
  if (!isNutritionProfessional && !isAdmin) {
    return (
      <section className="home-page" aria-labelledby="nutrition-blocked-title">
        <div className="home-welcome">
          <p className="eyebrow">Nutrição</p>
          <h1 id="nutrition-blocked-title">Área de Nutrição indisponível</h1>
          <p>{feedback ?? 'É necessário um vínculo profissional ativo da Nutrição.'}</p>
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

          <AgendaPage accessContext={accessContext} showSpecialty={false} onConfirmed={(appointment) => void openConfirmedPatient(appointment)} />

          <section className="home-profile" aria-labelledby="nutrition-birthdays-title">
            <h2 id="nutrition-birthdays-title">Aniversariantes de hoje</h2>
            {birthdays.status === 'loading' && <p>Carregando aniversariantes autorizados…</p>}
            {birthdays.status === 'error' && <p role="alert">{birthdays.error.message}</p>}
            {birthdays.status === 'empty' && <p>Nenhum aniversariante retornado.</p>}
            {birthdays.status === 'success' && <><h3>Pacientes vinculados</h3>{birthdays.data.patients.length ? <ul>{birthdays.data.patients.map((patient) => <li key={patient.patient_id}>{patient.full_name}</li>)}</ul> : <p>Nenhum paciente vinculado faz aniversário hoje.</p>}<h3>Equipe CAPO</h3>{birthdays.data.team.length ? <ul>{birthdays.data.team.map((member) => <li key={member.professional_id}>{member.full_name}</li>)}</ul> : <p>Nenhum integrante da equipe faz aniversário hoje.</p>}</>}
          </section>

          <nav className="home-profile" aria-label="Acessos rápidos da Nutrição">
            <h2>Acessos rápidos</h2>
            <div className="home-profile-grid">
              <a className="home-profile-card" href="#nutrition-plan-title"><strong>Planejamento Alimentar</strong><span>Abrir o plano do paciente selecionado.</span></a>
              <Link className="home-profile-card" to="/solicitacoes"><strong>Solicitações</strong><span>Demandas da própria atuação.</span></Link>
              <Link className="home-profile-card" to="/relatorios"><strong>Relatórios</strong><span>Indicadores autorizados da Nutrição.</span></Link>
            </div>
          </nav>

          <section className="home-profile" aria-labelledby="nutrition-plan-title">
            <p className="eyebrow">Planejamento Alimentar</p>
            <h2 id="nutrition-plan-title">Plano Alimentar e PDF oficial</h2>
            <label>Paciente vinculado
              <input value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Nome, Nº CAPO ou CMS" />
            </label>
            <button type="button" disabled={searchingPatients || patientQuery.trim().length < 2} onClick={() => void searchPatients()}>{searchingPatients ? 'Buscando…' : 'Buscar paciente'}</button>
            {patientSearchFeedback && <p role="status">{patientSearchFeedback}</p>}
            {patients.length > 0 && <select value={patients.some((item) => item.patient_id === patientId) ? patientId : ''} onChange={(event) => { const patient = patients.find((item) => item.patient_id === event.target.value); if (patient) void selectNutritionPatient(patient.patient_id, patient.full_name) }}><option value="">Selecionar paciente</option>{patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.full_name} · {patient.patient_number ?? 'Nº CAPO não informado'}</option>)}</select>}
            {patientId && <p>Paciente selecionado: {selectedPatientName}</p>}
            {planLoaded && !canEditPlan && <p role="status">O plano atual pertence a outro profissional; edição indisponível neste contexto.</p>}
            <div className="home-profile-grid">
              {Object.entries({ breakfast: 'Desjejum', lunch: 'Almoço', snack: 'Lanche', dinner: 'Jantar', hydration: 'Hidratação', supplement: 'Suplemento nutricional', other: 'Outras orientações' }).map(([planField, label]) => <label key={planField}>{label}<textarea rows={2} value={plan[planField as keyof typeof plan]} onChange={(event) => setPlan((current) => ({ ...current, [planField]: event.target.value }))} /></label>)}
            </div>
            <button type="button" disabled={!patientId || !planLoaded || !canEditPlan || busy} onClick={() => void savePlan()}>Salvar / atualizar plano</button>
            <button type="button" disabled={!patientId || !planLoaded || !canEditPlan || busy} onClick={() => void generateDocument()}>Gerar documento nutricional oficial</button>
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
          <label>Motivo administrativo para cancelar ou reabrir<textarea value={deliveryReason} minLength={5} maxLength={500} onChange={(event) => setDeliveryReason(event.target.value)} /></label>
          {deliveriesFeedback && <p role="status">{deliveriesFeedback}</p>}
          {deliveries.length === 0 && <p>Nenhuma entrega nutricional pendente.</p>}
          {deliveries.length > 0 && (
            <ul>
              {deliveries.map((delivery, index) => {
                const id = field(delivery, 'delivery_id', 'id')
                const status = field(delivery, 'status')?.toLowerCase()
                const requiresReason = (action: NutritionDeliveryAction) => ['cancel', 'reopen'].includes(action)
                const actionButton = (action: NutritionDeliveryAction, label: string) => id && <button type="button" disabled={busy || (requiresReason(action) && deliveryReason.trim().length < 5)} onClick={() => void manageDelivery(id, action)}>{label}</button>
                return (
                  <li key={id ?? index}>
                    <strong>{field(delivery, 'patient_name') ?? 'Paciente'}</strong>
                    <span>{field(delivery, 'status') ?? 'Situação não informada'}</span>
                    {status === 'pending' && <>{actionButton('start', 'Iniciar')}{actionButton('complete', 'Concluir')}{actionButton('cancel', 'Cancelar')}</>}
                    {status === 'in_progress' && <>{actionButton('complete', 'Concluir')}{actionButton('cancel', 'Cancelar')}</>}
                    {['completed', 'cancelled'].includes(status ?? '') && actionButton('reopen', 'Reabrir')}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}


    </section>
  )
}
