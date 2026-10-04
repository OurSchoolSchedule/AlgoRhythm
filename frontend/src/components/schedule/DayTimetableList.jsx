const HOME_PERIODS = [1, 2, 3, 4, 5, 6, 7]

/**
 * 홈의 오늘 시간표. 교시 1~7 행은 수업이 없어도 항상 그린다.
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 */
export default function DayTimetableList({ timetable }) {
  const todayByPeriod = timetable?.todayByPeriod
  const currentPeriod = timetable?.currentPeriod

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      {HOME_PERIODS.map((period, index) => {
        const cell = todayByPeriod?.[period]
        const selected = Boolean(cell) && period === currentPeriod
        return (
          <div
            key={period}
            className="day-row"
            style={{
              borderTop: index === 0 ? 'none' : '1px solid var(--color-border-light)',
              background: selected ? 'var(--color-primary-50)' : 'transparent',
            }}
          >
            <span
              className="day-period"
              style={{
                fontSize: 'var(--font-caption)',
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {period}교시
            </span>
            <span
              className="day-detail"
              style={{
                fontSize: 'var(--font-body)',
                color: cell ? 'var(--color-text)' : 'var(--color-text-muted)',
                fontWeight: selected ? 600 : 400,
              }}
            >
              {cell
                ? [cell.class, cell.subject, cell.teacher].filter(Boolean).join(' · ')
                : '-'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
