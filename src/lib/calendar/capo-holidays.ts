/** Calendário de feriados legais aplicáveis ao atendimento em Pouso Alegre/MG.
 * Feriados não equivalem a bloqueios: a agenda real conserva suas exceções e consultas.
 * Fontes: Lei federal 14.759/2023, calendário nacional (Lei 662/1949,
 * Lei 10.607/2002, Lei 6.802/1980), Data Magna de Minas Gerais em 21/04,
 * Lei municipal 5.070/2011, arts. 1º e 2º.
 * Pontos facultativos não integram automaticamente os dias não úteis.
 */
export type CapoHoliday = Readonly<{
  date: string
  name: string
  scope: 'nacional' | 'estadual' | 'municipal'
}>

function formatUtcDate(value: Date) {
  return value.toISOString().slice(0, 10)
}
function utcDay(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12))
}
function plusDays(date: Date, days: number) {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Computus gregoriano: Páscoa para calcular Sexta-Feira Santa e Corpus Christi. */
function easterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return utcDay(year, month, day)
}

export function capoHolidaysForYear(year: number): readonly CapoHoliday[] {
  if (!Number.isInteger(year) || year < 1900 || year > 2199) return []
  const fixed: readonly [string, string, CapoHoliday['scope']][] = [
    ['01-01', 'Confraternização Universal', 'nacional'],
    ['04-21', 'Tiradentes — Data Magna de Minas Gerais', 'nacional'],
    ['05-01', 'Dia do Trabalho', 'nacional'],
    ['09-07', 'Independência do Brasil', 'nacional'],
    ['10-12', 'Nossa Senhora Aparecida', 'nacional'],
    ['11-02', 'Finados', 'nacional'],
    ['11-15', 'Proclamação da República', 'nacional'],
    ['11-20', 'Dia Nacional de Zumbi e da Consciência Negra', 'nacional'],
    ['12-25', 'Natal', 'nacional'],
    ['08-06', 'Senhor Bom Jesus — Padroeiro de Pouso Alegre', 'municipal'],
    ['10-19', 'São Paulo da Cruz — Emancipação de Pouso Alegre', 'municipal'],
  ]
  const yearPrefix = String(year) + '-'
  const dates: CapoHoliday[] = fixed.map(([monthDay, name, scope]) => ({
    date: yearPrefix + monthDay, name, scope,
  }))
  // A Paixão de Cristo é nacional em 2026 e também consta da lei municipal.
  const easter = easterSunday(year)
  dates.push(
    { date: formatUtcDate(plusDays(easter, -2)), name: 'Sexta-Feira da Paixão', scope: 'nacional' },
    { date: formatUtcDate(plusDays(easter, 60)), name: 'Corpus Christi', scope: 'municipal' },
  )
  return dates.sort((left, right) => left.date.localeCompare(right.date))
}

export function capoHolidayOn(date: string): CapoHoliday | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const year = Number(date.slice(0, 4))
  return capoHolidaysForYear(year).find((holiday) => holiday.date === date) ?? null
}

export function capoIsBusinessDay(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const [year, month, day] = date.split('-').map(Number)
  const value = utcDay(year, month, day)
  if (formatUtcDate(value) !== date) return false
  const weekday = value.getUTCDay()
  return weekday !== 0 && weekday !== 6 && capoHolidayOn(date) === null
}

export function capoNextBusinessDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  let next = utcDay(year, month, day)
  for (let i = 0; i < 370; i += 1) {
    next = plusDays(next, 1)
    const candidate = formatUtcDate(next)
    if (capoIsBusinessDay(candidate)) return candidate
  }
  throw new Error('Não foi possível calcular o próximo dia útil do CAPO.')
}
