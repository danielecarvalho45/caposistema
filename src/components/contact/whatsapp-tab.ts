// Uma única aba controlada pelo CAPO para mensagens WhatsApp durante a sessão da SPA.
// Abas abertas manualmente fora do CAPO não podem ser capturadas automaticamente.
let capoWhatsAppTab: Window | null = null

export function openCapoWhatsAppTab(url: string): boolean {
  const tab = capoWhatsAppTab && !capoWhatsAppTab.closed
    ? capoWhatsAppTab
    : globalThis.open('', 'capo_whatsapp_web')
  if (!tab) return false

  capoWhatsAppTab = tab
  try {
    tab.opener = null
    tab.location.replace(url)
    tab.focus()
    return true
  } catch {
    return false
  }
}

/**
 * Reserva a aba no clique direto do operador, antes de consultas assíncronas.
 * Só navega para a conversa após confirmação de gravação e dados da mensagem.
 * Se o agendamento falhar, fecha apenas a aba nova criada nesta reserva.
 */
export function reserveCapoWhatsAppTab(): {
  open: (url: string) => boolean
  cancel: () => void
} | null {
  const existingTab = capoWhatsAppTab && !capoWhatsAppTab.closed ? capoWhatsAppTab : null
  const tab = existingTab ?? globalThis.open('', 'capo_whatsapp_web')
  if (!tab) return null
  capoWhatsAppTab = tab
  let pending = true
  return {
    open(url: string) {
      pending = false
      return openCapoWhatsAppTab(url)
    },
    cancel() {
      if (!pending) return
      pending = false
      if (existingTab) return
      try { tab.close() } catch { /* Janela já fechada pelo navegador. */ }
      if (capoWhatsAppTab === tab) capoWhatsAppTab = null
    },
  }
}
