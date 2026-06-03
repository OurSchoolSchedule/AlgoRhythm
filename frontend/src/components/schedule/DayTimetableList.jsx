import { TIMETABLE_DAYS, TIMETABLE_PERIODS } from '@/constants/schoolTimetable.js'

/**
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 */
export default function DayTimetableList({ timetable }) {
  const { todayKey, todayByPeriod, currentPeriod, currentClass } = timetable

  if (!todayKey || !todayByPeriod) {
    return (
      <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
        주말에는 수업 일정이 표시되지 않습니다.
      </p>
    )
  }

  return (
    <>
      {currentClass ? (
        <div
          style={{
            background: '#e8f7ee',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: '#27a859', fontWeight: 600 }}>
            {currentPeriod}교시 · {currentClass.class} · {currentClass.subject}
          </span>
        </div>
      ) : (
        <div
          style={{
            background: '#f1efe8',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 13, color: '#888' }}>현재 공강 시간입니다</span>
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
              borderRadius: '50%',
              border: 'none',
              background: d === todayKey ? '#27a859' : 'transparent',
              color: d === todayKey ? '#fff' : '#5f5e5a',
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
        {TIMETABLE_PERIODS.map((p) => {
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
                borderBottom: '0.5px solid #e8e6e0',
              }}
            >
              <span style={{ fontSize: 12, color: '#888', width: 32, flexShrink: 0 }}>
                {p}교시
              </span>
              {s ? (
                <span
                  style={{
                    flex: 1,
                    background: isCurrent ? '#e8f7ee' : '#f1efe8',
                    color: isCurrent ? '#27a859' : '#444',
                    borderRadius: 6,
                    padding: '5px 10px',
                    fontSize: 13,
                    fontWeight: isCurrent ? 600 : 400,
                  }}
                >
                  {s.class} | {s.subject}
                </span>
              ) : (
                <span style={{ flex: 1, color: '#d3d1c7', fontSize: 13, paddingLeft: 10 }}>
                  —
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
