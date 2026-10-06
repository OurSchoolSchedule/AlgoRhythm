/**
 * React Query 쿼리 키 팩토리.
 * 무효화(invalidate) 범위를 일관되게 관리하기 위해 한곳에서 정의한다.
 */
export const queryKeys = {
  mypage: {
    activeStore: () => ['mypage', 'active-store'],
    ownerProfile: () => ['mypage', 'owner', 'profile'],
    ownerStore: () => ['mypage', 'owner', 'store'],
    ownerStores: () => ['mypage', 'owner', 'stores'],
    staffProfile: () => ['mypage', 'staff', 'profile'],
    staffStores: () => ['mypage', 'staff', 'stores'],
  },
  store: {
    staffSummary: () => ['store', 'teachers'],
  },
  schoolSetting: {
    detail: () => ['school-setting'],
    periods: () => ['school-setting', 'periods'],
  },
  schoolCatalog: {
    subjects: () => ['school', 'subjects'],
    classes: (academicYear) => ['school', 'classes', academicYear ?? 'all'],
  },
  unavailability: {
    me: () => ['unavailability', 'me'],
    school: () => ['unavailability', 'school'],
  },
  schedule: {
    submissionStatus: () => ['schedule', 'without-availability'],
    candidates: (key) => ['schedule', 'candidates', key],
  },
  timetable: {
    mine: (year, semester) => (
      year != null && semester != null
        ? ['timetable', 'me', year, semester]
        : ['timetable', 'me']
    ),
    school: (year, semester) => (
      year != null && semester != null
        ? ['timetable', 'school', year, semester]
        : ['timetable', 'school']
    ),
  },
  swap: {
    mine: () => ['timetable-swap', 'me'],
  },
  todo: {
    byDate: (date) => ['todo', date],
  },
  notification: {
    list: () => ['notification', 'list'],
  },
  substitute: {
    requests: (status) => ['substitute', 'requests', status ?? 'all'],
  },
}
