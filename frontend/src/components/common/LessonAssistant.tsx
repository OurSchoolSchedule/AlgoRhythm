import {
  useRef,
  useState,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { getDatedLessons } from '@/api/home'
import { createLessonChange, createSubstituteBatch, getLessonChanges } from '@/api/lessonChanges'
import { useChangeCandidates } from '@/hooks/useLessonChanges'
import { lessonDayKey } from '@/hooks/lessonChangeCache'
import { useHomeDirectory } from '@/hooks/homeReads'
import { useScopedRead, type HomeSession } from '@/hooks/useHomeSession'
import { assertHiredSchool } from '@/hooks/useSchoolTerm'
import { usePeriodSettings } from '@/hooks/useSchoolSetting'
import { useSchoolClasses, useSubjects } from '@/hooks/useSchoolCatalog'
import { queryKeys } from '@/hooks/queryKeys.js'
import { schoolDate } from '@/utils/homeContract'
import { getSchoolWeekRange } from '@/utils/weekRange.js'
import { operationError } from '@/utils/operationInputs'
import type { DatedLessonDto, HomeTerm } from '@/types/datedLesson'

type Intent = 'MY_WEEK' | 'COVER_OPTIONS' | 'SWAP_OPTIONS' | 'CHANGE_STATUS'
type CalendarStatus = 'OUTSIDE_TERM' | 'EXCLUDED_DATE'
interface Filters {
  schoolId: number
  userId: number
  termId?: number
  date?: string
  targetDate?: string
  dateFromText?: boolean
  targetDateFromText?: boolean
  dateStatus?: CalendarStatus
  targetDateStatus?: CalendarStatus
  weekStart?: string
  targetWeekStart?: string
  range?: 'DAY' | 'WEEK'
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
type Option = { id: number; rev?: number; date?: string; label: string }

function weekdays(date: string) {
  const { start } = getSchoolWeekRange(new Date(date + 'T12:00:00'))
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(start + 'T12:00:00Z')
    day.setUTCDate(day.getUTCDate() + i)
    return day.toISOString().slice(0, 10)
  })
}

type ChosenDates = { requestDate?: string; targetDate?: string }
type DateField = keyof ChosenDates

function dateNotice(term: HomeTerm, date: string, weekly: boolean, status?: CalendarStatus) {
  if (!date) return '날짜를 선택하세요.'
  if (
    status === 'OUTSIDE_TERM' ||
    (term.startDate && date < term.startDate) ||
    (term.endDate && date > term.endDate)
  )
    return '업무 학기 기간 밖의 날짜입니다.'
  if (weekly) return ''
  if (status === 'EXCLUDED_DATE' || term.excludedDates?.includes(date))
    return '시험·휴업 등으로 등록된 정규 수업 제외일입니다.'
  if ([0, 6].includes(new Date(date + 'T12:00:00Z').getUTCDay())) return '주말 휴업일입니다.'
  return ''
}

function dateDecision(
  manual: string | undefined,
  natural: string | undefined,
  week: string | undefined,
  fallback: string,
  resolved: string | undefined,
) {
  const value = manual ?? natural ?? (week ? '' : fallback)
  const mismatch =
    manual &&
    (week
      ? getSchoolWeekRange(new Date(manual + 'T12:00:00')).start !== week
      : natural && natural !== manual)
  return {
    value,
    conflict: Boolean(mismatch && resolved !== manual),
    natural,
    week,
  }
}

function DateInput({
  title,
  decision,
  onChange,
  onAccept,
  notice,
}: {
  title: string
  decision: ReturnType<typeof dateDecision>
  onChange: (value: string) => void
  onAccept: () => void
  notice: string
}) {
  const { value, conflict, natural, week } = decision
  return (
    <div className="ai-date">
      <label>
        {title}
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      {(natural || week) && (
        <small>
          {week
            ? '문장에서 확인한 주간 ' + week + ' ~ ' + weekdays(week)[4]
            : '문장에서 확인한 날짜 ' + natural}{' '}
          (한국시간)
        </small>
      )}
      {conflict ? (
        <div className="ai-date-conflict" role="alert">
          <p>문장과 선택한 날짜가 다릅니다. {title}를 확인하세요.</p>
          <div className="ai-chat-actions">
            {natural && (
              <button type="button" onClick={() => onChange(natural)}>
                문장 날짜 사용 ({natural})
              </button>
            )}
            <button type="button" onClick={onAccept}>
              선택 날짜 사용 ({value})
            </button>
          </div>
        </div>
      ) : (
        notice && <p role="status">{notice}</p>
      )}
    </div>
  )
}

