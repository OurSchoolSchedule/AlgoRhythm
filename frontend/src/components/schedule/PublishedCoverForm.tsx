import { getDatedLessons } from '@/api/home'
import { useHomeSession, useScopedRead } from '@/hooks/useHomeSession'
import { lessonDayKey } from '@/hooks/lessonChangeCache'
import CreateSubstituteForm from './CreateSubstituteForm'

interface Props {
  termId?: number
  lesson: { weeklyLessonId?: number | null; periodSettingId?: number; teacherId?: number }
  date: string
  periodLabel: string
}

export default function PublishedCoverForm({ termId, lesson, date, periodLabel }: Props) {
  const session = useHomeSession()
  const day = useScopedRead(
    session, lessonDayKey(termId ?? null, date), !!termId && session.access.actions.approve,
    signal => getDatedLessons(termId!, date, signal), { staleTime: 0, retry: false },
  )
  const row = day.data?.find(r => r.originId === lesson.weeklyLessonId && !r.actual.cancelled &&
    r.actual.periodId === lesson.periodSettingId && r.actual.teacherId === lesson.teacherId)
  if (!termId) return <p role="alert">수업의 학기를 확인하세요.</p>
  if (day.isPending) return <p role="status">모집할 날짜 수업을 확인하고 있습니다.</p>
  if (day.isError || !row) return (
    <p role="alert">선택한 날짜의 수업이 변경되었거나 조회되지 않았습니다.{' '}
      <button type="button" onClick={() => day.refetch()}>날짜 수업 다시 조회</button>
    </p>
  )
  return <CreateSubstituteForm key={row.id + '/' + row.rev} defaultDate={date} periodLabel={periodLabel}
    datedTarget={{termId, datedLessonId:row.id, expectedLessonRev:row.rev}} />
}
