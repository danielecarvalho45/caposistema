/**
 * CAPO — Colagem de datas nos controles nativos de data.
 * Aceita DD/MM/AAAA, DD-MM-AAAA, DD.MM.AAAA e AAAA-MM-DD.
 * Preserva o valor quando a área de transferência não contém data válida.
 */
export function normalizePastedDate(text: string): string | null {
  const value = text.trim()
  const br = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/.exec(value)
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  if (!br && !iso) return null

  const year = Number(br ? br[3] : iso![1])
  const month = Number(br ? br[2] : iso![2])
  const day = Number(br ? br[1] : iso![3])
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) return null
  return `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function installDatePasteSupport(): void {
  document.addEventListener('paste', (event: ClipboardEvent) => {
    const input = event.target
    if (!(input instanceof HTMLInputElement) || input.type !== 'date' || input.disabled || input.readOnly) return
    const normalized = normalizePastedDate(event.clipboardData?.getData('text/plain') ?? '')
    if (!normalized) return
    if ((input.min && normalized < input.min) || (input.max && normalized > input.max)) return

    event.preventDefault()
    // Usar o setter nativo evita que o rastreador de valor do React
    // descarte o evento de atualização dos campos controlados.
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!setValue) return
    setValue.call(input, normalized)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, true)
}
