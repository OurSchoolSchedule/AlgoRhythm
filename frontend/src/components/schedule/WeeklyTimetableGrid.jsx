import { Fragment } from 'react'
import { TIMETABLE_DAYS, TIMETABLE_PERIODS } from '@/constants/schoolTimetable.js'

/**
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 */
export default function WeeklyTimetableGrid({ timetable }) {
  const { byDay } = timetable

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '72px repeat(5, 1fr)',
        gap: '10px 12px',
        alignItems: 'stretch',
      }}
    >
      <div />
      {TIMETABLE_DAYS.map((day) => (
        <div
          key={day}
          style={{
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 600,
            color: '#2c2c2a',
            paddingBottom: 4,
          }}
        >
          {day}
        </div>
      ))}

      {TIMETABLE_PERIODS.map((period) => (
        <Fragment key={period}>
          <div
            style={{
              fontSize: 13,
              color: '#888',
              textAlign: 'right',
              paddingRight: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {period}교시
          </div>
          {TIMETABLE_DAYS.map((day) => {
            const cell = byDay[day][period]
            return (
              <div
                key={`${day}-${period}`}
                style={{
                  minHeight: 52,
                  borderRadius: 10,
                  background: cell ? '#eceae4' : '#fff',
                  border: cell ? 'none' : '0.5px solid #eceae4',
                  padding: cell ? '6px 8px' : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: 2,
                }}
              >
                {cell ? (
                  <>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#2c2c2a',
                        lineHeight: 1.3,
                        wordBreak: 'break-all',
                      }}
                    >
                      {cell.class}
                    </span>
                    <span style={{ fontSize: 10, color: '#666', lineHeight: 1.2 }}>
                      {cell.subject}
                    </span>
                  </>
                ) : null}
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
