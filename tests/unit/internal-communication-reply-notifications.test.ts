import { describe, expect, it } from 'vitest'
import {
  hasIncomingCommunication,
  isCommunicationInReceived,
  lastCommunicationActor,
  type IncomingCommunication,
} from '../../src/features/communication/communication-inbox'

const admin = 'admin-1'
const professional = 'professional-1'
const stamp = '2026-11-19T12:00:00.000Z'

function thread(overrides: Partial<IncomingCommunication> = {}): IncomingCommunication {
  return {
    sender_id: admin,
    recipient_id: professional,
    unread: true,
    messages: [{ author_id: admin, created_at: stamp }],
    events: [{ actor_id: admin, created_at: stamp }],
    ...overrides,
  }
}

describe('Notificação bidirecional de respostas da Comunicação Interna', () => {
  it('a mensagem inicial avisa somente o destinatário, nunca o remetente', () => {
    const value = thread()
    expect(hasIncomingCommunication(value, professional)).toBe(true)
    expect(hasIncomingCommunication(value, admin)).toBe(false)
    expect(isCommunicationInReceived(value, professional)).toBe(true)
    expect(isCommunicationInReceived(value, admin)).toBe(false)
  })

  it('resposta do profissional avisa o Gestor/Operacional remetente e aparece em Recebidas', () => {
    const value = thread({
      messages: [
        { author_id: admin, created_at: stamp },
        { author_id: professional, created_at: '2026-11-19T12:01:00.000Z' },
      ],
    })
    expect(lastCommunicationActor(value)).toBe(professional)
    expect(hasIncomingCommunication(value, admin)).toBe(true)
    expect(hasIncomingCommunication(value, professional)).toBe(false)
    expect(isCommunicationInReceived(value, admin)).toBe(true)
  })

  it('resposta do Administrativo ao profissional avisa somente o profissional', () => {
    const value = thread({
      messages: [
        { author_id: professional, created_at: stamp },
        { author_id: admin, created_at: '2026-11-19T12:01:00.000Z' },
      ],
    })
    expect(hasIncomingCommunication(value, professional)).toBe(true)
    expect(hasIncomingCommunication(value, admin)).toBe(false)
  })

  it('início ou conclusão notifica a outra parte mesmo sem texto novo', () => {
    const value = thread({
      events: [
        { actor_id: admin, created_at: stamp },
        { actor_id: professional, created_at: '2026-11-19T12:02:00.000Z' },
      ],
    })
    expect(lastCommunicationActor(value)).toBe(professional)
    expect(hasIncomingCommunication(value, admin)).toBe(true)
  })

  it('leitura confirmada não aparece como nova mensagem', () => {
    expect(hasIncomingCommunication(thread({ unread: false }), professional)).toBe(false)
    expect(hasIncomingCommunication(thread({ unread: false }), admin)).toBe(false)
  })

  it('não mostra conversa de outro par de usuários', () => {
    const value = thread()
    expect(hasIncomingCommunication(value, 'outra-conta')).toBe(false)
    expect(isCommunicationInReceived(value, 'outra-conta')).toBe(false)
  })
})
