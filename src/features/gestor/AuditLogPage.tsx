import { useState } from 'react'
import { AsyncStateView } from '../../components/feedback/AsyncStateView'
import { getRpcService, type AsyncState } from '../../lib/supabase/rpc'
import './audit-log-page.css'

type AuditLogService = Pick<ReturnType<typeof getRpcService>, 'getAuditLogs'>

// Códigos e rótulos da função oficial capo_audit_entity_label().
const areas = [
  ['administrative_requests', 'Solicitações Administrativas'],
  ['agenda_blocks', 'Agenda — Bloqueios'],
  ['agenda_configs', 'Configuração de Agenda'],
  ['agenda_exceptions', 'Agenda — Exceções'],
  ['agenda_weekdays', 'Agenda — Dias da Semana'],
  ['dentistry_referral_events', 'Odontologia — Eventos'],
  ['family_bereavement_cycles', 'Assistência Social — Luto'],
  ['family_members', 'Familiares'],
  ['legal_terms', 'Termos Legais'],
  ['nutrition_document_deliveries', 'Nutrição — Entregas'],
  ['nutrition_plan_documents', 'Nutrição — Documentos'],
  ['nutrition_plans', 'Nutrição — Planos'],
  ['nutrition_vulnerability_alerts', 'Nutrição — Alertas Operacionais'],
  ['patient_active_searches', 'Busca Ativa'],
  ['patient_appointments', 'Agendamentos'],
  ['patient_care_closures', 'Encerramentos'],
  ['patient_care_cycles', 'Ciclos CAPO'],
  ['patient_care_cycle_specialties', 'Ciclos CAPO — Especialidades'],
  ['patient_care_closure_rounds', 'Ciclos CAPO — Encerramento Clínico'],
  ['patient_family_links', 'Vínculos Familiares'],
  ['patient_reopening_requests', 'Reaberturas'],
  ['patient_timeline', 'Linha do Tempo'],
  ['patients', 'Pacientes'],
  ['prescription_renewal_events', 'Renovação de Receita — Eventos'],
  ['professionals', 'Profissionais'],
  ['referrals', 'Encaminhamentos'],
  ['social_followup_cycles', 'Acompanhamento Social — Ciclos'],
  ['social_vulnerability_indicators', 'Assistência Social — Vulnerabilidade Operacional'],
  ['specialty_capabilities', 'Especialidades — Capacidades Institucionais'],
  ['transport_need_cycles', 'Transporte — Necessidade'],
  ['transport_requests', 'Transporte — Solicitações'],
  ['user_roles', 'Perfis de Usuário'],
  ['user_term_acceptances', 'Aceites de Termos'],
  ['waiting_list', 'Fila de Espera'],
] as const

const actionLabels: Record<string, string> = { INSERT: 'Criação', UPDATE: 'Alteração', DELETE: 'Exclusão' }

function isoBoundary(date: string, end: boolean) {
  return new Date(`${date}T${end ? '23:59:59.999' : '00:00:00.000'}`).toISOString()
}

function today() { return new Date().toISOString().slice(0, 10) }

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function entries(value: unknown): readonly Record<string, unknown>[] {
  const source = Array.isArray(value) ? value : record(value)?.items
  return Array.isArray(source) ? source.flatMap((item) => { const row = record(item); return row ? [row] : [] }) : []
}

function text(item: Record<string, unknown>, key: string) {
  const value = item[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function displayDate(date: string | null) {
  if (!date || Number.isNaN(Date.parse(date))) return 'Data não informada'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

function safeChanges(item: Record<string, unknown>) {
  return Array.isArray(item.changes)
    ? item.changes.flatMap((entry) => { const change = record(entry); return change && text(change, 'label') ? [change] : [] })
    : []
}

function changeValue(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
  return String(value)
}

export function AuditLogPage({ service = getRpcService() }: Readonly<{ service?: AuditLogService }>) {
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [entityName, setEntityName] = useState('')
  const [action, setAction] = useState('')
  const [state, setState] = useState<AsyncState<unknown> | null>(null)

  async function load(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!startDate || !endDate || endDate < startDate) return
    setState({ status: 'loading' })
    setState(await service.getAuditLogs({
      startAt: isoBoundary(startDate, false), endAt: isoBoundary(endDate, true),
      entityName: entityName || null, action: action || null, limit: 100,
    }))
  }

  return (
    <section className="gestor-route" aria-labelledby="audit-title">
      <header>
        <span>Governança e Gestão</span>
        <h2 id="audit-title">Auditoria</h2>
        <p>Consulte as alterações administrativas e operacionais registradas no CAPO, com identificação de autoria, data e área relacionada.</p>
      </header>
      <article className="gestor-panel">
        <form className="gestor-audit-filters" onSubmit={(event) => void load(event)}>
          <label>De<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>Até<input type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <label>Área / Módulo
            <select value={entityName} onChange={(event) => setEntityName(event.target.value)}>
              <option value="">Todas as áreas</option>
              {areas.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <label>Tipo de alteração
            <select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">Todas</option>
              {Object.entries(actionLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </label>
          <button type="submit" disabled={!startDate || !endDate || endDate < startDate}>Consultar</button>
        </form>
      </article>
      {state && <article className="gestor-panel">
        <AsyncStateView state={state} loading="Consultando auditoria..." empty="Nenhum registro autorizado foi retornado.">
          {(data) => {
            const logs = entries(data)
            return logs.length === 0
              ? <p>Nenhum registro autorizado foi retornado.</p>
              : <ul className="gestor-audit-list">{logs.map((log, index) => {
                const changes = safeChanges(log)
                const actionLabel = actionLabels[text(log, 'action') ?? ''] ?? 'Alteração registrada'
                return <li key={text(log, 'audit_id') ?? index}>
                  <time dateTime={text(log, 'created_at') ?? undefined}>{displayDate(text(log, 'created_at'))}</time>
                  <div className="gestor-audit-item-heading">
                    <strong>{actionLabel} — {text(log, 'entity_label') ?? 'Registro do Sistema'}</strong>
                    <span>{text(log, 'actor_name') ?? 'Autoria não informada'}{text(log, 'actor_role_label') && <> · {text(log, 'actor_role_label')}</>}</span>
                  </div>
                  {text(log, 'patient_name') && <p>Paciente: {text(log, 'patient_name')}</p>}
                  {text(log, 'patient_number') && <p>Nº CAPO: {text(log, 'patient_number')}</p>}
                  {text(log, 'summary') && <p>{text(log, 'summary')}</p>}
                  {changes.length > 0 && <details>
                    <summary>Ver detalhes</summary>
                    <div className="gestor-audit-details"><table>
                      <thead><tr><th scope="col">Campo</th><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead>
                      <tbody>{changes.map((change, changeIndex) => <tr key={changeIndex}>
                        <th scope="row">{text(change, 'label')}</th>
                        <td>{changeValue(change.old_value)}</td>
                        <td>{changeValue(change.new_value)}</td>
                      </tr>)}</tbody>
                    </table></div>
                  </details>}
                </li>
              })}</ul>
          }}
        </AsyncStateView>
      </article>}
    </section>
  )
}
