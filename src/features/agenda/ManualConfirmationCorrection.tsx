import { useState } from 'react'
import { getSupabaseClient } from '../../lib/supabase/client'

export type ManualCorrectionResult = 'correcao_pendente' | 'avisado' | 'sem_resposta'

export function ManualConfirmationCorrection({
  appointmentId, kind, patientName, disabled = false, onCorrected,
}: Readonly<{
  appointmentId: string
  kind: 'patient' | 'family'
  patientName: string
  disabled?: boolean
  onCorrected: (result: ManualCorrectionResult) => void | Promise<void>
}>) {
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<ManualCorrectionResult>('correcao_pendente')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function correct() {
    if (busy || reason.trim().length < 5 || reason.trim().length > 500) return
    setBusy(true)
    setFeedback('')
    try {
      const client = getSupabaseClient() as unknown as {
        rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
      }
      const { data, error } = await client.rpc('correct_manual_previsit_confirmation_for_interface', {
        p_appointment_id: appointmentId,
        p_kind: kind,
        p_result: result === 'correcao_pendente' ? 'pendente' : result,
        p_reason: reason.trim(),
      })
      if (error) throw error
      if (!data || typeof data !== 'object' || Array.isArray(data) || (data as Record<string, unknown>).success !== true) {
        throw new Error('O banco não confirmou a correção.')
      }
      await onCorrected(result)
      setReason('')
      setOpen(false)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao corrigir confirmação manual.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="capo-confirmation-correction">
      <button type="button" disabled={disabled || busy} aria-label={`Corrigir confirmação manual de ${patientName}`}
        onClick={() => { setOpen((previous) => !previous); setFeedback('') }}>
        Corrigir confirmação
      </button>
      {open && (
        <div className="capo-confirmation-correction-form" role="group" aria-label={`Corrigir confirmação manual de ${patientName}`}>
          <strong>Retificação da confirmação manual</strong>
          <p>A consulta permanece agendada. A confirmação anterior ficará registrada para auditoria.</p>
          <label>Resultado correto
            <select value={result} disabled={busy} onChange={(event) => setResult(event.target.value as ManualCorrectionResult)}>
              <option value="correcao_pendente">Confirmação pendente — paciente não confirmou</option>
              <option value="avisado">Paciente avisado — aguardando resposta</option>
              <option value="sem_resposta">Contato realizado — sem resposta</option>
            </select>
          </label>
          <label>Motivo obrigatório da correção
            <textarea value={reason} disabled={busy} maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: Confirmação registrada por engano" />
          </label>
          <div className="capo-confirmation-correction-actions">
            <button type="button" disabled={busy || reason.trim().length < 5} onClick={() => void correct()}>
              {busy ? 'Registrando…' : 'Salvar correção'}
            </button>
            <button type="button" disabled={busy} onClick={() => setOpen(false)}>Voltar</button>
          </div>
          {feedback && <p role="alert">{feedback}</p>}
        </div>
      )}
    </div>
  )
}
