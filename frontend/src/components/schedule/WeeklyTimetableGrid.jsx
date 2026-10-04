import { Fragment } from 'react'
import { TIMETABLE_DAYS } from '@/constants/schoolTimetable.js'

/**
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 */
export default function WeeklyTimetableGrid({ timetable }) {
  const { byDay, periods, todayKey } = timetable

  return (
    <div className="show-scrollbar" style={{ overflow: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '72px repeat(5, minmax(120px, 1fr))',
          gap: '8px 8px',
          alignItems: 'stretch',
          minWidth: 760,
        }}
      >
        <div />
        {TIMETABLE_DAYS.map((day) => {
          const isToday = day === todayKey
          return (
            <div
              key={day}
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                textAlign: 'center',
                fontSize: 'var(--font-caption)',
                lineHeight: '20px',
                fontWeight: 500,
                color: 'var(--color-text-subtle)',
                background: isToday ? 'var(--color-primary-50)' : 'var(--color-border-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 0',
              }}
            >
              {day}
              {isToday ? ' 오늘' : ''}
            </div>
          )
        })}

        {periods.map((period) => (
          <Fragment key={period}>
            <div
              style={{
                position: 'sticky',
                left: 0,
                zIndex: 1,
                fontSize: 'var(--font-caption)',
                lineHeight: '20px',
                fontWeight: 500,
                color: 'var(--color-text-subtle)',
                background: 'var(--color-border-light)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 8px',
              }}
            >
              {period}교시
            </div>
            {TIMETABLE_DAYS.map((day) => {
              const cell = byDay[day][period]
              const isToday = day === todayKey
              const title = cell?.teacher || cell?.class || ''
              const detail = [cell?.teacher ? cell.class : '', cell?.subject].filter(Boolean).join(' ')
              return (
                <div
                  key={`${day}-${period}`}
                  style={{
                    minHeight: 56,
                    borderRadius: 'var(--radius-sm)',
                    background: isToday ? 'var(--color-primary-50)' : 'var(--color-surface)',
                    border: cell
                      ? '1px solid var(--color-border)'
                      : '1px dashed var(--color-border-input)',
                    padding: '6px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    gap: 2,
                    overflow: 'hidden',
                  }}
                >
                  {cell ? (
                    <>
                      <span
                        style={{
                          fontSize: 'var(--font-micro)',
                          lineHeight: '16px',
                          fontWeight: 600,
                          color: 'var(--color-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {title}
                      </span>
                      {detail ? (
                        <span
                          style={{
                            fontSize: 'var(--font-micro)',
                            lineHeight: '16px',
                            fontWeight: 500,
                            color: 'var(--color-text-subtle)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {detail}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
