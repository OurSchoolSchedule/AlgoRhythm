import { useState } from 'react'
import CreateSubstituteForm from '@/components/schedule/CreateSubstituteForm'

const unavailable = {
  loading: '날짜 수업을 불러오는 중입니다.',
  forbidden: '날짜 수업 조회 권한이 없습니다.',
  error: '날짜 수업을 조회하지 못했습니다.',
  disabled: '조회할 학기를 선택하세요.',
}

export default function SelectedLesson({ home, term, cell, weeklyRows, roomId, onRequest }) {
  const [choice, setChoice] = useState('')
  const [publicRequest, setPublicRequest] = useState(null)
  const actual = (home.slotLessons.data ?? []).filter(
    (r) =>
      r.date === cell.iso &&
      r.termId === term?.termId &&
      (r.actual.periodNumber === cell.period ||
        weeklyRows.some((w) => w.periodSettingId === r.actual.periodId)) &&
      (!roomId || r.classId === roomId),
  )
  const options = actual.map((lesson) => {
    const room = home.classes.data?.find((r) => r.id === lesson.classId)
    const subject = home.subjects.data?.find((s) => s.id === lesson.subjectId)
    const label = [
      room ? `${room.grade}학년 ${room.classNumber}반` : `학급 #${lesson.classId}`,
      subject?.name ?? `과목 #${lesson.subjectId}`,
      lesson.actual.teacherName ?? `교사 #${lesson.actual.teacherId}`,
    ].join(' · ')
    return { key: 'dated-' + lesson.lessonId, label, lesson }
  })
  for (const row of weeklyRows) {
    if (!actual.some((r) => r.classId === row.schoolClassId)) {
      options.push({
        key: 'weekly-' + (row.weeklyLessonId ?? row.id),
        legacyId: row.id,
        label: `${row.grade}학년 ${row.classNumber}반 · ${row.subjectName ?? '과목 미확인'} · 기본표`,
      })
    }
  }
  const picked = options.length === 1 ? options[0] : options.find((o) => o.key === choice)
  const lesson = picked?.lesson
  const clock = home.periods?.data?.find((p) => p.periodNumber === cell.period)
  const allowed = home.access.actions
  const blocked = !home.access.queries.datedLessons
    ? '학교 승인 후 이용 가능합니다.'
    : home.slotLessons.refreshError
      ? '날짜 수업을 다시 조회하세요.'
      : (unavailable[home.slotLessons.state] ??
        (!picked && options.length > 1
          ? '신청할 수업을 먼저 선택하세요.'
          : !lesson
            ? '이 날짜와 교시에 조회된 실제 수업이 없습니다.'
            : lesson.actual.cancelled
              ? '휴강이 확정된 수업입니다.'
              : ''))
  const swapReason = !allowed.requestSwap
    ? '재직 교사만 신청 가능합니다.'
    : lesson && lesson.actual.teacherId !== home.profile.schoolUserId.value
      ? '이 수업의 실제 담당자만 신청 가능합니다.'
      : ''
  const coverAllowed = allowed.requestSubstitute && (!allowed.requestSwap || !swapReason)
  const publicKey = allowed.approve && picked &&
    (term ? lesson && !blocked : picked.legacyId != null)
    ? picked.key + '/' + (lesson?.rev ?? 'legacy')
    : null
  function open(kind) {
    onRequest({
      schoolId: term.schoolId,
      termId: term.termId,
      date: lesson.date,
      kind,
      datedLessonId: lesson.lessonId,
      rev: lesson.rev,
      teacherId: lesson.actual.teacherId,
    })
  }
  return (
    <aside className="desk-lesson-selection" aria-label="선택한 날짜 수업" aria-live="polite">
      <h3>
        {cell.iso} · {cell.period}교시
      </h3>
      {clock?.startTime && clock?.endTime && (
        <p>
          {clock.startTime.slice(0, 5)} ~ {clock.endTime.slice(0, 5)}
        </p>
      )}
      {options.length > 1 && (
        <label>
          이 교시의 수업
          <select value={picked?.key ?? ''} onChange={(e) => setChoice(e.target.value)}>
            <option value="">수업 선택</option>
            {options.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {picked && <strong>{picked.label}</strong>}
      {publicKey &&
        (publicRequest === publicKey ? (
          <CreateSubstituteForm
            key={publicKey}
            timetableId={picked.legacyId}
            datedTarget={lesson ? {
              termId: term.termId, datedLessonId: lesson.lessonId, expectedLessonRev: lesson.rev,
            } : undefined}
            defaultDate={cell.iso}
            periodLabel={cell.period + '교시'}
          />
        ) : (
          <button type="button" onClick={() => setPublicRequest(publicKey)}>
            공개 보결 모집
          </button>
        ))}
      {lesson && lesson.actual.teacherId !== lesson.planned.teacherId && (
        <span>담당 변경 · 실제 담당자 기준</span>
      )}
      {blocked && <p>{blocked}</p>}
      {home.slotLessons.refreshError || home.slotLessons.state === 'error' ? (
        <button onClick={home.retryDated}>다시 조회</button>
      ) : null}
      <button disabled={!!blocked || !coverAllowed} onClick={() => open('SUBSTITUTE')}>
        보결 요청하기
      </button>
      {!coverAllowed && <small>관리자 또는 이 수업의 실제 담당자가 신청할 수 있습니다.</small>}
      <button disabled={!!blocked || !!swapReason} onClick={() => open('SWAP')}>
        교환 요청하기
      </button>
      {swapReason && <small>{swapReason}</small>}
    </aside>
  )
}
