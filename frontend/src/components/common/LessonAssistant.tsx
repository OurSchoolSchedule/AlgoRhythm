import { useRef, useState, useEffect, type RefObject } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getDatedLessons } from '@/api/home'
import { createLessonChange, createSubstituteBatch, getLessonChanges } from '@/api/lessonChanges'
import { useChangeCandidates } from '@/hooks/useLessonChanges'
import { lessonDayKey } from '@/hooks/lessonChangeCache'
import { useHomeDirectory } from '@/hooks/homeReads'
import { useHomeSession, useScopedRead, type HomeSession } from '@/hooks/useHomeSession'
import { assertHiredSchool } from '@/hooks/useSchoolTerm'
import { useTermChoice } from '@/hooks/useTermChoice'
import { usePeriodSettings } from '@/hooks/useSchoolSetting'
import { useSchoolClasses, useSubjects } from '@/hooks/useSchoolCatalog'
import { queryKeys } from '@/hooks/queryKeys.js'
import { schoolDate } from '@/utils/homeContract'
import { getSchoolWeekRange } from '@/utils/weekRange.js'
import { operationError } from '@/utils/operationInputs'
import type { DatedLessonDto, HomeTerm } from '@/types/datedLesson'
import type { RegisteredTerm } from '@/api/terms'
import './lesson-assistant.css'

type Intent = 'MY_WEEK' | 'COVER_OPTIONS' | 'SWAP_OPTIONS' | 'CHANGE_STATUS'
interface Filters {
  schoolId: number
  userId: number
  date?: string
  periodNumber?: number
  teacherName?: string
}
type Command = { intentType: Intent; preview: Filters }
const states: Record<string, string> = {
  PENDING: '응답 대기',
  ACCEPTED: '수락 · 관리자 승인 대기',
  APPROVED: '승인 완료',
  REJECTED: '거절',
  WITHDRAWN: '마감',
}
type ReviewButton = RefObject<HTMLButtonElement | null>
type Option = { id: number; rev?: number; label: string }

