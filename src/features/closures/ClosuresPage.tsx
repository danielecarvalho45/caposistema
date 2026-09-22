import { useCallback, useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { loadingState, type AsyncState } from '../../lib/supabase/rpc'
import {
  createClosuresIntegration,
  type CareClosure,
  type ClosuresIntegration,
  type SocialFollowup,
} from './closures-integration'
import './closures-page.css'

const defaultIntegration = createClosuresIntegration()

function value(item: Readonly<Record<string, unknown>>, ...keys: string[]) {
  for (const key of keys) {
    const current = item[key]
    if (current !== null && current !== undefined && current !== '')
      return String(current)
  }
  return '—'
}

function errorOf<T>(state: AsyncState<T>) {
  return state.status === 'error' ? state.error.message : null
}

export function ClosuresPage({
  accessContext,
  integration = defaultIntegration,
}: Readonly<{
  accessContext: AccessContext
  integration?: ClosuresIntegration
}>) {
  const [view, setView] = useState<'closures' | 'social'>('closures')
  const [status, setStatus] = useState('')
  const [closures, setClosures] =
    useState<AsyncState<readonly CareClosure[]>>(loadingState)
  const [social, setSocial] =
    useState<AsyncState<readonly SocialFollowup[]>>(loadingState)
  const [selected, setSelected] = useState<CareClosure | null>(null)
  const [eligible, setEligible] = useState<AsyncState<readonly CareClosure[]>>({
    status: 'empty',
  })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [patientId, setPatientId] = useState('')
  const [specialtyId, setSpecialtyId] = useState('')
  const [reason, setReason] = useState('')
  const [professionalId, setProfessionalId] = useState('')

  const canManage = accessContext.roles.some((role) =>
    ['administrador', 'coordenador', 'administrativo_operacional'].includes(
      role.code,
    ),
  )
  const canRequest = Boolean(accessContext.professional_id)
  const closureId = selected ? value(selected, 'closure_id', 'id') : ''
  const reload = useCallback(async () => {
    const result = await integration.loadClosures(status || null)
    setClosures(result)
    if (result.status !== 'success') setSelected(null)
  }, [integration, status])

  useEffect(() => {
    let active = true
    void integration.loadClosures(status || null).then((result) => {
      if (!active) return
      setClosures(result)
      if (result.status !== 'success') setSelected(null)
    })
    return () => {
      active = false
    }
  }, [integration, status])
  useEffect(() => {
    if (view !== 'social') return
    void integration.loadSocial(null).then(setSocial)
  }, [integration, view])
  useEffect(() => {
    if (!selected || !canManage) return
    void integration
      .loadEligibleProfessionals(value(selected, 'closure_id', 'id'))
      .then(setEligible)
  }, [canManage, integration, selected])

  async function run(
    action: () => Promise<AsyncState<Readonly<Record<string, unknown>>>>,
    success: string,
  ) {
    setBusy(true)
    setFeedback(null)
    const result = await action()
    if (result.status === 'success') {
      setFeedback(success)
      await reload()
      if (view === 'social') setSocial(await integration.loadSocial(null))
    } else setFeedback(errorOf(result))
    setBusy(false)
  }

  return (
    <section className="closures-page" aria-labelledby="closures-title">
      <header className="closures-header">
        <div>
          <p className="eyebrow">Continuidade do cuidado</p>
          <h1 id="closures-title">Encerramentos e ciclos</h1>
          <p>
            Atuações individualizadas, acompanhamento social e retorno do ciclo,
            sempre consultados no backend oficial.
          </p>
        </div>
        <span className="closures-connection">Conexão — Disponível</span>
      </header>
      <nav className="closures-tabs" aria-label="Visões de encerramentos">
        <button
          type="button"
          aria-pressed={view === 'closures'}
          onClick={() => setView('closures')}
        >
          Encerramentos
        </button>
        <button
          type="button"
          aria-pressed={view === 'social'}
          onClick={() => setView('social')}
        >
          Acompanhamento social
        </button>
      </nav>
      {feedback && (
        <p className="closures-feedback" role="status">
          {feedback}
        </p>
      )}
      {view === 'closures' ? (
        <>
          <section
            className="closures-toolbar"
            aria-label="Filtros de encerramentos"
          >
            <label>
              Status
              <select
                value={status}
                onChange={(event) => {
                  setClosures(loadingState())
                  setStatus(event.target.value)
                }}
              >
                <option value="">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="encerrado">Encerrados</option>
                <option value="reaberto">Reabertos</option>
              </select>
            </label>
          </section>
          <section className="closures-layout">
            <div className="closures-list" aria-label="Lista de encerramentos">
              {closures.status === 'loading' && (
                <p>Carregando encerramentos...</p>
              )}
              {closures.status === 'empty' && (
                <p>Nenhum encerramento encontrado.</p>
              )}
              {closures.status === 'error' && (
                <p role="alert">{closures.error.message}</p>
              )}
              {closures.status === 'success' &&
                closures.data.map((item, index) => (
                  <button
                    type="button"
                    className="closure-row"
                    key={value(item, 'closure_id', 'id', String(index))}
                    onClick={() => setSelected(item)}
                  >
                    <strong>{value(item, 'patient_name', 'full_name')}</strong>
                    <span>{value(item, 'specialty_name', 'specialty')}</span>
                    <em>{value(item, 'status')}</em>
                  </button>
                ))}
            </div>
            <div className="closures-detail">
              <h2>Detalhe e ações autorizadas</h2>
              {selected ? (
                <>
                  <dl>
                    <div>
                      <dt>Paciente</dt>
                      <dd>{value(selected, 'patient_name', 'full_name')}</dd>
                    </div>
                    <div>
                      <dt>Especialidade</dt>
                      <dd>{value(selected, 'specialty_name', 'specialty')}</dd>
                    </div>
                    <div>
                      <dt>Profissional</dt>
                      <dd>
                        {value(
                          selected,
                          'professional_name',
                          'responsible_professional_name',
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>{value(selected, 'status')}</dd>
                    </div>
                    <div>
                      <dt>Início</dt>
                      <dd>{value(selected, 'started_at', 'created_at')}</dd>
                    </div>
                    <div>
                      <dt>Encerramento</dt>
                      <dd>{value(selected, 'closed_at', 'ended_at')}</dd>
                    </div>
                  </dl>
                  {canManage && (
                    <label>
                      Profissional elegível
                      <select
                        value={professionalId}
                        onChange={(event) =>
                          setProfessionalId(event.target.value)
                        }
                      >
                        <option value="">Selecione no contrato</option>
                        {eligible.status === 'success' &&
                          eligible.data.map((item, index) => (
                            <option
                              key={value(
                                item,
                                'professional_id',
                                'id',
                                String(index),
                              )}
                              value={value(item, 'professional_id', 'id')}
                            >
                              {value(item, 'professional_name', 'full_name')}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <div className="closures-actions">
                    {value(selected, 'status') === 'pendente' && canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              integration.closeClosure(
                                closureId,
                                reason.trim(),
                              ),
                            'Encerramento concluído e recarregado do backend.',
                          )
                        }
                      >
                        Concluir encerramento
                      </button>
                    )}
                    {value(selected, 'status') === 'encerrado' && canManage && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () =>
                              integration.reopenClosure(
                                closureId,
                                reason.trim(),
                              ),
                            'Encerramento reaberto e recarregado do backend.',
                          )
                        }
                      >
                        Reabrir encerramento
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        disabled={busy || !professionalId}
                        onClick={() =>
                          run(
                            () =>
                              integration.assignProfessional(
                                closureId,
                                professionalId,
                                false,
                              ),
                            'Profissional atribuído e recarregado do backend.',
                          )
                        }
                      >
                        Atribuir profissional
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p>
                  Selecione um encerramento para consultar detalhes e ações
                  autorizadas.
                </p>
              )}
              {selected && (
                <label>
                  Motivo / observação
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              )}
            </div>
          </section>
          {canRequest && (
            <form
              className="closures-request"
              onSubmit={(event) => {
                event.preventDefault()
                void run(
                  () =>
                    integration.requestOwnClosure(
                      patientId.trim(),
                      specialtyId.trim(),
                      reason.trim(),
                    ),
                  'Solicitação registrada e recarregada do backend.',
                )
              }}
            >
              <h2>Solicitar encerramento da própria especialidade</h2>
              <label>
                ID do paciente
                <input
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  required
                />
              </label>
              <label>
                ID da especialidade
                <input
                  value={specialtyId}
                  onChange={(event) => setSpecialtyId(event.target.value)}
                  required
                />
              </label>
              <label>
                Motivo
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  minLength={5}
                />
              </label>
              <button type="submit" disabled={busy}>
                Solicitar encerramento
              </button>
            </form>
          )}
          {canManage && (
            <form
              className="closures-request"
              onSubmit={(event) => {
                event.preventDefault()
                void run(
                  () =>
                    integration.openReturnCycle(
                      patientId.trim(),
                      reason.trim(),
                    ),
                  'Novo ciclo de retorno aberto e recarregado do backend.',
                )
              }}
            >
              <h2>Abrir ciclo de retorno</h2>
              <label>
                ID do paciente
                <input
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  required
                />
              </label>
              <label>
                Motivo de abertura
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  required
                  minLength={5}
                />
              </label>
              <button type="submit" disabled={busy}>
                Abrir ciclo de retorno
              </button>
            </form>
          )}
        </>
      ) : (
        <section className="closures-social">
          <h2>Acompanhamento social</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void run(
                () => integration.startSocial(patientId.trim(), reason.trim()),
                'Acompanhamento social iniciado e recarregado do backend.',
              )
            }}
          >
            <label>
              ID do ciclo
              <input
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                required
              />
            </label>
            <label>
              Motivo de abertura
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={5}
              />
            </label>
            <button type="submit" disabled={busy}>
              Iniciar acompanhamento social
            </button>
          </form>
          {social.status === 'loading' && (
            <p>Carregando acompanhamentos sociais...</p>
          )}
          {social.status === 'empty' && (
            <p>Nenhum acompanhamento social encontrado.</p>
          )}
          {social.status === 'error' && (
            <p role="alert">{social.error.message}</p>
          )}
          {social.status === 'success' &&
            social.data.map((item, index) => (
              <article key={value(item, 'cycle_id', 'id', String(index))}>
                <h3>{value(item, 'patient_name', 'full_name')}</h3>
                <p>Status: {value(item, 'status')}</p>
                {canManage && value(item, 'status') === 'ativo' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          integration.closeSocial(
                            value(item, 'cycle_id', 'id'),
                            reason.trim(),
                          ),
                        'Acompanhamento social encerrado e recarregado do backend.',
                      )
                    }
                  >
                    Encerrar acompanhamento
                  </button>
                )}
              </article>
            ))}
        </section>
      )}
    </section>
  )
}
