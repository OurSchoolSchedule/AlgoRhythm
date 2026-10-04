import { buildDayRows, buildTodayRows, formatRowDetail } from '@/utils/homeFocus.js'

function badgeKind(status) {
  if (status === '변경') return 'change'
  if (status === '보결' || status === '대타 대기') return 'wait'
  return 'neutral'
}

/**
 * 홈의 오늘 시간표. 수업이 없는 날은 행을 그리지 않는다.
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 * @param {Date} [props.now]
 * @param {string} [props.dayKey]
 * @param {Date} [props.date]
 */
export default function DayTimetableList({ timetable, now = new Date(), dayKey, date }) {
  const rows = dayKey
    ? buildDayRows(timetable, dayKey, now, date ?? null)
    : buildTodayRows(timetable, now)
  if (rows.length === 0) return null

  return (
    <div className="day-list">
      {rows.map((row) => {
        if (row.kind === 'lunch') {
          return (
            <div key={row.id} className="day-row-lunch">
              {row.label}
            </div>
          )
        }

        const cell = row.cell
        return (
          <div
            key={row.id}
            className={`day-row${row.isNow ? ' day-row-now' : ''}${row.isPast ? ' day-row-past' : ''}`}
          >
            <div className="day-period-col">
              <span className="day-period-label">{row.periodLabel}</span>
              <span className="day-period-time">{row.time}</span>
            </div>
            <div className="day-main">
              {cell ? (
                <>
                  <span className="day-subject">{cell.subject || '수업'}</span>
                  {formatRowDetail(cell) && <span className="day-meta">{formatRowDetail(cell)}</span>}
                  {cell.previousTeacher && (
                    <span className="day-change">
                      <s>{cell.previousTeacher}</s>
                      {cell.teacher ? ` → ${cell.teacher}` : ''}
                    </span>
                  )}
                </>
              ) : (
                <span className="day-subject day-empty">공강</span>
              )}
            </div>
            <div className="day-badges">
              {row.isNow && <span className="day-badge day-badge-now">지금</span>}
              {cell?.status && (
                <span className={`day-badge day-badge-${badgeKind(cell.status)}`}>{cell.status}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
