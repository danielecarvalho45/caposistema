import { useEffect, useState, type ChangeEvent, type InputHTMLAttributes } from 'react'
import './capo-date-input.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'> & {
  value: string
  min?: string
  max?: string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
}

function isoToBrazil(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : ''
}

function brazilToIso(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  return d.getFullYear() === Number(yyyy) && d.getMonth() === Number(mm) - 1 &&
    d.getDate() === Number(dd) ? `${yyyy}-${mm}-${dd}` : null
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

export function CapoDateInput({
  value, onChange, min, max, disabled, readOnly, className, onBlur, ...rest
}: Props) {
  const [text, setText] = useState(() => isoToBrazil(value))
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
  useEffect(() => setText(isoToBrazil(value)), [value])

  function notify(iso: string) {
    // Compatibilidade com os handlers existentes, que consomem event.target.value.
    onChange?.({ target: { value: iso }, currentTarget: { value: iso } } as ChangeEvent<HTMLInputElement>)
  }

  function choose(iso: string) {
    if ((min && iso < min) || (max && iso > max)) return
    setText(isoToBrazil(iso))
    notify(iso)
    setExpanded(false)
  }

  function monthStep(direction: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + direction, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }

  const [year, monthNumber] = month.split('-').map(Number)
  const monthIndex = monthNumber - 1
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const dayCount = daysInMonth(year, monthIndex)
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
        onChange={(event) => {
          const entered = event.target.value
          setText(entered)
          if (!entered) notify('')
          else {
            const iso = brazilToIso(entered)
            if (iso && (!min || iso >= min) && (!max || iso <= max)) notify(iso)
          }
        }}
        onBlur={(event) => {
          if (text !== isoToBrazil(value)) {
            const iso = brazilToIso(text)
            if (!iso || (min && iso < min) || (max && iso > max)) setText(isoToBrazil(value))
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
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => <small key={d}>{d}</small>)}
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
