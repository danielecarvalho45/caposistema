import { useEffect, useState } from 'react'
import './public-confirmation.css'

type Details = {
  valid: boolean
  available?: boolean
  decision?: 'comparecera' | 'nao_comparecera' | null
  appointment_date?: string
  patient_first_name?: string
  professional_name?: string
  care_location?: string | null
}

const token = new URLSearchParams(window.location.search).get('t') ?? ''
const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/appointment-confirmation`

async function requestConfirmation(action: 'read' | 'respond', decision?: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify({ action, token, ...(decision ? { decision } : {}) }),
  })
  if (!response.ok) throw new Error('O serviço de confirmação está indisponível. Tente novamente.')
  return response.json() as Promise<Record<string, unknown>>
}

function date(value: string) {
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short',
  }).format(parsed) : 'Consulte o CAPO'
}

export function PublicAppointmentConfirmation() {
  const [details, setDetails] = useState<Details | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Confirmar consulta — CAPO'
    if (!/^[0-9a-f]{64}$/.test(token)) { setLoading(false); return }
    let active = true
    void requestConfirmation('read')
      .then((data) => { if (active) setDetails(data as Details) })
      .catch(() => { if (active) setError('Não foi possível consultar agora. Tente novamente.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function choose(decision: 'comparecera' | 'nao_comparecera') {
    if (busy || !details?.available) return
    setBusy(true)
    setError('')
    try {
      const result = await requestConfirmation('respond', decision)
      if (result.success === true) {
        setDetails((current) => current ? { ...current, decision, available: false } : current)
      } else {
        setError('Não foi possível registrar esta resposta. Entre em contato com o CAPO.')
      }
    } catch {
      setError('Falha de comunicação. Verifique sua conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="capo-public-confirmation">
    <section className="capo-confirmation-card" aria-labelledby="capo-confirmation-title">
      <img src="/assets/capo-logo.jpg" alt="CAPO — Centro de Apoio ao Paciente Oncológico" />
      <h1 id="capo-confirmation-title">Confirmação de consulta</h1>
      {loading ? <p role="status">Consultando sua consulta…</p> : !details?.valid ? (
        <p role="alert">Este link é inválido ou expirou. Sua consulta não foi alterada. Entre em contato com a equipe CAPO.</p>
      ) : <>
        <p>Olá, {details.patient_first_name}! Confira os dados da sua consulta:</p>
        <div className="capo-confirmation-details">
          <p>📅 <strong>Data e horário:</strong> {date(details.appointment_date ?? '')}</p>
          <p>👩‍⚕️ <strong>Profissional:</strong> {details.professional_name}</p>
          {details.care_location && <p>📍 <strong>Local:</strong> {details.care_location}</p>}
        </div>
        {details.decision === 'comparecera' ? (
          <p className="capo-confirmation-done" role="status">✅ Sua presença foi confirmada antecipadamente. Aguardamos você!</p>
        ) : details.decision === 'nao_comparecera' ? (
          <p className="capo-confirmation-done" role="status">✅ Recebemos sua resposta. O horário foi liberado e o administrativo entrará em contato para a remarcação.</p>
        ) : !details.available ? (
          <p role="status">Esta consulta não está mais disponível para confirmação. Consulte a equipe CAPO.</p>
        ) : <div className="capo-confirmation-actions">
          <button type="button" disabled={busy} onClick={() => void choose('comparecera')} className="capo-confirmation-yes">✅ Vou comparecer</button>
          <button type="button" disabled={busy} onClick={() => void choose('nao_comparecera')} className="capo-confirmation-no">🟠 Não poderei comparecer</button>
          <p>Se não responder, sua consulta continuará agendada.</p>
        </div>}
      </>}
      {error && <p role="alert" className="capo-confirmation-error">{error}</p>}
      <footer>Centro de Apoio ao Paciente Oncológico — CAPO</footer>
    </section>
  </main>
}
