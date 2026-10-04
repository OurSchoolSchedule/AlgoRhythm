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
            style={{
              display: 'grid',
              gridTemplateColumns: '64px minmax(0, 1fr)',
              alignItems: 'center',
              minHeight: 44,
              padding: '8px 12px',
              borderTop: index === 0 ? 'none' : '1px solid var(--color-border-light)',
              background: selected ? 'var(--color-primary-50)' : 'transparent',
            }}
          >
            <span
              style={{
                fontSize: 'var(--font-caption)',
                color: 'var(--color-text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {period}교시
            </span>
            {cell ? (
              <span
                style={{
                  fontSize: 'var(--font-body)',
                  color: 'var(--color-text)',
                  fontWeight: selected ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {[cell.class, cell.subject, cell.teacher].filter(Boolean).join(' ')}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--font-body)', color: 'var(--color-text-muted)' }}>-</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
