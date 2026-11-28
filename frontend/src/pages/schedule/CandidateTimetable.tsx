import { useId, useState } from 'react'
import { DetailTabs } from '@/components/ui/DetailPage'
import type { GenerationJob, ScheduleCandidate } from '@/types/generationJob'
import CandidateGrid from './CandidateGrid'

const views = ['학급별 조회', '교사별 조회'] as const

interface Props {
  candidate: ScheduleCandidate
  job?: GenerationJob
  rosterTeacherIds: string[]
  className: (id: string) => string
  subjectName: (id: string) => string
  teacherName: (id: string) => string
}

export default function CandidateTimetable({
  candidate,
  job,
  rosterTeacherIds,
  className,
  subjectName,
  teacherName,
}: Props) {
  const panelId = useId()
  const [view, setView] = useState<string>(views[0])
  const [room, setRoom] = useState('')
  const [teacher, setTeacher] = useState('')
  const byClass = view === views[0]
  const target = byClass ? '학급' : '교사'
  const name = byClass ? className : teacherName
  const targetKey = byClass ? 'classId' : 'teacherId'
  const ids = new Set([
    ...candidate.placements.map((lesson) => lesson[targetKey]),
    ...(byClass ? Object.keys(job?.classGrades ?? {}) : rosterTeacherIds),
  ])
  const choices = [...ids]
    .map((id) => ({ id, label: name(id) }))
    .sort(
      (a, b) =>
        a.label.localeCompare(b.label, 'ko', { numeric: true }) ||
        a.id.localeCompare(b.id, 'en', { numeric: true }),
    )
  const labelCounts = new Map<string, number>()
  for (const { label } of choices) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1)
  const selected = byClass ? room : teacher
  const activeId = ids.has(selected) ? selected : (choices[0]?.id ?? '')
  const placements = candidate.placements.filter((lesson) => lesson[targetKey] === activeId)
  const limits = byClass
    ? job?.gradeLastPeriods?.find((g) => g.grade === job?.classGrades?.[activeId])?.lastPeriods
    : undefined

  return (
    <>
      <h3>선택한 후보의 시간표</h3>
      <DetailTabs
        label="후보 시간표 보기"
        panelId={panelId}
        items={views}
        value={view}
        onChange={setView}
      />
      <div id={panelId} role="tabpanel" aria-labelledby={panelId + (byClass ? '-0' : '-1')}>
        {choices.length ? (
          <>
            <div className="work-row">
              <label>
                {target}
                <select
                  value={activeId}
                  onChange={(e) => (byClass ? setRoom : setTeacher)(e.target.value)}
                >
                  {choices.map(({ id, label }) => (
                    <option key={id} value={id}>
                      {label}
                      {(labelCounts.get(label) ?? 0) > 1 && ' · #' + id}
                    </option>
                  ))}
                </select>
              </label>
              <span>주 {placements.length}차시</span>
            </div>
            {byClass && job?.gradeLastPeriods && !limits ? (
              <p role="alert">이 작업에서 선택한 학급의 학년별 편성 조건을 확인할 수 없습니다.</p>
            ) : job?.teachingSlots?.length ? (
              <CandidateGrid
                key={[candidate.candidateId, target, activeId].join('/')}
                slots={job.teachingSlots}
                limits={limits}
                registeredPeriods={job.registeredPeriods}
                placements={placements}
                target={target}
                subjectName={subjectName}
                lessonDetail={(lesson) =>
                  byClass ? teacherName(lesson.teacherId) : className(lesson.classId)
                }
              />
            ) : (
              <p role="status">이 작업의 운영 교시를 확인할 수 없습니다.</p>
            )}
          </>
        ) : (
          <p role="status">
            이 후보에서 조회할 {target === '교사' ? '교사가' : '학급이'} 없습니다.
          </p>
        )}
      </div>
    </>
  )
}
