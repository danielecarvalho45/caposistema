import { useCallback, useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import {
  getRpcService,
  loadingState,
  type AssistentialPatient,
  type AssistentialSpecialty,
  type AsyncState,
  type ReferralPatient,
} from '../../lib/supabase/rpc'
import {
  createClosuresIntegration,
  type CareClosure,
  type ClosuresIntegration,
} from './closures-integration'
import './closures-page.css'

const defaultIntegration = createClosuresIntegration()

function textValue(item: Readonly<Record<string, unknown>>, ...keys: string[]) {
  for (const key of keys) {
    const current = item[key]
    if (current !== null && current !== undefined && current !== '') {
      return String(current)
    }
  }
  return '—'
}

function booleanValue(item: Readonly<Record<string, unknown>>, key: string) {
  return item[key] === true
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
  const [status, setStatus] = useState('')
  const [closures, setClosures] =
    useState<AsyncState<readonly CareClosure[]>>(loadingState)
  const [selected, setSelected] = useState<CareClosure | null>(null)
  const [eligible, setEligible] = useState<AsyncState<readonly CareClosure[]>>({
    status: 'empty',
  })
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [professionalId, setProfessionalId] = useState('')

  const [ownPatientQuery, setOwnPatientQuery] = useState('')
  const [ownPatients, setOwnPatients] = useState<readonly AssistentialPatient[]>([])
  const [ownPatientId, setOwnPatientId] = useState('')
  const [ownSpecialties, setOwnSpecialties] = useState<readonly AssistentialSpecialty[]>([])
  const [ownSpecialtyId, setOwnSpecialtyId] = useState('')
  const [ownReason, setOwnReason] = useState('')

  const [returnPatientQuery, setReturnPatientQuery] = useState('')
  const [returnPatients, setReturnPatients] = useState<readonly ReferralPatient[]>([])
  const [returnPatientId, setReturnPatientId] = useState('')
  const [returnReason, setReturnReason] = useState('')

  const hasRole = (code: string) =>
    accessContext.roles.some((role) => role.code === code)
  const canAdministrativeAction =
    hasRole('administrador') || hasRole('administrativo_operacional')
  const isProfessional =
    Boolean(accessContext.professional_id) && hasRole('profissional')

  const closureId = selected ? textValue(selected, 'closure_id', 'id') : ''

  const reload = useCallback(async () => {
    const result = await integration.loadClosures(status || null)
    setClosures(result)
    if (result.status !== 'success') {
      setSelected(null)
      return result
    }
    setSelected((current) => {
      if (!current) return null
      const id = textValue(current, 'closure_id', 'id')
      return result.data.find((item) => textValue(item, 'closure_id', 'id') === id) ?? null
    })
    return result
  }, [integration, status])

  useEffect(() => {
    let active = true
    setClosures(loadingState())
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
    if (!selected || !canAdministrativeAction) {
      setEligible({ status: 'empty' })
      return
    }
    void integration
      .loadEligibleProfessionals(textValue(selected, 'closure_id', 'id'))
      .then(setEligible)
  }, [canAdministrativeAction, integration, selected])

  useEffect(() => {
    if (!isProfessional) return
    let active = true
    void getRpcService().getMyAssistentialSpecialties().then((result) => {
      if (!active) return
      if (result.status === 'success') {
        setOwnSpecialties(result.data)
        if (result.data.length === 1) setOwnSpecialtyId(result.data[0].specialty_id)
      } else if (result.status === 'error') {
        setFeedback(result.error.message)
      }
    })
    return () => {
      active = false
    }
  }, [isProfessional])

  async function run(
    action: () => Promise<AsyncState<Readonly<Record<string, unknown>>>>,
    success: string,
  ) {
    if (busy) return
    setBusy(true)
    setFeedback(null)
    const result = await action()
    if (result.status === 'success') {
      setFeedback(success)
      setActionReason('')
      await reload()
    } else {
      setFeedback(errorOf(result) ?? 'O banco não confirmou a operação.')
    }
    setBusy(false)
  }

  async function searchOwnPatients() {
    const query = ownPatientQuery.trim()
    if (query.length < 2) {
      setFeedback('Informe nome, Nº CAPO ou CMS com pelo menos dois caracteres.')
      return
    }
    const result = await getRpcService().searchMyAssistentialPatients(query, 20, 0)
    if (result.status === 'success') {
      setOwnPatients(result.data)
      setFeedback(result.data.length ? null : 'Nenhum paciente vinculado encontrado.')
    } else {
      setOwnPatients([])
      setFeedback(result.status === 'error' ? result.error.message : 'Nenhum paciente vinculado encontrado.')
    }
  }

  async function requestOwnClosure() {
    if (!ownPatientId || !ownSpecialtyId || ownReason.trim().length < 5 || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await integration.requestOwnClosure(
      ownPatientId,
      ownSpecialtyId,
      ownReason.trim(),
    )
    if (result.status === 'success') {
      setFeedback('Solicitação de encerramento da própria atuação registrada.')
      setOwnPatientQuery('')
      setOwnPatients([])
      setOwnPatientId('')
      setOwnReason('')
      await reload()
    } else {
      setFeedback(errorOf(result) ?? 'O banco não confirmou a solicitação.')
    }
    setBusy(false)
  }

  async function searchReturnPatients() {
    const query = returnPatientQuery.trim()
    if (query.length < 2) {
      setFeedback('Informe nome, Nº CAPO ou CMS com pelo menos dois caracteres.')
      return
    }
    const result = await getRpcService().searchReferralPatients(query, 20, 0)
    if (result.status === 'success') {
      setReturnPatients(result.data)
      setFeedback(result.data.length ? null : 'Nenhum paciente encontrado.')
    } else {
      setReturnPatients([])
      setFeedback(result.status === 'error' ? result.error.message : 'Nenhum paciente encontrado.')
    }
  }

  async function openReturnCycle() {
    if (!returnPatientId || returnReason.trim().length < 5 || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await integration.openReturnCycle(
      returnPatientId,
      returnReason.trim(),
    )
    if (result.status === 'success') {
      setFeedback('Ciclo de retorno confirmado pelo banco.')
      setReturnPatientQuery('')
      setReturnPatients([])
      setReturnPatientId('')
      setReturnReason('')
      await reload()
    } else {
      setFeedback(errorOf(result) ?? 'O banco não confirmou o ciclo de retorno.')
    }
    setBusy(false)
  }

  return (
    <section className="closures-page" aria-labelledby="closures-title">
      <header className="closures-header">
        <div>
          <p className="eyebrow">Continuidade do cuidado</p>
          <h1 id="closures-title">Encerramentos por especialidade</h1>
          <p>
            Encerramento individualizado da própria atuação, acompanhamento
            administrativo e reabertura com histórico preservado.
          </p>
        </div>
        <span className="closures-connection">Conexão — Disponível</span>
      </header>

      {feedback && (
        <p className="closures-feedback" role="status">
          {feedback}
        </p>
      )}

      <section className="closures-toolbar" aria-label="Filtros de encerramentos">
        <label>
          Status
          <select
            value={status}
            onChange={(event) => {
              setSelected(null)
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
          {closures.status === 'loading' && <p>Carregando encerramentos...</p>}
          {closures.status === 'empty' && <p>Nenhum encerramento encontrado.</p>}
          {closures.status === 'error' && <p role="alert">{closures.error.message}</p>}
          {closures.status === 'success' &&
            closures.data.map((item, index) => (
              <button
                type="button"
                className="closure-row"
                key={textValue(item, 'closure_id', 'id', String(index))}
                onClick={() => {
                  setSelected(item)
                  setProfessionalId('')
                  setActionReason('')
                }}
              >
                <strong>{textValue(item, 'patient_name', 'full_name')}</strong>
                <span>{textValue(item, 'specialty_name', 'specialty')}</span>
                <em>{textValue(item, 'status')}</em>
              </button>
            ))}
        </div>

        <div className="closures-detail">
          <h2>Detalhe e ações autorizadas</h2>
          {selected ? (
            <>
              <dl>
                <div><dt>Paciente</dt><dd>{textValue(selected, 'patient_name', 'full_name')}</dd></div>
                <div><dt>Nº CAPO</dt><dd>{textValue(selected, 'patient_number')}</dd></div>
                <div><dt>CMS</dt><dd>{textValue(selected, 'cms')}</dd></div>
                <div><dt>Especialidade</dt><dd>{textValue(selected, 'specialty_name', 'specialty')}</dd></div>
                <div><dt>Profissional</dt><dd>{textValue(selected, 'professional_name')}</dd></div>
                <div><dt>Status</dt><dd>{textValue(selected, 'status')}</dd></div>
                <div><dt>Início</dt><dd>{textValue(selected, 'initiated_at', 'created_at')}</dd></div>
                <div><dt>Encerramento</dt><dd>{textValue(selected, 'closed_at')}</dd></div>
              </dl>

              {(booleanValue(selected, 'can_close') ||
                booleanValue(selected, 'can_reopen')) && (
                <label>
                  Motivo / observação
                  <textarea
                    value={actionReason}
                    onChange={(event) => setActionReason(event.target.value)}
                    minLength={5}
                    maxLength={1000}
                  />
                </label>
              )}

              {canAdministrativeAction &&
                textValue(selected, 'status') === 'pendente' &&
                textValue(selected, 'professional_id') === '—' && (
                  <label>
                    Profissional elegível
                    <select
                      value={professionalId}
                      onChange={(event) => setProfessionalId(event.target.value)}
                    >
                      <option value="">Selecionar profissional</option>
                      {eligible.status === 'success' &&
                        eligible.data.map((item, index) => (
                          <option
                            key={textValue(item, 'professional_id', 'id', String(index))}
                            value={textValue(item, 'professional_id', 'id')}
                          >
                            {textValue(item, 'professional_name', 'full_name')}
                          </option>
                        ))}
                    </select>
                  </label>
                )}

              <div className="closures-actions">
                {booleanValue(selected, 'can_close') && (
                  <button
                    type="button"
                    disabled={busy || actionReason.trim().length < 5}
                    onClick={() =>
                      void run(
                        () => integration.closeClosure(closureId, actionReason.trim()),
                        'Encerramento da própria atuação concluído.',
                      )
                    }
                  >
                    Concluir meu encerramento
                  </button>
                )}

                {canAdministrativeAction && booleanValue(selected, 'can_reopen') && (
                  <button
                    type="button"
                    disabled={busy || actionReason.trim().length < 5}
                    onClick={() =>
                      void run(
                        () => integration.reopenClosure(closureId, actionReason.trim()),
                        'Encerramento reaberto com histórico preservado.',
                      )
                    }
                  >
                    Reabrir encerramento
                  </button>
                )}

                {canAdministrativeAction &&
                  textValue(selected, 'status') === 'pendente' &&
                  textValue(selected, 'professional_id') === '—' && (
                    <button
                      type="button"
                      disabled={busy || !professionalId}
                      onClick={() =>
                        void run(
                          () => integration.assignProfessional(
                            closureId,
                            professionalId,
                            false,
                          ),
                          'Profissional responsável atribuído.',
                        )
                      }
                    >
                      Atribuir profissional
                    </button>
                  )}
              </div>
            </>
          ) : (
            <p>Selecione um encerramento para consultar detalhes e ações autorizadas.</p>
          )}
        </div>
      </section>

      {isProfessional && (
        <section className="closures-request" aria-labelledby="own-closure-title">
          <h2 id="own-closure-title">Encerrar minha atuação</h2>
          <p>
            A solicitação é limitada ao paciente e à especialidade em que o
            profissional possui atuação efetiva.
          </p>
          <label>
            Paciente
            <input
              value={ownPatientQuery}
              onChange={(event) => setOwnPatientQuery(event.target.value)}
              placeholder="Nome, Nº CAPO ou CMS"
            />
          </label>
          <button
            type="button"
            disabled={busy || ownPatientQuery.trim().length < 2}
            onClick={() => void searchOwnPatients()}
          >
            Buscar paciente
          </button>
          {ownPatients.length > 0 && (
            <select value={ownPatientId} onChange={(event) => setOwnPatientId(event.target.value)}>
              <option value="">Selecionar paciente</option>
              {ownPatients.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {patient.full_name}{patient.patient_number ? ` · Nº CAPO ${patient.patient_number}` : patient.cms ? ` · CMS ${patient.cms}` : ''}
                </option>
              ))}
            </select>
          )}
          <label>
            Minha especialidade
            <select value={ownSpecialtyId} onChange={(event) => setOwnSpecialtyId(event.target.value)}>
              <option value="">Selecionar especialidade</option>
              {ownSpecialties.map((specialty) => (
                <option key={specialty.specialty_id} value={specialty.specialty_id}>
                  {specialty.specialty_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Motivo / observação
            <textarea
              value={ownReason}
              onChange={(event) => setOwnReason(event.target.value)}
              minLength={5}
              maxLength={1000}
            />
          </label>
          <button
            type="button"
            disabled={busy || !ownPatientId || !ownSpecialtyId || ownReason.trim().length < 5}
            onClick={() => void requestOwnClosure()}
          >
            Solicitar encerramento da própria atuação
          </button>
        </section>
      )}

      {canAdministrativeAction && (
        <section className="closures-request" aria-labelledby="return-cycle-title">
          <h2 id="return-cycle-title">Abrir novo ciclo de retorno</h2>
          <p>
            Disponível somente quando o paciente já possui ciclo anterior
            encerrado e não existe ciclo CAPO aberto.
          </p>
          <label>
            Paciente
            <input
              value={returnPatientQuery}
              onChange={(event) => setReturnPatientQuery(event.target.value)}
              placeholder="Nome, Nº CAPO ou CMS"
            />
          </label>
          <button
            type="button"
            disabled={busy || returnPatientQuery.trim().length < 2}
            onClick={() => void searchReturnPatients()}
          >
            Buscar paciente
          </button>
          {returnPatients.length > 0 && (
            <select value={returnPatientId} onChange={(event) => setReturnPatientId(event.target.value)}>
              <option value="">Selecionar paciente</option>
              {returnPatients.map((patient) => (
                <option key={patient.patient_id} value={patient.patient_id}>
                  {patient.full_name}{patient.patient_number ? ` · Nº CAPO ${patient.patient_number}` : patient.cms ? ` · CMS ${patient.cms}` : ''}
                </option>
              ))}
            </select>
          )}
          <label>
            Motivo de abertura
            <textarea
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              minLength={5}
              maxLength={500}
            />
          </label>
          <button
            type="button"
            disabled={busy || !returnPatientId || returnReason.trim().length < 5}
            onClick={() => void openReturnCycle()}
          >
            Abrir ciclo de retorno
          </button>
        </section>
      )}
    </section>
  )
}
