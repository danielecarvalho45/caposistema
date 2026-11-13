import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CapoDateInput } from '../../src/components/inputs/CapoDateInput'
import { CapoDateTimeInput } from '../../src/components/inputs/CapoDateTimeInput'
import { capoTodayIso } from '../../src/lib/date/capo-locale'

afterEach(cleanup)

describe('Calendário CAPO brasileiro', () => {
  it('mostra dia/mês/ano sem depender da linguagem do navegador', () => {
    render(<CapoDateInput value="2026-11-13" onChange={vi.fn()} />)
    expect(screen.getByRole('textbox')).toHaveValue('13/11/2026')
    expect(screen.getByRole('button', { name: 'Abrir calendário brasileiro' })).toBeVisible()
  })

  it('emite ISO ao selecionar data e mantém os limites da agenda', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CapoDateInput value="2026-11-13" min="2026-11-12" max="2026-11-14" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Abrir calendário brasileiro' }))
    expect(screen.getByRole('button', { name: '11/11/2026' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '14/11/2026' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '2026-11-14' } }))
  })

  it('aceita entrada manual brasileira e rejeita datas inexistentes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CapoDateInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    await user.type(input, '31/02/2026')
    expect(onChange).not.toHaveBeenCalled()
    await user.clear(input)
    await user.type(input, '28/02/2026')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: { value: '2026-02-28' } }))
  })

  it('preserva HH:MM em 24 horas no contato futuro', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CapoDateTimeInput value="2026-11-13T13:45" onChange={onChange} />)
    expect(screen.getByRole('textbox', { name: 'Horário em 24 horas' })).toHaveValue('13:45')
    await user.clear(screen.getByRole('textbox', { name: 'Horário em 24 horas' }))
    await user.type(screen.getByRole('textbox', { name: 'Horário em 24 horas' }), '22:30')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: { value: '2026-11-13T22:30' } }))
  })

  it('usa a data civil de Brasília, mesmo quando outra zona já está no dia seguinte', () => {
    expect(capoTodayIso(new Date('2026-11-14T01:00:00Z'))).toBe('2026-11-13')
  })
})
