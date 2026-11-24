import type { BirthdayTeamMember } from '../../lib/supabase/rpc'
import './team-monthly-birthdays.css'

export function teamBirthdayMonthLabel(referenceDate: string) {
  const [year, month] = referenceDate.split('-').map(Number)
  if (!year || !month || month < 1 || month > 12) return 'mês atual'
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
}

export function teamBirthdayDayLabel(member: BirthdayTeamMember, referenceDate: string) {
  const month = referenceDate.split('-')[1] ?? ''
  return member.birthday_day == null ? 'Dia não informado' :
    `${String(member.birthday_day).padStart(2, '0')}/${month}`
}

export function isTeamBirthdayToday(member: BirthdayTeamMember, referenceDate: string) {
  const day = Number(referenceDate.split('-')[2])
  return member.birthday_day !== null && member.birthday_day === day
}

export function TeamMonthlyBirthdays({
  team,
  referenceDate,
  heading = 'h3',
}: Readonly<{
  team: readonly BirthdayTeamMember[]
  referenceDate: string
  heading?: 'h3' | 'h4'
}>) {
  const title = `Equipe CAPO — Aniversariantes de ${teamBirthdayMonthLabel(referenceDate)}`
  return (
    <>
      {heading === 'h4' ? <h4>{title}</h4> : <h3>{title}</h3>}
      {team.length === 0 ? (
        <p>Nenhum integrante da equipe faz aniversário neste mês.</p>
      ) : (
        <ul className="capo-team-birthdays-month">
          {team.map(member => (
            <li key={member.professional_id}>
              <strong>{teamBirthdayDayLabel(member, referenceDate)} — {member.full_name}</strong>
              <small> · {member.function_title}{isTeamBirthdayToday(member, referenceDate) ? ' · Aniversário hoje' : ''}</small>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
