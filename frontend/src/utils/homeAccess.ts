import type { ActiveSchoolDto, HomeField, HomeroomDto } from '@/types/home'

export function homeAccess(authenticated: boolean, school: ActiveSchoolDto | null) {
  const active = authenticated && school !== null && school.schoolId > 0
  const admin = active && school.position === 'ADMIN'
  const teacher = active && school.position === 'TEACHER'
  const staff = admin || teacher
  // v2 term operations also check the school membership's employment status.
  const hired = staff && school.employmentStatus === 'HIRED'
  const actions = {
    generate: hired && admin,
    publish: hired && admin,
    approve: hired && admin,
    requestSubstitute: hired,
    respondToChange: hired && teacher,
    requestSwap: hired && teacher,
  }
  return {
    menus: {
      timetable: staff,
      profile: staff,
      notifications: staff,
      ...actions,
    },
    queries: {
      activeSchool: authenticated,
      adminProfile: admin,
      teacherProfile: teacher,
      members: admin,
      teachers: teacher,
      catalog: staff,
      datedLessons: hired,
      notifications: staff,
      // Enable only when a student auth and read endpoint are available.
      studentWeek: false as const,
    },
    // Role eligibility; the server still validates the dated lesson, responder, and revision.
    actions,
  }
}

type WeekView = { view: 'unavailable' | 'mine' | 'school' } | { view: 'homeroom'; classId: number }

export function homeWeekAccess(
  access: ReturnType<typeof homeAccess>,
  homerooms: HomeField<readonly HomeroomDto[]>,
  requestedClassId: number | null = null,
) {
  const rooms = access.queries.teacherProfile && homerooms.state === 'value' ? homerooms.value : []
  const selected = rooms.find((room) => room.classId === requestedClassId)
  let selection: WeekView = { view: 'unavailable' }
  if (selected) selection = { view: 'homeroom', classId: selected.classId }
  else if (access.queries.teacherProfile) selection = { view: 'mine' }
  else if (access.queries.adminProfile) selection = { view: 'school' }
  return {
    canSwitchHomeroom: rooms.length > 0,
    selection,
    queries: {
      myWeek: selection.view === 'mine',
      schoolWeek: selection.view === 'school' || selection.view === 'homeroom',
    },
  }
}
