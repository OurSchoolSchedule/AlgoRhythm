import { useState } from 'react'
import type { Meals } from '@/api/meals'
import MealsCard from '@/pages/home/meals/MealsCard'

// The rehearsal uses the same fixed teaching week as its published timetable.
const sample: Meals = {
  schoolId: 540001,
  linkVersion: 0,
  from: '2026-11-23',
  to: '2026-11-29',
  status: 'DEMO',
  source: 'DEMO',
  stale: false,
  fetchedAt: null,
  meals: [
    {
      date: '2026-11-25',
      mealCode: '2',
      mealType: 'LUNCH',
      mealName: '중식',
      menus: [
        { name: '보리밥', allergenCodes: [] },
        { name: '두부된장국', allergenCodes: [5, 6] },
      ],
      caloriesKcal: 630,
      nutrition: ['단백질(g) 22'],
      origin: ['쌀 · 국내산'],
    },
  ],
}

export default function RehearsalMeals() {
  const [date, selectDate] = useState('2026-11-25')
  return (
    <MealsCard
      today="2026-11-25"
      date={date}
      selectDate={selectDate}
      result={{ state: 'ready', data: sample }}
    />
  )
}
