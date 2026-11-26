import { useState } from 'react'
import { TableScroll } from '@/components/ui/DetailPage'
import type { ScheduleCandidate, TeachingSlot } from '@/types/generationJob'
import { days, weekday } from './generationOptions'

interface Props {
  slots: TeachingSlot[]
  placements: ScheduleCandidate['placements']
  room: string
  subjectName: (id: string) => string
  teacherName: (id: string) => string
}
const cellKey = ({ day, period }: TeachingSlot) => day + '/' + period

export default function CandidateGrid({
  slots,
  placements,
  room,
  subjectName,
  teacherName,
}: Props) {
  const [expanded, setExpanded] = useState('')
  const columns = days.filter((d) => !['SAT', 'SUN'].includes(d) || slots.some((s) => s.day === d))
  const periods = [...new Set(slots.map((s) => s.period))].sort((a, b) => a - b)
  const open = new Set(slots.map(cellKey))
  const cells = new Map(
    placements.filter((p) => p.classId === room).map((p) => [cellKey(p.slot), p]),
  )
  return (
    <TableScroll label="학급별 배치">
      <table className="candidate-grid">
        <caption className="desk-sr">선택한 학급의 주간 배치</caption>
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
                const lesson = cells.get(key)
                return (
                  <td key={day}>
                    {lesson ? (
                      <button
                        className="candidate-lesson"
                        type="button"
                        aria-expanded={expanded === key}
                        onClick={() => setExpanded(expanded === key ? '' : key)}
                      >
                        <span>{subjectName(lesson.subjectId)}</span>
                        <small>{teacherName(lesson.teacherId)}</small>
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
