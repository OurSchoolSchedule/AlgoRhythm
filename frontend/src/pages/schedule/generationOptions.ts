import type { DayOfWeek } from '@/types/common.js'
import type { GenerationObjective } from '@/types/generationJob'

export const days: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
export const weekday: Record<DayOfWeek, string> = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
}
export const objectives: Record<GenerationObjective, string> = {
  BALANCED: '기본 균형',
  MIN_TEACHER_GAPS: '교사 공강 최소화',
  PREFER_WANTS: '희망 시간 충족 우선',
}
