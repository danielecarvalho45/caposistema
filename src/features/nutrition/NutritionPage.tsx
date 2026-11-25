import { useEffect, useState } from 'react'
import { TeamMonthlyBirthdays } from '../../components/birthdays/TeamMonthlyBirthdays'
import { getRpcService, loadingState, type AsyncState, type BirthdayOverview, type AgendaAppointment, type ReferralPatient } from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { AgendaPage } from '../agenda/AgendaPage'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabase/client'
import { PatientDischargeProximityIndicator } from '../../components/patients/PatientDischargeProximityIndicator'
import { buildNutritionDocumentPdf } from '../../lib/pdf/nutrition-document-pdf'
import './nutrition-document.css'

type NutritionRecord = Readonly<Record<string, unknown>>
type NutritionDeliveryAction = 'start' | 'complete' | 'cancel' | 'reopen'
type NutritionPlan = {
  title: string; breakfast: string; lunch: string; dessertLunch: string;
  snack: string; dinner: string; dessertDinner: string; hydration: string;
  supplement: string; other: string; oncology: string; notes: string
}
const emptyPlan = (): NutritionPlan => ({
  title: 'PLANO ALIMENTAR ORAL', breakfast: '', lunch: '', dessertLunch: '',
  snack: '', dinner: '', dessertDinner: '', hydration: '', supplement: '',
  other: '', oncology: '', notes: '',
})
const nutritionSections: readonly { key: keyof Omit<NutritionPlan, 'title'>; label: string; rows: number }[] = [
  { key: 'breakfast', label: 'Café da manhã', rows: 5 },
  { key: 'lunch', label: 'Almoço', rows: 6 },
  { key: 'dessertLunch', label: 'Sobremesa (almoço)', rows: 3 },
  { key: 'snack', label: 'Lanche da tarde', rows: 4 },
  { key: 'dinner', label: 'Jantar', rows: 6 },
  { key: 'dessertDinner', label: 'Sobremesa (jantar)', rows: 3 },
  { key: 'hydration', label: 'Hidratação', rows: 4 },
  { key: 'supplement', label: 'Suplementação nutricional', rows: 4 },
  { key: 'other', label: 'Outras orientações', rows: 4 },
  { key: 'oncology', label: 'Orientações nutricionais em tratamento oncológico', rows: 6 },
  { key: 'notes', label: 'Observações complementares', rows: 4 },
]
function asRecord(value: unknown): NutritionRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as NutritionRecord : null
}
function planFromContext(value: unknown): { plan: NutritionPlan; canEdit: boolean } {
  const current = asRecord(asRecord(value)?.current_plan)
  const read = (key: string) => typeof current?.[key] === 'string' ? current[key] as string : ''
  return {
    plan: {
      title: read('document_title') || 'PLANO ALIMENTAR ORAL',
      breakfast: read('breakfast'), lunch: read('lunch'), dessertLunch: read('dessert_lunch'),
      snack: read('snack'), dinner: read('dinner'), dessertDinner: read('dessert_dinner'),
      hydration: read('hydration'), supplement: read('nutritional_supplement'),
      other: read('other_guidance'), oncology: read('oncology_guidance'), notes: read('additional_notes'),
    },
    canEdit: !current || current.owned_by_me === true,
  }
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
  homeOnly = false,
}: Readonly<{ accessContext: AccessContext; homeOnly?: boolean }>) {
  const location = useLocation()
  const navigate = useNavigate()
  const returnTo = location.state && typeof location.state === 'object' && 'returnTo' in location.state && location.state.returnTo === '/agenda' ? '/agenda' : '/'
  const [specialtyResult, setSpecialtyResult] = useState<{ professionalId: string; hasNutritionSpecialty: boolean } | null>(null)
  const eligibleForSpecialty = accessContext.is_active && Boolean(accessContext.professional_id) && accessContext.roles.some((role) => role.code === 'profissional')
  const hasNutritionSpecialty = !eligibleForSpecialty ? false : specialtyResult?.professionalId === accessContext.professional_id ? specialtyResult.hasNutritionSpecialty : null
  const isNutritionProfessional =
    accessContext.is_active && hasNutritionSpecialty === true &&
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some((role) => role.code === 'profissional')
  const isController = accessContext.roles.some((role) => role.code === 'administrador')
  const isAdministrativeOperational = accessContext.roles.some((role) => role.code === 'administrativo_operacional')
  const isTechnicalAdministrator = accessContext.roles.some((role) => role.code === 'administrador_tecnico')
  const isAdministrativeManager = isController || (isAdministrativeOperational && isTechnicalAdministrator)
  const isCoordinator = accessContext.roles.some((role) => role.code === 'coordenador')
  const canManageDeliveries = isController || isAdministrativeOperational
  const canGenerateManagementPdf = isAdministrativeManager
  const canConsultDocuments = isController || isCoordinator || isAdministrativeManager
  // Presentation only: the real access context and RPC authorization remain unchanged.
  const isTitular = accessContext.user_account_id === '7a077538-471f-4f3a-9033-e30fec74dd9b'
    && accessContext.primary_context.code === 'administrador' && isController
  const requestedView = isTitular && !homeOnly && !isNutritionProfessional
    && location.state && typeof location.state === 'object'
    ? (location.state as Record<string, unknown>).titularNutritionView : null
  const operationalView = requestedView === 'operacional'
  const managementView = requestedView === 'gestor'
  const showDocuments = canConsultDocuments && !operationalView
  const authorized = isNutritionProfessional || canManageDeliveries || canConsultDocuments
  const [patientId, setPatientId] = useState('')
  const [patientIdentification, setPatientIdentification] = useState<NutritionRecord | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [selectedPatientName, setSelectedPatientName] = useState('')
  const [birthdays, setBirthdays] = useState<AsyncState<BirthdayOverview>>(loadingState)
  const [patientQuery, setPatientQuery] = useState('')
  const [patients, setPatients] = useState<readonly { patient_id: string; full_name: string; patient_number: string | null }[]>([])
  const [patientSearchFeedback, setPatientSearchFeedback] = useState('')
  const [searchingPatients, setSearchingPatients] = useState(false)
  const [plan, setPlan] = useState<NutritionPlan>(emptyPlan)
  const [expandedSections, setExpandedSections] = useState<Partial<Record<keyof Omit<NutritionPlan, 'title'>, boolean>>>({})
  const [planLoaded, setPlanLoaded] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState('')
  const [planDirty, setPlanDirty] = useState(false)
  const [canEditPlan, setCanEditPlan] = useState(false)
  const [vulnerabilityAlert, setVulnerabilityAlert] = useState<NutritionRecord | null>(null)
  const [document, setDocument] = useState<NutritionRecord | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deliveries, setDeliveries] = useState<readonly NutritionRecord[]>([])
  const [deliveriesFeedback, setDeliveriesFeedback] = useState<string | null>(null)
  const [deliveryReason, setDeliveryReason] = useState('')
  const visibleDeliveries = managementView
    ? deliveries.filter((item) => ['completed', 'cancelled'].includes(field(item, 'status')?.toLowerCase() ?? ''))
    : deliveries
  const [managementDocuments, setManagementDocuments] = useState<readonly NutritionRecord[]>([])
  const [managementFeedback, setManagementFeedback] = useState<string | null>(null)
  const [managementPatientQuery, setManagementPatientQuery] = useState('')
  const [managementPatients, setManagementPatients] = useState<readonly ReferralPatient[]>([])
  const [managementPatientId, setManagementPatientId] = useState('')
  const [managementPatientName, setManagementPatientName] = useState('')

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
    if (!canManageDeliveries) return
    let active = true
    void getRpcService().getNutritionAdminDeliveries().then((result) => {
      if (!active) return
      if (result.status === 'success') setDeliveries(result.data as readonly NutritionRecord[])
      else if (result.status === 'empty') setDeliveries([])
      else setDeliveriesFeedback(result.status === 'error' ? result.error.message : 'Entregas não retornaram dados.')
    })
    return () => { active = false }
  }, [canManageDeliveries])

  useEffect(() => {
    if (!showDocuments) return
    let active = true
    void getRpcService().getNutritionDocumentsForManagement(50, 0).then((result) => {
      if (!active) return
      if (result.status === 'success') {
        setManagementDocuments(result.data as readonly NutritionRecord[])
        setManagementFeedback(null)
      } else if (result.status === 'empty') {
        setManagementDocuments([])
        setManagementFeedback(null)
      } else {
        setManagementDocuments([])
        setManagementFeedback(result.status === 'error' ? result.error.message : 'Documentos não retornaram dados.')
      }
    })
    return () => { active = false }
  }, [showDocuments])

  useEffect(() => {
    if (!isNutritionProfessional) return
    let active = true
    void getRpcService().getBirthdays().then((result) => { if (active) setBirthdays(result) })
    return () => { active = false }
  }, [isNutritionProfessional])

  // Ao confirmar na rota /agenda, recebemos somente o ID do agendamento.
  // O banco revalida a consulta, a presença e o vínculo profissional antes
  // de selecionar o paciente: não confiar em dados clínicos do estado da rota.
  useEffect(() => {
    if (homeOnly || !isNutritionProfessional) return
    const routeState = location.state && typeof location.state === 'object'
      ? location.state as Record<string, unknown>
      : null
    const confirmedAppointmentId = routeState?.confirmedAppointmentId
    if (typeof confirmedAppointmentId !== 'string' || !confirmedAppointmentId) return

    let active = true
    void getRpcService().getProfessionalAppointmentContext(confirmedAppointmentId).then((result) => {
      if (!active) return
      if (result.status !== 'success') {
        setFeedback(result.status === 'error'
          ? result.error.message
          : 'Não foi possível abrir o atendimento confirmado.')
        return
      }
      const appointment = result.data
      const isNutrition = appointment.specialty_name.normalize('NFD')
        .replace(/\p{M}/gu, '').toLowerCase() === 'nutricao'
      if (appointment.attendance_status !== 'confirmado'
        || appointment.professional_id !== accessContext.professional_id || !isNutrition) {
        setFeedback('O agendamento não corresponde a um atendimento de Nutrição confirmado neste perfil.')
        return
      }
      void selectNutritionPatient(appointment.patient_id, appointment.patient_name)
    })
    return () => { active = false }
  }, [homeOnly, isNutritionProfessional, location.state, accessContext.professional_id])

  // A Home jamais exibe o formulário. Ao confirmar na agenda embutida,
  // navegar para a tela exclusiva com o ID da consulta para revalidação no banco.
  useEffect(() => {
    if (homeOnly || !patientId || !planLoaded) return
    globalThis.document.getElementById('nutrition-plan-title')?.scrollIntoView?.({ block: 'start' })
  }, [homeOnly, patientId, planLoaded])

  function openConfirmedPatient(appointment: AgendaAppointment) {
    navigate('/nutricao', { state: { confirmedAppointmentId: appointment.appointment_id, returnTo: '/' } })
  }

  async function selectNutritionPatient(id: string, name: string) {
    setExpandedSections({})
    setFeedback(null); setPatientId(''); setPatientIdentification(null); setPreviewVisible(false); setPlanDirty(false); setPlanLoaded(false); setSavedPlanId(''); setDocument(null); setVulnerabilityAlert(null)
    const result = await getRpcService().getNutritionContext(id)
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O contexto nutricional do paciente não foi retornado.')
      return
    }
    const loaded = planFromContext(result.data)
    const context = asRecord(result.data)
    const currentPlan = asRecord(asRecord(result.data)?.current_plan)
    setSavedPlanId(typeof currentPlan?.plan_id === 'string' ? currentPlan.plan_id : '')
    setPlan(loaded.plan); setPlanDirty(false); setCanEditPlan(loaded.canEdit); setPlanLoaded(true)
    setPatientIdentification(asRecord(context?.patient))
    setVulnerabilityAlert(asRecord(context?.vulnerability_alert))
    setPatientId(id); setSelectedPatientName(name)
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
    if (!patientId || !planLoaded) {
      setFeedback('Abra o Plano Alimentar de um paciente autorizado antes de salvar.')
      return
    }
    if (!canEditPlan) {
      setFeedback('Este plano pertence a outro profissional. Edição não autorizada.')
      return
    }
    if (busy) return
    setBusy(true)
    setFeedback('Salvando Plano Alimentar no CAPO…')
    try {
      const result = await getRpcService().saveDetailedNutritionPlan({
        p_patient_id: patientId,
        p_breakfast: plan.breakfast,
        p_lunch: plan.lunch,
        p_snack: plan.snack,
        p_dinner: plan.dinner,
        p_hydration: plan.hydration,
        p_nutritional_supplement: plan.supplement,
        p_other_guidance: plan.other,
        p_dessert_lunch: plan.dessertLunch,
        p_dessert_dinner: plan.dessertDinner,
        p_oncology_guidance: plan.oncology,
        p_additional_notes: plan.notes,
        p_document_title: plan.title,
      })
      if (result.status !== 'success') {
        setFeedback(result.status === 'error'
          ? `Não foi possível salvar o plano: ${result.error.message}`
          : 'O banco não confirmou o salvamento. Seus textos continuam na tela.')
        return
      }
      const response = asRecord(result.data)
      if (response?.success !== true || typeof response.plan_id !== 'string') {
        setFeedback('O banco não confirmou o plano salvo. Seus textos continuam na tela.')
        return
      }
      const reloaded = await getRpcService().getNutritionContext(patientId)
      if (reloaded.status !== 'success') {
        setFeedback(reloaded.status === 'error'
          ? `Plano gravado, mas a conferência falhou: ${reloaded.error.message}. Confira antes de emitir o PDF.`
          : 'Plano gravado, mas não foi possível conferir o retorno do banco. Não emita o PDF antes de recarregar.')
        return
      }
      const persisted = asRecord(asRecord(reloaded.data)?.current_plan)
      // Nunca declarar sucesso nem substituir o texto digitado por uma leitura
      // antiga/vazia. O usuário precisa de confirmação da mesma revisão salva.
      const storedPlan = planFromContext(reloaded.data).plan
      const editableFields: (keyof NutritionPlan)[] = [
        'title', 'breakfast', 'lunch', 'dessertLunch', 'snack', 'dinner',
        'dessertDinner', 'hydration', 'supplement', 'other', 'oncology', 'notes',
      ]
      const mismatchedFields = editableFields.filter((key) =>
        storedPlan[key].trim() !== plan[key].trim())
      if (persisted?.plan_id !== response.plan_id || mismatchedFields.length > 0) {
        setFeedback(
          'A gravação retornou confirmação, mas o conteúdo ainda não corresponde ao plano digitado. ' +
          'Seus textos foram preservados; não gere o PDF até atualizar e conferir o plano no banco.',
        )
        return
      }
      setSavedPlanId(response.plan_id)
      setPlan(storedPlan)
      setPlanDirty(false)
      setCanEditPlan(true)
      setFeedback('Plano alimentar salvo e conferido no banco. O PDF oficial já pode ser gerado.')
    } catch (error) {
      setFeedback(`Falha ao salvar o plano: ${error instanceof Error ? error.message : 'erro inesperado'}. Os textos continuam na tela.`)
    } finally {
      setBusy(false)
    }
  }

  async function generateDocument() {
    if (!patientId || !planLoaded || !canEditPlan || busy || planDirty || !savedPlanId) {
      setFeedback(planDirty || !savedPlanId
        ? 'Preencha e salve o Plano Alimentar no CAPO antes de emitir o PDF oficial.'
        : 'Selecione um paciente autorizado da Nutrição com Plano Alimentar atual.')
      return
    }
    setBusy(true)
    setFeedback('Gerando documento nutricional oficial…')
    try {
    const created = await getRpcService().createNutritionDocument(patientId)
    if (created.status !== 'success') {
      setFeedback(created.status === 'error' ? created.error.message : 'Documento não retornou confirmação.')
      setBusy(false)
      return
    }

    const createdRecord = created.data as NutritionRecord
    const documentId = field(createdRecord, 'document_id', 'id')
    if (!documentId) {
      setFeedback('O banco não retornou a identificação do documento nutricional.')
      setBusy(false)
      return
    }

    const loaded = await getRpcService().getNutritionDocument(documentId)
    if (loaded.status !== 'success') {
      setFeedback(loaded.status === 'error' ? loaded.error.message : 'O documento nutricional não pôde ser carregado.')
      setBusy(false)
      return
    }

    const officialDocument = loaded.data as NutritionRecord
    const blob = buildNutritionDocumentPdf(officialDocument)
    const storagePath = `nutrition/${documentId}/plano-alimentar-${Date.now()}.pdf`
    const { error: uploadError } = await getSupabaseClient()
      .storage.from('capo-documents')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setFeedback(uploadError.message)
      setBusy(false)
      return
    }

    const registered = await getRpcService().registerNutritionPdf(documentId, storagePath)
    if (registered.status !== 'success') {
      setFeedback(registered.status === 'error' ? registered.error.message : 'O banco não confirmou o PDF nutricional.')
      setBusy(false)
      return
    }

    const reloaded = await getRpcService().getNutritionDocument(documentId)
    setDocument(reloaded.status === 'success' ? reloaded.data as NutritionRecord : officialDocument)
    setFeedback('PDF Nutricional Oficial gerado e vinculado ao documento.')
    } catch (error) {
      setFeedback('Falha na geração do PDF: ' +
        (error instanceof Error ? error.message : 'erro inesperado') +
        '. O plano alimentar salvo permanece preservado.')
    } finally {
      setBusy(false)
    }
  }

  async function searchManagementPatients() {
    const query = managementPatientQuery.trim()
    if (query.length < 2 || busy) {
      setManagementFeedback('Informe nome, Nº CAPO ou CMS com pelo menos dois caracteres.')
      return
    }
    setBusy(true)
    setManagementFeedback(null)
    const result = await getRpcService().searchReferralPatients(query, 20, 0)
    if (result.status === 'success') {
      setManagementPatients(result.data)
      setManagementFeedback(result.data.length ? null : 'Nenhum paciente encontrado.')
    } else {
      setManagementPatients([])
      setManagementFeedback(result.status === 'error' ? result.error.message : 'Nenhum paciente encontrado.')
    }
    setBusy(false)
  }

  async function generateManagementDocument() {
    if (!canGenerateManagementPdf || !managementPatientId || busy) return
    setBusy(true)
    setManagementFeedback('Gerando PDF a partir do Plano Alimentar já preenchido…')

    const created = await getRpcService().createNutritionManagementDocument(managementPatientId)
    if (created.status !== 'success') {
      setManagementFeedback(created.status === 'error' ? created.error.message : 'Documento não retornou confirmação.')
      setBusy(false)
      return
    }

    const documentId = field(created.data as NutritionRecord, 'document_id', 'id')
    if (!documentId) {
      setManagementFeedback('O banco não retornou a identificação do documento nutricional.')
      setBusy(false)
      return
    }

    const loaded = await getRpcService().getNutritionManagementDocument(documentId)
    if (loaded.status !== 'success') {
      setManagementFeedback(loaded.status === 'error' ? loaded.error.message : 'O documento nutricional não pôde ser carregado.')
      setBusy(false)
      return
    }

    const officialDocument = loaded.data as NutritionRecord
    const blob = buildNutritionDocumentPdf(officialDocument)
    const storagePath = `nutrition/${documentId}/plano-alimentar-${Date.now()}.pdf`
    const { error: uploadError } = await getSupabaseClient()
      .storage.from('capo-documents')
      .upload(storagePath, blob, { contentType: 'application/pdf', upsert: false })

    if (uploadError) {
      setManagementFeedback(uploadError.message)
      setBusy(false)
      return
    }

    const registered = await getRpcService().registerNutritionManagementPdf(documentId, storagePath)
    if (registered.status !== 'success') {
      setManagementFeedback(registered.status === 'error' ? registered.error.message : 'O banco não confirmou o PDF nutricional.')
      setBusy(false)
      return
    }

    const refreshed = await getRpcService().getNutritionDocumentsForManagement(50, 0)
    if (refreshed.status === 'success') setManagementDocuments(refreshed.data as readonly NutritionRecord[])
    else if (refreshed.status === 'empty') setManagementDocuments([])

    setManagementFeedback(`PDF Nutricional Oficial de ${managementPatientName || 'paciente selecionado'} gerado sem alteração do Plano Alimentar.`)
    setManagementPatients([])
    setManagementPatientId('')
    setManagementPatientName('')
    setManagementPatientQuery('')
    setBusy(false)
  }

  async function openNutritionStoragePath(path: string, download: boolean) {
    if (!path || busy) return
    setBusy(true)
    const { data, error } = await getSupabaseClient()
      .storage.from('capo-documents')
      .createSignedUrl(path, 120, download ? { download: true } : undefined)
    if (error || !data?.signedUrl) {
      setManagementFeedback(error?.message ?? 'Não foi possível abrir o PDF nutricional.')
      setBusy(false)
      return
    }
    globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    setBusy(false)
  }

  async function openNutritionDocument(documentId: string, download: boolean) {
    if (!documentId || busy) return
    setBusy(true)
    const result = await getRpcService().getNutritionDocument(documentId)
    if (result.status !== 'success') {
      setManagementFeedback(result.status === 'error' ? result.error.message : 'Documento nutricional não localizado.')
      setBusy(false)
      return
    }
    const path = field(result.data as NutritionRecord, 'pdf_path')
    if (!path) {
      setManagementFeedback('O PDF oficial ainda não foi registrado para este documento.')
      setBusy(false)
      return
    }
    const { data, error } = await getSupabaseClient()
      .storage.from('capo-documents')
      .createSignedUrl(path, 120, download ? { download: true } : undefined)
    if (error || !data?.signedUrl) {
      setManagementFeedback(error?.message ?? 'Não foi possível abrir o PDF nutricional.')
      setBusy(false)
      return
    }
    globalThis.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    setBusy(false)
  }

  async function requestAdministrativeDelivery() {
    const documentId = field(document, 'document_id', 'id')
    if (!documentId || busy) return
    setBusy(true)
    const result = await getRpcService().registerNutritionDelivery(documentId, 'administrativo')
    if (result.status === 'success') {
      setFeedback('Entrega administrativa do PDF Nutricional Oficial solicitada.')
    } else {
      setFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou a solicitação de entrega.')
    }
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

  if (!authorized && hasNutritionSpecialty === null) {
    return <section className="home-page"><p>Verificando especialidade autorizada…</p></section>
  }
  if (!authorized) {
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
    <section className="home-page home-mobile-standard" aria-labelledby="nutrition-title">
      {isNutritionProfessional && homeOnly && (
        <>
          <nav className="home-profile home-profile-standard" aria-label="Acessos rápidos da Nutrição">
            <h2>Acessos rápidos</h2>
            <div className="home-profile-grid">
              <Link className="home-profile-card quick-blue" to="/agenda"><span className="home-profile-icon" aria-hidden="true">▣</span><strong>Minha Agenda</strong><span>Dia, semana e mês</span></Link>
              <Link className="home-profile-card quick-purple" to="/minha-agenda/solicitar-alteracao"><span className="home-profile-icon" aria-hidden="true">▤</span><strong>Solicitar alteração de agenda</strong><span>Mudança estrutural para análise da Coordenação</span></Link>
              <Link className="home-profile-card quick-green" to="/nutricao" state={{ returnTo: '/' }}><span className="home-profile-icon" aria-hidden="true">◉</span><strong>Planejamento Alimentar</strong><span>Abrir o módulo da Nutrição</span></Link>
              <Link className="home-profile-card quick-purple" to="/solicitacoes"><span className="home-profile-icon" aria-hidden="true">▤</span><strong>Solicitações</strong><span>Demandas da própria atuação</span></Link>
              <Link className="home-profile-card quick-violet" to="/relatorios"><span className="home-profile-icon" aria-hidden="true">▥</span><strong>Relatórios</strong><span>Indicadores da Nutrição</span></Link>
              <Link className="home-profile-card quick-yellow" to="/suporte"><span className="home-profile-icon" aria-hidden="true">?</span><strong>Solicitar manutenção</strong><span>Informar problema ao suporte</span></Link>
            </div>
          </nav>

          <AgendaPage accessContext={accessContext} showSpecialty={false} onConfirmed={(appointment) => void openConfirmedPatient(appointment)} embeddedHome />

          <section className="home-profile" aria-labelledby="nutrition-birthdays-title">
            <h2 id="nutrition-birthdays-title">Aniversariantes</h2>
            {birthdays.status === 'loading' && <p>Carregando aniversariantes autorizados…</p>}
            {birthdays.status === 'error' && <p role="alert">{birthdays.error.message}</p>}
            {birthdays.status === 'empty' && <p>Nenhum aniversariante retornado.</p>}
            {birthdays.status === 'success' && <><h3>Pacientes vinculados — Hoje</h3>{birthdays.data.patients.length ? <ul>{birthdays.data.patients.map((patient) => (
  <li key={patient.patient_id}>
    {patient.full_name}
  </li>
))}</ul> : <p>Nenhum paciente vinculado faz aniversário hoje.</p>}<TeamMonthlyBirthdays team={birthdays.data.team} referenceDate={birthdays.data.reference_date} /></>}
          </section>

        </>
      )}

      {!homeOnly && isNutritionProfessional && (
        <section className="home-profile" aria-labelledby="nutrition-plan-title">
            <Link to={returnTo} className="nutrition-back-link">← Voltar {returnTo === '/agenda' ? 'à agenda' : 'à Home'}</Link>
            <p className="eyebrow">Planejamento Alimentar</p>
            <h2 id="nutrition-plan-title">Plano Alimentar e PDF oficial</h2>
            {patientId && (
              <p role="status">
                <strong>Vulnerabilidade — impacto mínimo autorizado:</strong>{' '}
                {vulnerabilityAlert
                  ? String(vulnerabilityAlert.impact_level ?? 'sem nível informado')
                  : 'nenhum alerta ativo'}
              </p>
            )}
            <label>Paciente vinculado
              <input value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Nome, Nº CAPO ou CMS" />
            </label>
            <button type="button" disabled={searchingPatients || patientQuery.trim().length < 2} onClick={() => void searchPatients()}>{searchingPatients ? 'Buscando…' : 'Buscar paciente'}</button>
            {patientSearchFeedback && <p role="status">{patientSearchFeedback}</p>}
            {patients.length > 0 && <select value={patients.some((item) => item.patient_id === patientId) ? patientId : ''} onChange={(event) => { const patient = patients.find((item) => item.patient_id === event.target.value); if (patient) void selectNutritionPatient(patient.patient_id, patient.full_name) }}><option value="">Selecionar paciente</option>{patients.map((patient) => <option key={patient.patient_id} value={patient.patient_id}>{patient.full_name} · {patient.patient_number ?? 'Nº CAPO não informado'}</option>)}</select>}
            {patientId && <p>Paciente selecionado: {selectedPatientName}</p>}
            {patientId && <PatientDischargeProximityIndicator patientId={patientId} />}
            {planLoaded && !canEditPlan && <p role="status">O plano atual pertence a outro profissional; edição indisponível neste contexto. Nenhuma alteração será gravada.</p>}
            {!patientId && <p role="status">Para salvar, selecione um paciente autorizado ou confirme sua presença na agenda.</p>}
            <div className="nutrition-document-editor" aria-label="Edição documental do Plano Alimentar">
              <header className="nutrition-document-heading">
                <strong>Secretaria Municipal de Saúde — CAPO</strong>
                <span>Serviço de Nutrição</span>
                {patientId && <span>Paciente: {selectedPatientName}</span>}
                {patientId && <span>Nº CAPO: {field(patientIdentification, 'patient_number') ?? 'Não informado'} · CMS: {field(patientIdentification, 'cms') ?? 'Não informado'}</span>}
                <small>Identificação e autoria são vinculadas ao cadastro e à sessão profissional.</small>
              </header>
              <label className="nutrition-document-title-field">
                Título do documento
                <input type="text" value={plan.title} disabled={!patientId || !canEditPlan}
                  onChange={(event) => { setPlanDirty(true); setPlan((current) => ({ ...current, title: event.target.value })) }} />
              </label>
              {nutritionSections.map(({ key, label, rows }) => {
                const expanded = expandedSections[key] === true
                const fieldId = 'nutrition-plan-field-' + key
                return (
                  <div className="nutrition-document-section" key={key}>
                    <div className="nutrition-document-section-heading">
                      <label htmlFor={fieldId}><strong>{label}</strong></label>
                      <button type="button" className="nutrition-section-toggle"
                        aria-label={(expanded ? 'Reduzir ' : 'Ampliar ') + label}
                        aria-expanded={expanded} aria-controls={fieldId}
                        title={expanded ? 'Reduzir campo' : 'Ampliar campo'}
                        disabled={!patientId || !planLoaded}
                        onClick={() => setExpandedSections(current => ({ ...current, [key]: !current[key] }))}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                          {expanded
                            ? <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
                            : <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />}
                        </svg>
                        <span>{expanded ? 'Reduzir' : 'Ampliar'}</span>
                      </button>
                    </div>
                    <textarea id={fieldId} rows={expanded ? 13 : rows} value={plan[key]}
                      disabled={!patientId || !canEditPlan}
                      placeholder="Digite livremente as orientações para este paciente"
                      onChange={(event) => { setPlanDirty(true); setPlan((current) => ({ ...current, [key]: event.target.value })) }} />
                  </div>
                )
              })}
            </div>
            {planDirty && <p className="nutrition-document-unsaved" role="status">Alterações não salvas. Salve o plano antes de gerar o documento oficial.</p>}
            {planLoaded && !savedPlanId && canEditPlan && <p role="status">Ainda não existe Plano Alimentar salvo para este paciente. Preencha as orientações e clique em Salvar / atualizar plano; somente após a confirmação será possível gerar o PDF oficial.</p>}
            <div className="nutrition-document-actions">
              <button type="button" disabled={!patientId || !planLoaded || !canEditPlan || busy} onClick={() => void savePlan()}>{busy ? 'Salvando plano…' : 'Salvar / atualizar plano'}</button>
              <button type="button" disabled={!patientId || !planLoaded} onClick={() => setPreviewVisible((current) => !current)}>{previewVisible ? 'Ocultar prévia' : 'Visualizar prévia'}</button>
              <button type="button" disabled={!patientId || !planLoaded || !canEditPlan || busy || planDirty || !savedPlanId} onClick={() => void generateDocument()}>Gerar documento nutricional oficial</button>
            </div>
            {previewVisible && patientId && (
              <article className="nutrition-document-preview" aria-label="Prévia do Plano Alimentar">
                <header><strong>Secretaria Municipal de Saúde — CAPO</strong><span>Serviço de Nutrição</span></header>
                <p><strong>Paciente:</strong> {selectedPatientName}</p>
                <p><strong>Nº CAPO:</strong> {field(patientIdentification, 'patient_number') ?? 'Não informado'} · <strong>CMS:</strong> {field(patientIdentification, 'cms') ?? 'Não informado'}</p>
                <h3>{plan.title || 'PLANO ALIMENTAR ORAL'}</h3>
                {nutritionSections.filter(({ key }) => plan[key].trim()).map(({ key, label }) => (
                  <section key={key}><h4>{label}</h4><p>{plan[key]}</p></section>
                ))}
                <footer>Documento de pré-visualização. O PDF oficial recebe autoria, registro profissional, data e revisão diretamente do banco.</footer>
              </article>
            )}
            {feedback && <p role="status">{feedback}</p>}
            {document && (
              <div>
                <p>Documento gerado: {field(document, 'document_id', 'id') ?? 'confirmado pelo banco'}</p>
                {field(document, 'pdf_path') && (
                  <>
                    <button type="button" disabled={busy} onClick={() => void openNutritionStoragePath(field(document, 'pdf_path') ?? '', false)}>Visualizar PDF</button>
                    <button type="button" disabled={busy} onClick={() => void openNutritionStoragePath(field(document, 'pdf_path') ?? '', true)}>Baixar PDF</button>
                    <button type="button" disabled={busy} onClick={() => void requestAdministrativeDelivery()}>Enviar ao Administrativo</button>
                  </>
                )}
              </div>
            )}
          </section>
      )}

      {!homeOnly && canManageDeliveries && (
        <section className="home-profile" aria-labelledby="nutrition-admin-title">
          <p className="eyebrow">Gestão administrativa</p>
          <h2 id="nutrition-admin-title">{managementView ? 'Reabertura de entregas nutricionais' : 'Entregas nutricionais'}</h2>
          <label>{managementView ? 'Motivo administrativo para reabrir' : operationalView ? 'Motivo administrativo para cancelar' : 'Motivo administrativo para cancelar ou reabrir'}<textarea value={deliveryReason} minLength={5} maxLength={500} onChange={(event) => setDeliveryReason(event.target.value)} /></label>
          {deliveriesFeedback && <p role="status">{deliveriesFeedback}</p>}
          {visibleDeliveries.length === 0 && <p>{managementView ? 'Nenhuma entrega disponível para reabertura.' : 'Nenhuma entrega nutricional pendente.'}</p>}
          {visibleDeliveries.length > 0 && (
            <ul>
              {visibleDeliveries.map((delivery, index) => {
                const id = field(delivery, 'delivery_id', 'id')
                const status = field(delivery, 'status')?.toLowerCase()
                const requiresReason = (action: NutritionDeliveryAction) => ['cancel', 'reopen'].includes(action)
                const actionButton = (action: NutritionDeliveryAction, label: string) =>
                  id && (action !== 'reopen' || (isController && !operationalView)) && (!managementView || action === 'reopen') &&
                  <button type="button" disabled={busy || (requiresReason(action) && deliveryReason.trim().length < 5)} onClick={() => void manageDelivery(id, action)}>{label}</button>
                return (
                  <li key={id ?? index}>
                    <strong>{field(delivery, 'patient_name') ?? 'Paciente'}</strong>
                    <span>{field(delivery, 'status') ?? 'Situação não informada'}</span>
                    {field(delivery, 'document_id') && (
                      <>
                        <button type="button" disabled={busy} onClick={() => void openNutritionDocument(field(delivery, 'document_id') ?? '', false)}>Visualizar PDF</button>
                        <button type="button" disabled={busy} onClick={() => void openNutritionDocument(field(delivery, 'document_id') ?? '', true)}>Baixar PDF</button>
                      </>
                    )}
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

      {!homeOnly && showDocuments && (
        <section className="home-profile" aria-labelledby="nutrition-management-title">
          <p className="eyebrow">Consulta gerencial</p>
          <h2 id="nutrition-management-title">Documentos nutricionais oficiais</h2>
          <p>Consulta operacional do PDF e de seus metadados. O conteúdo do Plano Alimentar permanece sem edição neste contexto.</p>
          {canGenerateManagementPdf && (
            <div className="home-ops">
              <h3>Gerar PDF de Plano Alimentar já preenchido</h3>
              <p>Esta ação cria uma nova revisão do documento usando exatamente o plano atual salvo pela Nutrição, sem permitir edição do conteúdo.</p>
              <label>Paciente
                <input
                  value={managementPatientQuery}
                  onChange={(event) => {
                    setManagementPatientQuery(event.target.value)
                    setManagementPatientId('')
                    setManagementPatientName('')
                  }}
                  placeholder="Nome, Nº CAPO ou CMS"
                />
              </label>
              <button type="button" disabled={busy || managementPatientQuery.trim().length < 2} onClick={() => void searchManagementPatients()}>
                Buscar paciente
              </button>
              {managementPatients.length > 0 && (
                <div className="patient-results">
                  {managementPatients.map((patient) => (
                    <button
                      type="button"
                      key={patient.patient_id}
                      className={managementPatientId === patient.patient_id ? 'is-selected' : ''}
                      onClick={() => {
                        setManagementPatientId(patient.patient_id)
                        setManagementPatientName(patient.full_name)
                      }}
                    >
                      {patient.full_name}
                      <small>{patient.patient_number ?? patient.cms ?? 'Identificação disponível no cadastro'}</small>
                    </button>
                  ))}
                </div>
              )}
              <button type="button" disabled={busy || !managementPatientId} onClick={() => void generateManagementDocument()}>
                Gerar PDF do plano já preenchido
              </button>
            </div>
          )}
          {managementFeedback && <p role="status">{managementFeedback}</p>}
          {managementDocuments.length === 0 && <p>Nenhum documento nutricional oficial encontrado.</p>}
          {managementDocuments.length > 0 && (
            <ul>
              {managementDocuments.map((item, index) => {
                const documentId = field(item, 'document_id', 'id') ?? ''
                return (
                  <li key={documentId || index}>
                    <strong>{field(item, 'patient_name') ?? 'Paciente'}</strong>
                    <span>
                      {field(item, 'author_name') ?? 'Autoria não informada'} · revisão {String(item.revision_no ?? '—')}
                    </span>
                    {item.pdf_available === true ? (
                      <>
                        <button type="button" disabled={busy} onClick={() => void openNutritionDocument(documentId, false)}>Visualizar PDF</button>
                        <button type="button" disabled={busy} onClick={() => void openNutritionDocument(documentId, true)}>Baixar PDF</button>
                      </>
                    ) : (
                      <small>PDF ainda não disponível.</small>
                    )}
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
