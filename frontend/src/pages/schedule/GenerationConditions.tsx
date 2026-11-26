import { useState } from 'react'
import { usePeriodSettings } from '@/hooks/useSchoolSetting'
import TeacherPreferences from './TeacherPreferences'
import { useSchoolClasses } from '@/hooks/useSchoolCatalog'
import type { HomeTerm } from '@/types/datedLesson'
import type { DayOfWeek } from '@/types/common.js'
import type { GenerationRequest, GenerationObjective } from '@/types/generationJob'
import type { ValidatedLoad } from '@/types/loadValidation'
import { days, objectives, weekday } from './generationOptions'

interface Props {
  term: HomeTerm
  receipt: ValidatedLoad
  locked: boolean
  canStart: boolean
  onEdit: () => void
  onGenerate: (request: GenerationRequest) => void
}
type Preference = NonNullable<GenerationRequest['preferences']>[number]

export default function GenerationConditions({
  term,
  receipt,
  locked,
  canStart,
  onEdit,
  onGenerate,
}: Props) {
  const periods = usePeriodSettings()
  const classes = useSchoolClasses(term.academicYear)
  const [ends, setEnds] = useState<Partial<Record<DayOfWeek, number>>>({})
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [objective, setObjective] = useState<GenerationObjective>('BALANCED')
  const [confirmed, setConfirmed] = useState('')

  const numbers = (periods.data ?? []).map((p) => p.periodNumber).sort((a, b) => a - b)
  if (periods.isError) {
    return (
      <p role="alert">
        학교 교시를 불러오지 못했습니다.{' '}
        <button onClick={() => periods.refetch()}>다시 조회</button>
      </p>
    )
  }
  if (periods.isLoading) return <p role="status">학교 교시 조회 중</p>
  if (!numbers.length) return <p role="status">학교 설정에서 교시를 먼저 등록하세요.</p>
  const last = (day: DayOfWeek) => {
    const end = ends[day]
    if (end !== undefined) return numbers.filter((n) => n <= end).at(-1) ?? 0
    return ['SAT', 'SUN'].includes(day) ? 0 : numbers[numbers.length - 1]
  }
  const slots = days.flatMap((d) =>
    numbers.filter((n) => n <= last(d)).map((n) => ({ day: d, period: n })),
  )
  const inRange = (d: DayOfWeek, n: number) => slots.some((s) => s.day === d && s.period === n)
  const invalidPreference = preferences.some((p) => !inRange(p.anyOf[0].day, p.anyOf[0].period))
  const totals = new Map<string, number>()
  for (const r of receipt.demands)
    totals.set(r.classId, (totals.get(r.classId) ?? 0) + r.weeklyPeriods)
  const rows = [...totals]
    .map(([id, hours]) => {
      const room = classes.data?.find((c) => String(c.id) === id)
      return {
        id,
        hours,
        label: room ? `${room.grade}학년 ${room.classNumber}반` : '학급 #' + id,
        free: slots.length - hours,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'ko', { numeric: true }))
  const excess = rows.some((r) => r.free < 0)
  const gaps = rows.some((r) => r.free > 0)
  const layoutKey = JSON.stringify(slots)
  const ready =
    slots.length > 0 &&
    slots.length <= 128 &&
    !excess &&
    !invalidPreference &&
    (!gaps || confirmed === layoutKey)

  return (
    <fieldset disabled={locked} className="generation-conditions">
      <legend>요일별 마지막 교시</legend>
      <div className="generation-days">
        {days.map((d) => (
          <label key={d}>
            {weekday[d]}요일
            <select
              aria-label={weekday[d] + '요일 마지막 교시'}
              value={last(d)}
              onChange={(e) => {
                setEnds({ ...ends, [d]: Number(e.target.value) })
                setConfirmed('')
                onEdit()
              }}
            >
              <option value={0}>운영 안 함</option>
              {numbers.map((n) => (
                <option key={n} value={n}>
                  {n}교시
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p>
        학급당 주 {slots.length}칸 · 학교 전체 필요 시수 {rows.reduce((sum, r) => sum + r.hours, 0)}
        차시
      </p>
      <details open={excess || undefined}>
        <summary>학급별 필요 시수 ({rows.length}개 학급)</summary>
        <ul>
          {rows.map((r) => (
            <li key={r.id}>
              {r.label} · {slots.length}칸 중 {r.hours}차시 ·{' '}
              {r.free < 0 ? `${-r.free}차시 초과` : r.free ? `공강 ${r.free}칸` : '모두 배치'}
            </li>
          ))}
        </ul>
      </details>
      {excess && (
        <p role="alert">
          필요 시수가 운영 칸을 초과한 학급이 있습니다. 교시 또는 시수표를 조정하세요.
        </p>
      )}
      {slots.length > 128 && <p role="alert">주간 운영 교시는 최대 128칸입니다.</p>}
      {!excess && gaps && (
        <div className="generation-confirm">
          {rows
            .filter((r) => r.free > 0)
            .map((r) => (
              <p key={r.id}>
                {r.label}은 {slots.length}칸 중 {r.hours}차시를 배치해 공강 {r.free}칸이 생깁니다.
              </p>
            ))}
          <label>
            <input
              type="checkbox"
              checked={confirmed === layoutKey}
              onChange={(e) => setConfirmed(e.target.checked ? layoutKey : '')}
            />{' '}
            학급별 공강을 확인했습니다.
          </label>
        </div>
      )}
      <TeacherPreferences
        term={term}
        receipt={receipt}
        slots={slots}
        preferences={preferences}
        onChange={(next) => {
          setPreferences(next)
          onEdit()
        }}
      />
      {invalidPreference && (
        <p role="alert">운영하지 않는 교시의 선호를 삭제하거나 운영 교시를 늘리세요.</p>
      )}
      <label>
        후보 평가 기준 (선택)
        <select
          value={objective}
          onChange={(e) => {
            setObjective(e.target.value as GenerationObjective)
            onEdit()
          }}
        >
          {Object.entries(objectives).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="work-primary"
        disabled={!ready || !canStart}
        onClick={() => {
          if (ready && canStart && !locked)
            onGenerate({
              validatedLoadId: receipt.validatedLoadId,
              teachingSlots: slots,
              preferences,
              objective,
            })
        }}
      >
        후보 생성
      </button>
    </fieldset>
  )
}
