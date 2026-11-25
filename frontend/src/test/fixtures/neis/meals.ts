import type { Meals } from '@/api/meals'

export const lunchFixture: Meals = {
  schoolId: 17,
  linkVersion: 1,
  status: 'OK',
  source: 'NEIS',
  from: '2026-11-25',
  to: '2026-11-25',
  fetchedAt: '2026-11-25T03:04:00Z',
  stale: false,
  meals: [
    {
      date: '2026-11-25',
      mealCode: '2',
      mealType: 'LUNCH',
      mealName: '중식',
      menus: [
        { name: '현미밥', allergenCodes: [] },
        { name: '두부조림', allergenCodes: [5, 6] },
      ],
      caloriesKcal: 685.2,
      nutrition: ['단백질(g) : 25.1'],
      origin: ['콩 : 국내산'],
    },
  ],
}