export default function LessonAssistant({
  command,
  session,
  term,
  dates,
  originalDates,
  boardDate,
  setDates,
  reviewButton,
}: {
  command: Command
  session: HomeSession
  term: HomeTerm | null
  dates: ChosenDates
  originalDates: ChosenDates
  boardDate?: string
  setDates: Dispatch<SetStateAction<ChosenDates>>
  reviewButton: ReviewButton
}) {
  const { preview, intentType } = command
  const [accepted, setAccepted] = useState<ChosenDates>({})
  const [period, setPeriod] = useState(preview.periodNumber ?? 0)
  const periods = usePeriodSettings()
  if (
    !session.access.actions.requestSwap ||
    preview.userId !== session.userId ||
    preview.schoolId !== session.scope.schoolId
  )
    return <p role="alert">현재 학교와 재직 교사 권한을 확인하세요.</p>
  if (!term) return <p>먼저 학교의 업무 학기를 등록하세요.</p>
  if (preview.termId != null && preview.termId !== term.termId)
    return <p role="alert">업무 학기가 바뀌었습니다. 현재 학기로 다시 질문하세요.</p>
  const referenceDate = boardDate || schoolDate(new Date())
  const weekly = intentType === 'MY_WEEK' && preview.range !== 'DAY'
  const status = intentType === 'CHANGE_STATUS'
  const swap = intentType === 'SWAP_OPTIONS'
  const natural =
    preview.dateFromText ||
    (preview.dateFromText === undefined && originalDates.requestDate !== preview.date)
      ? preview.date
      : undefined
  const naturalTarget =
    preview.targetDateFromText ||
    (preview.targetDateFromText === undefined && originalDates.targetDate !== preview.targetDate)
      ? preview.targetDate
      : undefined
  const first = dateDecision(
    dates.requestDate,
    natural,
    preview.weekStart,
    !dateNotice(term, referenceDate, true) ? referenceDate : '',
    accepted.requestDate,
  )
  const second = dateDecision(
    dates.targetDate,
    naturalTarget,
    preview.targetWeekStart,
    first.value,
    accepted.targetDate,
  )
  // A natural-language week can straddle the term boundary. Only query its in-term school days.
  const partialWeek =
    weekly &&
    preview.weekStart === first.value &&
    !dates.requestDate &&
    weekdays(first.value).some((day) => !dateNotice(term, day, true))
  const firstNotice = partialWeek
    ? ''
    : dateNotice(
        term,
        first.value,
        weekly,
        preview.date === first.value ? preview.dateStatus : undefined,
      )
  const secondNotice = dateNotice(
    term,
    second.value,
    false,
    preview.targetDate === second.value ? preview.targetDateStatus : undefined,
  )
  function field(
    name: DateField,
    decision: ReturnType<typeof dateDecision>,
    title: string,
    notice: string,
  ) {
    return (
      <DateInput
        {...{ title, decision, notice }}
        onChange={(value) => {
          setDates((old) => ({ ...old, [name]: value }))
          setAccepted((old) => ({ ...old, [name]: undefined }))
        }}
        onAccept={() => setAccepted((old) => ({ ...old, [name]: decision.value }))}
      />
    )
  }
  return (
    <div className="lesson-assistant">
      {!status && (
        <>
          {field(
            'requestDate',
            first,
            weekly ? '조회 주간의 날짜' : intentType === 'MY_WEEK' ? '조회 날짜' : '요청 날짜',
            firstNotice,
          )}
          {swap && field('targetDate', second, '상대 수업 날짜', secondNotice)}
          <label>
            교시
            <select value={period} onChange={(event) => setPeriod(Number(event.target.value))}>
              <option value={0}>모든 교시</option>
              {(periods.data ?? []).map((p) => (
                <option key={p.id} value={p.periodNumber}>
                  {p.periodNumber}교시
                </option>
              ))}
            </select>
          </label>
        </>
      )}
      {(status || (!first.conflict && !firstNotice)) && (
        <LessonResults
          key={JSON.stringify([first.value, period, intentType])}
          {...{ term, session, command, reviewButton, weekly, status, period }}
          date={first.value}
          targetDate={swap && !secondNotice && !second.conflict ? second.value : ''}
        />
      )}
    </div>
  )
}

