import type { GradeLastPeriods, SchoolWeekday } from '@/types/generationJob'
import { schoolWeekdays, weekday } from './generationOptions'
import './grade-period-matrix.css'

interface RoomLoad {
  grade: number
  classNumber: number
  hours: number
  capacity: number
}

interface Props {
  gradeLastPeriods: GradeLastPeriods[]
  periods: number[]
  rooms: RoomLoad[]
  onChange: (grade: number, day: SchoolWeekday, period: number) => void
}

function WeeklyBalance({ rooms }: { rooms: RoomLoad[] }) {
  const capacity = rooms[0].capacity
  const groups = new Map<number, number[]>()
  for (const { hours, classNumber } of rooms) {
    const group = groups.get(hours)
    if (group) group.push(classNumber)
    else groups.set(hours, [classNumber])
  }

  return [...groups].map(([hours, classNumbers]) => {
    const difference = hours - capacity
    return (
      <div className="grade-balance" key={hours}>
        {groups.size > 1 && <small>{classNumbers.join('·')}반</small>}
        <span className="grade-load">
          {capacity}칸 / {hours}차시
        </span>
        {difference === 0 ? (
          <span className="grade-match">
            <svg aria-hidden="true" viewBox="0 0 16 16" className="grade-check">
              <circle cx="8" cy="8" r="8" fill="currentColor" />
              <path d="m4.2 8.2 2.4 2.5 5.3-5.4" />
            </svg>
            일치
          </span>
        ) : difference > 0 ? (
          <span className="grade-excess">+{difference} 초과</span>
        ) : (
          <span className="grade-gap">{difference} 공강</span>
        )}
      </div>
    )
  })
}

export default function GradePeriodMatrix({ gradeLastPeriods, periods, rooms, onChange }: Props) {
  return (
    <div className="grade-period-wrap">
      <table className="grade-period-matrix" aria-label="학년별 요일별 마지막 교시">
        <thead>
          <tr>
            <th scope="col">학년</th>
            {schoolWeekdays.map((day) => (
              <th key={day} scope="col">
                {weekday[day]}
              </th>
            ))}
            <th scope="col">주간 배치 가능 교시 / 필요 차시</th>
          </tr>
        </thead>
        <tbody>
          {gradeLastPeriods.map(({ grade, lastPeriods }) => (
            <tr key={grade}>
              <th scope="row">{grade}학년</th>
              {schoolWeekdays.map((day) => (
                <td key={day}>
                  <select
                    aria-label={`${grade}학년 ${weekday[day]}요일 마지막 교시`}
                    value={lastPeriods[day]}
                    onChange={(e) => onChange(grade, day, Number(e.target.value))}
                  >
                    {lastPeriods[day] !== 0 && !periods.includes(lastPeriods[day]) && (
                      <option value={lastPeriods[day]} disabled>
                        {lastPeriods[day]} (삭제됨)
                      </option>
                    )}
                    <option value={0}>운영 안 함</option>
                    {periods.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
              <td>
                <WeeklyBalance rooms={rooms.filter((room) => room.grade === grade)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
