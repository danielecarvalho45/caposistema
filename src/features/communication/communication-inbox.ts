// Apenas a Comunicação Interna: as caixas e avisos acompanham a última interação,
// não somente o destinatário original. Nunca altera Solicitações/Notificações Gerais.
export const COMMUNICATION_UPDATED_EVENT = 'capo:internal-communication-updated'

export type IncomingCommunication = {
  sender_id: string
  recipient_id: string
  unread: boolean
  messages?: readonly { author_id: string; created_at: string }[]
  events?: readonly { actor_id: string; created_at: string }[]
}

export function lastCommunicationActor(thread: IncomingCommunication): string | null {
  const messages = thread.messages ?? []
  const events = thread.events ?? []
  const message = messages[messages.length - 1]
  const event = events[events.length - 1]
  if (event && (!message || Date.parse(event.created_at) > Date.parse(message.created_at))) {
    return event.actor_id
  }
  return message?.author_id ?? event?.actor_id ?? null
}

export function hasIncomingCommunication(thread: IncomingCommunication, accountId: string): boolean {
  if (!accountId || !thread.unread) return false
  if (thread.sender_id !== accountId && thread.recipient_id !== accountId) return false
  // A criação não deve contar como mensagem nova para quem acabou de enviá-la.
  return lastCommunicationActor(thread) !== accountId
}

export function isCommunicationInReceived(thread: IncomingCommunication, accountId: string): boolean {
  if (!accountId) return false
  return thread.recipient_id === accountId ||
    (thread.sender_id === accountId &&
      (thread.messages ?? []).some(message => message.author_id !== accountId))
}

export function notifyInternalCommunicationUpdated(): void {
  globalThis.dispatchEvent(new Event(COMMUNICATION_UPDATED_EVENT))
}
