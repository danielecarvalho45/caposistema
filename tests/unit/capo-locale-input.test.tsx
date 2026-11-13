import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CapoDateInput } from '../../src/components/inputs/CapoDateInput'
import { CapoDateTimeInput } from '../../src/components/inputs/CapoDateTimeInput'
import { CapoTimeInput } from '../../src/components/inputs/CapoTimeInput'
import { capoTodayIso } from '../../src/lib/date/capo-locale'
import { capoDateToIso, maskCapoDate, maskCapoTime, validCapoTime } from '../../src/components/inputs/capo-input-mask'

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

describe('Máscaras brasileiras sem impedir digitação ou colagem', () => {
  it('insere automaticamente / em DD/MM/AAAA sem exigir barras digitadas', () => {
    expect(maskCapoDate('13')).toBe('13/')
    expect(maskCapoDate('1311')).toBe('13/11/')
    expect(maskCapoDate('13112026')).toBe('13/11/2026')
    expect(maskCapoDate('13/11/2026')).toBe('13/11/2026')
    expect(maskCapoDate('2026-11-13')).toBe('13/11/2026')
    expect(capoDateToIso('13/11/2026')).toBe('2026-11-13')
    expect(capoDateToIso('31/02/2026')).toBeNull()
  })

  it('permite colar data completa com ou sem separadores', () => {
    const onChange = vi.fn()
    render(<CapoDateInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '13112026' } })
    expect(input).toHaveValue('13/11/2026')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { value: '2026-11-13' },
    }))
    fireEvent.change(input, { target: { value: '07/12/2026' } })
    expect(input).toHaveValue('07/12/2026')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { value: '2026-12-07' },
    }))
  })

  it('insere : ao digitar somente números e aceita colagem de HH:MM', () => {
    expect(maskCapoTime('13')).toBe('13:')
    expect(maskCapoTime('1345')).toBe('13:45')
    expect(maskCapoTime('13:45')).toBe('13:45')
    expect(validCapoTime('23:59')).toBe(true)
    expect(validCapoTime('24:00')).toBe(false)
    expect(validCapoTime('12:60')).toBe(false)
  })

  it('oferece seleção opcional de qualquer hora e minuto sem limitar a digitação', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CapoDateTimeInput value="2026-11-13T08:00" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Escolher horário em 24 horas' }))
    await user.selectOptions(screen.getByLabelText('Hora'), '23')
    await user.selectOptions(screen.getByLabelText('Minuto'), '59')
    await user.click(screen.getByRole('button', { name: 'Aplicar horário' }))
    expect(screen.getByRole('textbox', { name: 'Horário em 24 horas' })).toHaveValue('23:59')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { value: '2026-11-13T23:59' },
    }))
  })
})

describe('Horários na configuração da agenda', () => {
  it('aceita HHMM digitado e insere automaticamente o separador de hora e minuto', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CapoTimeInput value="" onChange={onChange} />)
    const field = screen.getByRole('textbox')
    await user.type(field, '0945')
    expect(field).toHaveValue('09:45')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { value: '09:45' },
    }))
  })

  it('aceita colar HH:MM sem alterar o valor de domínio', () => {
    const onChange = vi.fn()
    render(<CapoTimeInput value="" onChange={onChange} />)
    const field = screen.getByRole('textbox')
    fireEvent.change(field, { target: { value: '17:38' } })
    expect(field).toHaveValue('17:38')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { value: '17:38' },
    }))
  })

  it('possibilita selecionar horas e todos os minutos', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<CapoTimeInput value="" onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'Escolher horário em 24 horas' }))
    await user.selectOptions(screen.getByLabelText('Hora'), '21')
    await user.selectOptions(screen.getByLabelText('Minuto'), '37')
    await user.click(screen.getByRole('button', { name: 'Aplicar horário' }))
    expect(screen.getByRole('textbox')).toHaveValue('21:37')
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { value: '21:37' },
    }))
  })
})
