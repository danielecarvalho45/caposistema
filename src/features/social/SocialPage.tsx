import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, loadingState, type AgendaAppointment, type AsyncState } from '../../lib/supabase/rpc'
import { AgendaPage } from '../agenda/AgendaPage'
import {
  createClosuresIntegration,
  type SocialFollowup,
} from '../closures/closures-integration'
import './social-page.css'
import '../../styles/quick-access.css'
import { Link } from 'react-router-dom'
import { BirthdayPanel } from '../../components/birthdays/BirthdayPanel'
import { RegisterPatientDeath } from '../../components/patients/RegisterPatientDeath'
import { PatientCareSpecialties } from '../../components/patients/PatientCareSpecialties'
import { PatientDischargeProximityIndicator } from '../../components/patients/PatientDischargeProximityIndicator'

const defaultIntegration = createClosuresIntegration()
const defaultSpecialtiesLoader = () => getRpcService().getMyAssistentialSpecialties()

export function SocialPage({
  accessContext,
  mode = 'home',
  integration = defaultIntegration,
  loadSpecialties = defaultSpecialtiesLoader,
}: Readonly<{
  accessContext: AccessContext
  mode?: 'home' | 'followup'
  integration?: ReturnType<typeof createClosuresIntegration>
  loadSpecialties?: typeof defaultSpecialtiesLoader
}>) {
  const [socialSpecialtyFor, setSocialSpecialtyFor] = useState<string | null>(null)
  const [social, setSocial] =
    useState<AsyncState<readonly SocialFollowup[]>>(loadingState)
  const [selectedAppointment, setSelectedAppointment] = useState<AgendaAppointment | null>(null)
  const [reason, setReason] = useState('')
  const [vulnerabilityLevel, setVulnerabilityLevel] =
    useState<'verde' | 'amarelo' | 'vermelho'>('verde')
  const [vulnerabilityFeedback, setVulnerabilityFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const eligibleForSocial = accessContext.is_active && Boolean(accessContext.professional_id) && accessContext.roles.some((role) => role.code === 'profissional')
  const canOperateSocial = eligibleForSocial && socialSpecialtyFor === accessContext.professional_id

  useEffect(() => {
    if (!eligibleForSocial || !accessContext.professional_id) return
    let active = true
    const professionalId = accessContext.professional_id
    void loadSpecialties().then((result) => {
      if (!active) return
      setSocialSpecialtyFor(result.status === 'success' && result.data.some((item) => item.specialty_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'assistencia social') ? professionalId : null)
    })
    return () => { active = false }
  }, [eligibleForSocial, accessContext.professional_id, loadSpecialties])

  useEffect(() => {
    if (!canOperateSocial) return
    let active = true
    void integration.loadSocial(null).then((result) => { if (active) setSocial(result) })
    return () => { active = false }
  }, [integration, canOperateSocial])

  async function reloadSocial() {
    const result = await integration.loadSocial(null)
    setSocial(result)
    return result
  }

  async function closeSocial(item: SocialFollowup) {
    const cycleId = String(item.cycle_id ?? item.id ?? '')
    if (!cycleId || reason.trim().length < 5 || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await integration.closeSocial(cycleId, reason.trim())
    if (result.status === 'success') {
      const reloaded = await reloadSocial()
      if (reloaded.status === 'success' || reloaded.status === 'empty') {
        setFeedback('Acompanhamento social encerrado e recarregado do backend.')
        setReason('')
      } else setFeedback('A operação foi recebida, mas a atualização do acompanhamento falhou.')
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setBusy(false)
  }

  function openConfirmedPatient(appointment: AgendaAppointment) {
    setSelectedAppointment(appointment)
    setFeedback(null)
    setVulnerabilityFeedback(null)
    void getRpcService()
      .getSocialVulnerabilityIndicator(appointment.patient_id)
      .then((result) => {
        if (result.status !== 'success') return
        const value = result.data && typeof result.data === 'object' && !Array.isArray(result.data)
          ? (result.data as Record<string, unknown>).level
          : null
        if (value === 'verde' || value === 'amarelo' || value === 'vermelho') {
          setVulnerabilityLevel(value)
        }
      })
    globalThis.document.getElementById('acompanhamento-social')?.scrollIntoView?.({ block: 'start' })
  }

  async function saveVulnerability() {
    if (!selectedAppointment || busy) return
    setBusy(true)
    setVulnerabilityFeedback(null)
    const result = await getRpcService().setSocialVulnerabilityIndicator(
      selectedAppointment.patient_id,
      vulnerabilityLevel,
    )
    if (result.status === 'success') {
      setVulnerabilityFeedback(
        'Indicador de vulnerabilidade atualizado. A Nutrição receberá somente o alerta mínimo autorizado quando aplicável.',
      )
    } else if (result.status === 'error') {
      setVulnerabilityFeedback(result.error.message)
    }
    setBusy(false)
  }

  async function startSocial() {
    if (!selectedAppointment || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await integration.startSocial(
      selectedAppointment.patient_id,
      selectedAppointment.appointment_id,
    )
    if (result.status === 'success') {
      const reloaded = await reloadSocial()
      if (reloaded.status === 'success' || reloaded.status === 'empty') {
        setFeedback('Acompanhamento social iniciado e recarregado do backend.')
      } else {
        setFeedback('A operação foi recebida, mas a atualização do acompanhamento falhou.')
      }
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setBusy(false)
  }

  if (!canOperateSocial) return <section className="social-page"><h1>Assistência Social indisponível</h1><p>É necessário vínculo profissional ativo com a especialidade Assistência Social autorizada.</p></section>

  return (
    <section className={mode === 'home' ? 'social-page home-mobile-standard' : 'social-page'} aria-labelledby="social-title">
      <header className="social-header">
        <div>
          <p className="eyebrow">Assistência Social</p>
          <h1 id="social-title">Acompanhamento Social no Serviço CAPO</h1>
          <p>
            Visão operacional autorizada, sem conteúdo profissional confidencial
            e sem dados demonstrativos.
          </p>
        </div>
      </header>

      {mode === 'home' && (
        <>
          <section className="social-quick-access home-profile-standard" aria-labelledby="quick-title">
            <h2 id="quick-title">Acessos rápidos</h2>
            <div className="social-quick-grid">
              <Link className="social-quick-card social-quick-card--agenda" to="/agenda"><span className="social-quick-icon" aria-hidden="true">▣</span><strong>Minha Agenda</strong><span>Dia, semana e mês</span></Link>
              <Link className="social-quick-card social-quick-card--followup" to="/assistencia-social"><span className="social-quick-icon" aria-hidden="true">♡</span><strong>Acompanhamento Social no Serviço CAPO</strong><span>Ativos e encerrados</span></Link>
              <Link className="social-quick-card social-quick-card--family" to="/familiar-cuidador"><span className="social-quick-icon" aria-hidden="true">♧</span><strong>Familiar / Cuidador</strong><span>Vínculo ativo e histórico</span></Link>
              <Link className="social-quick-card social-quick-card--requests" to="/solicitacoes"><span className="social-quick-icon" aria-hidden="true">▤</span><strong>Solicitações</strong><span>Providências operacionais</span></Link>
            </div>
          </section>

          <section
            id="agenda"
            className="social-agenda"
            aria-labelledby="agenda-title"
          >
            <AgendaPage accessContext={accessContext} onConfirmed={openConfirmedPatient} embeddedHome />
          </section>

          <BirthdayPanel title="Aniversariantes de hoje" allowPatientWhatsApp className="social-birthdays" />
        </>
      )}

      <section
        id="acompanhamento-social"
        className="social-modules social-followups"
        aria-labelledby="followups-title"
      >
        <div className="social-section-heading">
          <div>
            <p className="eyebrow">Continuidade do cuidado</p>
            <h2 id="followups-title">Acompanhamento Social no Serviço CAPO</h2>
          </div>
          <p>Registros ativos e encerrados consultados no backend oficial.</p>
        </div>
        {canOperateSocial && selectedAppointment && (
          <div className="social-followup-form">
            <strong>Paciente confirmado na agenda: {selectedAppointment.patient_name}</strong>
            <PatientCareSpecialties key={selectedAppointment.patient_id} patientId={selectedAppointment.patient_id} />
            <PatientDischargeProximityIndicator patientId={selectedAppointment.patient_id} />
            <RegisterPatientDeath key={selectedAppointment.patient_id} patientId={selectedAppointment.patient_id} patientName={selectedAppointment.patient_name} />
            <p>O acompanhamento será vinculado ao agendamento confirmado e ao ciclo CAPO correspondente.</p>
            <button type="button" disabled={busy} onClick={() => void startSocial()}>
              Iniciar acompanhamento social
            </button>
            <fieldset>
              <legend>Vulnerabilidade — indicador operacional</legend>
              <label>
                Nível
                <select
                  value={vulnerabilityLevel}
                  onChange={(event) =>
                    setVulnerabilityLevel(
                      event.target.value as 'verde' | 'amarelo' | 'vermelho',
                    )
                  }
                >
                  <option value="verde">Verde</option>
                  <option value="amarelo">Amarelo</option>
                  <option value="vermelho">Vermelho</option>
                </select>
              </label>
              <button type="button" disabled={busy} onClick={() => void saveVulnerability()}>
                Salvar indicador
              </button>
              {vulnerabilityFeedback && <p role="status">{vulnerabilityFeedback}</p>}
            </fieldset>
          </div>
        )}
        {social.status === 'loading' && <p>Carregando acompanhamentos sociais...</p>}
        {social.status === 'empty' && (
          <p>Nenhum acompanhamento social encontrado.</p>
        )}
        {social.status === 'error' && (
          <p className="social-error" role="alert">
            {social.error.message}
          </p>
        )}
        {feedback && <p role="status">{feedback}</p>}
        {social.status === 'success' && (
          <div className="social-followup-groups">
            {(['ativo', 'encerrado'] as const).map((groupStatus) => {
              const items = social.data.filter(
                (item) => String(item.status ?? '').toLowerCase() === groupStatus,
              )
              return (
                <section key={groupStatus} aria-labelledby={`${groupStatus}-title`}>
                  <h3 id={`${groupStatus}-title`}>
                    {groupStatus === 'ativo' ? 'Ativos' : 'Encerrados'}
                  </h3>
                  {items.length === 0 ? (
                    <p>Nenhum registro real encontrado.</p>
                  ) : (
                    <div className="social-followup-list">
                      {items.map((item, index) => {
                        const cycleId = String(item.cycle_id ?? item.id ?? index)
                        return (
                          <article className="social-followup" key={cycleId}>
                            <h4>
                              {String(item.patient_name ?? item.full_name ?? 'Paciente')}
                            </h4>
                            <p>Status: {String(item.status ?? '—')}</p>
                            {canOperateSocial && groupStatus === 'ativo' && (
                              <button
                                type="button"
                                disabled={busy || reason.trim().length < 5}
                                onClick={() => void closeSocial(item)}
                              >
                                Encerrar acompanhamento
                              </button>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </section>

    </section>
  )
}
