import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getRpcService, type AsyncState } from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import { RegisterPatientDeath } from '../../components/patients/RegisterPatientDeath'
import './patients-page.css'

const emptyState: AsyncState<readonly { patient_id: string; full_name: string; patient_number: string | null; cms: string | null }[]> = {
  status: 'empty',
}

export function PatientsPage({
  accessContext,
}: Readonly<{ accessContext: AccessContext }>) {
  const [activeView, setActiveView] = useState<'register' | 'search'>('register')
  const [patientName, setPatientName] = useState('')
  const [patientBirthDate, setPatientBirthDate] = useState('')
  const [patientCms, setPatientCms] = useState('')
  const [patientSex, setPatientSex] = useState('')
  const [patientPhone, setPatientPhone] = useState('')
  const [patientPhoneSecondary, setPatientPhoneSecondary] = useState('')
  const [patientAddress, setPatientAddress] = useState('')
  const [patientCapoStartDate, setPatientCapoStartDate] = useState('')
  const [patientNotes, setPatientNotes] = useState('')
  const [patientOrigin, setPatientOrigin] = useState('')
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null)
  const [createdPatientNumber, setCreatedPatientNumber] = useState<string | null>(null)
  const [createdPatientStatus, setCreatedPatientStatus] = useState<string | null>(null)
  const [offerOutcome, setOfferOutcome] = useState<'aceitou' | 'novo_contato' | 'sem_resposta' | 'recusou' | ''>('')
  const [offerNextContactDate, setOfferNextContactDate] = useState('')
  const [offerNextContactTime, setOfferNextContactTime] = useState('')
  const [offerNotes, setOfferNotes] = useState('')
  const [offerFeedback, setOfferFeedback] = useState<string | null>(null)
  const [offerHistory, setOfferHistory] = useState<readonly Record<string, unknown>[]>([])
  const [offerBusy, setOfferBusy] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<AsyncState<readonly {
    patient_id: string
    full_name: string
    patient_number: string | null
    cms: string | null
  }[]>>(emptyState)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [editBusy, setEditBusy] = useState(false)

  const whatsappDigits = patientPhone.replace(/\D/g, '')
  const whatsappNumber = whatsappDigits.startsWith('55')
    ? whatsappDigits
    : `55${whatsappDigits}`
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : 'Boa tarde'
  const operatorName = accessContext.full_name ?? accessContext.username
  const offerMessage = `${greeting}, ${patientName.trim() || '[nome do paciente]'}! Tudo bem?

Estou entrando em contato para apresentar o CAPO – Centro de Acolhimento ao Paciente Oncológico, serviço multiprofissional da Secretaria Municipal de Saúde de Pouso Alegre – MG.

O CAPO oferece acolhimento, orientações e acompanhamento ao paciente e à sua família, de forma complementar e paralela às consultas, aos exames e ao acompanhamento oncológico específico.

É importante esclarecer que este contato e o encaminhamento ao CAPO não significam que exista um diagnóstico de câncer confirmado.

Você tem interesse em conhecer e receber esse acompanhamento? Se desejar, podemos agendar um primeiro acolhimento com a assistente social, que explicará como funciona o serviço e fornecerá as orientações iniciais.

Fico à disposição para esclarecer suas dúvidas.

${operatorName} – ADMINISTRATIVO CAPO`

  function openWhatsApp() {
    if (whatsappNumber.length < 10) return
    window.open(
      `https://web.whatsapp.com/send?phone=${encodeURIComponent(whatsappNumber)}&text=${encodeURIComponent(offerMessage)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  async function createPatient() {
    if (!patientName.trim() || !patientBirthDate) {
      setFeedback('Informe nome completo e data de nascimento.')
      return
    }
    setFeedback('Cadastrando paciente no banco…')
    const next = await getRpcService().createPatient({
      fullName: patientName.trim(),
      birthDate: patientBirthDate,
      cms: patientCms.trim() || null,
      sex: patientSex || null,
      phone: patientPhone.trim() || null,
      phoneSecondary: patientPhoneSecondary.trim() || null,
      address: patientAddress.trim() || null,
      capoStartDate: patientCapoStartDate || null,
      operationalNotes: patientNotes.trim() || null,
      origin: patientOrigin.trim() || null,
    })
    if (next.status === 'success') {
      setCreatedPatientId(next.data.patient_id)
      setCreatedPatientNumber(next.data.patient_number)
      setCreatedPatientStatus(next.data.status)
      setFeedback(`Paciente cadastrado. Nº CAPO ${next.data.patient_number}.`)
      const refreshed = await getRpcService().searchReferralPatients(
        next.data.patient_number,
        20,
        0,
      )
      if (refreshed.status === 'success') setResult(refreshed)
    } else if (next.status === 'error') {
      setFeedback(next.error.message)
    } else {
      setFeedback('O cadastro não retornou dados do paciente.')
    }
  }

  async function loadOfferHistory(patientId: string) {
    const result = await getRpcService().getInitialActiveSearches(null, 100, 0)
    if (result.status !== 'success' || !result.data || typeof result.data !== 'object') {
      setOfferHistory([])
      return
    }
    const payload = result.data as Record<string, unknown>
    const items = Array.isArray(payload.items) ? payload.items : []
    const patient = items.find((item) =>
      Boolean(item) && typeof item === 'object' && !Array.isArray(item) &&
      (item as Record<string, unknown>).patient_id === patientId,
    ) as Record<string, unknown> | undefined
    setOfferHistory(Array.isArray(patient?.history)
      ? patient.history.filter((item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object' && !Array.isArray(item))
      : [])
  }

  async function registerOfferOutcome() {
    if (!createdPatientId || !offerOutcome || offerBusy) return
    if (offerOutcome === 'novo_contato' && !offerNextContactDate) {
      setOfferFeedback('Informe a data do próximo contato.')
      return
    }
    const nextContactAt = offerNextContactDate
      ? `${offerNextContactDate}T${offerNextContactTime || '09:00'}:00-03:00`
      : null
    const acceptedService = offerOutcome === 'aceitou'
      ? true
      : offerOutcome === 'recusou'
        ? false
        : null
    const closeFlow = offerOutcome === 'aceitou' || offerOutcome === 'recusou'
    const resultText: Record<Exclude<typeof offerOutcome, ''>, string> = {
      aceitou: 'Aceitou a Oferta CAPO',
      novo_contato: 'Novo contato necessário',
      sem_resposta: 'Sem resposta / contato não conseguido',
      recusou: 'Recusou a Oferta CAPO',
    }
    const closureReason = offerOutcome === 'aceitou'
      ? 'Oferta CAPO aceita pelo paciente.'
      : offerOutcome === 'recusou'
        ? 'Oferta CAPO recusada pelo paciente.'
        : null

    setOfferBusy(true)
    setOfferFeedback('Registrando desfecho no banco…')
    const result = await getRpcService().registerInitialActiveSearchAttempt({
      patientId: createdPatientId,
      contactMethod: 'whatsapp',
      contactResult: resultText[offerOutcome],
      acceptedService,
      nextAction: offerOutcome === 'novo_contato' || offerOutcome === 'sem_resposta'
        ? 'Realizar novo contato conforme acompanhamento administrativo.'
        : null,
      notes: offerNotes.trim() || null,
      nextContactAt,
      closeFlow,
      closureReason,
    })
    if (result.status === 'success') {
      setOfferFeedback('Desfecho da Oferta CAPO registrado no banco.')
      setOfferNotes('')
      setOfferNextContactDate('')
      setOfferNextContactTime('')
      setOfferOutcome('')
      await loadOfferHistory(createdPatientId)
    } else {
      setOfferFeedback(result.status === 'error' ? result.error.message : 'O banco não confirmou o registro da Oferta CAPO.')
    }
    setOfferBusy(false)
  }

  async function searchPatients() {
    const cleanQuery = query.trim()
    if (cleanQuery.length < 2) {
      setFeedback('Informe ao menos dois caracteres para buscar o paciente.')
      setResult(emptyState)
      return
    }

    setFeedback(null)
    const next = await getRpcService().searchReferralPatients(cleanQuery, 20, 0)
    setResult(next.status === 'success' ? next : { status: 'empty' })

    if (next.status === 'error') {
      setFeedback(next.error.message)
    }
  }

  async function openPatientEditor(patientId: string) {
    setEditBusy(true)
    setFeedback(null)
    const next = await getRpcService().getPatientForEdit(patientId)
    if (next.status === 'success') {
      const row = Array.isArray(next.data) ? next.data[0] : next.data
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        const source = row as Record<string, unknown>
        setEditingPatientId(patientId)
        setEditForm({
          full_name: String(source.full_name ?? ''),
          birth_date: String(source.birth_date ?? ''),
          cms: String(source.cms ?? ''),
          sex: String(source.sex ?? ''),
          phone: String(source.phone ?? ''),
          phone_secondary: String(source.phone_secondary ?? ''),
          address: String(source.address ?? ''),
          capo_start_date: String(source.capo_start_date ?? ''),
          operational_notes: String(source.operational_notes ?? ''),
          origin: String(source.origin ?? ''),
          status: String(source.status ?? 'ativo'),
        })
      } else {
        setFeedback('O banco não retornou os dados editáveis do paciente.')
      }
    } else if (next.status === 'error') {
      setFeedback(next.error.message)
    }
    setEditBusy(false)
  }

  async function savePatientEditor() {
    if (!editingPatientId || editBusy) return
    if (editForm.full_name?.trim().length < 3 || !editForm.birth_date) {
      setFeedback('Informe nome completo e data de nascimento válidos.')
      return
    }
    setEditBusy(true)
    const next = await getRpcService().updatePatient({
      patientId: editingPatientId,
      fullName: editForm.full_name.trim(),
      birthDate: editForm.birth_date,
      cms: editForm.cms?.trim() || null,
      sex: editForm.sex?.trim() || null,
      phone: editForm.phone?.trim() || null,
      phoneSecondary: editForm.phone_secondary?.trim() || null,
      address: editForm.address?.trim() || null,
      capoStartDate: editForm.capo_start_date || null,
      operationalNotes: editForm.operational_notes?.trim() || null,
      status: editForm.status === 'inativo' ? 'inativo' : 'ativo',
      origin: editForm.origin?.trim() || null,
    })
    if (next.status === 'success') {
      setFeedback('Cadastro administrativo do paciente atualizado.')
      if (query.trim().length >= 2) await searchPatients()
    } else if (next.status === 'error') {
      setFeedback(next.error.message)
    }
    setEditBusy(false)
  }

  return (
    <section className="home-page" aria-labelledby="patients-title">
      <header className="home-welcome">
        <p className="eyebrow">Atendimento e Acompanhamento</p>
        <h1 id="patients-title">Pacientes</h1>
        <p>
          Cadastro, Oferta CAPO integrada e consulta administrativa autorizada.
        </p>
        <div className="patients-actions" aria-label="Ações de pacientes">
          <button
            type="button"
            className={activeView === 'register' ? 'is-active' : undefined}
            aria-pressed={activeView === 'register'}
            onClick={() => setActiveView('register')}
          >
            Cadastrar
          </button>
          <button
            type="button"
            className={activeView === 'search' ? 'is-active' : undefined}
            aria-pressed={activeView === 'search'}
            onClick={() => setActiveView('search')}
          >
            Consultar
          </button>
        </div>
      </header>

      {activeView === 'register' && (
        <section className="home-profile patients-register" aria-labelledby="patients-register-title">
          <div className="patients-section-heading">
            <div>
              <p className="eyebrow">Cadastro + Oferta CAPO</p>
              <h2 id="patients-register-title">Cadastro do Paciente</h2>
              <p>Cadastro administrativo do paciente. A Oferta CAPO permanece integrada a este mesmo fluxo.</p>
            </div>
          </div>
          <div className="patients-form-grid">
            <label className="patients-span-2">
              Nome completo *
              <input
                type="text"
                placeholder="Nome completo do paciente"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
              />
            </label>
            <label>
              Data de nascimento *
              <input type="date" value={patientBirthDate} onChange={(event) => setPatientBirthDate(event.target.value)} />
            </label>
            <label>
              Idade
              <input type="text" placeholder="Calculada automaticamente" readOnly />
            </label>
            <label>
              CMS
              <input type="text" placeholder="Cartão Municipal de Saúde" value={patientCms} onChange={(event) => setPatientCms(event.target.value)} />
            </label>
            <label>
              Nº CAPO
              <input
                type="text"
                value={createdPatientNumber ?? ''}
                placeholder="Gerado automaticamente pelo banco"
                readOnly
                aria-describedby="patient-number-note"
              />
            </label>
            <label>
              Origem
              <input type="text" placeholder="Origem do paciente" value={patientOrigin} onChange={(event) => setPatientOrigin(event.target.value)} />
            </label>
            <label>
              Sexo
              <select value={patientSex} onChange={(event) => setPatientSex(event.target.value)}>
                <option value="">Selecionar</option>
                <option value="feminino">Feminino</option>
                <option value="masculino">Masculino</option>
                <option value="outro">Outro / não informado</option>
              </select>
            </label>
            <label>
              Telefone / WhatsApp
              <input
                type="tel"
                placeholder="(35) 99999-9999"
                value={patientPhone}
                onChange={(event) => setPatientPhone(event.target.value)}
              />
            </label>
            <label>
              Telefone alternativo do paciente
              <input type="tel" placeholder="Telefone alternativo" value={patientPhoneSecondary} onChange={(event) => setPatientPhoneSecondary(event.target.value)} />
            </label>
            <label className="patients-span-2">
              Endereço
              <input type="text" placeholder="Endereço administrativo" value={patientAddress} onChange={(event) => setPatientAddress(event.target.value)} />
            </label>
            <label>
              Data de entrada no CAPO
              <input type="date" value={patientCapoStartDate} onChange={(event) => setPatientCapoStartDate(event.target.value)} />
            </label>
            <label className="patients-span-all">
              Observações administrativas
              <textarea rows={3} placeholder="Somente observações administrativas pertinentes ao fluxo." value={patientNotes} onChange={(event) => setPatientNotes(event.target.value)} />
            </label>
          </div>
          <p id="patient-number-note" className="patients-generated-note">
            O Nº CAPO será preenchido após o cadastro confirmado pelo banco.
          </p>
          {createdPatientStatus && (
            <p className="patients-generated-note" role="status">
              Situação retornada pelo banco: <strong>{createdPatientStatus}</strong>
            </p>
          )}
          <div className="patients-form-actions">
            <button type="button" disabled={!patientName.trim() || !patientBirthDate} onClick={() => void createPatient()}>Cadastrar paciente</button>
          </div>
        </section>
      )}

      {activeView === 'register' && (
        <section className="home-profile patients-offer" aria-labelledby="patients-offer-title">
          <div className="patients-section-heading">
            <div>
              <p className="eyebrow">Cadastro + Oferta CAPO</p>
              <h2 id="patients-offer-title">Oferta CAPO — primeiro contato</h2>
              <p>Esta etapa permanece integrada ao cadastro do paciente.</p>
            </div>
          </div>
          <div className="patients-offer-grid">
            <div>
              <label className="patients-field-label" htmlFor="patients-offer-message">
                Mensagem de WhatsApp
              </label>
              <textarea
                id="patients-offer-message"
                className="patients-message-preview"
                rows={7}
                value={offerMessage}
                readOnly
              />
              <div className="patients-form-actions patients-offer-actions">
                <button type="button" onClick={() => void navigator.clipboard?.writeText(offerMessage)}>
                  Copiar mensagem
                </button>
                <button type="button" disabled={whatsappNumber.length < 10} onClick={openWhatsApp}>
                  Abrir WhatsApp
                </button>
              </div>
            </div>
            <div className="patients-offer-status">
              <strong>Telefone informado</strong>
              <span>{patientPhone.trim() || 'Informe o telefone/WhatsApp no cadastro.'}</span>
              <small>O cadastro confirmado pelo banco é obrigatório para registrar o desfecho.</small>

              <fieldset disabled={!createdPatientId || offerBusy}>
                <legend>Desfecho do contato</legend>
                <label><input type="radio" name="offer-outcome" checked={offerOutcome === 'aceitou'} onChange={() => setOfferOutcome('aceitou')} /> Aceitou</label>
                <label><input type="radio" name="offer-outcome" checked={offerOutcome === 'novo_contato'} onChange={() => setOfferOutcome('novo_contato')} /> Novo contato necessário</label>
                <label><input type="radio" name="offer-outcome" checked={offerOutcome === 'sem_resposta'} onChange={() => setOfferOutcome('sem_resposta')} /> Sem resposta / contato não conseguido</label>
                <label><input type="radio" name="offer-outcome" checked={offerOutcome === 'recusou'} onChange={() => setOfferOutcome('recusou')} /> Recusa / desfecho definitivo</label>
              </fieldset>

              {(offerOutcome === 'novo_contato' || offerOutcome === 'sem_resposta') && (
                <>
                  <label>Data do próximo contato
                    <input type="date" value={offerNextContactDate} onChange={(event) => setOfferNextContactDate(event.target.value)} />
                  </label>
                  <label>Horário do próximo contato
                    <input type="time" value={offerNextContactTime} onChange={(event) => setOfferNextContactTime(event.target.value)} />
                  </label>
                </>
              )}
              <label>Observação administrativa do contato
                <textarea rows={3} value={offerNotes} onChange={(event) => setOfferNotes(event.target.value)} />
              </label>
              <button type="button" disabled={!createdPatientId || !offerOutcome || offerBusy} onClick={() => void registerOfferOutcome()}>
                {offerBusy ? 'Registrando…' : 'Registrar contato da Oferta'}
              </button>
              {offerFeedback && <p role="status">{offerFeedback}</p>}
              <div aria-label="Histórico da Oferta CAPO">
                <strong>Histórico</strong>
                {offerHistory.length === 0 ? <small>Nenhum contato registrado nesta consulta.</small> : (
                  <ul>{offerHistory.map((item, index) => (
                    <li key={String(item.id ?? index)}>
                      {String(item.contact_result ?? 'Contato registrado')}
                      {item.contact_date ? ` · ${new Date(String(item.contact_date)).toLocaleString('pt-BR')}` : ''}
                    </li>
                  ))}</ul>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {activeView === 'search' && <section className="home-profile" aria-labelledby="patients-search-title">
        <div>
          <p className="eyebrow">Pesquisa</p>
          <h2 id="patients-search-title">Buscar paciente</h2>
        </div>

        <div className="home-profile-grid">
          <label style={{ display: 'grid', gap: '0.5rem' }}>
            Nome, Nº CAPO ou CMS
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Digite ao menos 2 caracteres"
            />
          </label>
          <button
            type="button"
            onClick={() => void searchPatients()}
            style={{ alignSelf: 'end' }}
          >
            Buscar
          </button>
        </div>
      </section>}

      {feedback && (
        <p className="home-birthdays-error" role="alert">
          {feedback}
        </p>
      )}

      <section className="home-profile" aria-labelledby="patients-results-title">
        <div>
          <p className="eyebrow">Resultado</p>
          <h2 id="patients-results-title">Pacientes encontrados</h2>
        </div>

        {result.status === 'loading' && <p>Buscando pacientes…</p>}
        {result.status === 'empty' && <p>Nenhum paciente encontrado.</p>}
        {result.status === 'success' && result.data.length === 0 && (
          <p>Nenhum paciente encontrado.</p>
        )}

        {result.status === 'success' && result.data.length > 0 && (
          <div className="home-profile-grid">
            {result.data.map((patient) => (
              <article key={patient.patient_id} className="home-profile-card">
                <strong>{patient.full_name}</strong>
                <span>
                  {patient.patient_number ? `Nº CAPO ${patient.patient_number}` : 'Nº CAPO não informado'}
                  {patient.patient_number && patient.cms ? ' · ' : ''}
                  {patient.cms ? `CMS ${patient.cms}` : patient.cms === null ? 'CMS não informado' : ''}
                </span>
                <small>
                  Contexto administrativo: consulta autorizada para o perfil {accessContext.primary_context.name ?? 'atual'}.
                </small>
                <div className="patients-card-actions" aria-label={`Ações para ${patient.full_name}`}>
                  <PatientWhatsAppButton patientId={patient.patient_id} />
                  <RegisterPatientDeath patientId={patient.patient_id} patientName={patient.full_name} />
                  <button type="button" disabled={editBusy} onClick={() => void openPatientEditor(patient.patient_id)}>
                    Editar cadastro
                  </button>
                  <Link to="/agenda">Agenda Geral</Link>
                  <Link to="/familiar-cuidador">Familiar / Cuidador</Link>
                  <Link to="/encerramentos">Encerramentos</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {editingPatientId && (
        <section className="home-profile" aria-labelledby="patient-edit-title">
          <div>
            <p className="eyebrow">Cadastro administrativo</p>
            <h2 id="patient-edit-title">Editar paciente</h2>
          </div>
          <div className="patients-form-grid">
            <label className="patients-span-2">Nome completo
              <input value={editForm.full_name ?? ''} onChange={(event) => setEditForm({ ...editForm, full_name: event.target.value })} />
            </label>
            <label>Data de nascimento
              <input type="date" value={editForm.birth_date ?? ''} onChange={(event) => setEditForm({ ...editForm, birth_date: event.target.value })} />
            </label>
            <label>CMS
              <input value={editForm.cms ?? ''} onChange={(event) => setEditForm({ ...editForm, cms: event.target.value })} />
            </label>
            <label>Sexo
              <input value={editForm.sex ?? ''} onChange={(event) => setEditForm({ ...editForm, sex: event.target.value })} />
            </label>
            <label>Telefone / WhatsApp
              <input value={editForm.phone ?? ''} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
            </label>
            <label>Telefone alternativo
              <input value={editForm.phone_secondary ?? ''} onChange={(event) => setEditForm({ ...editForm, phone_secondary: event.target.value })} />
            </label>
            <label className="patients-span-2">Endereço
              <input value={editForm.address ?? ''} onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} />
            </label>
            <label>Entrada no CAPO
              <input type="date" value={editForm.capo_start_date ?? ''} onChange={(event) => setEditForm({ ...editForm, capo_start_date: event.target.value })} />
            </label>
            <label>Origem
              <input value={editForm.origin ?? ''} onChange={(event) => setEditForm({ ...editForm, origin: event.target.value })} />
            </label>
            <label>Situação
              <select value={editForm.status ?? 'ativo'} onChange={(event) => setEditForm({ ...editForm, status: event.target.value })}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </label>
            <label className="patients-span-all">Observação administrativa
              <textarea rows={3} value={editForm.operational_notes ?? ''} onChange={(event) => setEditForm({ ...editForm, operational_notes: event.target.value })} />
            </label>
          </div>
          <div className="patients-form-actions">
            <button type="button" disabled={editBusy} onClick={() => void savePatientEditor()}>Salvar alterações</button>
            <button type="button" disabled={editBusy} onClick={() => { setEditingPatientId(null); setEditForm({}) }}>Fechar</button>
          </div>
        </section>
      )}
    </section>
  )
}
