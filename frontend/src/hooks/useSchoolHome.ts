import { useSyncExternalStore } from 'react'
import type { DirectoryMember } from '@/api/home'
import { getDatedLessons } from '@/api/home'
import { useSchoolClasses, useSubjects } from './useSchoolCatalog.js'
import { usePeriodSettings } from './useSchoolSetting.js'
import type { HomeTerm, LessonAssignmentDto } from '@/types/datedLesson'
import type { PeriodSettingResponse } from '@/types/schoolSetting.js'
import { firstSchoolDate, isInTerm } from './useTimetableDate'
import type { BoardSelection } from './useTimetableSelection'
import { getPublishedWeek, type PublishedView } from '@/api/publishedWeek'
import { getSchoolWeekRange } from '@/utils/weekRange.js'
import { homeWeekAccess } from '@/utils/homeAccess'
import { schoolDate, toHomeNotifications } from '@/utils/homeContract'
import { fieldRead, homeQueryState } from '@/utils/homeQueryState'
import { useHomeProfile, useHomeNotices, useWeekRead } from './homeReads'
import { queryKeys } from './queryKeys.js'
import { useScopedRead, useHomeSession } from './useHomeSession'

function subscribeClock(notify: () => void) {
  let timer: number
  function tick() {
    notify()
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
  }
  timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000))
  document.addEventListener('visibilitychange', notify)
  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', notify)
  }
}

function assignment(
  dto: LessonAssignmentDto,
  members?: readonly DirectoryMember[],
  periods?: PeriodSettingResponse[],
) {
  const member = members?.find((m) => m.schoolUserId === dto.teacherId)
  return {
    ...dto,
    teacherName: member?.displayName ?? member?.username ?? null,
    periodNumber: periods?.find((p) => p.id === dto.periodId)?.periodNumber ?? null,
  }
}

export interface HomeSelection extends BoardSelection {
  term: HomeTerm | null
  weeklyTerm?: Omit<HomeTerm, 'termId'> | null
  classId?: number | null
  date?: string
  timeZone?: string
}

