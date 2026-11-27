import CandidateGrid from './CandidateGrid'
import { objectives } from './generationOptions'
import { useState } from 'react'
import type { HomeTerm } from '@/types/datedLesson'
import type { ScheduleCandidate, GenerationJob } from '@/types/generationJob'
import type { useCandidatePublication } from '@/hooks/useCandidatePublication'
import { useHomeDirectory } from '@/hooks/homeReads'
import { useHomeSession } from '@/hooks/useHomeSession'
import { useSubjects, useSchoolClasses } from '@/hooks/useSchoolCatalog'
import { operationError } from '@/utils/operationInputs'
import { schoolDate } from '@/utils/homeContract'

const recoveryText = {
  'reselect-candidate': '최신 작업 상태를 확인한 뒤 후보를 다시 선택하세요.',
  regenerate: '기존 게시 버전이 만료되었습니다. 새 후보를 생성하세요.',
  'revalidate-load': '입력 자료가 변경되었습니다. 시수표를 다시 검증하세요.',
  'review-dated-lessons':
    '적용 기간에 변경된 수업이 있습니다. 날짜 수업을 확인하고 적용일을 다시 선택하세요.',
  'review-publication': '최신 상태를 검토하고 후보와 적용일을 다시 선택하세요.',
}
interface Props {
  term: HomeTerm
  publication: ReturnType<typeof useCandidatePublication>
  job?: GenerationJob
  candidates: ScheduleCandidate[]
  onRestart: (revalidate: boolean) => void
}
export default function CandidatePublication({
  term,
  publication,
  candidates,
  job,
  onRestart,
}: Props) {
  const [id, setId] = useState('')
  const [room, setRoom] = useState('')
  const [date, setDate] = useState(() => {
    const today = schoolDate(new Date())
    if (term.startDate && term.endDate && (today < term.startDate || today > term.endDate))
      return term.startDate
    return today
  })
  const [error, setError] = useState('')
  const subjects = useSubjects(),
    classes = useSchoolClasses(term.academicYear)
  const members = useHomeDirectory(useHomeSession(), true, term.termId)
  const { teachingSlots: slots, objective, gradeLastPeriods, classGrades } = job ?? {}
  const candidate = candidates.find((c) => c.candidateId === id)
  const className = (id: string) => {
    const r = classes.data?.find((c) => String(c.id) === id)
    const grade = classGrades?.[id]
    if (r && (grade === undefined || r.grade === grade)) return `${r.grade}학년 ${r.classNumber}반`
    return grade === undefined ? '학급 #' + id : `${grade}학년 · 학급 #${id}`
  }
  const state = publication.state
  const mustRestart =
    state.phase === 'conflict' &&
    (state.recovery === 'regenerate' || state.recovery === 'revalidate-load')
  const rooms = [
    ...new Set([
      ...Object.keys(classGrades ?? {}),
      ...(candidate?.placements.map((p) => p.classId) ?? []),
    ]),
  ].sort((a, b) => className(a).localeCompare(className(b), 'ko', { numeric: true }))
  const selectedRoom = rooms.includes(room) ? room : rooms[0]
  const limits = gradeLastPeriods?.find((g) => g.grade === classGrades?.[selectedRoom])?.lastPeriods
  return (
    <section className="work-card">
      <h2>후보 비교 및 게시</h2>
      {objective && <p>후보 평가 기준 · {objectives[objective]}</p>}
      <fieldset disabled={publication.isPublishing || state.phase === 'published' || mustRestart}>
        <legend>게시할 후보 선택</legend>
        <div className="work-candidates">
          {candidates.map((c, i) => (
            <label key={c.candidateId}>
              <span>
                <input
                  type="radio"
                  name="candidate"
                  value={c.candidateId}
                  checked={id === c.candidateId}
                  onChange={() => {
                    setId(c.candidateId)
                    setError('')
                  }}
                />{' '}
                후보 {i + 1}
              </span>
              <small>주 {c.placements.length}차시</small>
              <small>
                희망 시간 충족 {c.score.wantsMet}/{c.score.wantsTotal}
              </small>
              <small>
                기피 시간 회피 {c.score.avoidsMet}/{c.score.avoidsTotal}
              </small>
              <small>
                교사 공강{' '}
                {c.score.teacherGapPeriods == null ? '미집계' : c.score.teacherGapPeriods + '교시'}
              </small>
              <small>희망 미충족 교사 {c.score.teachersWithNoWantMet}명</small>
            </label>
          ))}
        </div>
      </fieldset>
      {candidate && (
        <section className="work-detail">
          <h3>선택한 후보의 학급별 배치</h3>
          <label>
            학급{' '}
            <select
              aria-label="학급"
              value={selectedRoom}
              onChange={(e) => setRoom(e.target.value)}
            >
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {className(r)}
                </option>
              ))}
            </select>
          </label>
          {gradeLastPeriods && !limits ? (
            <p role="alert">이 작업에서 선택한 학급의 학년별 편성 조건을 확인할 수 없습니다.</p>
          ) : slots?.length ? (
            <CandidateGrid
              key={candidate.candidateId + '/' + selectedRoom}
              slots={slots}
              limits={limits}
              registeredPeriods={job?.registeredPeriods}
              placements={candidate.placements}
              room={selectedRoom}
              subjectName={(id) =>
                subjects.data?.find((s) => String(s.id) === id)?.name ?? '과목 #' + id
              }
              teacherName={(id) =>
                members.data?.find((m) => String(m.schoolUserId) === id)?.username ?? '교사 #' + id
              }
            />
          ) : (
            <p role="status">이 작업의 운영 교시를 확인할 수 없습니다.</p>
          )}
        </section>
      )}
      <form
        className="work-row"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!candidate) return
          setError('')
          try {
            const out = await publication.publish({
              candidateId: id,
              effectiveFrom: date,
            })
            if (out.phase === 'conflict') setId('')
          } catch (err) {
            setError(operationError(err))
          }
        }}
      >
        <label>
          게시 적용일
          <input
            type="date"
            min={term.startDate}
            max={term.endDate}
            value={date}
            required
            disabled={publication.isPublishing || state.phase === 'published'}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <button
          className="work-primary"
          disabled={
            !candidate ||
            !date ||
            publication.isPublishing ||
            state.phase === 'published' ||
            mustRestart
          }
        >
          선택한 후보 게시 확정
        </button>
      </form>
      {publication.isPublishing && <p role="status">게시 결과 확인 중</p>}
      {error && (
        <p className="work-error" role="alert">
          {error}
        </p>
      )}
      {state.phase === 'published' && (
        <p className="work-success" role="status">
          {state.request.effectiveFrom}부터 게시했습니다. 주 {state.receipt.weeklyLessons}차시 ·
          게시 버전 {state.receipt.publishRev}
        </p>
      )}
      {state.phase === 'conflict' && (
        <div className="work-error" role="alert">
          <strong>게시 충돌 (409)</strong>
          <p>
            {state.problem.message} {recoveryText[state.recovery]}
          </p>
          <p>
            {state.refresh.job && '최신 작업 ' + state.refresh.job.state + ' · '}
            {state.problem.currentRev != null && '서버 버전 ' + state.problem.currentRev + ' · '}
            {state.refresh.lessons && '적용일 수업 ' + state.refresh.lessons.length + '건'}
          </p>
          {mustRestart && (
            <button onClick={() => onRestart(state.recovery === 'revalidate-load')}>
              {state.recovery === 'revalidate-load' ? '시수표 다시 검증' : '후보 다시 생성 준비'}
            </button>
          )}
          {state.recovery === 'review-dated-lessons' && (
            <details>
              <summary>적용일 수업 확인</summary>
              <ul>
                {state.refresh.lessons?.map((r) => (
                  <li key={r.id}>
                    수업 #{r.id} · {className(String(r.classId))} · 담당 교사 #{r.actual.teacherId}{' '}
                    · 버전 {r.rev}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      {(state.phase === 'conflict' || state.phase === 'published') &&
        state.refresh.failures.length > 0 && (
          <p role="status">후속 조회 일부에 실패했습니다. 시간표와 날짜 수업을 다시 조회하세요.</p>
        )}
    </section>
  )
}
