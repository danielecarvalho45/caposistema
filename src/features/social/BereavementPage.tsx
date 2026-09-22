import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type AsyncState, loadingState } from '../../lib/supabase/rpc'
import {
  createFamilyCaregiverService,
  type FamilyCaregiverService,
  type FamilyMember,
} from './family-caregiver-integration'
import './family-caregiver-page.css'

type BereavementRecord = Readonly<Record<string, unknown>>

function isBereavementRecord(value: unknown): value is BereavementRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

type BereavementPageProps = Readonly<{
  accessContext: AccessContext
  familyService?: FamilyCaregiverService
}>

function field(record: BereavementRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

export function BereavementPage({
  accessContext,
  familyService = createFamilyCaregiverService(),
}: BereavementPageProps) {
  const primaryContext = accessContext.primary_context.code
  const isManager = primaryContext === 'administrador'
  const canOperate = isManager || accessContext.roles.some((role) => role.code === 'assistente_social')

  const [state, setState] = useState<AsyncState<readonly BereavementRecord[]>>(loadingState)
  const [familyQuery, setFamilyQuery] = useState('')
  const [familyMembers, setFamilyMembers] = useState<readonly FamilyMember[]>([])
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadBereavements() {
    setState(loadingState())
    const result = await getRpcService().getFamilyBereavement()
    if (result.status === 'success') {
      const records = Array.isArray(result.data)
        ? result.data.filter(isBereavementRecord)
        : []
      setState(records.length > 0 ? { status: 'success', data: records } : { status: 'empty' })
    } else {
      setState(result)
    }
  }

  useEffect(() => {
    void loadBereavements()
  }, [])

  async function searchFamilies() {
    if (familyQuery.trim().length < 2) return
    const result = await familyService.searchFamilyMembers(familyQuery.trim(), 20)
    setFamilyMembers(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setFeedback(result.error.message)
  }

  async function start(familyMemberId: string) {
    if (busy) return
    setBusy(true)
    const result = await getRpcService().startFamilyBereavement(familyMemberId)
    if (result.status === 'success') {
      setFeedback('Luto iniciado pelo banco.')
      await loadBereavements()
    } else setFeedback(result.status === 'error' ? result.error.message : 'Retorno sem confirmação.')
    setBusy(false)
  }

  async function close(familyMemberId: string) {
    if (busy) return
    setBusy(true)
    const result = await getRpcService().closeFamilyBereavement(familyMemberId)
    if (result.status === 'success') {
      setFeedback('Luto encerrado pelo banco.')
      await loadBereavements()
    } else setFeedback(result.status === 'error' ? result.error.message : 'Retorno sem confirmação.')
    setBusy(false)
  }

  return (
    <section className="family-caregiver-page" aria-labelledby="bereavement-title">
      <header className="family-caregiver-header">
        <div>
          <p className="eyebrow">Fluxos e Acompanhamentos</p>
          <h1 id="bereavement-title">Luto</h1>
          <p>
            Continuidade autorizada do familiar/cuidador, preservando o histórico
            e o vínculo com o paciente de origem.
          </p>
        </div>
        <span className="family-caregiver-connection">
          {isManager ? 'Gestão autorizada' : 'Visualização gerencial'}
        </span>
      </header>

      {feedback && <p role="status">{feedback}</p>}

      {canOperate && (
        <section className="family-caregiver-sections" aria-label="Iniciar luto">
          <article>
            <h2>Iniciar acompanhamento de luto</h2>
            <label>
              Buscar familiar/cuidador
              <input value={familyQuery} onChange={(event) => setFamilyQuery(event.target.value)} />
            </label>
            <button type="button" onClick={() => void searchFamilies()}>Buscar</button>
            {familyMembers.length > 0 && (
              <ul>
                {familyMembers.map((member, index) => (
                  <li key={String(member.id ?? index)}>
                    <span>{String(member.full_name ?? member.name ?? 'Familiar')}</span>
                    <button type="button" disabled={busy} onClick={() => void start(String(member.id))}>Iniciar luto</button>
                    <button type="button" disabled={busy} onClick={() => void close(String(member.id))}>Encerrar luto</button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}

      <section className="family-caregiver-sections" aria-label="Fluxo de luto">
        <article>
          <h2>Acompanhamentos</h2>
          {state.status === 'loading' && <p>Carregando acompanhamentos…</p>}
          {state.status === 'empty' && <p>Nenhum acompanhamento de luto real encontrado.</p>}
          {state.status === 'error' && <p role="alert">{state.error.message}</p>}
          {state.status === 'success' && state.data.length === 0 && (
            <p>Nenhum acompanhamento de luto real encontrado.</p>
          )}
          {state.status === 'success' && state.data.length > 0 && (
            <ul>
              {state.data.map((record, index) => (
                <li key={field(record, 'bereavement_id', 'id') ?? index}>
                  <strong>{field(record, 'family_member_name', 'full_name') ?? 'Familiar'}</strong>
                  <span>{field(record, 'status') ?? 'Situação não informada'}</span>
                </li>
              ))}
            </ul>
          )}
          <small>
            {isManager
              ? 'Operação conectada ao contrato oficial de luto.'
              : 'Este contexto possui somente visualização do fluxo.'}
          </small>
        </article>
      </section>
    </section>
  )
}

