/** CAPO: apresentação brasileira sem alterar os contratos ISO do banco. */
export function maskCapoDate(input: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.trim())
  const raw = iso ? `${iso[3]}${iso[2]}${iso[1]}` : input.replace(/\D/g, '').slice(0, 8)
  if (raw.length <= 2) return raw.length === 2 ? `${raw}/` : raw
  if (raw.length <= 4) return `${raw.slice(0, 2)}/${raw.slice(2)}${raw.length === 4 ? '/' : ''}`
  return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4)}`
}

export function capoDateToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null
  const probe = new Date(0)
  probe.setFullYear(year, month - 1, day)
  if (probe.getFullYear() !== year || probe.getMonth() + 1 !== month || probe.getDate() !== day) return null
  return `${match[3]}-${match[2]}-${match[1]}`
}

export function maskCapoTime(input: string): string {
  const raw = input.replace(/\D/g, '').slice(0, 4)
  return raw.length > 2 ? `${raw.slice(0, 2)}:${raw.slice(2)}`
    : raw.length === 2 ? `${raw}:` : raw
}

export function validCapoTime(input: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input)
}
