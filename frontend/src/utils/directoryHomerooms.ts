import type { HomeMemberDto, HomeroomDto } from '@/types/home'

export function hasTermHomerooms(member: HomeMemberDto | undefined, termId: number | null) {
  if (!member || termId === null) return false
  return member.homeroomAssignmentTermId === undefined
    ? Boolean(member.termHomeroomsApplied)
    : member.homeroomAssignmentTermId === termId
}

// undefined means the directory cannot establish an assignment for this school term.
// An empty array means it can establish that the teacher has no homeroom.
export function directoryHomerooms(
  member: HomeMemberDto | undefined,
  academicYear: number | null,
  termId: number | null,
): readonly HomeroomDto[] | undefined {
  if (!member || academicYear === null) return undefined

  if (member.homeroomAssignmentTermId != null && member.homeroomAssignmentTermId !== termId) return undefined
  if (hasTermHomerooms(member, termId))
    return member.homeroomClasses?.filter((room) => room.academicYear === academicYear)

  if (member.rosterLinked === false ||
      (member.rosterLinked === undefined && !('rosterHomeroomClass' in member))) {
    return member.homeroomClasses?.filter((room) => room.academicYear === academicYear)
  }
  if (termId === null) return undefined
  const room = member.rosterHomeroomClass
  if (member.rosterLinked === true) {
    if (member.rosterAssignmentTermId !== termId) return undefined
  } else if (!room && !member.rosterSubjects?.length) {
    // Earlier directory responses used null and [] for both missing and empty assignments.
    return undefined
  }
  if (room === null) return []
  return room?.academicYear === academicYear ? [room] : undefined
}
