import { useState } from 'react'
import { toISODate } from '@/utils'
import { getTimetableErrorMessage } from '@/utils/timetableErrors.js'
import { useSchoolTimetable } from '@/hooks'
import WeeklyTimetableGrid from '@/components/schedule/WeeklyTimetableGrid.jsx'
import ScheduleTodoTab from './ScheduleTodoTab.jsx'

export default function TimetableView() {
  const [tab, setTab] = useState('weekly')
  const todayDate = toISODate()
  const { timetable, isLoading, isError, error } = useSchoolTimetable()

  const tabStyle = (active) => ({
    padding: '10px 28px',
    border: '0.5px solid #e8e6e0',
    borderBottom: active ? '0.5px solid #fff' : '0.5px solid #e8e6e0',
    background: active ? '#fff' : '#f1efe8',
    color: active ? '#2c2c2a' : '#888',
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    cursor: 'pointer',
    borderRadius: active && tab === 'weekly' ? '8px 8px 0 0' : active ? '8px 8px 0 0' : '8px 8px 0 0',
    marginBottom: active ? -1 : 0,
    position: 'relative',
    zIndex: active ? 1 : 0,
  })

  return (
    <div style={{ maxWidth: 900 }}>
      <h1
        style={{
          margin: '0 0 24px',
          fontSize: 22,
          fontWeight: 700,
          color: '#2c2c2a',
          letterSpacing: '-0.5px',
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
            background: '#fff',
            border: '0.5px solid #e8e6e0',
            borderRadius: '0 12px 12px 12px',
            padding: '28px 32px',
          }}
        >
          {tab === 'weekly' ? (
            <>
              {isLoading && (
                <p style={{ margin: 0, fontSize: 13, color: '#888' }}>시간표 불러오는 중...</p>
              )}
              {isError && (
                <p style={{ margin: 0, fontSize: 13, color: '#d85a30' }}>
                  {getTimetableErrorMessage(error)}
                </p>
              )}
              {!isLoading && !isError && timetable.weekClassCount === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: '#b4b2a9' }}>
                  이번 주 등록된 수업이 없습니다.
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
