import { useEffect, useState } from 'react'
import { getRpcService, loadingState, type AsyncState, type BirthdayOverview, type AgendaAppointment } from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { AgendaPage } from '../agenda/AgendaPage'
import { Link } from 'react-router-dom'
import { getSupabaseClient } from '../../lib/supabase/client'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'

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

function nutritionPdfSafe(value: string) {
  return Array.from(value).map((character) => {
    const code = character.charCodeAt(0)
    if (code <= 255) return character
    return ({ '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '•': '*' } as Record<string, string>)[character] ?? '?'
  }).join('')
}

function nutritionPdfBytes(value: string) {
  return Uint8Array.from(Array.from(value).map((character) => character.charCodeAt(0) & 255))
}

function nutritionPdfEscape(value: string) {
  return nutritionPdfSafe(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function nutritionPdfWrap(value: string, width = 84) {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (!words.length) return ['']
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length > width) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function buildNutritionPdf(document: NutritionRecord) {
  const snapshot = asRecord(document.plan_snapshot)
  const labels: readonly [string, string][] = [
    ['breakfast', 'Desjejum'],
    ['lunch', 'Almoço'],
    ['snack', 'Lanche'],
    ['dinner', 'Jantar'],
    ['hydration', 'Hidratação'],
    ['nutritional_supplement', 'Complemento nutricional'],
    ['other_guidance', 'Outras orientações'],
  ]
  const lines = [
    'CAPO - PLANO ALIMENTAR NUTRICIONAL',
    `Paciente: ${field(document, 'patient_name') ?? ''}`,
    `CMS: ${field(document, 'cms') ?? '—'}`,
    `Nº CAPO: ${field(document, 'patient_number') ?? '—'}`,
    `Autoria: ${field(document, 'author_name') ?? ''}`,
    `Registro profissional: ${field(document, 'author_registration') ?? 'Não informado'}`,
    `Revisão: ${String(document.revision_no ?? '—')}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
    '',
  ]
  for (const [key, label] of labels) {
    const value = typeof snapshot?.[key] === 'string' ? String(snapshot[key]).trim() : ''
    if (value) lines.push(`${label}:`, ...nutritionPdfWrap(value), '')
  }

  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += 46) {
    pages.push(lines.slice(index, index + 46))
  }
  if (!pages.length) pages.push(['CAPO - PLANO ALIMENTAR NUTRICIONAL'])

  const objects: Record<number, Uint8Array> = {}
  objects[1] = nutritionPdfBytes('<< /Type /Catalog /Pages 2 0 R >>')
  objects[3] = nutritionPdfBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const kids: string[] = []
  pages.forEach((page, pageIndex) => {
    const pageObject = 4 + pageIndex * 2
    const contentObject = 5 + pageIndex * 2
    kids.push(`${pageObject} 0 R`)
    objects[pageObject] = nutritionPdfBytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`,
    )
    const stream =
      'BT\n/F1 11 Tf\n14 TL\n48 790 Td\n' +
      page.map((line, lineIndex) =>
        `${lineIndex ? 'T*\\n' : ''}(${nutritionPdfEscape(line)}) Tj`,
      ).join('\n') +
      '\nET'
    const streamBytes = nutritionPdfBytes(stream)
    const prefix = nutritionPdfBytes(`<< /Length ${streamBytes.length} >>\nstream\n`)
    const suffix = nutritionPdfBytes('\nendstream')
    const contentBytes = new Uint8Array(prefix.length + streamBytes.length + suffix.length)
    contentBytes.set(prefix, 0)
    contentBytes.set(streamBytes, prefix.length)
    contentBytes.set(suffix, prefix.length + streamBytes.length)
    objects[contentObject] = contentBytes
  })
  objects[2] = nutritionPdfBytes(
    `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`,
  )

  const maxObject = Math.max(...Object.keys(objects).map(Number))
  const header = nutritionPdfBytes('%PDF-1.4\n')
  const parts: Uint8Array[] = [header]
  const offsets = [0]
  let length = header.length
  for (let index = 1; index <= maxObject; index += 1) {
    offsets[index] = length
    const object = objects[index]
    const prefix = nutritionPdfBytes(`${index} 0 obj\n`)
    const suffix = nutritionPdfBytes('\nendobj\n')
    const wrapped = new Uint8Array(prefix.length + object.length + suffix.length)
    wrapped.set(prefix, 0)
    wrapped.set(object, prefix.length)
    wrapped.set(suffix, prefix.length + object.length)
    parts.push(wrapped)
    length += wrapped.length
  }
  const xrefOffset = length
  let xref = `xref\n0 ${maxObject + 1}\n0000000000 65535 f \n`
  for (let index = 1; index <= maxObject; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${maxObject + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  parts.push(nutritionPdfBytes(xref))
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return new Blob([bytes], { type: 'application/pdf' })
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
  const isController = accessContext.roles.some((role) => role.code === 'administrador')
  const isAdministrativeOperational = accessContext.roles.some((role) => role.code === 'administrativo_operacional')
  const isCoordinator = accessContext.roles.some((role) => role.code === 'coordenador')
  const canManageDeliveries = isController || isAdministrativeOperational
  const canConsultDocuments = isController || isCoordinator
  const authorized = isNutritionProfessional || canManageDeliveries || canConsultDocuments
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
  const [vulnerabilityAlert, setVulnerabilityAlert] = useState<NutritionRecord | null>(null)
  const [document, setDocument] = useState<NutritionRecord | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [deliveries, setDeliveries] = useState<readonly NutritionRecord[]>([])
  const [deliveriesFeedback, setDeliveriesFeedback] = useState<string | null>(null)
  const [deliveryReason, setDeliveryReason] = useState('')
  const [managementDocuments, setManagementDocuments] = useState<readonly NutritionRecord[]>([])
  const [managementFeedback, setManagementFeedback] = useState<string | null>(null)

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
    if (!canConsultDocuments) return
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
  }, [canConsultDocuments])

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
    setFeedback(null); setPatientId(''); setPlanLoaded(false); setDocument(null); setVulnerabilityAlert(null)
    const result = await getRpcService().getNutritionContext(id)
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O contexto nutricional do paciente não foi retornado.')
      return
    }
    const loaded = planFromContext(result.data)
    const context = asRecord(result.data)
    setPlan(loaded.plan); setCanEditPlan(loaded.canEdit); setPlanLoaded(true)
    setVulnerabilityAlert(asRecord(context?.vulnerability_alert))
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
    if (!patientId || !planLoaded || !canEditPlan || busy) {
      setFeedback('Selecione um paciente real da Nutrição com Plano Alimentar atual.')
      return
    }
    setBusy(true)
    setFeedback('Gerando documento nutricional oficial…')
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
    const blob = buildNutritionPdf(officialDocument)
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
            {birthdays.status === 'success' && <><h3>Pacientes vinculados</h3>{birthdays.data.patients.length ? <ul>{birthdays.data.patients.map((patient) => (
  <li key={patient.patient_id}>
    {patient.full_name}
    <PatientWhatsAppButton
      patientId={patient.patient_id}
      message={`Olá, ${patient.full_name}. 🎉 A equipe do CAPO deseja a você um feliz aniversário, com saúde, alegria e bons momentos. Receba nosso carinho e nossos melhores votos!`}
    />
  </li>
))}</ul> : <p>Nenhum paciente vinculado faz aniversário hoje.</p>}<h3>Equipe CAPO</h3>{birthdays.data.team.length ? <ul>{birthdays.data.team.map((member) => <li key={member.professional_id}>{member.full_name}</li>)}</ul> : <p>Nenhum integrante da equipe faz aniversário hoje.</p>}</>}
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
            {planLoaded && !canEditPlan && <p role="status">O plano atual pertence a outro profissional; edição indisponível neste contexto.</p>}
            <div className="home-profile-grid">
              {Object.entries({ breakfast: 'Desjejum', lunch: 'Almoço', snack: 'Lanche', dinner: 'Jantar', hydration: 'Hidratação', supplement: 'Suplemento nutricional', other: 'Outras orientações' }).map(([planField, label]) => <label key={planField}>{label}<textarea rows={2} value={plan[planField as keyof typeof plan]} onChange={(event) => setPlan((current) => ({ ...current, [planField]: event.target.value }))} /></label>)}
            </div>
            <button type="button" disabled={!patientId || !planLoaded || !canEditPlan || busy} onClick={() => void savePlan()}>Salvar / atualizar plano</button>
            <button type="button" disabled={!patientId || !planLoaded || !canEditPlan || busy} onClick={() => void generateDocument()}>Gerar documento nutricional oficial</button>
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
        </>
      )}

      {canManageDeliveries && (
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
                const actionButton = (action: NutritionDeliveryAction, label: string) =>
                  id && (action !== 'reopen' || isController) &&
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

      {canConsultDocuments && (
        <section className="home-profile" aria-labelledby="nutrition-management-title">
          <p className="eyebrow">Consulta gerencial</p>
          <h2 id="nutrition-management-title">Documentos nutricionais oficiais</h2>
          <p>Consulta operacional do PDF e de seus metadados. O conteúdo do Plano Alimentar permanece sem edição neste contexto.</p>
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
