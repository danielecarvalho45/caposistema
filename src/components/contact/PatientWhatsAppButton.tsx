import { useState } from 'react'
import { getRpcService } from '../../lib/supabase/rpc'
import { openCapoWhatsAppTab } from './whatsapp-tab'

type Props = Readonly<{
  patientId: string
  label?: string
  compact?: boolean
  message?: string | null
  prepareMessage?: () => Promise<string>
}>

function digits(value: string) {
  return value.replace(/\D/g, '')
}

export function PatientWhatsAppButton({
  patientId,
  label = 'WhatsApp',
  compact = false,
  message = null,
  prepareMessage,
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

    const normalizedPhone = phone.startsWith('55') ? phone : `55${phone}`
    let preparedMessage = message?.trim() ?? ''
    if (prepareMessage) {
      try {
        preparedMessage = (await prepareMessage()).trim()
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Não foi possível preparar a mensagem.')
        setBusy(false)
        return
      }
    }
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${encodeURIComponent(normalizedPhone)}${preparedMessage ? `&text=${encodeURIComponent(preparedMessage)}` : ''}`
    if (!openCapoWhatsAppTab(whatsappUrl)) {
      setFeedback('Não foi possível abrir ou reutilizar a aba do WhatsApp. Autorize pop-ups para o CAPO e tente novamente.')
      setBusy(false)
      return
    }
    setFeedback(
      preparedMessage
        ? 'WhatsApp aberto com a mensagem preparada. Confira os dados e envie manualmente.'
        : 'WhatsApp aberto no contato autorizado.',
    )
    setBusy(false)
  }

  return (
    <span>
      {compact ? (
        <button
          type="button"
          aria-label={busy ? 'Abrindo WhatsApp…' : label}
          title={busy ? 'Abrindo WhatsApp…' : label}
          disabled={busy || !patientId}
          onClick={() => void openContact()}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            verticalAlign: 'middle', width: 32, height: 32, minWidth: 32, minHeight: 32,
            maxWidth: 32, padding: 4, marginInlineStart: 6, boxSizing: 'border-box',
            border: '1px solid #b9ddf5', borderRadius: 8, background: '#e8f6ff',
            boxShadow: 'none', color: '#006bd9', flexShrink: 0,
            opacity: busy || !patientId ? 0.5 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
            <path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.2-4.3a8.5 8.5 0 1 1 15.8-4.4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 7.5c-.8-.4-2 .5-2 1.8 0 3.6 4.6 7.3 7.4 7.3 1.4 0 2.1-.8 2.3-1.6.1-.5-2.5-1.8-2.9-1.7-.5.1-.9 1-1.3 1-1.4-.4-3-2-3.4-3.3 0-.4.8-.8.9-1.2.1-.3-.6-2-1-2.3Z" fill="currentColor"/>
          </svg>
        </button>
      ) : (
      <button type="button" disabled={busy || !patientId} onClick={() => void openContact()}>
        {busy ? 'Abrindo…' : label}
      </button>
      )}
      {feedback && <small role="status">{feedback}</small>}
    </span>
  )
}
