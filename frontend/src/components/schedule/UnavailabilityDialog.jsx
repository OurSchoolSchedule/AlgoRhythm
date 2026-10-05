import { useEffect, useState } from 'react'
import { useMyUnavailabilities, useSaveUnavailabilities } from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const DAYS = [
  ['MON', '월'],
  ['TUE', '화'],
  ['WED', '수'],
  ['THU', '목'],
  ['FRI', '금'],
]
const PERIODS = [1, 2, 3, 4, 5, 6, 7]

function cellKey(day, period) {
  return `${day}-${period}`
}

export default function UnavailabilityDialog({ onClose }) {
  const query = useMyUnavailabilities()
  const save = useSaveUnavailabilities()
  const [selected, setSelected] = useState(() => new Set())
  const [ready, setReady] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!query.data || ready) return
    setSelected(new Set(query.data.map((item) => cellKey(item.dayOfWeek, item.periodNumber))))
    setReady(true)
  }, [query.data, ready])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggle = (day, period) => {
    const key = cellKey(day, period)
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleSave = () => {
    const unavailabilities = []
    for (const [day] of DAYS) {
      for (const period of PERIODS) {
        if (selected.has(cellKey(day, period))) {
          unavailabilities.push({ dayOfWeek: day, periodNumber: period })
        }
      }
    }
    save.mutate(
      { replace: (query.data ?? []).length > 0, unavailabilities },
      {
        onSuccess: () => setToast('근무 불가 시간을 저장했습니다.'),
        onError: (error) => setToast(getApiErrorMessage(error, '저장에 실패했습니다.')),
      },
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="시간대 선호도"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          maxHeight: '86vh',
          overflow: 'auto',
          padding: 20,
          borderRadius: 12,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>시간대 선호도</h2>
          <button type="button" className="panel-close" aria-label="시간대 선호도 닫기" onClick={onClose}>닫기</button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          선택한 칸은 근무 불가입니다.
        </p>
        {query.isLoading && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>}
        {query.isError && (
          <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>
            {getApiErrorMessage(query.error, '근무 불가 시간을 불러오지 못했습니다.')}{' '}
            <button type="button" className="history-link" onClick={() => query.refetch()}>다시 시도</button>
          </p>
        )}
        {!query.isLoading && !query.isError && query.data?.length === 0 && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-muted)' }}>등록된 근무 불가가 없습니다.</p>
        )}
        {!query.isError && (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={headStyle}>교시</th>
                {DAYS.map(([, label]) => <th key={label} style={headStyle}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period}>
                  <th style={headStyle}>{period}</th>
                  {DAYS.map(([day]) => {
                    const on = selected.has(cellKey(day, period))
                    return (
                      <td key={day} style={{ padding: 4, textAlign: 'center' }}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${day} ${period}교시 ${on ? '근무 불가' : '가능'}`}
                          disabled={query.isLoading || query.isError}
                          onClick={() => toggle(day, period)}
                          style={{
                            width: '100%',
                            minHeight: 36,
                            borderRadius: 6,
                            border: '1px solid var(--color-border-input)',
                            background: on ? 'var(--color-primary-button)' : 'var(--color-surface)',
                            color: on ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >{on ? '불가' : ''}</button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          type="button"
          disabled={query.isLoading || query.isError || save.isPending}
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '10px 0',
            border: 'none',
            borderRadius: 8,
            background: 'var(--color-primary-button)',
            color: 'var(--color-on-primary)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >{save.isPending ? '저장 중...' : '저장'}</button>
        {save.isError && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-danger)' }}>
            <button type="button" className="history-link" onClick={handleSave}>다시 시도</button>
          </p>
        )}
      </div>
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            padding: '10px 16px',
            borderRadius: 8,
            background: 'var(--color-text)',
            color: 'var(--color-surface)',
            fontSize: 13,
          }}
        >{toast}</div>
      )}
    </div>
  )
}

const headStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  padding: 4,
}