function weekdays(date: string) {
  const { start } = getSchoolWeekRange(new Date(date + 'T12:00:00'))
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(start + 'T12:00:00Z')
    day.setUTCDate(day.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

export default function LessonAssistant({
  command,
  reviewButton,
}: {
  command: Command
  reviewButton: ReviewButton
}) {
  const session = useHomeSession()
  const allowed =
    session.access.actions.requestSwap &&
    command.preview.userId === session.userId &&
    command.preview.schoolId === session.scope.schoolId
  const choice = useTermChoice(session, allowed)
  if (!allowed) return <p>현재 학교와 재직 교사 권한을 확인하세요.</p>
  if (choice.list.isError) return <p role="alert">{operationError(choice.list.error)}</p>
  if (choice.list.isPending) return <p>학기 조회 중…</p>
  const term = choice.term
  const bounds = choice.terms.find((t) => t.termId === term?.termId)
  if (!term || !bounds) return <p>먼저 학교의 업무 학기를 등록하세요.</p>
  return (
    <div className="lesson-assistant">
      <label>
        업무 학기{' '}
        <select
          value={term.termId}
          onChange={(e) => {
            const next = choice.terms.find((t) => t.termId === Number(e.target.value))
            if (next) choice.saveChoice(next)
          }}
        >
          {choice.terms.map((t) => (
            <option key={t.termId} value={t.termId}>
              {t.academicYear}학년도 {t.semester}학기 · {t.startDate}
            </option>
          ))}
        </select>
      </label>
      <LessonQuery
        key={JSON.stringify([term.termId, session.scope, command])}
        {...{ term, bounds, session, command, reviewButton }}
      />
    </div>
  )
}

function LessonQuery({
  term,
  bounds,
  session,
  command,
  reviewButton,
}: {
  reviewButton: ReviewButton
  term: HomeTerm
  bounds: RegisteredTerm
  session: HomeSession
  command: Command
}) {
  const { preview, intentType } = command
  const today = schoolDate(new Date())
  const [date, setDate] = useState(preview.date ?? today)
  const [period, setPeriod] = useState(preview.periodNumber ?? 0)
  const [selected, setSelected] = useState('')
  const weekly = intentType === 'MY_WEEK'
  const status = intentType === 'CHANGE_STATUS'
  const dates = (weekly && date ? weekdays(date) : [date]).filter(
    (d) => bounds.startDate <= d && d <= bounds.endDate,
  )
  const directory = useHomeDirectory(session, true, term.termId)
  const periods = usePeriodSettings()
  const subjects = useSubjects()
  const classes = useSchoolClasses(term.academicYear)
  const days = useScopedRead(
    session,
    ['assistant-lessons', term.termId, ...dates],
    !status && dates.length > 0,
    async (signal) => (await Promise.all(dates.map((d) => getDatedLessons(term.termId, d, signal)))).flat(),
    { retry: false },
  )
  const requests = useScopedRead(
    session,
    queryKeys.home.lessonChanges(term.termId),
    status,
    (signal) => getLessonChanges(term.termId, signal),
    { retry: false },
  )
  const people = directory.data ?? []
  const me = people.find((p) => p.userId === session.userId)?.schoolUserId
  const teacher = (id: number) => {
    const row = people.find((p) => p.schoolUserId === id)
    return row?.displayName || row?.username || '교사 #' + id
  }
  const periodOf = (r: DatedLessonDto) => periods.data?.find((p) => p.id === r.actual.periodId)?.periodNumber
  function label(r: DatedLessonDto) {
    const room = classes.data?.find((c) => c.id === r.classId)
    return [
      r.date,
      periodOf(r) ? periodOf(r) + '교시' : '교시 #' + r.actual.periodId,
      room ? room.grade + '-' + room.classNumber + '반' : '학급 #' + r.classId,
      subjects.data?.find((s) => s.id === r.subjectId)?.name || '과목 #' + r.subjectId,
    ].join(' · ')
  }
  const stamp = (r: DatedLessonDto) => r.id + '/' + r.rev
  const rows = (days.data ?? [])
    .filter((r) => r.actual.teacherId === me && !r.actual.cancelled && (!period || periodOf(r) === period))
    .sort((a, b) => a.date.localeCompare(b.date) || (periodOf(a) ?? 0) - (periodOf(b) ?? 0))
  const first = rows.find((r) => stamp(r) === selected)
  const error = directory.error || (status ? requests.error : days.error)
  if (error) return <p role="alert">{operationError(error)}</p>
  if (directory.isPending) return <p>학교 명부 조회 중…</p>
  if (!me) return <p>본인과 연결된 교사 명부를 확인하세요.</p>
  if (status) {
    const mine = requests.data?.filter((r) => r.requester === me)
    if (!mine) return <p>처리 상태 조회 중…</p>
    return mine.length ? (
      <ul>
        {mine.map((r) => (
          <li key={r.id}>
            #{r.id} {r.kind === 'SWAP' ? '교환' : '보결'} · {teacher(r.responder)} ·{' '}
            {states[r.state] ?? r.state}
          </li>
        ))}
      </ul>
    ) : (
      <p>이 학기에 보낸 요청이 없습니다.</p>
    )
  }
  return (
    <>
      <label>
        {weekly ? '조회할 주간의 날짜' : '내 수업 날짜'}{' '}
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value)
            setSelected('')
          }}
        />
      </label>
      <label>
        교시{' '}
        <select
          value={period}
          onChange={(e) => {
            setPeriod(Number(e.target.value))
            setSelected('')
          }}
        >
          <option value={0}>모든 교시</option>
          {(periods.data ?? []).map((p) => (
            <option key={p.id} value={p.periodNumber}>
              {p.periodNumber}교시
            </option>
          ))}
        </select>
      </label>
      {!dates.length ? (
        <p>
          학기 기간 {bounds.startDate} ~ {bounds.endDate} 중 날짜를 선택하세요.
        </p>
      ) : days.isPending ? (
        <p>게시 수업 조회 중…</p>
      ) : !rows.length ? (
        <p>해당 기간과 교시에 본인의 게시 수업이 없습니다.</p>
      ) : weekly ? (
        <ul>
          {rows.map((r) => (
            <li key={r.id}>{label(r)}</li>
          ))}
        </ul>
      ) : (
        <label>
          내 수업{' '}
          <select aria-label="내 수업" value={first ? stamp(first) : ''} onChange={(e) => setSelected(e.target.value)}>
            <option value="">수업 선택</option>
            {rows.map((r) => (
              <option key={r.id} value={stamp(r)}>
                {label(r)}
              </option>
            ))}
          </select>
        </label>
      )}
      {first && (
        <Candidates
          key={stamp(first)}
          {...{ term, session, first, label, teacher, reviewButton }}
          swap={intentType === 'SWAP_OPTIONS'}
          teacherFilter={preview.teacherName ?? ''}
        />
      )}
    </>
  )
}

