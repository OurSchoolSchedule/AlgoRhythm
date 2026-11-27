import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { approveApplicant, getMatchOptions, listApprovalEntries } from '@/api/rosterApproval'
import { rosterProblem } from '@/api/rosterImport'
import { type HomeSession, useHomeSession, useScopedRead } from '@/hooks/useHomeSession'
import { schoolRosterKey } from '@/hooks/useRosterImport'
import { useTermChoice } from '@/hooks/useTermChoice'
import { queryKeys } from '@/hooks/queryKeys'
import './rosterImport.css'

type Scope = { session: HomeSession; schoolId: number; termId: number | null }

function ApplicantReview({
  session,
  schoolId,
  termId,
  rosterId,
  backfill,
  onApproved,
}: Scope & {
  rosterId: number
  backfill: boolean
  onApproved: (message: string) => void
}) {
  const [selection, setSelection] = useState('')
  const [problem, setProblem] = useState('')
  const [busy, setBusy] = useState(false)
  const request = useRef<AbortController | null>(null)
  const cache = useQueryClient()
  useEffect(() => () => request.current?.abort(), [])
  const options = useScopedRead(
    session,
    [...schoolRosterKey(schoolId), 'match', rosterId, termId],
    true,
    (signal) => getMatchOptions(schoolId, rosterId, termId, signal),
    { retry: false },
  )
  const data = options.isSuccess ? options.data : null
  const selected = data?.candidates.find(
    (item) => String(item.teacherSchoolUserId) === selection && !item.linked,
  )
  const needsChoice = backfill || data?.requiresSelection || !!data?.candidates.length
  const canApprove = !!data?.verifiedEmail && (!needsChoice || !!selected)

  async function approve() {
    if (!data || !canApprove || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setProblem('')
    try {
      await approveApplicant(
        schoolId,
        rosterId,
        selected?.teacherSchoolUserId ?? null,
        controller.signal,
      )
      if (!controller.signal.aborted) {
        const message = backfill ? '재직 교사 확인 완료' : '가입 승인 완료'
        const link = selected ? ` · ${selected.displayName} 명부 연결` : ''
        onApproved(`${data.applicantName} ${message}${link}`)
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setSelection('')
        setProblem(rosterProblem(err).message)
      }
    } finally {
      // A response lost after commit also requires fresh membership and occupancy.
      await Promise.all(
        [schoolRosterKey(schoolId), queryKeys.store.staffSummary(), queryKeys.home.directory()].map(
          (queryKey) => cache.invalidateQueries({ queryKey }),
        ),
      )
      request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  if (options.isError)
    return (
      <div role="alert">
        {rosterProblem(options.error).message}{' '}
        <button type="button" className="btn" onClick={() => options.refetch()}>
          후보 다시 조회
        </button>
      </div>
    )
  if (!data) return <p role="status">신청 정보와 명부를 불러오는 중입니다.</p>
  return (
    <div className="ri-card">
      <h3>
        {data.applicantName} · {backfill ? '재직 교사 명부 연결' : '가입 신청'}
      </h3>
      <p>
        인증 이메일 · {data.verifiedEmail || '확인 필요'}
        <br />
        신청 과목 · {data.subjectHint || '미입력'}
        <br />
        신청 시각 ·{' '}
        {data.requestedAt
          ? new Date(data.requestedAt).toLocaleString('ko-KR', {
              timeZone: 'Asia/Seoul',
              timeZoneName: 'short',
            })
          : '기록 없음'}
      </p>
      {needsChoice && (
        <div className="ri-scope">
          <label>
            연결할 기존 교사 명부
            <select value={selection} onChange={(e) => setSelection(e.target.value)} disabled={busy}>
              <option value="">교사를 선택하세요</option>
              {data.candidates.map((row) => (
                <option
                  key={row.teacherSchoolUserId}
                  value={row.teacherSchoolUserId}
                  disabled={row.linked}
                >
                  {row.displayName} (#{row.teacherSchoolUserId}) ·{' '}
                  {row.subjects.join(', ') || '과목 미등록'} · 주 {row.weeklyPeriods}차시 ·{' '}
                  {row.linked ? '이미 연결됨' : '연결 가능'}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {needsChoice && !data.candidates.some((row) => !row.linked) && (
        <p>연결 가능한 명부가 없습니다. 학교 명부와 연결 상태를 확인하세요.</p>
      )}
      {problem && <p role="alert">{problem}</p>}
      <button
        className="btn btn-primary"
        type="button"
        disabled={!canApprove || busy || options.isFetching}
        onClick={approve}
      >
        {busy
          ? '승인 중…'
          : backfill
            ? '기존 교사 명부 연결'
            : needsChoice
              ? '명부 연결 및 가입 승인'
              : '가입 승인'}
      </button>
    </div>
  )
}

function SchoolRequests({ session, schoolId, termId }: Scope) {
  const [applicant, setApplicant] = useState('')
  const [message, setMessage] = useState('')
  const [backfill, setBackfill] = useState(false)
  const list = useScopedRead(
    session,
    [...schoolRosterKey(schoolId), 'applicants'],
    true,
    (signal) => listApprovalEntries(schoolId, signal),
    { retry: false },
  )
  const entries = list.isSuccess
    ? list.data.filter((row) =>
        backfill
          ? row.status === 'LINKED' &&
            row.employmentStatus === 'HIRED' &&
            row.teachingSchoolUserId === null
          : row.status === 'PENDING',
      )
    : []
  const selected = entries.find((row) => String(row.rosterId) === applicant)
  return (
    <section className="ri-panel" aria-label="교사 가입 승인">
      <div className="ri-card">
        <div className="ri-heading">
          <h2>
            {backfill ? '명부 미연결 재직 교사' : '승인 대기'}{' '}
            {list.isSuccess ? `· ${entries.length}건` : ''}
          </h2>
          <button
            type="button"
            className="btn"
            disabled={list.isFetching}
            onClick={() => list.refetch()}
          >
            신청 목록 새로고침
          </button>
        </div>
        {schoolId === 540001 && (
          <label>
            <input
              type="checkbox"
              checked={backfill}
              onChange={(e) => {
                setBackfill(e.target.checked)
                setApplicant('')
                setMessage('')
              }}
            />{' '}
            이미 승인된 교사의 명부 연결
          </label>
        )}
        {list.isLoading && <p role="status">가입 요청을 확인하고 있습니다.</p>}
        {list.isError && <p role="alert">{rosterProblem(list.error).message}</p>}
        {list.isSuccess && !entries.length && (
          <p>{backfill ? '연결할 재직 교사가 없습니다.' : '승인 대기 중인 교사가 없습니다.'}</p>
        )}
        {!!entries.length && (
          <div className="ri-scope">
            <label>
              {backfill ? '재직 교사' : '가입 신청자'}
              <select
                value={selected ? applicant : ''}
                onChange={(e) => {
                  setApplicant(e.target.value)
                  setMessage('')
                }}
              >
                <option value="">교사를 선택하세요</option>
                {entries.map((row) => (
                  <option key={row.rosterId} value={row.rosterId}>
                    {row.displayName} · {row.authEmail}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
      {message && (
        <p className="ri-success" role="status">
          {message}
        </p>
      )}
      {selected && (
        <ApplicantReview
          key={selected.rosterId}
          {...{ session, schoolId, termId }}
          rosterId={selected.rosterId}
          backfill={backfill}
          onApproved={(msg) => {
            setApplicant('')
            setMessage(msg)
          }}
        />
      )}
    </section>
  )
}

export default function JoinApprovalPanel() {
  const session = useHomeSession()
  const { term, list } = useTermChoice(session)
  if (session.active.isLoading) return <p role="status">학교 권한을 확인하는 중입니다.</p>
  if (!session.school || !session.access.actions.approve)
    return <p>현재 학교의 재직 관리자만 가입을 승인할 수 있습니다.</p>
  if (list.isLoading) return <p role="status">업무 학기를 확인하는 중입니다.</p>
  if (list.isError)
    return (
      <div role="alert">
        업무 학기 확인에 실패했습니다.{' '}
        <button type="button" className="btn" onClick={() => list.refetch()}>
          학기 다시 조회
        </button>
      </div>
    )
  return (
    <SchoolRequests
      key={JSON.stringify([session.scope, term?.termId])}
      session={session}
      schoolId={session.school.schoolId}
      termId={term?.termId ?? null}
    />
  )
}
