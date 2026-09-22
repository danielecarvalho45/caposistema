import { useEffect, useState, type FormEvent } from 'react'
import type { AccessContext } from '../../types/access'
import { loadingState, type AsyncState } from '../../lib/supabase/rpc'
import { AgendaPage } from '../agenda/AgendaPage'
import {
  createClosuresIntegration,
  type SocialFollowup,
} from '../closures/closures-integration'
import './social-page.css'

const defaultIntegration = createClosuresIntegration()

const pendingModules = [
  ['vulnerabilidade', 'Vulnerabilidade', 'Nenhum contrato social disponível.'],
  ['familiar-cuidador', 'Familiar / Cuidador', 'Nenhum contrato de vínculo disponível.'],
  ['luto', 'Luto', 'Nenhum contrato de acompanhamento disponível.'],
  ['registro-obito', 'Registro Autorizado de Óbito', 'Nenhum contrato autorizado disponível.'],
  ['transporte', 'Transporte', 'Usar o módulo oficial quando autorizado.'],
  ['solicitacoes', 'Solicitações', 'Usar o fluxo canônico de Solicitações.'],
  ['encaminhamentos', 'Encaminhamentos', 'Usar o fluxo canônico de Encaminhamentos.'],
  ['relatorios', 'Relatórios', 'Nenhum relatório social contratado.'],
] as const

export function SocialPage({
  accessContext,
  integration = defaultIntegration,
}: Readonly<{
  accessContext: AccessContext
  integration?: ReturnType<typeof createClosuresIntegration>
}>) {
  const [social, setSocial] =
    useState<AsyncState<readonly SocialFollowup[]>>(loadingState)
  const [cycleId, setCycleId] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const canOperateSocial =
    accessContext.is_active &&
    Boolean(accessContext.professional_id) &&
    accessContext.roles.some((role) => role.code === 'profissional')

  useEffect(() => {
    void integration.loadSocial(null).then(setSocial)
  }, [integration])

  async function reloadSocial() {
    setSocial(await integration.loadSocial(null))
  }

  async function closeSocial(item: SocialFollowup) {
    const cycleId = String(item.cycle_id ?? item.id ?? '')
    if (!cycleId || reason.trim().length < 5 || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await integration.closeSocial(cycleId, reason.trim())
    if (result.status === 'success') {
      setFeedback('Acompanhamento social encerrado e recarregado do backend.')
      setReason('')
      await reloadSocial()
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
      setFeedback('Acompanhamento social iniciado e recarregado do backend.')
      setCycleId('')
      setReason('')
      await reloadSocial()
    } else if (result.status === 'error') {
      setFeedback(result.error.message)
    }
    setBusy(false)
  }

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
        <span className="social-connection">
          Conexão verificada a cada consulta
        </span>
      </header>

      <section className="social-quick-access" aria-labelledby="quick-title">
        <h2 id="quick-title">Acessos rápidos</h2>
        <div className="social-quick-grid">
          <a
            className="social-quick-card social-quick-card--agenda"
            href="#agenda"
          >
            <strong>Minha Agenda</strong>
            <span>Dia, semana e mês</span>
          </a>
          <a
            className="social-quick-card social-quick-card--followup"
            href="#acompanhamento-social"
          >
            <strong>Acompanhamento Social no Serviço CAPO</strong>
            <span>Ativos e encerrados</span>
          </a>
          <a
            className="social-quick-card social-quick-card--family"
            href="/familiar-cuidador"
          >
            <strong>Familiar / Cuidador</strong>
            <span>Vínculo ativo e histórico</span>
          </a>
          <a
            className="social-quick-card social-quick-card--requests"
            href="#solicitacoes"
          >
            <strong>Solicitações</strong>
            <span>Providências operacionais</span>
          </a>
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
            <p className="eyebrow">Construção controlada</p>
            <h2 id="modules-title">Fluxos autorizados</h2>
          </div>
          <p>
            Sem dados reais disponíveis, cada módulo permanece em estado vazio.
          </p>
        </div>
        <div className="social-module-grid">
          {pendingModules.map(([id, title, detail]) => (
            <article
              id={id}
              className="social-module"
              key={title}
            >
              <h3>{title}</h3>
              <p>{detail}</p>
              <span className="social-empty">Nenhum registro encontrado.</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
