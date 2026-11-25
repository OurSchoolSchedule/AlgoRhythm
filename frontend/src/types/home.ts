// Projections of the fields consumed by home (BE 17811f4). IDs retain their wire types.
export interface ActiveSchoolDto {
  schoolId: number
  position: string
  employmentStatus: string
}

export interface HomeProfileDto {
  userId: number
  username: string | null
}

export interface SubjectInfoDto {
  subjectId: number
  subjectName: string
}

export interface HomeroomDto {
  classId: number
  academicYear: number
  grade: number
  classNumber: number
}

export interface HomeMemberDto {
  displayName?: string | null
  rosterSubjects?: readonly SubjectInfoDto[]
  rosterHomeroomClass?: HomeroomDto | null
  userId: number
  schoolUserId: number
  subjects: readonly SubjectInfoDto[]
  homeroomClasses: readonly HomeroomDto[]
}

export interface HomeNoticeDto {
  id: number
  category: string
  type: string
  message: string
  schoolName: string | null
  createdAt: string
  read: boolean
  timetableSwapRequestId: number | null
  substituteRequestId: number | null
  substituteResponseId: number | null
}

// Query results and field availability are independent. A 403 is a server decision.
type ReadFailure = { state: 'error' | 'forbidden'; error: unknown }
export type HomeRead<T> = { state: 'pending' } | ReadFailure | { state: 'success'; data: T }
export type HomeField<T> =
  | { state: 'pending' | 'empty' | 'unsupported' | 'unconfirmed' }
  | ReadFailure
  | { state: 'value'; value: T }

export interface HomeProfile {
  name: HomeField<string>
  schoolUserId: HomeField<number>
  subjects: HomeField<readonly SubjectInfoDto[]>
  homerooms: HomeField<readonly HomeroomDto[]>
  deputyHomeroom: { state: 'unsupported' }
  positionTitle: { state: 'unsupported' }
}

export type NoticeGroup = 'substitute' | 'approval' | 'swap' | 'schedule' | 'unclassified'
export interface HomeNotice {
  id: number
  group: NoticeGroup
  message: string
  schoolName: string | null
  createdAt: string
  read: boolean
  related: {
    swapRequestId: number | null
    substituteRequestId: number | null
    substituteResponseId: number | null
  }
}
export interface HomeNotifications {
  scope: 'account'
  items: HomeField<readonly HomeNotice[]>
  schoolAnnouncements: { state: 'unsupported' }
}