function Candidates({
  term,
  session,
  first,
  label,
  teacher,
  swap,
  teacherFilter,
  reviewButton,
}: {
  reviewButton: ReviewButton
  term: HomeTerm
  session: HomeSession
  first: DatedLessonDto
  swap: boolean
  teacherFilter: string
  label: (row: DatedLessonDto) => string
  teacher: (id: number) => string
}) {
  const [date, setDate] = useState(first.date)
  const [search, setSearch] = useState(teacherFilter)
  const [ids, setIds] = useState<number[]>([])
  const [review, setReview] = useState<Option[] | null>(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const cache = useQueryClient()
  const lease = useRef<AbortController | null>(null)
  const sending = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    lease.current = controller
    return () => controller.abort()
  }, [])
  const candidates = useChangeCandidates(
    term,
    swap && !date ? undefined : first,
    swap ? 'SWAP' : 'SUBSTITUTE',
    swap ? date || undefined : undefined,
  )
  const targets = useScopedRead(
    session,
    lessonDayKey(term.termId, date),
    swap && !!date,
    (signal) => getDatedLessons(term.termId, date, signal),
    { retry: false },
  )
  const matches = new Set(candidates.data ?? [])
  const all: Option[] = swap
    ? (targets.data ?? [])
        .filter((row) => matches.has(row.id))
        .map((row) => ({
          id: row.id,
          rev: row.rev,
          label: teacher(row.actual.teacherId) + ' · ' + label(row),
        }))
    : [...matches].map((id) => ({ id, label: teacher(id) }))
  const options = all.filter((option) => option.label.includes(search.trim()))
  const selected = options.filter((option) => ids.includes(option.id))
  const stale = review !== null && JSON.stringify(selected) !== JSON.stringify(review)
  const candidateError = candidates.error || (swap && targets.error)
  async function submit() {
    const signal = lease.current?.signal
    if (
      !signal ||
      signal.aborted ||
      sending.current ||
      result ||
      !review ||
      !selected.length ||
      selected.length !== ids.length ||
      stale ||
      candidateError
    )
      return
    sending.current = true
    setPending(true)
    try {
      assertHiredSchool(cache, session)
      const receipts = swap
        ? [
            await createLessonChange(
              term.termId,
              {
                kind: 'SWAP',
                firstId: first.id,
                firstRev: first.rev,
                secondId: review[0].id,
                secondRev: review[0].rev!,
              },
              signal,
            ),
          ]
        : await createSubstituteBatch(term.termId, first.id, first.rev, ids, signal)
      void cache.invalidateQueries({
        queryKey: [...queryKeys.home.lessonChanges(term.termId), session.scope],
      })
      if (!signal.aborted) setResult('접수 완료 · 응답 대기 ' + receipts.map((r) => '#' + r.id).join(', '))
    } catch (err) {
      if (!signal.aborted) {
        setError(operationError(err) + ' 현재 요청 상태와 최신 후보를 확인하세요.')
        setReview(null)
        setIds([])
        void candidates.refetch()
      }
    } finally {
      sending.current = false
      if (!signal.aborted) setPending(false)
    }
  }
  if (result) return <p role="status">{result}</p>
  if (stale)
    return (
      <p role="alert">
        후보가 변경되었습니다.{' '}
        <button
          onClick={() => {
            setReview(null)
            setIds([])
          }}
        >
          다시 선택
        </button>
      </p>
    )
  return (
    <fieldset disabled={pending}>
      <legend>{swap ? '교환 가능한 수업' : '공강 교사'}</legend>
      {review ? (
        <>
          <p>
            {label(first)} → {review.map((o) => o.label).join(', ')}
          </p>
          <button type="button" onClick={() => void submit()}>
            {pending ? '접수 중…' : '확인하고 요청 보내기'}
          </button>
          <button type="button" onClick={() => setReview(null)}>
            돌아가기
          </button>
        </>
      ) : (
        <>
          {swap && (
            <label>
              상대 수업 날짜{' '}
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setIds([])
                }}
              />
            </label>
          )}
          <label>
            교사 검색{' '}
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setIds([])
              }}
            />
          </label>
          {candidateError ? (
            <p role="alert">{operationError(candidateError)}</p>
          ) : candidates.isPending || (swap && targets.isPending) ? (
            <p>후보 조회 중…</p>
          ) : !options.length ? (
            <p>조건에 맞는 후보가 없습니다.</p>
          ) : (
            options.map((o) => (
              <label key={o.id}>
                <input
                  type={swap ? 'radio' : 'checkbox'}
                  name="assistant-recipient"
                  checked={ids.includes(o.id)}
                  onChange={(e) =>
                    setIds(
                      swap ? [o.id] : e.target.checked ? [...ids, o.id] : ids.filter((id) => id !== o.id),
                    )
                  }
                />{' '}
                {o.label}
              </label>
            ))
          )}
          <button
            type="button"
            ref={reviewButton}
            disabled={!selected.length || !!candidateError}
            onClick={() => {
              setError('')
              setReview(selected)
            }}
          >
            요청 내용 확인
          </button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </fieldset>
  )
}
