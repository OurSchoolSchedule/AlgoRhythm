import { useState } from 'react'
import { isAxiosError } from 'axios'
import type { HomeTerm, DatedLessonDto, HomeLessonSelection } from '@/types/datedLesson'
import type { ChangeResult, LessonChange } from '@/types/lessonChange'
import { useChangeCandidates, useChangeDetails, useLessonChanges } from '@/hooks/useLessonChanges'
import { useSubjects, useSchoolClasses } from '@/hooks/useSchoolCatalog'
import { usePeriodSettings } from '@/hooks/useSchoolSetting'
import { operationError } from '@/utils/operationInputs'
import { schoolDate } from '@/utils/homeContract'
import CoverTeacherGrid from './CoverTeacherGrid'
import './lesson-change-form.css'
import TermWorkspace from './TermWorkspace'

const states = {
  PENDING: '응답 대기',
  WITHDRAWN: '다른 교사가 수락하여 마감',
  ACCEPTED: '수락 · 승인 대기',
  REJECTED: '거절',
  APPROVED: '승인 완료',
}
const conflictActions: Record<string, string> = {
  LESSON_CANCELLED: '휴강 수업을 제외하고 최신 날짜 수업을 다시 선택하세요.',
  STALE_LESSON: '최신 날짜 수업을 다시 선택해 새 신청을 접수하세요.',
  SLOT_CONFLICT:
    '해당 교시의 담당 교사와 학급 시간표를 확인해 다른 수업 또는 보결 교사를 선택하세요.',
  STALE_REQUEST: '신청 목록에서 최신 상태를 확인한 뒤 가능한 동작을 선택하세요.',
}
const stamp = (lesson: DatedLessonDto) => lesson.id + '/' + lesson.rev
const readLabel: Record<string, string> = {
  loading: '조회 중',
  empty: '조회된 항목이 없습니다.',
  error: '조회에 실패했습니다.',
  forbidden: '조회 권한이 없습니다.',
  disabled: '조회 조건을 확인하세요.',
}
interface RetryApproval {
  id: number
  send: () => Promise<ChangeResult>
}

interface Props {
  initialDate?: string
  selection?: HomeLessonSelection
  onHome?: () => void
}

