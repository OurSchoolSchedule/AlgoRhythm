import { useState } from 'react'
import { useHomeDirectory } from '@/hooks/homeReads'
import { useHomeSession } from '@/hooks/useHomeSession'
import type { HomeTerm } from '@/types/datedLesson'
import type { DayOfWeek } from '@/types/common.js'
import type { TeachingSlot, GenerationRequest } from '@/types/generationJob'
import type { ValidatedLoad } from '@/types/loadValidation'
import { days, weekday } from './generationOptions'
import './teacher-preferences.css'

type Preference = NonNullable<GenerationRequest['preferences']>[number]
interface Props {
  term: HomeTerm
  receipt: ValidatedLoad
  slots: TeachingSlot[]
  preferences: Preference[]
  onChange: (next: Preference[]) => void
}
function slotKey(s: TeachingSlot) {
  return s.day + '/' + s.period
}
function groupKey(group: TeachingSlot[]) {
  return group.map(slotKey).sort().join(',')
}
function slotLabel(s: TeachingSlot) {
  return weekday[s.day] + '요일 ' + s.period + '교시'
}

export default function TeacherPreferences({ term, receipt, slots, preferences, onChange }: Props) {
  const members = useHomeDirectory(useHomeSession(), true, term.termId)
  const [teacher, setTeacher] = useState('')
  const [day, setDay] = useState<DayOfWeek>('MON')
  const [period, setPeriod] = useState(0)
  const [kind, setKind] = useState<Preference['kind']>('WANT')
  const [mode, setMode] = useState('single')
  const [checked, setChecked] = useState<string[]>([])
  const teachers = [...new Set(receipt.demands.map((r) => r.teacherId))]
  const teacherName = (id: string) =>
    members.data?.find((m) => String(m.schoolUserId) === id)?.username ?? '교사 #' + id
  const selectedTeacher = teachers.includes(teacher) ? teacher : teachers[0]
  const selectedDay = slots.some((s) => s.day === day) ? day : slots[0]?.day
  const dayPeriods = slots.filter((s) => s.day === selectedDay)
  const selectedSlot = dayPeriods.find((s) => s.period === period) ?? dayPeriods[0]
  const selected =
    mode === 'group'
      ? slots.filter((s) => checked.includes(slotKey(s)))
      : selectedSlot
        ? [selectedSlot]
        : []
  const selectedKey = groupKey(selected)
  const duplicate = preferences.some(
    (p) => p.teacherId === selectedTeacher && p.kind === kind && groupKey(p.anyOf) === selectedKey,
  )
  const canAdd = selectedTeacher && selected.length >= (mode === 'group' ? 2 : 1) && !duplicate

  return (
    <details className="teacher-preferences">
      <summary>교사별 시간 선호 (선택)</summary>
      <div className="work-row">
        <label>
          교사
          <select value={selectedTeacher ?? ''} onChange={(e) => setTeacher(e.target.value)}>
            {teachers.map((t) => (
              <option key={t} value={t}>
                {teacherName(t)}
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
        <label>
          선호 입력 방식
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="single">교시별로 각각 평가</option>
            <option value="group">여러 교시 중 하나로 평가</option>
          </select>
        </label>
        {mode === 'single' && (
          <>
            <label>
              선호 요일
              <select
                value={selectedDay ?? ''}
                onChange={(e) => setDay(e.target.value as DayOfWeek)}
              >
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
              <select
                value={selectedSlot?.period ?? ''}
                onChange={(e) => setPeriod(Number(e.target.value))}
              >
                {dayPeriods.map((s) => (
                  <option key={s.period} value={s.period}>
                    {s.period}교시
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      {mode === 'group' && (
        <fieldset className="wish-group">
          <legend>함께 평가할 교시 선택</legend>
          <p>
            {kind === 'WANT'
              ? '선택한 교시 중 하나라도 수업이 배정되면 희망 1건을 충족합니다.'
              : '선택한 교시 중 하나라도 비면 기피 1건을 회피합니다.'}{' '}
            교시를 두 개 이상 선택하세요.
          </p>
          {days
            .filter((d) => slots.some((s) => s.day === d))
            .map((d) => (
              <div className="wish-day" key={d}>
                <strong>{weekday[d]}요일</strong>
                {slots
                  .filter((s) => s.day === d)
                  .map((s) => {
                    const key = slotKey(s)
                    return (
                      <label key={key}>
                        <input
                          type="checkbox"
                          aria-label={slotLabel(s)}
                          checked={checked.includes(key)}
                          onChange={(e) =>
                            setChecked(
                              e.target.checked
                                ? [...checked, key]
                                : checked.filter((k) => k !== key),
                            )
                          }
                        />
                        {s.period}교시
                      </label>
                    )
                  })}
              </div>
            ))}
        </fieldset>
      )}
      <div className="work-row">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            if (canAdd) {
              onChange([...preferences, { teacherId: selectedTeacher, kind, anyOf: selected }])
              setChecked([])
            }
          }}
        >
          선호 추가
        </button>
        {duplicate && <small role="status">이미 등록한 선호입니다.</small>}
      </div>
      <ul>
        {preferences.map((p, i) => (
          <li key={[p.teacherId, p.kind, groupKey(p.anyOf)].join(':')}>
            {teacherName(p.teacherId)} · {p.kind === 'WANT' ? '희망' : '기피'} ·{' '}
            {p.anyOf.map(slotLabel).join(' 또는 ')}{' '}
            <button
              type="button"
              aria-label={
                teacherName(p.teacherId) +
                ' ' +
                p.anyOf.map(slotLabel).join(' 또는 ') +
                ' ' +
                (p.kind === 'WANT' ? '희망' : '기피') +
                ' 삭제'
              }
              onClick={() => onChange(preferences.filter((_, index) => index !== i))}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
