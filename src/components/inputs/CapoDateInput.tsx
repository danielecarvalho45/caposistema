import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import { capoDateToIso, maskCapoDate } from './capo-input-mask'
import './capo-date-input.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'> & {
  value: string
  min?: string
  max?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

function isoToBrazil(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? maskCapoDate(value) : ''
}

export function CapoDateInput({
  value, onChange, min, max, disabled, readOnly, className, onBlur, onKeyDown, ...rest
}: Props) {
  const [text, setText] = useState(() => isoToBrazil(value))
  // Evita que a confirmação do pai apague a digitação parcial quando o ISO
  // anterior precisa ser invalidado (ex.: editar uma data já preenchida).
  const selfEmittedValue = useRef<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [month, setMonth] = useState(() => {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
    const brazilianNow = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit',
    }).formatToParts(new Date())
    const year = brazilianNow.find((part) => part.type === 'year')?.value
    const month = brazilianNow.find((part) => part.type === 'month')?.value
    return d ? `${d.slice(0, 7)}-01` : `${year}-${month}-01`
  })

  useEffect(() => {
    if (selfEmittedValue.current === value) {
      selfEmittedValue.current = null
      return
    }
    setText(isoToBrazil(value))
  }, [value])

  function notify(iso: string) {
    selfEmittedValue.current = iso
    // O contrato das páginas CAPO continua sendo event.target.value em ISO.
    onChange?.({ target: { value: iso }, currentTarget: { value: iso } } as unknown as ChangeEvent<HTMLInputElement>)
  }

  function input(raw: string) {
    const masked = maskCapoDate(raw)
    setText(masked)
    const iso = capoDateToIso(masked)
    if (iso && (!min || iso >= min) && (!max || iso <= max)) {
      notify(iso)
    } else if (value) {
      // Não deixar um valor antigo válido ser enviado quando o campo foi editado.
      notify('')
    }
  }

  function choose(iso: string) {
    if ((min && iso < min) || (max && iso > max)) return
    setText(isoToBrazil(iso))
    notify(iso)
    setExpanded(false)
  }

  function monthStep(direction: number) {
    const [year, monthNumber] = month.split('-').map(Number)
    const date = new Date(year, monthNumber - 1 + direction, 1)
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`)
  }

  const [year, monthNumber] = month.split('-').map(Number)
  const monthIndex = monthNumber - 1
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const dayCount = new Date(year, monthIndex + 1, 0).getDate()
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, monthIndex, 1))

  return (
    <span className="capo-date-input">
      <input
        {...rest}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/AAAA"
        pattern="(?:0[1-9]|[12][0-9]|3[01])/(?:0[1-9]|1[0-2])/[0-9]{4}"
        maxLength={10}
        className={className}
        value={text}
        disabled={disabled}
        readOnly={readOnly}
        onChange={(event) => input(event.target.value)}
        onKeyDown={(event) => {
          // Backspace sobre a barra remove o último dígito, não prende o cursor.
          if (event.key === 'Backspace' && !disabled && !readOnly) {
            const field = event.currentTarget
            const cursor = field.selectionStart
            if (cursor !== null && cursor === field.selectionEnd && cursor > 0 &&
                field.value[cursor - 1] === '/') {
              event.preventDefault()
              const digitsBefore = field.value.slice(0, cursor - 1).replace(/\D/g, '')
              const digitsAfter = field.value.slice(cursor).replace(/\D/g, '')
              input(digitsBefore.slice(0, -1) + digitsAfter)
            }
          }
          onKeyDown?.(event)
        }}
        onBlur={(event) => {
          const iso = capoDateToIso(text)
          if (!iso || (min && iso < min) || (max && iso > max)) {
            setText(isoToBrazil(value))
          }
          onBlur?.(event)
        }}
      />
      {!disabled && !readOnly && (
        <button type="button" className="capo-date-trigger"
          aria-label="Abrir calendário brasileiro"
          aria-expanded={expanded}
          onClick={() => {
            if (!expanded && /^\d{4}-\d{2}-\d{2}$/.test(value))
              setMonth(value.slice(0, 7) + '-01')
            setExpanded(!expanded)
          }}>Calendário</button>
      )}
      {expanded && !disabled && !readOnly && (
        <span className="capo-date-calendar" role="group" aria-label="Calendário em português brasileiro">
          <span className="capo-date-calendar-heading">
            <button type="button" onClick={() => monthStep(-1)} aria-label="Mês anterior">‹</button>
            <strong>{monthLabel}</strong>
            <button type="button" onClick={() => monthStep(1)} aria-label="Próximo mês">›</button>
          </span>
          <span className="capo-date-days">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => <small key={day}>{day}</small>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`empty-${index}`} />)}
            {Array.from({ length: dayCount }, (_, index) => {
              const day = index + 1
              const iso = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              return <button type="button" key={iso}
                aria-label={`${String(day).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}/${year}`}
                aria-pressed={value === iso}
                disabled={(!!min && iso < min) || (!!max && iso > max)}
                onClick={() => choose(iso)}>{day}</button>
            })}
          </span>
          <button type="button" className="capo-date-calendar-close"
            onClick={() => setExpanded(false)}>Fechar</button>
        </span>
      )}
    </span>
  )
}
