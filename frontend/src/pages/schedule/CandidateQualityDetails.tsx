import { candidateQuality } from './candidateQuality'
import { days, weekday } from './generationOptions'
import './candidate-quality.css'

type Props = {
  quality: ReturnType<typeof candidateQuality>
  className: (id: string) => string
  subjectName: (id: string) => string
  teacherName: (id: string) => string
}
const names = new Intl.Collator('ko', { numeric: true })
function periodList(periods: number[]) {
  return [...periods].sort((a, b) => a - b).join('·') + '교시'
}

export default function CandidateQualityDetails({
  quality,
  className,
  subjectName,
  teacherName,
}: Props) {
  const concentrated = [...quality.concentrated].sort(
    (a, b) =>
      b.slots.length - a.slots.length ||
      names.compare(className(a.classId), className(b.classId)) ||
      names.compare(subjectName(a.subjectId), subjectName(b.subjectId)),
  )
  const longDays = [...quality.longDays].sort(
    (a, b) =>
      b.periods.length - a.periods.length ||
      names.compare(teacherName(a.teacherId), teacherName(b.teacherId)) ||
      days.indexOf(a.day) - days.indexOf(b.day),
  )

  return (
    <div className="candidate-quality">
      <details>
        <summary>주간 시수가 하루에 모인 학급·과목 {concentrated.length}건</summary>
        <p>학급별로 주 2차시 이상인 과목 {quality.eligibleSubjects}건을 확인했습니다.</p>
        {concentrated.length > 0 && (
          <ul>
            {concentrated.map(({ classId, subjectId, slots }) => (
              <li key={JSON.stringify([classId, subjectId])}>
                {className(classId)} · {subjectName(subjectId)} · {weekday[slots[0].day]}요일{' '}
                {periodList(slots.map((s) => s.period))} (주 {slots.length}차시)
              </li>
            ))}
          </ul>
        )}
      </details>
      <details>
        <summary>하루 6차시 이상인 교사·요일 {longDays.length}건</summary>
        <p>같은 교사가 이틀간 각각 6차시를 맡으면 2건으로 셉니다.</p>
        {longDays.length > 0 && (
          <ul>
            {longDays.map(({ teacherId, day, periods }) => (
              <li key={JSON.stringify([teacherId, day])}>
                {teacherName(teacherId)} · {weekday[day]}요일 {periodList(periods)} (
                {periods.length}차시)
              </li>
            ))}
          </ul>
        )}
      </details>
    </div>
  )
}
