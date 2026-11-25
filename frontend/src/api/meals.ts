import client from './client.js'

export interface Meal {
  date: string
  mealCode: string
  mealType: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'OTHER'
  mealName: string
  menus: { name: string; allergenCodes: number[] }[]
  caloriesKcal: number | null
  nutrition: string[]
  origin: string[]
}

export interface Meals {
  schoolId: number
  linkVersion: number
  status: 'OK' | 'NO_DATA' | 'NOT_LINKED' | 'STALE' | 'DEMO'
  source: 'NEIS' | 'DEMO' | null
  from: string
  to: string
  fetchedAt: string | null
  stale: boolean
  meals: Meal[]
}

export interface MealRange {
  from: string
  to: string
  today: boolean
}

function stringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function validMeal(meal: Meal, range: MealRange) {
  return (
    meal &&
    typeof meal.date === 'string' &&
    meal.date >= range.from &&
    meal.date <= range.to &&
    typeof meal.mealName === 'string' &&
    typeof meal.mealCode === 'string' &&
    (meal.caloriesKcal === null || Number.isFinite(meal.caloriesKcal)) &&
    Array.isArray(meal.menus) &&
    meal.menus.every(
      (menu) =>
        menu &&
        typeof menu.name === 'string' &&
        Array.isArray(menu.allergenCodes) &&
        menu.allergenCodes.every(Number.isInteger),
    ) &&
    stringList(meal.nutrition) &&
    stringList(meal.origin)
  )
}

export class MealContextError extends Error {}

export async function readMeals(
  schoolId: number,
  version: number,
  range: MealRange,
  signal: AbortSignal,
) {
  const path = `/api/neis/schools/${schoolId}/meals`
  const { data } = await client.get<Meals>(range.today ? path + '/today' : path, {
    signal,
    params: range.today ? undefined : { from: range.from, to: range.to },
  })
  if (
    data?.schoolId !== schoolId ||
    data.linkVersion !== version ||
    data.from !== range.from ||
    data.to !== range.to
  ) {
    throw new MealContextError('급식의 학교 연결 또는 조회 기간이 바뀌었습니다.')
  }
  // The authenticated rehearsal screen owns synthetic menus. Never trust a DEMO payload on the work API.
  const unlinked = data.status === 'NOT_LINKED'
  if (
    !Array.isArray(data.meals) ||
    !['OK', 'NO_DATA', 'STALE', 'NOT_LINKED'].includes(data.status) ||
    data.stale !== (data.status === 'STALE') ||
    data.source !== (unlinked ? null : 'NEIS') ||
    (unlinked
      ? data.fetchedAt !== null
      : !data.fetchedAt || !Number.isFinite(Date.parse(data.fetchedAt))) ||
    ((unlinked || data.status === 'NO_DATA') && data.meals.length !== 0) ||
    !data.meals.every((meal) => validMeal(meal, range))
  ) {
    throw new Error('급식 응답을 확인할 수 없습니다.')
  }
  return data
}
