import { useEffect, useState, type ChangeEvent } from 'react'
import { CapoDateInput } from './CapoDateInput'

type Props = {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
}

export function CapoDateTimeInput({ value, onChange, disabled, readOnly, required }: Props) {
  const [time, setTime] = useState(() => value.slice(11, 16))
  const [date, setDate] = useState(() => /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : '')
  useEffect(() => {
    if (value) {
      setTime(value.slice(11, 16))
      setDate(value.slice(0, 10))
    }
  }, [value])
  function emit(day: string, hour: string) {
    if (!day || !/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(hour)) {
      onChange({ target: { value: '' }, currentTarget: { value: '' } } as ChangeEvent<HTMLInputElement>)
      return
    }
    const iso = `${day}T${hour}`
    onChange({ target: { value: iso }, currentTarget: { value: iso } } as ChangeEvent<HTMLInputElement>)
  }
  return (
    <span className="capo-date-time-input">
      <CapoDateInput value={date} disabled={disabled} readOnly={readOnly} required={required}
        onChange={(event) => {
          setDate(event.target.value)
          emit(event.target.value, time)
        }} />
      <input type="text" inputMode="numeric" autoComplete="off" placeholder="HH:MM"
        pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5}
        aria-label="Horário em 24 horas" value={time}
        disabled={disabled} readOnly={readOnly} required={required}
        onChange={(event) => {
          const next = event.target.value
          setTime(next)
          emit(date, next)
        }} />
    </span>
  )
}
