import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getPreviewUserRole } from '@/api/tokenStorage'
import { ownRosterKey, readOwnRoster } from '@/api/ownRoster'
import { useHomeSession, useScopedRead } from '@/hooks/useHomeSession'
import { useTermChoice } from '@/hooks/useTermChoice'
import { TermForm } from '@/pages/home/HomePanels'
import ServiceFooter from '@/components/layout/ServiceFooter'
import Schools from './Schools'
import './roster.css'

function Frame({ children, logout }) {
  return (
    <div className="roster-page">
      <main className="roster-card">
        <header>
          <strong>우리학교시간표</strong>
          <button className="btn" type="button" onClick={logout}>
            로그아웃
          </button>
        </header>
        {children}
      </main>
      <ServiceFooter />
    </div>
  )
}

function Correction({ school, entry, termLabel }) {
  const [reason, setReason] = useState('')
  const subject = encodeURIComponent(`[${school}] 교사 명부 정정 요청`)
  const body = encodeURIComponent(
    `${school} · ${termLabel}\n학교 표시 이름: ${entry.displayName}\n\n정정 요청사항\n${reason.trim()}`,
  )
  return (
    <div className="roster-correction">
      <label>
        정정할 내용
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1200}
          rows={3}
        />
      </label>
      <p>메일 앱에서 학교 명부 담당자를 받는 사람으로 지정해 보내 주세요.</p>
      {reason.trim() && (
        <a className="btn" href={`mailto:?subject=${subject}&body=${body}`}>
          정정 요청 메일 작성
        </a>
      )}
    </div>
  )
}

