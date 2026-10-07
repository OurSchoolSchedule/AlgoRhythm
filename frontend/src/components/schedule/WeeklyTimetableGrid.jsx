import { SCHOOL_PERIOD_SLOTS } from '@/constants/schoolTimetable.js'
import { formatClassName } from '@/utils/homeFocus.js'
import { getPeriodFromDatetime, lessonsOf } from '@/utils/schoolTimetable.js'
import { resolveSubjectColor } from '@/utils/subjectColor.js'
import {
  boardPeriods,
  cellSlotKey,
  periodsWithLunch,
} from '@/utils/timetableBoard.js'

const STATUS_META = {
  wait: { label: '대기', className: 'is-wait' },
  대기: { label: '대기', className: 'is-wait' },
  대기중: { label: '대기', className: 'is-wait' },
  change: { label: '변경', className: 'is-change' },
  변경: { label: '변경', className: 'is-change' },
  conflict: { label: '충돌', className: 'is-conflict' },
  충돌: { label: '충돌', className: 'is-conflict' },
}

function clockOf(period) {
  const slot = SCHOOL_PERIOD_SLOTS.find((item) => item.period === period)
  return shortClock(slot?.start)
}

function shortClock(value) {
  if (!value) return ''
  const [hour, minute] = String(value).split(':')
  if (hour == null || minute == null) return ''
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
}

const CROWD_PREVIEW = 3

function chipLabel(lesson) {
  return [lesson.class, lesson.subject].filter(Boolean).join(' ')
}

function subline(cell, detailMode) {
  const klass = formatClassName(cell.class)
  if (detailMode === 'class') return cell.teacher || ''
  if (detailMode === 'all') return [klass, cell.teacher].filter(Boolean).join(' · ')
  return klass
}

function statusMeta(cell) {
  const raw = cell?.status || cell?.cellStatus || cell?.flag
  if (!raw) return null
  return STATUS_META[String(raw)] || STATUS_META[String(raw).toLowerCase()] || null
}

/**
 * @param {Object} props
 * @param {ReturnType<import('@/utils/schoolTimetable.js').buildSchoolTimetable>} props.timetable
 * @param {{ key: string, dayNum: number, holiday: string, isToday: boolean, isPast: boolean }[]} props.days
 */
