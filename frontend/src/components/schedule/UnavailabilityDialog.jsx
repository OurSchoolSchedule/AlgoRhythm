import { useEffect, useMemo, useState } from 'react'
import { useMyUnavailabilities, usePeriodSettings, useSaveUnavailabilities } from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const DAYS = [
  ['MON', '월'],
  ['TUE', '화'],
  ['WED', '수'],
  ['THU', '목'],
  ['FRI', '금'],
]

function cellKey(day, period) {
  return `${day}-${period}`
}

export default function UnavailabilityDialog({ onClose }) {
  const query = useMyUnavailabilities()
  const save = useSaveUnavailabilities()
  const bells = usePeriodSettings()
  const periods = [...new Set((bells.data ?? []).map((p) => p.periodNumber))]
    .filter((p) => Number.isSafeInteger(p) && p > 0)
    .sort((a, b) => a - b)
  const [changes, setChanges] = useState(new Map())
  const [toast, setToast] = useState('')
  const byKey = useMemo(() => {
    const map = new Map()
    for (const item of query.data ?? []) {
      map.set(cellKey(item.dayOfWeek, item.periodNumber), item)
    }
    return map
  }, [query.data])
  const selected = new Map(byKey)
  for (const [key, change] of changes) {
    // If a bell disappears while editing, keep the server's original entry.
    if (!periods.includes(change.periodNumber)) continue
    if (change.blocked) selected.set(key, change)
    else selected.delete(key)
  }
  const ready = Array.isArray(query.data) && periods.length > 0 && !query.isError && !bells.isError

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const toggle = (day, period) => {
    const key = cellKey(day, period)
    const next = new Map(changes)
    const blocked = !selected.has(key)
    if (blocked === byKey.has(key)) next.delete(key)
    else next.set(key, { dayOfWeek: day, periodNumber: period, blocked })
    setChanges(next)
  }

  const handleSave = async () => {
    if (!ready || save.isPending || !changes.size) return
    const unavailabilities = Array.from(selected.values(), ({ dayOfWeek, periodNumber, reason }) =>
      ({ dayOfWeek, periodNumber, ...(reason != null && { reason }) }))
    try {
      await save.mutateAsync({ replace: true, unavailabilities })
      setChanges(new Map())
      setToast('근무 불가 시간을 저장했습니다.')
    } catch (error) {
      setToast(getApiErrorMessage(error, '저장에 실패했습니다.'))
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="근무 불가 시간"
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
          <h2 style={{ margin: 0, fontSize: 16 }}>근무 불가 시간</h2>
          <button type="button" className="panel-close" aria-label="근무 불가 시간 닫기" onClick={onClose}>닫기</button>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          수업을 맡을 수 없는 요일과 교시를 선택하세요.
        </p>
        {(query.isLoading || bells.isLoading) && <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>}
        {(query.isError || bells.isError) && (
          <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>
            {getApiErrorMessage(query.error ?? bells.error, '교시와 근무 불가 시간을 불러오지 못했습니다.')}{' '}
            <button type="button" className="history-link" onClick={() => { void query.refetch(); void bells.refetch() }}>다시 시도</button>
          </p>
        )}
        {!bells.isError && Array.isArray(bells.data) && !periods.length && (
          <p>학교에 등록된 교시가 없습니다.</p>
        )}
        {ready && query.data.length === 0 && (
          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-muted)' }}>등록된 근무 불가가 없습니다.</p>
        )}
        {ready && (
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: 12 }}>
            <thead>
              <tr>
                <th style={{ ...headStyle, width: 40 }}>교시</th>
                {DAYS.map(([, label]) => <th key={label} style={headStyle}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period}>
                  <th style={headStyle}>{period}</th>
                  {DAYS.map(([day, label]) => {
                    const on = selected.has(cellKey(day, period))
                    return (
                      <td key={day} style={{ padding: 4, textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={`${label}요일 ${period}교시 ${on ? '근무 불가' : '가능'}`}
                          disabled={save.isPending}
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
                            color: on ? 'var(--color-on-primary)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '34px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >{on ? '불가' : '가능'}</button>
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
          disabled={!ready || !changes.size || save.isPending}
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
