import { useEffect, useState, type ChangeEvent } from 'react'
import { CapoDateInput } from './CapoDateInput'
import { maskCapoTime, validCapoTime } from './capo-input-mask'

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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState(() => value.slice(11, 13) || '08')
  const [selectedMinute, setSelectedMinute] = useState(() => value.slice(14, 16) || '00')

  useEffect(() => {
    if (value) {
      setTime(value.slice(11, 16))
      setDate(value.slice(0, 10))
    }
  }, [value])

  function emit(day: string, hour: string) {
    const iso = day && validCapoTime(hour) ? `${day}T${hour}` : ''
    // Preserva o contrato local datetime-local com os formulários existentes.
    onChange({ target: { value: iso }, currentTarget: { value: iso } } as unknown as ChangeEvent<HTMLInputElement>)
  }

  function applyTime(hour: string) {
    setTime(hour)
    emit(date, hour)
    setPickerOpen(false)
  }

  return (
    <span className="capo-date-time-input">
      <CapoDateInput value={date} disabled={disabled} readOnly={readOnly} required={required}
        onChange={(event) => {
          setDate(event.target.value)
          emit(event.target.value, time)
        }} />
      <span className="capo-time-input">
        <input
          type="text" inputMode="numeric" autoComplete="off" placeholder="HH:MM"
          pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5}
          aria-label="Horário em 24 horas" value={time}
          disabled={disabled} readOnly={readOnly} required={required}
          onChange={(event) => {
            const masked = maskCapoTime(event.target.value)
            setTime(masked)
            emit(date, masked)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && event.currentTarget.selectionStart === 3 &&
                event.currentTarget.selectionEnd === 3 && time[2] === ':') {
              event.preventDefault()
              const masked = maskCapoTime(time.slice(0, 1) + time.slice(3))
              setTime(masked)
              emit(date, masked)
            }
          }}
        />
        {!disabled && !readOnly && (
          <button type="button" className="capo-time-trigger"
            aria-label="Escolher horário em 24 horas" aria-expanded={pickerOpen}
            onClick={() => {
              const active = validCapoTime(time) ? time : '08:00'
              setSelectedHour(active.slice(0, 2))
              setSelectedMinute(active.slice(3, 5))
              setPickerOpen((old) => !old)
            }}>Horário</button>
        )}
        {pickerOpen && (
          <span className="capo-time-picker" role="group" aria-label="Selecionar horas e minutos">
            <label>Hora
              <select aria-label="Hora" value={selectedHour}
                onChange={(event) => setSelectedHour(event.target.value)}>
                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
                  .map((hour) => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label>
            <span aria-hidden="true">:</span>
            <label>Minuto
              <select aria-label="Minuto" value={selectedMinute}
                onChange={(event) => setSelectedMinute(event.target.value)}>
                {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
                  .map((minute) => <option key={minute} value={minute}>{minute}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => applyTime(`${selectedHour}:${selectedMinute}`)}>
              Aplicar horário
            </button>
          </span>
        )}
      </span>
    </span>
  )
}
