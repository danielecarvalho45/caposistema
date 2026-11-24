import { describe, expect, it } from 'vitest'
import {
  isTeamBirthdayToday,
  teamBirthdayDayLabel,
  teamBirthdayMonthLabel,
} from '../../src/components/birthdays/TeamMonthlyBirthdays'
import type { BirthdayTeamMember } from '../../src/lib/supabase/rpc'

const member: BirthdayTeamMember = {
  professional_id: 'profissional-exemplo',
  full_name: 'Integrante Exemplo',
  function_title: 'Psicologia',
  birthday_day: 5,
}

describe('Aniversariantes da equipe CAPO no mês', () => {
  it('mostra o mês da referência no fuso de Brasília e dia/mês sem nascimento completo', () => {
    expect(teamBirthdayMonthLabel('2026-11-24')).toBe('novembro de 2026')
    expect(teamBirthdayDayLabel(member, '2026-11-24')).toBe('05/11')
  })

  it('indica aniversário hoje apenas no dia correto', () => {
    expect(isTeamBirthdayToday(member, '2026-11-05')).toBe(true)
    expect(isTeamBirthdayToday(member, '2026-11-24')).toBe(false)
  })

  it('não inventa dia de nascimento quando o registro não traz o dado', () => {
    expect(teamBirthdayDayLabel({ ...member, birthday_day: null }, '2026-11-24'))
      .toBe('Dia não informado')
  })
})
