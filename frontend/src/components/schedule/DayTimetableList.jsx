import { TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'

/**
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 */
export default function DayTimetableList({ timetable }) {
  const { todayKey, todayByPeriod, currentPeriod, currentClass, periods } = timetable

  if (!todayKey || !todayByPeriod) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
        주말에는 수업이 없습니다. 월요일 일정은 시간표에서 확인하세요.
      </p>
    )
  }

  return (
    <>
      {currentClass ? (
        <div
          style={{
            background: 'var(--color-primary-50)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600 }}>
            진행 중 {currentPeriod}교시 {currentClass.class} {currentClass.subject}
          </span>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-border-light)',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>현재 공강 시간입니다</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
        {TIMETABLE_DAYS.map((d) => (
          <button
            key={d}
            type="button"
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid',
              borderColor: d === todayKey ? 'var(--color-primary-500)' : 'transparent',
              background: d === todayKey ? 'var(--color-primary-500)' : 'transparent',
              color: d === todayKey ? 'var(--color-surface)' : 'var(--color-text-subtle)',
              fontWeight: d === todayKey ? 600 : 400,
              fontSize: 13,
              cursor: 'default',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <div style={{ overflowY: 'auto', maxHeight: 320 }}>
        {periods.map((p) => {
          const s = todayByPeriod[p]
          const isCurrent = p === currentPeriod
          return (
            <div
              key={p}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 0',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', width: 32, flexShrink: 0 }}>
                {p}교시
              </span>
              {s ? (
                <span
                  style={{
                    flex: 1,
                    background: isCurrent ? 'var(--color-primary-50)' : 'var(--color-border-light)',
                    color: 'var(--color-text)',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 13,
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {s.class} | {s.subject}
                  {s.teacher ? ` · ${s.teacher}` : ''}
                </span>
              ) : (
                <span style={{ flex: 1, color: 'var(--color-text-muted)', fontSize: 13, paddingLeft: 10 }}>
                  공강
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
