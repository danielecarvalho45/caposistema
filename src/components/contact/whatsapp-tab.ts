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