export default function WeeklyTimetableGrid({
  timetable,
  days,
  detailMode = 'teacher',
  selectedKey = '',
  editing = false,
  dragFrom = null,
  hoverKey = '',
  hoverReason = '',
  showFreeLabel = true,
  now = null,
  onSelect,
  onDragStart,
  onDragHover,
  onDrop,
  onDragEnd,
}) {
  const periods = boardPeriods(timetable.periods, timetable.byDay)
  const rows = periodsWithLunch(periods)
  const currentPeriod = timetable.currentPeriod ?? getPeriodFromDatetime(now || new Date())

  return (
    <div className="tt-board show-scrollbar">
      <div className="tt-head-row">
      <div className="tt-corner" />
      {days.map((day) => (
        <div
          key={day.key}
          className={`tt-headcell${day.isToday ? ' is-today' : ''}${day.holiday ? ' is-off' : ''}${day.isPast ? ' is-past' : ''}`}
        >
          <span className="tt-dow">{day.key}</span>
          <span className={`tt-dom${day.isToday ? ' is-today' : ''}`}>{day.dayNum}</span>
          {day.holiday ? <span className="tt-holiday">{day.holiday}</span> : null}
        </div>
      ))}
      </div>

      {rows.map((row) => {
        if (row.kind === 'lunch') {
          return (
            <div key="lunch" className="tt-lunch-row">
              <div className="tt-time" />
              <div className="tt-lunch">점심시간</div>
            </div>
          )
        }
        const isCurrentPeriod = currentPeriod != null && row.period === currentPeriod
        return (
          <div key={row.period} className={`tt-period-row${isCurrentPeriod ? ' is-now-row' : ''}`}>
            <div className="tt-time">
              <span className="tt-period-num">{row.period}교시</span>
              <span className="tt-period-clock">{clockOf(row.period)}</span>
            </div>
            {days.map((day) => {
              const cell = timetable.byDay?.[day.key]?.[row.period] ?? null
              const lessons = lessonsOf(cell)
              const crowded = lessons.length > 1
              const preview = crowded ? lessons.slice(0, CROWD_PREVIEW) : []
              const hiddenCount = crowded ? lessons.length - preview.length : 0
              const key = cellSlotKey(day.key, row.period)
              const dragging = dragFrom && cellSlotKey(dragFrom.day, dragFrom.period) === key
              const hovered = hoverKey === key && dragFrom
              const rejected = hovered && hoverReason
              const isNowSlot = Boolean(day.isToday && isCurrentPeriod)
              const status = cell && !crowded ? statusMeta(cell) : null
              const subjectColor = cell && !crowded
                ? resolveSubjectColor({
                    id: cell.subjectId,
                    name: cell.subject,
                  })
                : null
              const className = [
                'tt-slot',
                day.isToday ? 'is-today' : '',
                isNowSlot ? 'is-now' : '',
                day.holiday ? 'is-off' : '',
                day.isPast ? 'is-past' : '',
                selectedKey === key ? 'is-selected' : '',
                dragging ? 'is-drag' : '',
                hovered && !rejected ? 'is-allow' : '',
                rejected ? 'is-reject' : '',
                cell ? 'has-subject' : '',
                crowded ? 'is-crowd' : '',
                status ? status.className : '',
              ].filter(Boolean).join(' ')
              const style = subjectColor
                ? {
                    background: subjectColor.bg,
                    color: subjectColor.text,
                    '--tt-subject-text': subjectColor.text,
                  }
                : undefined
              return (
                <button
                  key={key}
                  type="button"
                  className={className}
                  style={style}
                  draggable={editing && Boolean(cell) && !crowded}
                  title={rejected ? hoverReason : undefined}
                  aria-label={crowded ? `${day.key}요일 ${row.period}교시, ${lessons.length}학급` : undefined}
                  onClick={() => onSelect?.({ day: day.key, period: row.period })}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData('text/plain', key)
                    onDragStart?.({ day: day.key, period: row.period })
                  }}
                  onDragOver={(event) => {
                    if (!editing || !dragFrom) return
                    event.preventDefault()
                    onDragHover?.({ day: day.key, period: row.period })
                  }}
                  onDrop={(event) => {
                    if (!editing) return
                    event.preventDefault()
                    onDrop?.({ day: day.key, period: row.period })
                  }}
                  onDragEnd={() => onDragEnd?.()}
                >
                  {crowded ? (
                    <>
                      <span className="tt-crowd-count">{lessons.length}학급</span>
                      <span className="tt-chips">
                        {preview.map((lesson, index) => {
                          const color = resolveSubjectColor({
                            id: lesson.subjectId,
                            name: lesson.subject,
                          })
                          return (
                            <span
                              key={lesson.id ?? `${chipLabel(lesson)}-${index}`}
                              className="tt-chip"
                              style={{ background: color.bg, color: color.text }}
                            >
                              {chipLabel(lesson)}
                            </span>
                          )
                        })}
                      </span>
                      {hiddenCount > 0 ? <span className="tt-chip-more">+{hiddenCount}</span> : null}
                    </>
                  ) : cell ? (
                    <>
                      <span className="tt-subject">{cell.subject || '수업'}</span>
                      {subline(cell, detailMode) ? <span className="tt-sub">{subline(cell, detailMode)}</span> : null}
                      {status ? <span className={`tt-badge ${status.className}`}>{status.label}</span> : null}
                    </>
                  ) : showFreeLabel ? (
                    <span className="tt-free">—</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
