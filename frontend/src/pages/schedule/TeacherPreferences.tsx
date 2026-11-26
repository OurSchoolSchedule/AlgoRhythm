import { useState } from 'react'
import { useHomeDirectory } from '@/hooks/homeReads'
import { useHomeSession } from '@/hooks/useHomeSession'
import type { HomeTerm } from '@/types/datedLesson'
import type { DayOfWeek } from '@/types/common.js'
import type { TeachingSlot, GenerationRequest } from '@/types/generationJob'
import type { ValidatedLoad } from '@/types/loadValidation'
import { days, weekday } from './generationOptions'

type Preference = NonNullable<GenerationRequest['preferences']>[number]
interface Props {
  term: HomeTerm
  receipt: ValidatedLoad
  slots: TeachingSlot[]
  preferences: Preference[]
  onChange: (next: Preference[]) => void
}
export default function TeacherPreferences({ term, receipt, slots, preferences, onChange }: Props) {
  const members = useHomeDirectory(useHomeSession(), true, term.termId)
  const [teacher, setTeacher] = useState('')
  const [day, setDay] = useState<DayOfWeek>('MON')
  const [period, setPeriod] = useState(0)
  const [kind, setKind] = useState<Preference['kind']>('WANT')
  const teachers = [...new Set(receipt.demands.map((r) => r.teacherId))]
  const teacherName = (id: string) =>
    members.data?.find((m) => String(m.schoolUserId) === id)?.username ?? '교사 #' + id
  const selectedTeacher = teacher || teachers[0]
  const selectedDay = slots.some((s) => s.day === day) ? day : slots[0]?.day
  const dayPeriods = slots.filter((s) => s.day === selectedDay)
  const selectedPeriod = dayPeriods.some((s) => s.period === period)
    ? period
    : dayPeriods[0]?.period
  const duplicate = preferences.some(
    (p) =>
      p.teacherId === selectedTeacher &&
      p.kind === kind &&
      p.anyOf[0].day === selectedDay &&
      p.anyOf[0].period === selectedPeriod,
  )

  return (
    <details>
      <summary>교사별 시간 선호 (선택)</summary>
      <div className="work-row">
        <label>
          교사
          <select value={selectedTeacher} onChange={(e) => setTeacher(e.target.value)}>
            {teachers.map((t) => (
              <option key={t} value={t}>
                {teacherName(t)}
              </option>
            ))}
          </select>
        </label>
        <label>
          선호 요일
          <select value={selectedDay ?? ''} onChange={(e) => setDay(e.target.value as DayOfWeek)}>
            {days
              .filter((d) => slots.some((s) => s.day === d))
              .map((d) => (
                <option key={d} value={d}>
                  {weekday[d]}요일
                </option>
              ))}
          </select>
        </label>
        <label>
          선호 교시
          <select value={selectedPeriod ?? ''} onChange={(e) => setPeriod(Number(e.target.value))}>
            {dayPeriods.map((s) => (
              <option key={s.period} value={s.period}>
                {s.period}교시
              </option>
            ))}
          </select>
        </label>
        <label>
          선호 유형
          <select value={kind} onChange={(e) => setKind(e.target.value as Preference['kind'])}>
            <option value="WANT">희망</option>
            <option value="AVOID">기피</option>
          </select>
        </label>
        <button
          disabled={!selectedTeacher || !selectedDay || !selectedPeriod || duplicate}
          onClick={() => {
            onChange([
              ...preferences,
              {
                teacherId: selectedTeacher,
                kind,
                anyOf: [{ day: selectedDay, period: selectedPeriod }],
              },
            ])
          }}
        >
          선호 추가
        </button>
      </div>
      <ul>
        {preferences.map((p, i) => (
          <li key={[p.teacherId, p.kind, p.anyOf[0].day, p.anyOf[0].period].join('/')}>
            {teacherName(p.teacherId)} · {weekday[p.anyOf[0].day]} {p.anyOf[0].period}교시{' '}
            {p.kind === 'WANT' ? '희망' : '기피'}{' '}
            <button
              onClick={() => {
                onChange(preferences.filter((_, index) => index !== i))
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
