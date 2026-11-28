import { useState } from 'react'
import { TableScroll } from '@/components/ui/DetailPage'
import type { GradeLastPeriods, ScheduleCandidate, TeachingSlot } from '@/types/generationJob'
import { days, weekday } from './generationOptions'

interface Props {
  slots: TeachingSlot[]
  limits?: GradeLastPeriods['lastPeriods']
  registeredPeriods?: number[]
  placements: ScheduleCandidate['placements']
  target: '학급' | '교사'
  subjectName: (id: string) => string
  lessonDetail: (lesson: ScheduleCandidate['placements'][number]) => string
}
const cellKey = ({ day, period }: TeachingSlot) => day + '/' + period

export default function CandidateGrid({
  slots,
  limits,
  registeredPeriods,
  placements,
  target,
  subjectName,
  lessonDetail,
}: Props) {
  const [expanded, setExpanded] = useState('')
  const columns = days.filter((d) => !['SAT', 'SUN'].includes(d) || slots.some((s) => s.day === d))
  const periods = [...new Set(registeredPeriods ?? slots.map((s) => s.period))].sort(
    (a, b) => a - b,
  )
  const open = new Set(
    slots
      .filter(
        ({ day, period }) => !limits || (day !== 'SAT' && day !== 'SUN' && period <= limits[day]),
      )
      .map(cellKey),
  )
  const cells = new Map<string, ScheduleCandidate['placements']>()
  for (const lesson of placements) {
    const key = cellKey(lesson.slot)
    const group = cells.get(key)
    if (group) group.push(lesson)
    else cells.set(key, [lesson])
  }
  return (
    <TableScroll label={target + '별 배치'}>
      <table className="candidate-grid">
        <caption className="desk-sr">선택한 {target}의 주간 배치</caption>
        <thead>
          <tr>
            <th scope="col">교시</th>
            {columns.map((d) => (
              <th key={d} scope="col">
                {weekday[d]}요일
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p}>
              <th scope="row">{p}교시</th>
              {columns.map((day) => {
                const key = cellKey({ day, period: p })
                const lessons = cells.get(key)
                return (
                  <td key={day}>
                    {lessons ? (
                      <button
                        className="candidate-lesson"
                        type="button"
                        aria-expanded={expanded === key}
                        onClick={() => setExpanded(expanded === key ? '' : key)}
                      >
                        {lessons.length > 1 && <strong>중복 배정 {lessons.length}건</strong>}
                        {lessons.map((lesson, index) => (
                          <span key={index}>
                            <span>{subjectName(lesson.subjectId)}</span>{' '}
                            <small>{lessonDetail(lesson)}</small>
                          </span>
                        ))}
                      </button>
                    ) : (
                      <span className={open.has(key) ? 'candidate-free' : 'candidate-closed'}>
                        {open.has(key) ? '공강' : '수업 없음'}
                      </span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  )
}
