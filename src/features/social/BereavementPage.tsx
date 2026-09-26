import { useEffect, useState } from 'react'
import type { AccessContext } from '../../types/access'
import { getRpcService, type AsyncState, loadingState } from '../../lib/supabase/rpc'
import './family-caregiver-page.css'

type BereavementRecord = Readonly<Record<string, unknown>>

function isBereavementRecord(value: unknown): value is BereavementRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function bereavementRows(value: unknown): readonly BereavementRecord[] {
  const source = isBereavementRecord(value) ? value.items : value
  return Array.isArray(source) ? source.filter(isBereavementRecord) : []
}
function isSocialSpecialty(value: string): boolean {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase() === 'assistencia social'
}
type BereavementService = Pick<
  ReturnType<typeof getRpcService>,
  'getFamilyBereavement' |
  'searchBereavementFamilyMembers' |
  'startFamilyBereavement' |
  'closeFamilyBereavement' |
  'getMyAssistentialSpecialties'
>

type BereavementPageProps = Readonly<{
  accessContext: AccessContext
  service?: BereavementService
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
  service = getRpcService(),
}: BereavementPageProps) {
  const isManager = accessContext.roles.some((role) => role.code === 'administrador')
  const [socialSpecialty, setSocialSpecialty] = useState<string | null>(null)
  const canOperate = accessContext.is_active && (isManager || socialSpecialty === accessContext.professional_id)

  const [state, setState] = useState<AsyncState<readonly BereavementRecord[]>>(loadingState)
  const [familyQuery, setFamilyQuery] = useState('')
  const [familyMembers, setFamilyMembers] = useState<readonly BereavementRecord[]>([])
  const [startNotes, setStartNotes] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadBereavements() {
    const result = await service.getFamilyBereavement()
    if (result.status === 'success') {
      const records = bereavementRows(result.data)
      setState(records.length > 0 ? { status: 'success', data: records } : { status: 'empty' })
    } else {
      setState(result)
    }
    return result
  }

  useEffect(() => {
    let active = true
    void service.getFamilyBereavement().then((result) => {
      if (!active) return
      if (result.status === 'success') {
        const records = bereavementRows(result.data)
        setState(records.length > 0 ? { status: 'success', data: records } : { status: 'empty' })
      } else setState(result)
    })
    return () => { active = false }
  }, [service])

  useEffect(() => {
    if (!accessContext.is_active || !accessContext.professional_id || !accessContext.roles.some((role) => role.code === 'profissional')) return
    let active = true
    const professionalId = accessContext.professional_id
    void service.getMyAssistentialSpecialties().then((result) => {
      if (!active) return
      setSocialSpecialty(result.status === 'success' && result.data.some((item) => isSocialSpecialty(item.specialty_name)) ? professionalId : null)
    })
    return () => { active = false }
  }, [accessContext.is_active, accessContext.professional_id, accessContext.roles, service])

  async function searchFamilies() {
    if (familyQuery.trim().length < 2) return
    const result = await service.searchBereavementFamilyMembers(familyQuery.trim(), 20)
    setFamilyMembers(result.status === 'success' ? result.data : [])
    if (result.status === 'error') setFeedback(result.error.message)
  }

  async function start(familyMemberId: string) {
    if (busy) return
    setBusy(true)
    const result = await service.startFamilyBereavement(
      familyMemberId,
      startNotes.trim() || null,
    )
    if (result.status === 'success') {
      const reloaded = await loadBereavements()
      setFeedback(reloaded.status === 'success' || reloaded.status === 'empty' ? 'Luto iniciado e consulta atualizada.' : 'A operação foi recebida, mas a atualização da lista falhou.')
      setStartNotes('')
      setFamilyMembers([])
    } else setFeedback(result.status === 'error' ? result.error.message : 'Retorno sem confirmação.')
    setBusy(false)
  }

  async function close(familyMemberId: string) {
    if (busy || closeNotes.trim().length < 2) {
      setFeedback('Informe o motivo operacional do encerramento.')
      return
    }
    setBusy(true)
    const result = await service.closeFamilyBereavement(
      familyMemberId,
      closeNotes.trim(),
    )
    if (result.status === 'success') {
      const reloaded = await loadBereavements()
      setFeedback(reloaded.status === 'success' || reloaded.status === 'empty' ? 'Luto encerrado e consulta atualizada.' : 'A operação foi recebida, mas a atualização da lista falhou.')
      setCloseNotes('')
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
          {canOperate ? 'Operação autorizada' : 'Somente consulta'}
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
            <label>
              Observação inicial
              <textarea
                value={startNotes}
                onChange={(event) => setStartNotes(event.target.value)}
                maxLength={500}
              />
            </label>
            {familyMembers.length > 0 && (
              <ul>
                {familyMembers.map((member, index) => (
                  <li key={String(member.family_member_id ?? index)}>
                    <span>
                      {String(member.full_name ?? 'Familiar')} · paciente de origem: {String(member.source_patient_name ?? 'não informado')}
                    </span>
                    <button
                      type="button"
                      disabled={busy || member.bereavement_active === true}
                      onClick={() => void start(String(member.family_member_id))}
                    >
                      {member.bereavement_active === true ? 'Luto já ativo' : 'Iniciar luto'}
                    </button>
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
            <>
              {canOperate && (
                <label>
                  Motivo operacional do encerramento
                  <textarea
                    value={closeNotes}
                    onChange={(event) => setCloseNotes(event.target.value)}
                    minLength={2}
                    maxLength={500}
                  />
                </label>
              )}
              <ul>
                {state.data.map((record, index) => (
                  <li key={field(record, 'bereavement_cycle_id') ?? index}>
                    <strong>{field(record, 'family_name') ?? 'Familiar'}</strong>
                    <span>
                      {field(record, 'status') ?? 'Situação não informada'} · paciente de origem: {field(record, 'patient_name') ?? 'não informado'}
                    </span>
                    {canOperate && field(record, 'status') === 'active' && (
                      <button
                        type="button"
                        disabled={busy || closeNotes.trim().length < 2}
                        onClick={() => void close(field(record, 'family_member_id') ?? '')}
                      >
                        Encerrar luto
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
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

