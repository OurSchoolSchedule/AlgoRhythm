import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ownRosterKey, readOwnRoster } from '@/api/ownRoster'
import { getStaffStores, joinStaffStore } from '@/api/mypage'
import SchoolJoinForm from '@/pages/auth/SchoolJoinForm'
import { useScopedRead } from '@/hooks/useHomeSession'
import { useUpdateActiveStore } from '@/hooks/useMypage'
import { queryKeys } from '@/hooks/queryKeys'

const labels = {
  HIRED: '재직 중',
  PENDING: '승인 대기',
  ON_LEAVE: '휴직',
  RESIGNED: '퇴직',
}

function PendingName({ session, schoolId }) {
  const request = useScopedRead(
    session,
    [...ownRosterKey(schoolId), 'pending'],
    true,
    (signal) => readOwnRoster(schoolId, null, signal),
    { retry: false },
  )
  return request.data && !request.isError ? (
    <small>신청 이름 · {request.data.displayName}</small>
  ) : null
}

export default function Schools({ session }) {
  const cache = useQueryClient()
  const schools = useScopedRead(
    session,
    queryKeys.mypage.staffStores(),
    true,
    (signal) => getStaffStores({ signal }),
    { retry: false },
  )
  const activate = useUpdateActiveStore()
  const [message, setMessage] = useState('')
  async function refresh() {
    const latest = await schools.refetch()
    await cache.invalidateQueries({
      queryKey: ['school-roster'],
      predicate: ({ queryKey }) =>
        queryKey[2] === 'me' && queryKey.at(-1)?.userId === session.userId,
    })
    if (
      latest.data?.some((s) => s.employmentStatus === 'HIRED') ||
      session.school
    )
      await session.active.refetch()
  }
  return (
    <section className="roster-schools" aria-label="학교 가입과 승인 상태">
      <h2>내 학교와 가입 상태</h2>
      {schools.isLoading && <p role="status">소속 학교를 확인하고 있습니다.</p>}
      {schools.isError && <p role="alert">학교 목록을 불러오지 못했습니다.</p>}
      {schools.isSuccess && !schools.data.length && (
        <p>아직 연결된 학교가 없습니다.</p>
      )}
      <ul>
        {!schools.isError &&
          schools.data?.map((s) => (
            <li key={s.schoolId}>
              <span>
                {s.name} · {labels[s.employmentStatus] ?? '상태 확인 필요'}
                {s.employmentStatus === 'PENDING' && (
                  <PendingName session={session} schoolId={s.schoolId} />
                )}
              </span>
              {s.employmentStatus === 'HIRED' &&
                s.schoolId !== session.school?.schoolId && (
                  <button
                    className="btn"
                    type="button"
                    disabled={activate.isPending}
                    onClick={() => activate.mutate(s.schoolId)}
                  >
                    이 학교로 전환<span className="roster-sr"> · {s.name}</span>
                  </button>
                )}
            </li>
          ))}
      </ul>
      {activate.isError && (
        <p role="alert">
          학교 전환에 실패했습니다. 가입 상태를 다시 확인하세요.
        </p>
      )}
      <button type="button" className="btn" onClick={refresh}>
        승인 상태 새로고침
      </button>
      <h3>학교 가입 요청</h3>
      <SchoolJoinForm submit={joinStaffStore} onComplete={async result => {
        setMessage(result.employmentStatus === 'PENDING' ? '가입 요청을 접수했습니다. 관리자 승인 대기 중입니다.' : '학교 연결 상태를 확인하세요.')
        await refresh()
      }} />
      {message && <p role="status">{message}</p>}
    </section>
  )
}