export function useSchoolHome(input: HomeSelection) {
  const { term, weeklyTerm, classId = null, date, timeZone } = input
  const session = useHomeSession()
  const { access, school, userId } = session
  const today = useSyncExternalStore(subscribeClock, () => schoolDate(new Date(), timeZone))
  const currentTerm = term?.schoolId === school?.schoolId ? term : null
  const calendar = currentTerm ?? (weeklyTerm?.schoolId === school?.schoolId ? weeklyTerm : null)
  const day = date ?? firstSchoolDate(currentTerm, today)
  const inRange = isInTerm(day, currentTerm)
  const staff = access.queries.adminProfile || access.queries.teacherProfile
  const inWeek = access.queries.datedLessons && calendar != null
  const { profileQuery, directory, profile } = useHomeProfile(
    session,
    calendar?.academicYear ?? null,
    currentTerm?.termId ?? null,
  )
  const classes = useSchoolClasses(calendar?.academicYear, {
    termId: currentTerm?.termId,
    enabled: inWeek,
  })
  const notifications = useHomeNotices(session)
  const subjects = useSubjects()
  const periods = usePeriodSettings()
  const fallback = homeWeekAccess(access, profile.homerooms, classId)
  const requested = input.view ?? fallback.selection.view
  const admin = access.queries.adminProfile
  const view = !inWeek
    ? 'unavailable'
    : requested === 'class' ||
        (admin ? ['teacher', 'school'] : ['mine', 'homeroom']).includes(requested)
      ? requested
      : admin
        ? 'school'
        : 'mine'
  const rooms = profile.homerooms.state === 'value' ? profile.homerooms.value : []
  const homeroom = rooms.find((r) => r.classId === (input.homeroomId ?? classId)) ?? rooms[0]
  const room =
    view === 'class' && !classes.isError
      ? classes.data?.find((r) => r.id === classId && r.grade === input.grade)
      : undefined
  const roomId = view === 'homeroom' ? homeroom?.classId : room?.id
  const memberId = profile.schoolUserId.state === 'value' ? profile.schoolUserId.value : null
  const teachers = directory.isError
    ? []
    : (directory.data ?? []).filter(
        (m) =>
          (!m.position || m.position === 'TEACHER') &&
          (!m.employmentStatus || m.employmentStatus === 'HIRED'),
      )
  const teacher =
    view === 'teacher' ? teachers.find((m) => m.schoolUserId === input.teacherId) : undefined
  const teacherId = view === 'mine' ? memberId : (teacher?.schoolUserId ?? null)
  const hasTarget =
    view !== 'unavailable' &&
    ((view !== 'class' && view !== 'homeroom') || roomId != null) &&
    (view !== 'teacher' || !!teacher)
  const canReadWeek = inWeek && inRange && hasTarget
  const wireView: PublishedView =
    view === 'homeroom' ? 'class' : view === 'unavailable' ? 'mine' : view
  const weekStart = inRange ? getSchoolWeekRange(new Date(day + 'T12:00:00')).start : null
  const publishedEnabled = canReadWeek && !!currentTerm
  const published = useScopedRead(
    session,
    [
      'timetable',
      'published',
      currentTerm?.termId,
      weekStart,
      view,
      roomId ?? null,
      view === 'mine' && memberId === null ? { accountId: session.userId } : teacherId,
    ],
    publishedEnabled,
    (signal) =>
      getPublishedWeek(currentTerm!.termId, day, wireView, roomId, teacher?.schoolUserId, signal),
    { retry: false },
  )
  const legacyEnabled = canReadWeek && !currentTerm && view !== 'class'
  const legacy = useWeekRead(
    session,
    !legacyEnabled
      ? 'unavailable'
      : view === 'teacher'
        ? 'school'
        : view === 'homeroom'
          ? 'homeroom'
          : view === 'mine'
            ? 'mine'
            : 'school',
    calendar?.academicYear,
    calendar?.semester,
    undefined,
    roomId,
    { date: day },
  )
  const publishedState = homeQueryState(published, publishedEnabled)
  const legacyState = homeQueryState(legacy, legacyEnabled)
  const legacyRows =
    view === 'teacher'
      ? legacyState.data?.filter((r) => r.teacherId === teacherId)
      : legacyState.data
  const weekly = currentTerm
    ? { ...publishedState, data: publishedState.data?.lessons }
    : { ...legacyState, data: legacyRows }
  const datedEnabled = publishedEnabled && (view !== 'mine' || teacherId !== null)
  const dated = useScopedRead(
    session,
    queryKeys.home.dated(currentTerm?.termId, day, view, roomId, teacherId),
    datedEnabled,
    async (signal) => {
      if (!currentTerm) throw new Error('학기를 선택하세요.')
      const rows = await getDatedLessons(currentTerm.termId, day, signal)
      return rows.filter(
        (row) =>
          ((view !== 'mine' && view !== 'teacher') ||
            row.actual.teacherId === teacherId ||
            row.planned.teacherId === teacherId) &&
          (roomId === undefined || row.classId === roomId),
      )
    },
    {
      select: (rows) =>
        rows.map(({ id, planned, actual, ...lesson }) => ({
          ...lesson,
          lessonId: id,
          planned: assignment(
            planned,
            directory.isError ? undefined : directory.data,
            periods.isError ? undefined : periods.data,
          ),
          actual: assignment(
            actual,
            directory.isError ? undefined : directory.data,
            periods.isError ? undefined : periods.data,
          ),
        })),
    },
  )

  const slotLessons = homeQueryState(dated, datedEnabled)
  // Keep the personal agenda restricted to actual teaching duties. A selected cell can also
  // explain who took over a lesson the teacher was originally scheduled to teach.
  const personalRows =
    view === 'mine' || view === 'teacher'
      ? slotLessons.data?.filter((row) => row.actual.teacherId === teacherId)
      : undefined
  return {
    activeSchool: homeQueryState(session.active, userId !== null && !session.switching),
    access,
    today,
    date: day,
    profile,
    profileQuery: homeQueryState(profileQuery, staff),
    directory: homeQueryState(directory, staff),
    subjects: homeQueryState(subjects, staff),
    classes: homeQueryState(classes, inWeek),
    periods: homeQueryState(periods, staff),
    selection: {
      view,
      classId: roomId,
      grade: view === 'homeroom' ? homeroom?.grade : room?.grade,
      teacherId,
    },
    teachers,
    teacher,
    rooms,
    room,
    homeroom,
    inRange,
    calendarDays: publishedState.data?.days,
    canSwitchHomeroom: inWeek && access.queries.teacherProfile && rooms.length > 0,
    retryWeekly: currentTerm ? published.refetch : legacy.refetch,
    retryDated: datedEnabled ? dated.refetch : undefined,
    retryNotices: staff ? notifications.refetch : undefined,
    weekly: weekly.data?.length === 0 ? { ...weekly, state: 'empty' as const } : weekly,
    slotLessons,
    dated: personalRows
      ? {
          ...slotLessons,
          state: personalRows.length ? ('ready' as const) : ('empty' as const),
          data: personalRows,
        }
      : slotLessons,
    notifications: toHomeNotifications(fieldRead(notifications, staff)),
    notificationQuery: homeQueryState(notifications, staff),
  }
}
