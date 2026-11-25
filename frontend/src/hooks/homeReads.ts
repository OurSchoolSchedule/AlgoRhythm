import { getOwnerProfile, getStaffProfile } from '@/api/mypage.js'
import { toHomeProfile } from '@/utils/homeContract'
import { fieldRead } from '@/utils/homeQueryState'
import { getHomeDirectory, getHomeNotices } from '@/api/home'
import {
  getMyTimetable,
  getMyTimetableByTerm,
  getSchoolTimetable,
  getSchoolTimetableByTerm,
} from '@/api/timetable.js'
import type { TimetableDto } from '@/types/timetable.js'
import { queryKeys } from './queryKeys.js'
import { type HomeSession, type ReadOptions, useScopedRead } from './useHomeSession'

export function useHomeDirectory(session: HomeSession, enabled = true) {
  const { members, teachers } = session.access.queries
  return useScopedRead(
    session,
    queryKeys.home.directory(),
    enabled && (members || teachers),
    (signal) => getHomeDirectory(members, signal),
  )
}

export function useHomeProfile(session: HomeSession, academicYear: number | null) {
  const staff = session.access.menus.profile
  const admin = session.access.queries.adminProfile
  const profileQuery = useScopedRead(
    session,
    admin ? queryKeys.mypage.ownerProfile() : queryKeys.mypage.staffProfile(),
    staff,
    (signal) => (admin ? getOwnerProfile({ signal }) : getStaffProfile({ signal })),
  )
  const directory = useHomeDirectory(session)
  const profile = toHomeProfile(
    session.userId,
    academicYear,
    fieldRead(profileQuery, staff),
    fieldRead(directory, staff),
  )
  return { profileQuery, directory, profile }
}

export function useHomeNotices(session: HomeSession) {
  return useScopedRead(
    session,
    queryKeys.notification.list(),
    session.access.queries.notifications,
    getHomeNotices,
  )
}

export function useWeekRead(
  session: HomeSession,
  view: 'mine' | 'school' | 'homeroom' | 'unavailable',
  year?: number,
  semester?: number,
  termId?: number,
  classId?: number,
  options: ReadOptions<TimetableDto[], TimetableDto[]> = {},
) {
  const mine = view === 'mine'
  const key = mine
    ? queryKeys.timetable.mine(year, semester)
    : queryKeys.timetable.school(year, semester)
  const allowed =
    view !== 'unavailable' &&
    (mine
      ? session.access.queries.teacherProfile
      : session.access.queries.teacherProfile || session.access.queries.adminProfile)
  return useScopedRead(
    session,
    [...key, termId ?? null, view, classId ?? null],
    allowed,
    async (signal) => {
      const termRead = mine ? getMyTimetableByTerm : getSchoolTimetableByTerm
      const allRead = mine ? getMyTimetable : getSchoolTimetable
      const rows =
        year != null && semester != null
          ? await termRead(year, semester, { signal })
          : await allRead({ signal })
      return rows.filter(
        (row) =>
          row.schoolId === session.scope.schoolId &&
          (view !== 'homeroom' || row.schoolClassId === classId),
      )
    },
    options,
  )
}
