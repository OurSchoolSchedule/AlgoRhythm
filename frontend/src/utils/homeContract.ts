import { directoryHomerooms } from './directoryHomerooms'
import type {
  HomeField,
  HomeMemberDto,
  HomeNoticeDto,
  HomeNotifications,
  HomeProfile,
  HomeProfileDto,
  HomeRead,
  NoticeGroup,
} from '@/types/home'

export function failedHomeRead(status: number | undefined, error: unknown) {
  return status === 403
    ? ({ state: 'forbidden', error } as const)
    : ({ state: 'error', error } as const)
}

// undefined: response did not establish the value; null or []: confirmed empty.
function readField<T, V>(
  source: HomeRead<T>,
  select: (data: T) => V | null | undefined,
): HomeField<V> {
  if (source.state !== 'success') return source
  const value = select(source.data)
  if (value === undefined) return { state: 'unconfirmed' }
  if (value === null || (Array.isArray(value) && !value.length)) return { state: 'empty' }
  return { state: 'value', value }
}

export function toHomeProfile(
  userId: number | null,
  academicYear: number | null,
  profile: HomeRead<HomeProfileDto>,
  directory: HomeRead<readonly HomeMemberDto[]>,
  termId: number | null = null,
): HomeProfile {
  // userId identifies the account; schoolUserId identifies its school membership.
  const member =
    directory.state === 'success' ? directory.data.find((row) => row.userId === userId) : undefined
  return {
    name: member?.displayName ? { state: 'value', value: member.displayName } : readField(profile, (row) => {
      if (row.userId !== userId) return undefined
      return row.username === '' ? null : row.username
    }),
    schoolUserId: readField(directory, () => member?.schoolUserId),
    subjects: readField(directory, () => member?.rosterSubjects === undefined ? member?.subjects :
      termId === null ? undefined : member.rosterSubjects),
    homerooms: readField(directory, () => directoryHomerooms(member, academicYear, termId)),
    deputyHomeroom: { state: 'unsupported' },
    positionTitle: { state: 'unsupported' },
  }
}

const noticeGroups: ReadonlyMap<string, NoticeGroup> = new Map([
  ['SCHEDULE_INPUT_REQUEST', 'schedule'],
  ['TIMETABLE_SWAP_REQUEST', 'swap'],
  ['TIMETABLE_SWAP_NOTIFY_ADMIN', 'approval'],
  ['TIMETABLE_SWAP_ADMIN_APPROVED_REQUESTER', 'approval'],
  ['TIMETABLE_SWAP_ADMIN_APPROVED_RECEIVER', 'approval'],
  ['TIMETABLE_SWAP_ADMIN_REJECTED_REQUESTER', 'approval'],
  ['TIMETABLE_SWAP_ADMIN_REJECTED_RECEIVER', 'approval'],
  ['SUBSTITUTE_REQUEST_INVITE', 'substitute'],
  ['SUBSTITUTE_FILLED_BROADCAST', 'substitute'],
  ['SUBSTITUTE_NOTIFY_ADMIN', 'approval'],
  ['SUBSTITUTE_ADMIN_APPROVED_TEACHER', 'approval'],
  ['SUBSTITUTE_ADMIN_REJECTED_TEACHER', 'approval'],
])

export function toHomeNotifications(source: HomeRead<readonly HomeNoticeDto[]>): HomeNotifications {
  return {
    scope: 'account',
    items: readField(source, (rows) =>
      rows.map((notice) => ({
        id: notice.id,
        group: noticeGroups.get(notice.type) ?? 'unclassified',
        message: notice.message,
        schoolName: notice.schoolName,
        createdAt: notice.createdAt,
        read: notice.read,
        related: {
          swapRequestId: notice.timetableSwapRequestId,
          substituteRequestId: notice.substituteRequestId,
          substituteResponseId: notice.substituteResponseId,
        },
      })),
    ),
    schoolAnnouncements: { state: 'unsupported' },
  }
}

// The deployed school DTO has no IANA zone. Korean schools use Seoul unless a zone is supplied.
export function schoolDate(instant: Date, timeZone = 'Asia/Seoul'): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant)
  const fields = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${fields.year}-${fields.month}-${fields.day}`
}
