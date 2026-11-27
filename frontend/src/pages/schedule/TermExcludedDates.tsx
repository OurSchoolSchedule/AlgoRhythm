import { useId, useState } from 'react'
import { excludedDatesError } from '@/utils/termExcludedDates'
import './term-excluded-dates.css'

interface Props {
  startDate: string
  endDate: string
  value: readonly string[]
  onChange: (dates: string[]) => void
}

export default function TermExcludedDates({ startDate, endDate, value, onChange }: Props) {
  const inputId = useId()
  const [draft, setDraft] = useState('')
  const error = excludedDatesError(startDate, endDate, draft ? [...value, draft] : value)
  function add() {
    if (!draft || error) return
    onChange([...value, draft].sort())
    setDraft('')
  }
  return (
    <div className="term-excluded-dates">
      <label htmlFor={inputId}>정규 수업 제외일 (선택)</label>
      <p id={inputId + '-hint'}>시험일 등 정규 수업을 쉬는 날짜를 추가하세요.</p>
      <div className="term-excluded-entry">
        <input
          id={inputId}
          type="date"
          min={startDate || undefined}
          max={endDate || undefined}
          value={draft}
          ref={(input) => {
            input?.setCustomValidity(
              draft ? (error ?? '날짜 추가를 누르거나 입력한 날짜를 지우세요.') : '',
            )
          }}
          aria-invalid={Boolean(draft && error)}
          aria-describedby={inputId + '-hint' + (error ? ' ' + inputId + '-error' : '')}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <button type="button" disabled={!draft || Boolean(error)} onClick={add}>
          날짜 추가
        </button>
      </div>
      {error && (
        <p role="alert" id={inputId + '-error'}>
          {error}
        </p>
      )}
      {value.length > 0 && (
        <ul aria-label="선택한 수업 제외일">
          {value.map((date) => (
            <li key={date}>
              <time dateTime={date}>{date}</time>
              <button
                type="button"
                aria-label={date + ' 제외일 삭제'}
                onClick={() => onChange(value.filter((d) => d !== date))}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
