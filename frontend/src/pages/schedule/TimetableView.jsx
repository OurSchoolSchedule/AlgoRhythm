import { useState } from 'react'
import { toISODate } from '@/utils'
import { getTimetableErrorMessage } from '@/utils/timetableErrors.js'
import { getAccessToken } from '@/api'
import { useSchoolTimetable } from '@/hooks'
import WeeklyTimetableGrid from '@/components/schedule/WeeklyTimetableGrid.jsx'
import ScheduleTodoTab from './ScheduleTodoTab.jsx'

export default function TimetableView() {
  const [tab, setTab] = useState('weekly')
  const todayDate = toISODate()
  const { timetable, isLoading, isError, error } = useSchoolTimetable()
  const previewOnly = !getAccessToken()

  const tabStyle = (active) => ({
    padding: '10px 28px',
    border: '1px solid var(--color-border)',
    borderBottom: active ? '1px solid var(--color-surface)' : '1px solid var(--color-border)',
    background: active ? 'var(--color-surface)' : 'var(--color-surface-hover)',
    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    cursor: 'pointer',
    borderRadius: '8px 8px 0 0',
    marginBottom: active ? -1 : 0,
    position: 'relative',
    zIndex: active ? 1 : 0,
  })

  return (
    <div>
      <h1
        style={{
          margin: '0 0 24px',
          fontSize: 'var(--font-display)',
          lineHeight: '32px',
          fontWeight: 700,
          color: 'var(--color-text)',
        }}
      >
        시간표
      </h1>

      <div>
        <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
          <button type="button" onClick={() => setTab('weekly')} style={tabStyle(tab === 'weekly')}>
            주간
          </button>
          <button type="button" onClick={() => setTab('todo')} style={tabStyle(tab === 'todo')}>
            투두
          </button>
        </div>

        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '0 12px 12px 12px',
            padding: '20px 24px',
          }}
        >
          {tab === 'weekly' ? (
            <>
              {isLoading && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>시간표 불러오는 중...</p>
              )}
              {isError && !previewOnly && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>
                  {getTimetableErrorMessage(error)}
                </p>
              )}
              {!isLoading && (previewOnly || !isError) && timetable.weekClassCount === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                  등록된 수업이 없습니다. 시간표를 만들면 여기에 표시됩니다.
                </p>
              )}
              {!isLoading && !isError && timetable.weekClassCount > 0 && (
                <WeeklyTimetableGrid timetable={timetable} />
              )}
            </>
          ) : (
            <ScheduleTodoTab date={todayDate} />
          )}
        </div>
      </div>
    </div>
  )
}
