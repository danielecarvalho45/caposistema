import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { maskCapoTime, validCapoTime } from './capo-input-mask'
import './capo-date-input.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> & {
  value: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

export function CapoTimeInput({ value, onChange, disabled, readOnly, onBlur, onKeyDown, ...rest }: Props) {
  const [text, setText] = useState(value)
  const emitted = useRef<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [hour, setHour] = useState(value.slice(0, 2) || '08')
  const [minute, setMinute] = useState(value.slice(3, 5) || '00')

  useEffect(() => {
    if (emitted.current === value) {
      emitted.current = null
      return
    }
    setText(value)
  }, [value])

  function notify(next: string) {
    emitted.current = next
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as unknown as ChangeEvent<HTMLInputElement>)
  }

  function input(raw: string) {
    const next = maskCapoTime(raw)
    setText(next)
    if (validCapoTime(next)) notify(next)
    else if (value) notify('')
  }

  function choose(next: string) {
    setText(next)
    notify(next)
    setExpanded(false)
  }

  return (
    <span className="capo-time-input">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder="HH:MM"
        pattern="(?:[01][0-9]|2[0-3]):[0-5][0-9]"
        maxLength={5}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => input(event.target.value)}
        onKeyDown={(event) => {
          const field = event.currentTarget
          if (event.key === 'Backspace' && !disabled && !readOnly && field.selectionStart === 3 &&
              field.selectionEnd === 3 && text[2] === ':') {
            event.preventDefault()
            input(text.slice(0, 1) + text.slice(3))
          }
          onKeyDown?.(event)
        }}
        onBlur={(event) => {
          if (!validCapoTime(text)) setText(value)
          onBlur?.(event)
        }}
      />
      {!disabled && !readOnly && (
        <button type="button" className="capo-time-trigger"
          aria-label="Escolher horário em 24 horas"
          aria-expanded={expanded}
          onClick={() => {
            const selected = validCapoTime(text) ? text : '08:00'
            setHour(selected.slice(0, 2))
            setMinute(selected.slice(3, 5))
            setExpanded((current) => !current)
          }}>Horário</button>
      )}
      {expanded && (
        <span className="capo-time-picker" role="group" aria-label="Selecionar horas e minutos">
          <label>Hora
            <select aria-label="Hora" value={hour} onChange={(event) => setHour(event.target.value)}>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
                .map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <span aria-hidden="true">:</span>
          <label>Minuto
            <select aria-label="Minuto" value={minute} onChange={(event) => setMinute(event.target.value)}>
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))
                .map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => choose(`${hour}:${minute}`)}>Aplicar horário</button>
        </span>
      )}
    </span>
  )
}
