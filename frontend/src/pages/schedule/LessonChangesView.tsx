import { useState } from 'react'
import { isAxiosError } from 'axios'
import type { HomeTerm, DatedLessonDto } from '@/types/datedLesson'
import type { ChangeResult, LessonChange } from '@/types/lessonChange'
import { useLessonChanges } from '@/hooks/useLessonChanges'
import { useSubjects, useSchoolClasses } from '@/hooks/useSchoolCatalog'
import { usePeriodSettings } from '@/hooks/useSchoolSetting'
import { operationError } from '@/utils/operationInputs'
import { schoolDate } from '@/utils/homeContract'
import TermWorkspace from './TermWorkspace'

const states = {
  PENDING: '응답 대기',
  ACCEPTED: '수락 · 승인 대기',
  REJECTED: '거절',
  APPROVED: '승인 완료',
}
const conflictActions: Record<string, string> = {
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

function LessonDesk({ term, initialDate }: { term: HomeTerm; initialDate?: string }) {
  const [date, setDate] = useState(initialDate || schoolDate(new Date()))
  const [otherDate, setOtherDate] = useState('')
  const changes = useLessonChanges(term, date, otherDate || date)
  const [firstKey, setFirst] = useState(''),
    [secondKey, setSecond] = useState(''),
    [teacher, setTeacher] = useState('')
  const [message, setMessage] = useState(''),
    [retry, setRetry] = useState<RetryApproval | null>(null)
  const [result, setResult] = useState<ChangeResult | null>(null)
  const [sending, setSending] = useState(false)
  const members = changes.directory.data ?? []
  const periods = usePeriodSettings().data ?? []
  const subjects = useSubjects().data ?? [],
    classes = useSchoolClasses(term.academicYear).data ?? []
  const mine = changes.canRequestSwap
  const firstRows = (changes.lessons.data ?? []).filter(
    (r) => !mine || r.actual.teacherId === changes.memberId,
  )
  const first = firstRows.find((r) => stamp(r) === firstKey)
  const secondRows = (changes.secondLessons.data ?? []).filter(
    (r) => first && r.actual.teacherId !== first.actual.teacherId && r.id !== first.id,
  )
  const second = secondRows.find((r) => stamp(r) === secondKey)
  const teachers = members.filter(
    (m) =>
      m.position === 'TEACHER' &&
      m.employmentStatus === 'HIRED' &&
      m.schoolUserId !== first?.actual.teacherId,
  )
  const validTeacher = teachers.some((t) => String(t.schoolUserId) === teacher)
  const name = (id: number) => members.find((m) => m.schoolUserId === id)?.username ?? '교사 #' + id
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
    setMessage('')
    setResult(null)
    setSending(true)
    try {
      const next = await send()
      setResult(next)
      setRetry(null)
      if (next.phase === 'created' || next.phase === 'conflict') {
        setFirst('')
        setSecond('')
        setTeacher('')
      }
    } catch (err) {
      setMessage(operationError(err))
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
      setMessage(operationError(err))
    }
  }
  const locked = sending || changes.pending
  async function refresh() {
    setSending(true)
    setMessage('')
    try {
      await changes.refresh()
      setMessage('신청 목록과 선택한 날짜 수업을 다시 조회했습니다.')
    } catch (err) {
      setMessage(operationError(err))
    } finally {
      setSending(false)
    }
  }
  return (
    <>
      <section className="work-card">
        <h2>날짜 수업 선택</h2>
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
                  setSecond('')
                  setTeacher('')
                }
              }}
            />
          </label>
          <label>
            교환 상대 수업 날짜
            <input
              type="date"
              value={otherDate || date}
              disabled={locked}
              onChange={(e) => {
                setOtherDate(e.target.value)
                setSecond('')
              }}
            />
          </label>
        </div>
        {(changes.canRequestSubstitute || mine) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!first) return
              if (mine && second) void run(() => changes.requestSwap(first, second))
              else if (changes.canRequestSubstitute && validTeacher)
                void run(() => changes.requestSubstitute(first, Number(teacher)))
            }}
          >
            <fieldset disabled={locked || !!retry}>
              <legend>{mine ? '수업 교환 신청' : '지정 교사 보결 신청'}</legend>
              <label>
                {mine ? '내가 담당하는 수업' : '보결할 수업'}
                <select
                  required
                  value={first?.id ? firstKey : ''}
                  onChange={(e) => {
                    setFirst(e.target.value)
                    setSecond('')
                    setTeacher('')
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
              {changes.lessons.state !== 'ready' || !firstRows.length ? (
                <small>
                  {readLabel[changes.lessons.state] ?? '이 날짜에 선택할 수업이 없습니다.'}
                </small>
              ) : null}
              {mine ? (
                <label>
                  교환할 상대 수업
                  <select
                    required
                    disabled={!first}
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
                  {first && !secondRows.length && (
                    <small>
                      {readLabel[changes.secondLessons.state] ??
                        '이 날짜에 다른 교사의 수업이 없습니다.'}
                    </small>
                  )}
                </label>
              ) : (
                <label>
                  지정 교사
                  <select
                    required
                    disabled={!first}
                    value={validTeacher ? teacher : ''}
                    onChange={(e) => setTeacher(e.target.value)}
                  >
                    <option value="">보결 교사 선택</option>
                    {teachers.map((t) => (
                      <option key={t.schoolUserId} value={t.schoolUserId}>
                        {name(t.schoolUserId)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                className="work-primary"
                disabled={!first || (mine ? !second : !validTeacher)}
              >
                {mine ? '교환 신청' : '보결 신청'}
              </button>
            </fieldset>
          </form>
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
        {message && <p>{message}</p>}
        {result?.phase === 'created' && (
          <p className="work-success">신청 #{result.change.id}을 접수했습니다.</p>
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
export default function LessonChangesView({ initialDate }: { initialDate?: string }) {
  return (
    <TermWorkspace title="보결·교환 업무">
      {(term) => <LessonDesk term={term} initialDate={initialDate} />}
    </TermWorkspace>
  )
}
