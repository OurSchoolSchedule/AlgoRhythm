import { useSyncExternalStore } from 'react'
import type { DirectoryMember } from '@/api/home'
import { getDatedLessons } from '@/api/home'
import { useSchoolClasses, useSubjects } from './useSchoolCatalog.js'
import { usePeriodSettings } from './useSchoolSetting.js'
import { getOwnerProfile, getStaffProfile } from '@/api/mypage.js'
import type { HomeTerm, LessonAssignmentDto } from '@/types/datedLesson'
import type { PeriodSettingResponse } from '@/types/schoolSetting.js'
import { homeWeekAccess } from '@/utils/homeAccess'
import { schoolDate, toHomeNotifications, toHomeProfile } from '@/utils/homeContract'
import { fieldRead, homeQueryState } from '@/utils/homeQueryState'
import { useHomeDirectory, useHomeNotices, useWeekRead } from './homeReads'
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
  return {
    ...dto,
    teacherName: members?.find((m) => m.schoolUserId === dto.teacherId)?.username ?? null,
    periodNumber: periods?.find((p) => p.id === dto.periodId)?.periodNumber ?? null,
  }
}

export interface HomeSelection {
  term: HomeTerm | null
  classId?: number | null
  date?: string
  timeZone?: string
}

export function useSchoolHome({ term, classId = null, date, timeZone }: HomeSelection) {
  const session = useHomeSession()
  const { access, school, userId } = session
  const today = useSyncExternalStore(subscribeClock, () => schoolDate(new Date(), timeZone))
  const day = date ?? today
  const currentTerm = term?.schoolId === school?.schoolId ? term : null
  const staff = access.queries.adminProfile || access.queries.teacherProfile
  const inTerm = staff && currentTerm !== null
  const admin = access.queries.adminProfile
  const profileQuery = useScopedRead(
    session,
    admin ? queryKeys.mypage.ownerProfile() : queryKeys.mypage.staffProfile(),
    staff,
    (signal) => (admin ? getOwnerProfile({ signal }) : getStaffProfile({ signal })),
  )
  const directory = useHomeDirectory(session)
  const profile = toHomeProfile(
    userId,
    currentTerm?.academicYear ?? null,
    fieldRead(profileQuery, staff),
    fieldRead(directory, staff),
  )
  const week = homeWeekAccess(access, profile.homerooms, classId)
  const view = inTerm ? week.selection.view : 'unavailable'
  const selected = inTerm && week.selection.view === 'homeroom' ? week.selection.classId : undefined
  const weekly = useWeekRead(
    session,
    view,
    currentTerm?.academicYear,
    currentTerm?.semester,
    currentTerm?.termId,
    selected,
  )
  const notifications = useHomeNotices(session)
  const subjects = useSubjects()
  const classes = useSchoolClasses(currentTerm?.academicYear, { enabled: inTerm })
  const periods = usePeriodSettings()

  const teacherId =
    view === 'mine' && profile.schoolUserId.state === 'value' ? profile.schoolUserId.value : null
  const datedEnabled =
    inTerm && access.queries.datedLessons && (view !== 'mine' || teacherId !== null)
  const dated = useScopedRead(
    session,
    queryKeys.home.dated(currentTerm?.termId, day, view, selected, teacherId),
    datedEnabled,
    async (signal) => {
      if (!currentTerm) throw new Error('학기를 선택하세요.')
      const rows = await getDatedLessons(currentTerm.termId, day, signal)
      return rows.filter(
        (row) =>
          (view !== 'mine' || row.actual.teacherId === teacherId) &&
          (view !== 'homeroom' || row.classId === selected),
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

  return {
    activeSchool: homeQueryState(session.active, userId !== null && !session.switching),
    access,
    today,
    date: day,
    profile,
    profileQuery: homeQueryState(profileQuery, staff),
    directory: homeQueryState(directory, staff),
    subjects: homeQueryState(subjects, staff),
    classes: homeQueryState(classes, inTerm),
    periods: homeQueryState(periods, staff),
    selection: inTerm ? week.selection : { view: 'unavailable' as const },
    canSwitchHomeroom: inTerm && week.canSwitchHomeroom,
    weekly: homeQueryState(weekly, inTerm),
    dated: homeQueryState(dated, datedEnabled),
    notifications: toHomeNotifications(fieldRead(notifications, staff)),
    notificationQuery: homeQueryState(notifications, staff),
  }
}
