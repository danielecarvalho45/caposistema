import { useState } from 'react'
import { getRpcService } from '../../lib/supabase/rpc'

type Props = Readonly<{
  patientId: string
  label?: string
  message?: string | null
}>

function digits(value: string) {
  return value.replace(/\D/g, '')
}

export function PatientWhatsAppButton({
  patientId,
  label = 'WhatsApp',
  message = null,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function openContact() {
    if (!patientId || busy) return
    setBusy(true)
    setFeedback(null)
    const result = await getRpcService().getPatientContact(patientId)
    if (result.status !== 'success') {
      setFeedback(
        result.status === 'error'
          ? result.error.message
          : 'Contato do paciente não localizado.',
      )
      setBusy(false)
      return
    }

    const data =
      result.data && typeof result.data === 'object' && !Array.isArray(result.data)
        ? result.data as Record<string, unknown>
        : null
    const phone = typeof data?.phone === 'string' ? digits(data.phone) : ''
    if (!phone) {
      setFeedback('Paciente sem telefone/WhatsApp cadastrado.')
      setBusy(false)
      return
    }

    if (message?.trim()) {
      await globalThis.navigator?.clipboard?.writeText(message.trim())
    }

    const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`
    globalThis.open(
      `https://web.whatsapp.com/send?phone=${encodeURIComponent(normalizedPhone)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setFeedback(
      message?.trim()
        ? 'Mensagem copiada e WhatsApp aberto no contato autorizado.'
        : 'WhatsApp aberto no contato autorizado.',
    )
    setBusy(false)
  }

  return (
    <span>
      <button type="button" disabled={busy || !patientId} onClick={() => void openContact()}>
        {busy ? 'Abrindo…' : label}
      </button>
      {feedback && <small role="status">{feedback}</small>}
    </span>
  )
}