function TeacherReview({ session, logout, children }) {
  const school = session.school
  const { choice, saveChoice } = useTermChoice(session)
  const { termId } = choice
  const query = useScopedRead(
    session,
    [...ownRosterKey(school.schoolId), termId],
    true,
    (signal) => readOwnRoster(school.schoolId, termId, signal),
    { retry: false, refetchOnMount: 'always' },
  )
  const entry = !query.isError ? query.data : null
  const missing =
    isAxiosError(query.error) && query.error.response?.status === 404
  // A term-scoped 404 can also mean an unknown term. Confirm the identity lookup separately.
  const base = useScopedRead(
    session,
    [...ownRosterKey(school.schoolId), 'identity'],
    termId !== null && missing,
    (signal) => readOwnRoster(school.schoolId, null, signal),
    { retry: false },
  )
  const legacy =
    missing &&
    (termId === null ||
      (isAxiosError(base.error) && base.error.response?.status === 404))
  const linked =
    entry?.status === 'LINKED' && entry.employmentStatus === 'HIRED'
  const key = `roster-reviewed/${session.userId}/${school.schoolId}/${entry?.rosterId ?? 'legacy'}/${termId ?? 'base'}`
  // Only retain a digest on this device. A changed name, subject list or homeroom needs a fresh review.
  const snapshot = JSON.stringify([
    key,
    entry?.displayName,
    entry?.authEmail,
    entry?.term,
  ])
  const [verifiedSnapshot, setVerifiedSnapshot] = useState('')
  const [review, setReview] = useState(false)
  const [correcting, setCorrecting] = useState(false)
  const [editingTerm, setEditingTerm] = useState(false)
  useEffect(() => {
    if ((!linked && !legacy) || !globalThis.crypto?.subtle) return
    let active = true
    crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(snapshot))
      .then((bytes) => {
        if (!active) return
        const digest = Array.from(new Uint8Array(bytes), (n) =>
          n.toString(16).padStart(2, '0'),
        ).join('')
        try {
          if (verifiedSnapshot === snapshot) localStorage.setItem(key, digest)
          else if (localStorage.getItem(key) === digest) setVerifiedSnapshot(snapshot)
        } catch {
          /* Private browsing may disable persistence. */
        }
      })
      .catch(() => {
        /* The review still works in memory. */
      })
    return () => {
      active = false
    }
  }, [key, snapshot, legacy, linked, verifiedSnapshot])
  if (!review && verifiedSnapshot === snapshot && (linked || legacy))
    return children(() => setReview(true))
  function finish() {
    setVerifiedSnapshot(snapshot)
    setReview(false)
    setCorrecting(false)
  }
  const termLabel = `${choice.academicYear}학년도 ${choice.semester}학기`
  return (
    <Frame logout={logout}>
      <p className="roster-context">
        {school.name} · {termLabel}
      </p>
      <h1>내 교사 정보 확인</h1>
      {(query.isLoading || (query.isFetching && !entry && !query.isError)) && (
        <p role="status">학교 명부를 불러오고 있습니다.</p>
      )}
      {entry && (
        <dl>
          <div>
            <dt>학교 표시 이름</dt>
            <dd>{entry.displayName}</dd>
          </div>
          <div>
            <dt>로그인 이메일</dt>
            <dd>{entry.authEmail}</dd>
          </div>
          <div>
            <dt>담당 과목</dt>
            <dd>
              {entry.term
                ? entry.term.subjects.map((s) => s.subjectName).join(', ') ||
                  '등록된 과목 없음'
                : '학기 연결 후 확인'}
            </dd>
          </div>
          <div>
            <dt>담임 학급</dt>
            <dd>
              {entry.term
                ? entry.term.homeroomClass
                  ? `${entry.term.homeroomClass.grade}학년 ${entry.term.homeroomClass.classNumber}반`
                  : '담임 미등록'
                : '학기 연결 후 확인'}
            </dd>
          </div>
        </dl>
      )}
      {legacy && (
        <p>
          재직 정보는 확인됐지만 연결된 교사 명부가 없습니다. 아래에서 학교
          코드와 표시 이름으로 연결을 요청할 수 있습니다.
        </p>
      )}
      {query.isError && !legacy && (
        <p role="alert">
          명부를 확인하지 못했습니다. 학교와 학기 ID를 확인하고 다시 조회해
          주세요.
        </p>
      )}
      {entry && !linked && (
        <p role="status">
          학교 관리자의 승인 및 재직 확인을 기다리고 있습니다.
        </p>
      )}
      <div className="roster-actions">
        {(linked || legacy) && (
          <button type="button" className="btn btn-primary" onClick={finish}>
            {legacy ? '기존 재직 정보로 계속' : '확인하고 업무 홈으로'}
          </button>
        )}
        <button
          type="button"
          className="btn"
          aria-expanded={editingTerm}
          onClick={() => setEditingTerm(!editingTerm)}
        >
          학기 설정
        </button>
        {entry && (
          <button
            type="button"
            className="btn"
            aria-expanded={correcting}
            onClick={() => setCorrecting(!correcting)}
          >
            정정 요청
          </button>
        )}
        {query.isError && (
          <button type="button" className="btn" onClick={() => query.refetch()}>
            명부 다시 조회
          </button>
        )}
      </div>
      {editingTerm && (
        <TermForm
          current={choice}
          onApply={(value) => {
            saveChoice(value)
            setEditingTerm(false)
          }}
        />
      )}
      {correcting && entry && (
        <Correction school={school.name} entry={entry} termLabel={termLabel} />
      )}
      <details open={legacy || undefined}>
        <summary>다른 학교 선택 · 가입 상태 확인</summary>
        <Schools session={session} />
      </details>
    </Frame>
  )
}

export default function RosterGate({ onLogout, children }) {
  const session = useHomeSession()
  const scope = JSON.stringify(session.scope)
  if (!session.userId && getPreviewUserRole()) return children()
  if (session.switching || session.active.isLoading)
    return (
      <Frame logout={onLogout}>
        <p role="status">소속 학교를 확인하고 있습니다.</p>
      </Frame>
    )
  if (
    session.active.isSuccess &&
    session.school &&
    session.school.position !== 'TEACHER'
  )
    return children()
  if (
    session.active.isSuccess &&
    session.school?.employmentStatus === 'HIRED'
  ) {
    return (
      <TeacherReview key={scope} session={session} logout={onLogout}>
        {children}
      </TeacherReview>
    )
  }
  const denied =
    isAxiosError(session.active.error) &&
    session.active.error.response?.status === 403
  return (
    <Frame logout={onLogout}>
      <h1>학교 연결 확인</h1>
      {session.userId && (denied || session.active.isSuccess) ? (
        <Schools key={scope} session={session} />
      ) : (
        <>
          <p role="alert">활성 학교를 확인하지 못했습니다.</p>
          <button className="btn" onClick={() => session.active.refetch()}>
            다시 확인
          </button>
        </>
      )}
    </Frame>
  )
}