function LessonDesk({ term, initialDate, selection, onHome }: Props & { term: HomeTerm }) {
  const [date, setDate] = useState(selection?.date ?? (initialDate || schoolDate(new Date())))
  const [otherDate, setOtherDate] = useState<string | null>(null)
  const targetDate = otherDate ?? date
  const changes = useLessonChanges(term, date, targetDate)
  const [detailId, setDetailId] = useState<number | null>(null)
  const details = useChangeDetails(term, detailId)
  const [firstKey, setFirst] = useState('')
  const [secondKey, setSecond] = useState('')
  const [teacher, setTeacher] = useState('')
  const [coverTargets, setCoverTargets] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)
  const [retry, setRetry] = useState<RetryApproval | null>(null)
  const [result, setResult] = useState<ChangeResult | null>(null)
  const [sending, setSending] = useState(false)
  const members = changes.directory.data ?? []
  const periods = usePeriodSettings().data ?? []
  const subjects = useSubjects().data ?? [],
    classes = useSchoolClasses(term.academicYear).data ?? []
  const mine = changes.canRequestSwap
  const firstRows = (changes.lessons.data ?? []).filter(
    (r) => !r.actual.cancelled && (!mine || r.actual.teacherId === changes.memberId),
  )
  const first = selection
    ? firstRows.find(
        (r) =>
          term.schoolId === selection.schoolId &&
          r.termId === selection.termId &&
          r.date === selection.date &&
          r.id === selection.datedLessonId &&
          r.rev === selection.rev &&
          r.actual.teacherId === selection.teacherId &&
          (selection.kind === 'SWAP' ? mine : changes.canRequestSubstitute),
      )
    : firstRows.find((r) => stamp(r) === firstKey)
  const coverCandidates = useChangeCandidates(term, first, 'SUBSTITUTE')
  const swapCandidates = useChangeCandidates(term, first, 'SWAP', targetDate)
  const name = (id: number) => {
    const person = members.find((m) => m.schoolUserId === id)
    return person?.displayName ?? person?.username ?? '교사 #' + id
  }
  const teachers = members.filter(
    (m) =>
      m.position === 'TEACHER' &&
      m.employmentStatus === 'HIRED' &&
      m.schoolUserId !== first?.actual.teacherId &&
      m.schoolUserId !== changes.memberId,
  )
  const freeIds = coverCandidates.isSuccess ? coverCandidates.data : []
  const validTargets = coverTargets.filter(
    (id) => freeIds.includes(id) && teachers.some((t) => t.schoolUserId === id),
  )
  const targetDay = changes.secondLessons
  const swapReadError =
    swapCandidates.error ?? ('error' in targetDay ? targetDay.error : targetDay.refreshError)
  const swapIds = new Set(swapCandidates.data ?? [])
  const eligibleLessons = swapReadError
    ? []
    : (targetDay.data ?? []).filter(
        (row) =>
          first &&
          swapIds.has(row.id) &&
          row.date === targetDate &&
          row.versionId === first.versionId &&
          !row.actual.cancelled &&
          row.actual.teacherId !== first.actual.teacherId &&
          !(row.date === first.date && row.actual.periodId === first.actual.periodId),
      )
  const eligibleTeachers = new Set(eligibleLessons.map((row) => row.actual.teacherId))
  const matchingTeachers = teachers.filter(
    (t) => eligibleTeachers.has(t.schoolUserId) && name(t.schoolUserId).includes(search.trim()),
  )
  const validTeacher = matchingTeachers.some((t) => String(t.schoolUserId) === teacher)
  const secondRows = validTeacher
    ? eligibleLessons.filter((row) => row.actual.teacherId === Number(teacher))
    : []
  const second = secondRows.find((row) => stamp(row) === secondKey)
  const swapLoading = swapCandidates.isPending || targetDay.state === 'loading'
  function clearTarget() {
    setSecond('')
    setCoverTargets([])
    setTeacher('')
    setSearch('')
    setOtherDate(null)
  }
  function lessonName(r: DatedLessonDto) {
    const room = classes.find((c) => c.id === r.classId)
    const period = periods.find((p) => p.id === r.actual.periodId)
    return [
      period ? period.periodNumber + '교시' : '교시 #' + r.actual.periodId,
      room ? `${room.grade}-${room.classNumber}반` : '학급 #' + r.classId,
      subjects.find((s) => s.id === r.subjectId)?.name ?? '과목 #' + r.subjectId,
      name(r.actual.teacherId),
    ].join(' · ')
  }
  function describe(id: number) {
    const row =
      (changes.lessons.data ?? []).find((r) => r.id === id) ??
      (changes.secondLessons.data ?? []).find((r) => r.id === id)
    return row ? row.date + ' · ' + lessonName(row) : '날짜 수업 #' + id
  }
  async function run(send: () => Promise<ChangeResult>, approval?: RetryApproval) {
    setMessage(null)
    setResult(null)
    setSending(true)
    try {
      const next = await send()
      setResult(next)
      setRetry(null)
      if (next.phase === 'created' || next.phase === 'conflict') {
        setFirst('')
        clearTarget()
      }
    } catch (err) {
      setMessage({ text: operationError(err), error: true })
      if (approval && isAxiosError(err) && (!err.response || err.response.status >= 500))
        setRetry(approval)
      else setRetry(null)
    } finally {
      setSending(false)
    }
  }
  function approve(row: LessonChange) {
    try {
      const attempt = { id: row.id, send: changes.prepareApproval(row) }
      void run(attempt.send, attempt)
    } catch (err) {
      setMessage({ text: operationError(err), error: true })
    }
  }
  const locked = sending || changes.pending
  async function refresh() {
    setSending(true)
    setMessage(null)
    try {
      await changes.refresh()
      setMessage({ text: '신청 목록과 선택한 날짜 수업을 다시 조회했습니다.', error: false })
    } catch (err) {
      setMessage({ text: operationError(err), error: true })
    } finally {
      setSending(false)
    }
  }
  return (
    <>
      <section className="work-card">
        <h2>{selection ? '홈에서 선택한 수업' : '날짜 수업 선택'}</h2>
        {selection ? (
          <>
            <p>
              {selection.date} ·{' '}
              {first
                ? lessonName(first)
                : changes.lessons.state === 'loading'
                  ? '날짜 수업 확인 중'
                  : '선택한 수업의 상태 또는 담당자가 변경됐습니다.'}
            </p>
            <button onClick={onHome}>홈에서 다시 선택</button>
          </>
        ) : (
          <div className="work-row">
            <label>
              첫 수업 날짜
              <input
                type="date"
                value={date}
                disabled={locked}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(e.target.value)
                    setFirst('')
                    clearTarget()
                  }
                }}
              />
            </label>
            <label>
              {mine ? '내가 담당하는 수업' : '보결할 수업'}
              <select
                value={first ? firstKey : ''}
                disabled={locked}
                onChange={(e) => {
                  setFirst(e.target.value)
                  clearTarget()
                }}
              >
                <option value="">수업 선택</option>
                {firstRows.map((r) => (
                  <option key={r.id} value={stamp(r)}>
                    {lessonName(r)}
                  </option>
                ))}
              </select>
            </label>
            {!firstRows.length && (
              <small>
                {readLabel[changes.lessons.state] ?? '이 날짜에 선택할 수업이 없습니다.'}
              </small>
            )}
          </div>
        )}
        {changes.canRequestSubstitute ? (
          <form
            aria-label="보결 신청"
            onSubmit={(e) => {
              e.preventDefault()
              if (first && validTargets.length)
                void run(() => changes.requestSubstitute(first, validTargets))
            }}
          >
            <fieldset disabled={locked || !!retry}>
              <legend>보결 요청</legend>
              {first && coverCandidates.isPending && <p>공강 교사를 확인하고 있습니다.</p>}
              {coverCandidates.isError && (
                <p role="alert">
                  후보 조회에 실패했습니다.{' '}
                  <button type="button" onClick={() => coverCandidates.refetch()}>
                    다시 조회
                  </button>
                </p>
              )}
              {coverCandidates.data?.length === 0 && <p>이 교시에 보결 가능한 교사가 없습니다.</p>}
              <CoverTeacherGrid
                teachers={teachers}
                candidateIds={freeIds}
                selectedIds={validTargets}
                onChange={setCoverTargets}
              />
              <button
                className="work-primary"
                disabled={!first || !validTargets.length || coverCandidates.isError}
              >
                선택한 교사 {validTargets.length}명에게 보결 요청
              </button>
            </fieldset>
          </form>
        ) : (
          <p>학교 재직 상태를 확인하세요.</p>
        )}
        {mine ? (
          <form
            aria-label="교환 신청"
            onSubmit={(e) => {
              e.preventDefault()
              if (first && second) void run(() => changes.requestSwap(first, second))
            }}
          >
            <fieldset disabled={locked || !!retry}>
              <legend>1:1 수업 교환</legend>
              <label className="change-date-toggle">
                <input
                  type="checkbox"
                  disabled={!first}
                  checked={otherDate !== null}
                  onChange={(e) => {
                    setOtherDate(e.target.checked ? date : null)
                    setTeacher('')
                    setSecond('')
                  }}
                />
                다른 날짜의 수업 선택
              </label>
              {otherDate !== null && (
                <label>
                  교환 상대 수업 날짜
                  <input
                    type="date"
                    value={otherDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setOtherDate(e.target.value)
                        setTeacher('')
                        setSecond('')
                      }
                    }}
                  />
                </label>
              )}
              <div className="swap-teacher-fields">
                <label>
                  상대 교사 검색
                  <input
                    type="search"
                    disabled={!first}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setTeacher('')
                      setSecond('')
                    }}
                  />
                </label>
                <label>
                  상대 교사
                  <select
                    required
                    disabled={!matchingTeachers.length}
                    value={validTeacher ? teacher : ''}
                    onChange={(e) => {
                      setTeacher(e.target.value)
                      setSecond('')
                    }}
                  >
                    <option value="">상대 교사 선택</option>
                    {matchingTeachers.map((t) => (
                      <option key={t.schoolUserId} value={t.schoolUserId}>
                        {name(t.schoolUserId)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                교환할 상대 수업 · {targetDate}
                <select
                  required
                  disabled={!first || !validTeacher}
                  value={second ? secondKey : ''}
                  onChange={(e) => setSecond(e.target.value)}
                >
                  <option value="">상대 수업 선택</option>
                  {secondRows.map((r) => (
                    <option key={r.id} value={stamp(r)}>
                      {lessonName(r)}
                    </option>
                  ))}
                </select>
              </label>
              {first &&
                (swapReadError ? (
                  <p role="alert">
                    교환 후보 조회에 실패했습니다. {operationError(swapReadError)}{' '}
                    <button type="button" onClick={refresh}>
                      다시 조회
                    </button>
                  </p>
                ) : swapLoading ? (
                  <p role="status">교환 가능한 수업을 조회하고 있습니다.</p>
                ) : !eligibleLessons.length ? (
                  <p role="status">
                    이 날짜에 교환 가능한 수업이 없습니다. 다른 날짜를 선택하세요.
                  </p>
                ) : !matchingTeachers.length && search.trim() ? (
                  <p role="status">검색과 일치하는 상대 교사가 없습니다.</p>
                ) : null)}
              {first && second && (
                <div className="change-preview" aria-label="교환 미리보기">
                  <div>
                    <strong>내 수업</strong>
                    <p>
                      {first.date} · {lessonName(first)}
                    </p>
                  </div>
                  <div>
                    <strong>상대 수업</strong>
                    <p>
                      {second.date} · {lessonName(second)}
                    </p>
                  </div>
                </div>
              )}
              <button
                className="work-primary"
                disabled={!first || !second || swapCandidates.isError}
              >
                교환 신청
              </button>
            </fieldset>
          </form>
        ) : (
          <p>교환은 재직 교사가 본인 담당 수업에서 신청할 수 있습니다.</p>
        )}
        {changes.directory.state !== 'ready' && (
          <p>학교 명부 · {readLabel[changes.directory.state]}</p>
        )}
      </section>
      <section className="work-card">
        <header className="work-heading">
          <h2>변경 신청 목록</h2>
          <button onClick={refresh} disabled={locked}>
            최신 상태 조회
          </button>
        </header>
        {readLabel[changes.changes.state] && (
          <p role="status">{readLabel[changes.changes.state]}</p>
        )}
        <ul className="work-requests">
          {changes.changes.data?.map((row) => (
            <li key={row.id}>
              <div>
                <strong>
                  {row.kind === 'SWAP' ? '교환' : '보결'} #{row.id}
                </strong>{' '}
                <span className="work-badge">{states[row.state]}</span>
                <p>
                  {describe(row.firstId)}
                  {row.secondId !== null && <> ↔ {describe(row.secondId)}</>}
                </p>
                <small>
                  신청 {name(row.requester)} · 지정 {name(row.responder)} · 신청 버전 {row.rev}
                </small>
              </div>
              <button onClick={() => setDetailId(detailId === row.id ? null : row.id)}>
                {detailId === row.id ? '상세 닫기' : '요청 상세'}
              </button>
              {detailId === row.id && (
                <div aria-live="polite">
                  {details.isPending && '대상 수업 조회 중'}
                  {details.isError &&
                    '대상 수업을 조회할 수 없습니다. 게시 버전과 학교를 확인하세요.'}
                  {details.data?.map((r) => (
                    <p key={r.id}>
                      {r.date} · {lessonName(r)}
                    </p>
                  ))}
                </div>
              )}
              {changes.canRespond(row) && (
                <div className="work-row">
                  <button
                    disabled={locked || !!retry}
                    onClick={() => run(() => changes.respond(row, true))}
                  >
                    수락
                  </button>
                  <button
                    disabled={locked || !!retry}
                    onClick={() => run(() => changes.respond(row, false))}
                  >
                    거절
                  </button>
                </div>
              )}
              {changes.canApprove(row) && (
                <button disabled={locked || !!retry} onClick={() => approve(row)}>
                  승인 확정
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <div aria-live="polite">
        {message && <p className={message.error ? 'work-error' : 'work-success'}>{message.text}</p>}
        {result?.phase === 'created' && (
          <p className="work-success">
            {result.count
              ? `보결 요청 ${result.count}건을 접수했습니다.`
              : `신청 #${result.change.id}을 접수했습니다.`}
          </p>
        )}
        {result?.phase === 'responded' && (
          <p className="work-success">
            신청 #{result.change.id} · {states[result.change.state]}
          </p>
        )}
        {result?.phase === 'approved' && (
          <p className="work-success">
            신청 #{result.receipt.requestId} 승인 완료 · 날짜 수업 {result.receipt.lessons.length}
            건에 반영됐습니다.
          </p>
        )}
        {result?.phase === 'conflict' && (
          <p className="work-error">
            변경 충돌 (409) · {result.problem.message ?? result.problem.code}{' '}
            {result.problem.currentRev != null && '서버 버전 ' + result.problem.currentRev + ' · '}
            {conflictActions[result.problem.code ?? ''] ??
              '최신 신청 상태와 날짜 수업을 확인한 뒤 다시 선택하세요.'}
          </p>
        )}
        {result?.refreshError != null && (
          <p className="work-error">후속 조회에 실패했습니다. 최신 상태 조회로 확인하세요.</p>
        )}
        {retry && (
          <div className="work-error">
            신청 #{retry.id}의 승인 응답을 확인하지 못했습니다.{' '}
            <button disabled={locked} onClick={() => run(retry.send, retry)}>
              같은 승인 다시 전송
            </button>
            <button
              disabled={locked}
              onClick={() => {
                setRetry(null)
                void refresh()
              }}
            >
              재전송 종료·최신 상태 조회
            </button>
          </div>
        )}
      </div>
    </>
  )
}
export default function LessonChangesView(props: Props) {
  return (
    <TermWorkspace title="보결·교환 업무">
      {(term) => <LessonDesk term={term} {...props} />}
    </TermWorkspace>
  )
}
