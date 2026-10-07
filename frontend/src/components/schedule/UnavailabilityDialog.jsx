import { useEffect, useMemo, useState } from 'react'
import { useDeleteUnavailability, useMyUnavailabilities, useSaveUnavailabilities } from '@/hooks'
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
  const remove = useDeleteUnavailability()
  const [draft, setDraft] = useState(null)
  const [toast, setToast] = useState('')
  const byKey = useMemo(() => {
    const map = new Map()
    for (const item of query.data ?? []) {
      map.set(cellKey(item.dayOfWeek, item.periodNumber), item)
    }
    return map
  }, [query.data])
  const loaded = new Set(byKey.keys())
  const selected = draft ?? loaded

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggle = (day, period) => {
    const key = cellKey(day, period)
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setDraft(next)
  }

  const handleSave = async () => {
    const current = query.data ?? []
    const nextKeys = selected
    const removed = current.filter((item) => !nextKeys.has(cellKey(item.dayOfWeek, item.periodNumber)) && item.id != null)
    const unavailabilities = []
    for (const [day] of DAYS) {
      for (const period of PERIODS) {
        if (nextKeys.has(cellKey(day, period))) {
          unavailabilities.push({ dayOfWeek: day, periodNumber: period })
        }
      }
    }

    try {
      for (const item of removed) {
        await remove.mutateAsync(item.id)
      }
      if (unavailabilities.length > 0 || current.length > 0) {
        await save.mutateAsync({
          replace: current.length > 0 && removed.length < current.length,
          unavailabilities,
        })
      }
      setDraft(null)
      setToast('근무 불가 시간을 저장했습니다.')
    } catch (error) {
      setToast(getApiErrorMessage(error, '저장에 실패했습니다.'))
    }
  }

  const pending = save.isPending || remove.isPending

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
          선택한 칸은 근무 불가입니다. 해제한 칸은 개별 삭제됩니다.
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
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ ...headStyle, width: 40 }}>교시</th>
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
                      <td key={day} style={{ padding: 4, textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${day} ${period}교시 ${on ? '근무 불가' : '가능'}`}
                          disabled={query.isLoading || query.isError}
                          onClick={() => toggle(day, period)}
                          style={{
                            boxSizing: 'border-box',
                            display: 'block',
                            width: '100%',
                            height: 36,
                            padding: 0,
                            margin: 0,
                            borderRadius: 6,
                            border: '1px solid var(--color-border-input)',
                            background: on ? 'var(--color-primary-button)' : 'var(--color-surface)',
                            color: on ? 'var(--color-on-primary)' : 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '34px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >불가</button>
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
          disabled={query.isLoading || query.isError || pending}
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
        >{pending ? '저장 중...' : '저장'}</button>
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
