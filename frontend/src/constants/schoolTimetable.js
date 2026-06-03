/** 월~금 주간 시간표 UI 공통 상수 */
export const TIMETABLE_DAYS = ['월', '화', '수', '목', '금']
export const TIMETABLE_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8]

/** 교시별 기본 시각 (datetime → 교시 매핑용) */
export const SCHOOL_PERIOD_SLOTS = [
  { period: 1, start: '08:30', end: '09:20' },
  { period: 2, start: '09:30', end: '10:20' },
  { period: 3, start: '10:30', end: '11:20' },
  { period: 4, start: '11:30', end: '12:20' },
  { period: 5, start: '13:20', end: '14:10' },
  { period: 6, start: '14:20', end: '15:10' },
  { period: 7, start: '15:20', end: '16:10' },
  { period: 8, start: '16:20', end: '17:10' },
]
