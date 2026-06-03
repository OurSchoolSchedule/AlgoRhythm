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
    staff: () => ['store', 'staff'],
    staffSummary: (params) => ['store', 'staff', 'summary', params ?? {}],
  },
  storeSettings: {
    detail: () => ['store-settings'],
    temporary: (key) => ['store-settings', 'temporary', key],
  },
  availability: {
    me: () => ['availability', 'me'],
    store: (storeId) => ['availability', 'store', storeId],
  },
  schedule: {
    submissionStatus: (storeId) => ['schedule', 'submission-status', storeId],
    candidates: (key) => ['schedule', 'candidates', key],
  },
  workShift: {
    all: () => ['work-shift', 'all'],
    storeWeek: (range) => ['work-shift', 'store-week', range],
    myWeek: (range) => ['work-shift', 'my-week', range],
  },
  attendance: {
    today: () => ['attendance', 'today'],
  },
  payroll: {
    storeSummary: (params) => ['payroll', 'store', 'summary', params ?? {}],
    storeTotal: (params) => ['payroll', 'store', 'total', params ?? {}],
    staffDetail: (userStoreId, params) => [
      'payroll',
      'store',
      'staff',
      userStoreId,
      params ?? {},
    ],
    employeeDetail: (userStoreId, params) => [
      'payroll',
      'store',
      'employee',
      userStoreId,
      params ?? {},
    ],
    storeWages: () => ['payroll', 'store', 'wages'],
    me: (params) => ['payroll', 'me', params ?? {}],
    meTotal: (params) => ['payroll', 'me', 'total', params ?? {}],
    minimumWage: (params) => ['payroll', 'minimum-wage', params ?? {}],
    currentMinimumWage: () => ['payroll', 'minimum-wage', 'current'],
  },
  todo: {
    byDate: (date) => ['todo', date],
  },
  notification: {
    list: () => ['notification', 'list'],
  },
}
