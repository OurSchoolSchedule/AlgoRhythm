import { useState } from 'react'
import { usePeriodSettings } from '@/hooks/useSchoolSetting'
import TeacherPreferences from './TeacherPreferences'
import { useSchoolClasses } from '@/hooks/useSchoolCatalog'
import type { HomeTerm } from '@/types/datedLesson'
import type {
  GenerationRequest,
  GenerationObjective,
  GradeLastPeriods,
} from '@/types/generationJob'
import type { ValidatedLoad } from '@/types/loadValidation'
import { schoolWeekdays, objectives, weekday } from './generationOptions'

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
  const [overrides, setOverrides] = useState<
    Record<number, Partial<GradeLastPeriods['lastPeriods']>>
  >({})
  const [selectedGrade, setSelectedGrade] = useState<number>()
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [objective, setObjective] = useState<GenerationObjective>('BALANCED')
  const [confirmed, setConfirmed] = useState('')

  if (periods.isError || classes.isError) {
    return (
      <p role="alert">
        {periods.isError ? '학교 교시' : '학급 명부'}를 불러오지 못했습니다.{' '}
        <button
          onClick={() => {
            void periods.refetch()
            void classes.refetch()
          }}
        >
          다시 조회
        </button>
      </p>
    )
  }
  if (periods.isLoading || classes.isLoading) return <p role="status">학급과 학교 교시 조회 중</p>
  const numbers = (periods.data ?? []).map((p) => p.periodNumber).sort((a, b) => a - b)
  if (!numbers.length) return <p role="status">학교 설정에서 교시를 먼저 등록하세요.</p>
  if (
    numbers.some((n) => !Number.isSafeInteger(n) || n <= 0) ||
    new Set(numbers).size !== numbers.length
  )
    return <p role="alert">학교 교시 설정에서 교시 번호와 중복을 확인하세요.</p>
  const rooms = classes.data ?? []
  if (!rooms.length) return <p role="alert">{term.academicYear}학년도 학급을 먼저 등록하세요.</p>
  if (rooms.some((r) => !Number.isSafeInteger(r.grade) || r.grade <= 0))
    return <p role="alert">학급 명부에서 학년을 확인하세요.</p>
  const totals = new Map<string, number>(rooms.map((r) => [String(r.id), 0]))
  for (const demand of receipt.demands) {
    const count = totals.get(demand.classId)
    if (count === undefined)
      return (
        <p role="alert">
          시수표의 학급 #{demand.classId}을 이 학기의 명부에서 찾을 수 없습니다. 학급 명부와 파일을
          확인하세요.
        </p>
      )
    totals.set(demand.classId, count + demand.weeklyPeriods)
  }

  const grades = [...new Set(rooms.map((r) => r.grade))].sort((a, b) => a - b)
  const grade =
    selectedGrade !== undefined && grades.includes(selectedGrade) ? selectedGrade : grades[0]
  const max = numbers[numbers.length - 1]
  const gradeLastPeriods = grades.map((grade) => ({
    grade,
    lastPeriods: {
      MON: max,
      TUE: max,
      WED: max,
      THU: max,
      FRI: max,
      ...overrides[grade],
    },
  }))
  const limits = gradeLastPeriods.find((g) => g.grade === grade)!.lastPeriods
  const capacities = new Map(
    gradeLastPeriods.map(({ grade, lastPeriods }) => [
      grade,
      schoolWeekdays.reduce(
        (sum, day) => sum + numbers.filter((n) => n <= lastPeriods[day]).length,
        0,
      ),
    ]),
  )
  const invalidLimit = gradeLastPeriods.find(({ lastPeriods }) =>
    Object.values(lastPeriods).some((n) => n !== 0 && !numbers.includes(n)),
  )
  const slots = schoolWeekdays.flatMap((day) =>
    numbers
      .filter((n) => gradeLastPeriods.some((g) => n <= g.lastPeriods[day]))
      .map((period) => ({ day, period })),
  )
  const invalidPreference = preferences.some((pref) =>
    pref.anyOf.some((s) => !slots.some((slot) => slot.day === s.day && slot.period === s.period)),
  )
  const rows = rooms
    .map((room) => {
      const id = String(room.id)
      const hours = totals.get(id)!
      const capacity = capacities.get(room.grade)!
      return {
        id,
        hours,
        capacity,
        label: `${room.grade}학년 ${room.classNumber}반`,
        free: capacity - hours,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'ko', { numeric: true }))
  const excess = rows.some((r) => r.free < 0)
  const gaps = rows.some((r) => r.free > 0)
  const layoutKey = JSON.stringify([gradeLastPeriods, rows])
  const ready =
    slots.length > 0 &&
    slots.length <= 128 &&
    !invalidLimit &&
    !excess &&
    !invalidPreference &&
    (!gaps || confirmed === layoutKey)

  return (
    <fieldset disabled={locked} className="generation-conditions">
      <legend>요일별 마지막 교시</legend>
      <div className="work-row">
        <label>
          편성 학년
          <select value={grade} onChange={(e) => setSelectedGrade(Number(e.target.value))}>
            {grades.map((n) => (
              <option key={n} value={n}>
                {n}학년
              </option>
            ))}
          </select>
        </label>
        <strong>
          {grade}학년 · 주간 배치 가능 교시 {capacities.get(grade)}칸
        </strong>
      </div>
      <div className="generation-days">
        {schoolWeekdays.map((d) => (
          <label key={d}>
            {weekday[d]}요일
            <select
              aria-label={weekday[d] + '요일 마지막 교시'}
              value={limits[d]}
              onChange={(e) => {
                const value = Number(e.target.value)
                setOverrides((prev) => ({
                  ...prev,
                  [grade]: { ...prev[grade], [d]: value },
                }))
                setConfirmed('')
                onEdit()
              }}
            >
              {limits[d] !== 0 && !numbers.includes(limits[d]) && (
                <option value={limits[d]} disabled>
                  {limits[d]}교시 (삭제됨)
                </option>
              )}
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
        학교 전체 필요 시수 {rows.reduce((sum, r) => sum + r.hours, 0)}
        차시
      </p>
      <details open={excess || undefined}>
        <summary>학급별 필요 시수 ({rows.length}개 학급)</summary>
        <ul>
          {rows.map((r) => (
            <li key={r.id}>
              {r.label} · {r.capacity}칸 중 {r.hours}차시 ·{' '}
              {r.free < 0 ? `${-r.free}차시 초과` : r.free ? `공강 ${r.free}칸` : '모두 배치'}
            </li>
          ))}
        </ul>
      </details>
      {invalidLimit && (
        <p role="alert">
          {invalidLimit.grade}학년의 마지막 교시가 학교 설정에서 변경되었습니다. 다시 선택하세요.
        </p>
      )}
      {excess && (
        <p role="alert">
          필요 시수가 운영 칸을 초과한 학급이 있습니다. 교시 또는 시수표를 조정하세요.
        </p>
      )}
      {!slots.length && <p role="alert">주간 운영 교시를 한 칸 이상 선택하세요.</p>}
      {slots.length > 128 && <p role="alert">주간 운영 교시는 최대 128칸입니다.</p>}
      {!excess && gaps && (
        <div className="generation-confirm">
          {rows
            .filter((r) => r.free > 0)
            .map((r) => (
              <p key={r.id}>
                {r.label}은 {r.capacity}칸 중 {r.hours}차시를 배치해 공강 {r.free}칸이 생깁니다.
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
              gradeLastPeriods,
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
