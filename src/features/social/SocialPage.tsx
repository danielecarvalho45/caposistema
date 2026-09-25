import { useEffect, useState, type FormEvent } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, loadingState, type AsyncState } from '../../lib/supabase/rpc'
import { AgendaPage } from '../agenda/AgendaPage'
import {
  createClosuresIntegration,
  type SocialFollowup,
} from '../closures/closures-integration'
import './social-page.css'
import { Link } from 'react-router-dom'
import { canAccessAppRoute, type AppRoute } from '../../app/route-access'

const defaultIntegration = createClosuresIntegration()
const defaultSpecialtiesLoader = () => getRpcService().getMyAssistentialSpecialties()

const relatedModules: readonly { path: AppRoute; title: string }[] = [
  { path: '/luto', title: 'Luto' },
  { path: '/transporte', title: 'Transporte' },
  { path: '/encaminhamentos', title: 'Encaminhamentos' },
  { path: '/relatorios', title: 'Relatórios' },
]

export function SocialPage({
  accessContext,
  integration = defaultIntegration,
  loadSpecialties = defaultSpecialtiesLoader,
}: Readonly<{
  accessContext: AccessContext
  integration?: ReturnType<typeof createClosuresIntegration>
  loadSpecialties?: typeof defaultSpecialtiesLoader
}>) {
  const [socialSpecialtyFor, setSocialSpecialtyFor] = useState<string | null>(null)
  const [social, setSocial] =
    useState<AsyncState<readonly SocialFollowup[]>>(loadingState)
  const [cycleId, setCycleId] = useState('')
  const [reason, setReason] = useState('')
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

  async function startSocial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cycleId.trim() || reason.trim().length < 5 || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await integration.startSocial(cycleId.trim(), reason.trim())
    if (result.status === 'success') {
      const reloaded = await reloadSocial()
      if (reloaded.status === 'success' || reloaded.status === 'empty') {
        setFeedback('Acompanhamento social iniciado e recarregado do backend.')
        setCycleId('')
        setReason('')
      } else setFeedback('A operação foi recebida, mas a atualização do acompanhamento falhou.')
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setBusy(false)
  }

  if (!canOperateSocial) return <section className="social-page"><h1>Assistência Social indisponível</h1><p>É necessário vínculo profissional ativo com a especialidade Assistência Social autorizada.</p></section>

  return (
    <section className="social-page" aria-labelledby="social-title">
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

      <section className="social-quick-access" aria-labelledby="quick-title">
        <h2 id="quick-title">Acessos rápidos</h2>
        <div className="social-quick-grid">
          <a className="social-quick-card social-quick-card--agenda" href="#agenda"><strong>Minha Agenda</strong><span>Dia, semana e mês</span></a>
          <a className="social-quick-card social-quick-card--followup" href="#acompanhamento-social"><strong>Acompanhamento Social no Serviço CAPO</strong><span>Ativos e encerrados</span></a>
          <Link className="social-quick-card social-quick-card--family" to="/familiar-cuidador"><strong>Familiar / Cuidador</strong><span>Vínculo ativo e histórico</span></Link>
          <Link className="social-quick-card social-quick-card--requests" to="/solicitacoes"><strong>Solicitações</strong><span>Providências operacionais</span></Link>
        </div>
      </section>

      <section
        id="agenda"
        className="social-agenda"
        aria-labelledby="agenda-title"
      >
        <div className="social-section-heading">
          <div>
            <p className="eyebrow">Atendimento</p>
            <h2 id="agenda-title">Minha Agenda</h2>
          </div>
          <span className="social-section-note">
            Faltosos seguem fluxo próprio
          </span>
        </div>
        <AgendaPage accessContext={accessContext} />
      </section>

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
        {canOperateSocial && (
          <form className="social-followup-form" onSubmit={startSocial}>
            <label>
              ID do ciclo
              <input
                value={cycleId}
                onChange={(event) => setCycleId(event.target.value)}
                required
              />
            </label>
            <label>
              Motivo de abertura
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                required
              />
            </label>
            <button type="submit" disabled={busy || reason.trim().length < 5}>
              Iniciar acompanhamento social
            </button>
          </form>
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

      <section className="social-modules" aria-labelledby="modules-title">
        <div className="social-section-heading">
          <div>
            <p className="eyebrow">Acompanhamento</p>
            <h2 id="modules-title">Fluxos autorizados</h2>
          </div>
          <p>Abrir o módulo correspondente para consultar os registros autorizados.</p>
        </div>
        <div className="social-module-grid">
          {relatedModules.filter(({ path }) => canAccessAppRoute(accessContext, path)).map(({ path, title }) => (
            <Link className="social-module" to={path} key={path}><h3>{title}</h3><span>Abrir fluxo</span></Link>
          ))}
        </div>
      </section>
    </section>
  )
}
