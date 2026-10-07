import { buildDayRows, buildTodayRows, formatRowDetail } from '@/utils/homeFocus.js'

/**
 * 홈의 오늘 시간표. 수업이 없는 날은 행을 그리지 않는다.
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 * @param {Date} [props.now]
 * @param {string} [props.dayKey]
 * @param {Date} [props.date]
 * @param {number} [props.limit] 홈 미리보기용 행 수 제한
 * @param {() => void} [props.onMore] 잘린 행이 있을 때 더보기
 */
export default function DayTimetableList({
  timetable,
  now = new Date(),
  dayKey,
  date,
  limit,
  onMore,
}) {
  const rows = dayKey
    ? buildDayRows(timetable, dayKey, now, date ?? null)
    : buildTodayRows(timetable, now)
  if (rows.length === 0) return null

  const visible = typeof limit === 'number' ? rows.slice(0, limit) : rows
  const hiddenCount = Math.max(0, rows.length - visible.length)

  return (
    <div className="day-list">
      {visible.map((row) => {
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
              {cell?.lessons?.length > 1 ? (
                <span className="day-subject">{cell.lessons.length}학급</span>
              ) : cell ? (
                <>
                  <span className="day-subject">{cell.subject || '수업'}</span>
                  {formatRowDetail(cell) && <span className="day-meta">{formatRowDetail(cell)}</span>}
                </>
              ) : (
                <span className="day-subject day-empty">공강</span>
              )}
            </div>
            <div className="day-badges">
              {row.isNow && <span className="day-badge day-badge-now">지금</span>}
            </div>
          </div>
        )
      })}
      {hiddenCount > 0 && onMore && (
        <button type="button" className="home-more" onClick={onMore}>
          더보기 {hiddenCount}건
        </button>
      )}
    </div>
  )
}