function LessonResults({
  term,
  session,
  command,
  reviewButton,
  date,
  targetDate,
  weekly,
  status,
  period,
}: {
  reviewButton: ReviewButton
  term: HomeTerm
  session: HomeSession
  command: Command
  date: string
  targetDate: string
  weekly: boolean
  status: boolean
  period: number
}) {
  const { preview, intentType } = command
  const [selected, setSelected] = useState('')
  const dates = (weekly ? weekdays(date) : [date]).filter((d) => !dateNotice(term, d, false))
  const directory = useHomeDirectory(session, true, term.termId)
  const periods = usePeriodSettings()
  const subjects = useSubjects()
  const classes = useSchoolClasses(term.academicYear, { termId: term.termId })
  const days = useQueries({
    queries: (status ? [] : dates).map((day) => ({
      queryKey: [...lessonDayKey(term.termId, day), session.scope],
      queryFn: ({ signal }: { signal: AbortSignal }) => getDatedLessons(term.termId, day, signal),
      retry: false,
    })),
  })
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
  const periodOf = (r: DatedLessonDto) =>
    periods.data?.find((p) => p.id === r.actual.periodId)?.periodNumber
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
  const rows = days
    .flatMap((day) => day.data ?? [])
    .filter(
      (r) =>
        r.actual.teacherId === me && !r.actual.cancelled && (!period || periodOf(r) === period),
    )
    .sort((a, b) => a.date.localeCompare(b.date) || (periodOf(a) ?? 0) - (periodOf(b) ?? 0))
  const first = rows.find((r) => stamp(r) === selected)
  const error =
    directory.error || (status ? requests.error : days.find((day) => day.isError)?.error)
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
      {!dates.length ? (
        <p>이 주간에는 학기 달력상 정규 수업일이 없습니다.</p>
      ) : days.some((day) => day.isPending) ? (
        <p>게시 수업 조회 중…</p>
      ) : !rows.length ? (
        <p>
          {weekly ? '이 주간' : date}
          {period ? ' ' + period + '교시' : ''}에 본인의 게시 수업이 없습니다.
        </p>
      ) : intentType === 'MY_WEEK' ? (
        <ul>
          {rows.map((r) => (
            <li key={r.id}>{label(r)}</li>
          ))}
        </ul>
      ) : (
        <label>
          내 수업{' '}
          <select
            aria-label="내 수업"
            value={first ? stamp(first) : ''}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">수업 선택</option>
            {rows.map((r) => (
              <option key={r.id} value={stamp(r)}>
                {label(r)}
              </option>
            ))}
          </select>
        </label>
      )}
      {first && (intentType !== 'SWAP_OPTIONS' || targetDate) && (
        <Candidates
          key={stamp(first) + '/' + targetDate}
          date={targetDate}
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
  date,
  teacherFilter,
  reviewButton,
}: {
  reviewButton: ReviewButton
  term: HomeTerm
  session: HomeSession
  first: DatedLessonDto
  swap: boolean
  date: string
  teacherFilter: string
  label: (row: DatedLessonDto) => string
  teacher: (id: number) => string
}) {
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
          date: row.date,
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
                firstDate: first.date,
                secondId: review[0].id,
                secondDate: review[0].date,
                secondRev: review[0].rev!,
              },
              signal,
            ),
          ]
        : await createSubstituteBatch(term.termId, first.id, first.rev, ids, signal, first.date)
      void cache.invalidateQueries({
        queryKey: [...queryKeys.home.lessonChanges(term.termId), session.scope],
      })
      if (!signal.aborted)
        setResult('접수 완료 · 응답 대기 ' + receipts.map((r) => '#' + r.id).join(', '))
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
            업무 학기 {term.academicYear}학년도 {term.semester}학기
          </p>
          <p>요청 수업 {label(first)}</p>
          <p>
            {swap ? '상대 수업' : '보결 교사'} {review.map((o) => o.label).join(', ')}
          </p>
          <button
            type="button"
            className="ai-chat-primary"
            onClick={() => void submit()}
            aria-busy={pending}
          >
            {pending ? '접수 중…' : '확인하고 요청 보내기'}
          </button>
          <button type="button" onClick={() => setReview(null)}>
            돌아가기
          </button>
        </>
      ) : (
        <>
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
          ) : swap && !targets.data?.some((row) => !row.actual.cancelled) ? (
            <p>상대 수업 날짜 {date}에 게시된 수업이 없습니다.</p>
          ) : !options.length ? (
            <p>조건에 맞는 후보가 없습니다.</p>
          ) : (
            options.map((o) => (
              <label key={o.id} className="ai-candidate">
                <input
                  type={swap ? 'radio' : 'checkbox'}
                  name="assistant-recipient"
                  checked={ids.includes(o.id)}
                  onChange={(e) =>
                    setIds(
                      swap
                        ? [o.id]
                        : e.target.checked
                          ? [...ids, o.id]
                          : ids.filter((id) => id !== o.id),
                    )
                  }
                />{' '}
                {o.label}
              </label>
            ))
          )}
          <button
            type="button"
            className="ai-chat-primary"
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
