import { startOfSchoolWeek } from '@/utils/schoolWeek'
import { toISODate } from '@/utils'

export function mealWeek(today: string) {
  const monday = startOfSchoolWeek(new Date(today + 'T12:00:00'))
  return Array.from({ length: 7 }, (_, day) => {
    const date = new Date(monday)
    date.setDate(date.getDate() + day)
    return toISODate(date)
  })
}
