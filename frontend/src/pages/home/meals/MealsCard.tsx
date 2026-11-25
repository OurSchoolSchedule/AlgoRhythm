import { useId, useState } from 'react'
import type { Meal, Meals } from '@/api/meals'
import { mealWeek } from './mealWeek'
import './meals.css'

export type MealRead =
  | { state: 'loading' | 'unlinked' }
  | { state: 'error'; retry: () => void }
  | { state: 'ready'; data: Meals }

interface Props {
  today: string
  date: string
  selectDate: (date: string) => void
  result: MealRead
  openSchoolSettings?: () => void
}

const weekdays = ['월', '화', '수', '목', '금', '토', '일']
const regularMeals = [
  ['1', '조식'],
  ['2', '중식'],
  ['3', '석식'],
]
const seoulTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  dateStyle: 'medium',
  timeStyle: 'short',
})

function MealDetails({ meal }: { meal: Meal }) {
  const allergens = meal.menus.filter((menu) => menu.allergenCodes.length)
  return (
    <>
      <div className="meal-line">
        <h3>{meal.mealName} 메뉴</h3>
        {meal.caloriesKcal !== null && (
          <span>{meal.caloriesKcal.toLocaleString('ko-KR')} kcal</span>
        )}
      </div>
      <ul className="meal-menu">
        {meal.menus.map((menu, i) => (
          <li key={i}>{menu.name}</li>
        ))}
      </ul>
      <details className="meal-details">
        <summary>알레르기 · 영양 · 원산지</summary>
        <dl>
          <dt>알레르기 번호</dt>
          <dd>
            {allergens.length ? (
              <ul>
                {allergens.map((menu, i) => (
                  <li key={i}>
                    {menu.name} · {menu.allergenCodes.join(', ')}
                  </li>
                ))}
              </ul>
            ) : (
              '표시된 번호 없음'
            )}
          </dd>
          <dt>영양 정보</dt>
          <dd>{meal.nutrition.join(' · ') || '제공 정보 없음'}</dd>
          <dt>원산지</dt>
          <dd>{meal.origin.join(' · ') || '제공 정보 없음'}</dd>
        </dl>
      </details>
    </>
  )
}

export default function MealsCard({ today, date, selectDate, result, openSchoolSettings }: Props) {
  const group = useId()
  const [selectedCode, setCode] = useState('2')
  const data = result.state === 'ready' ? result.data : null
  const rehearsal = data?.status === 'DEMO'
  const currentDay = rehearsal ? null : today
  const rows = data?.meals.filter((meal) => meal.date === date) ?? []
  const options = new Map(regularMeals.map(([code, label]) => [code, label]))
  rows.forEach((meal) => options.set(meal.mealCode, meal.mealName))
  const code = options.has(selectedCode) ? selectedCode : '2'
  const selectedMeal = rows.find((meal) => meal.mealCode === code)
  const unlinked = result.state === 'unlinked' || data?.status === 'NOT_LINKED'
  return (
    <section className="desk-card meal-card" aria-labelledby={group + '-heading'}>
      <div className="meal-line">
        <h2 id={group + '-heading'}>학교 급식</h2>
        <label>
          끼니{' '}
          <select value={code} onChange={(e) => setCode(e.target.value)}>
            {Array.from(options, ([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset
        className="meal-week"
        aria-label={rehearsal ? '실습 주간 급식 날짜' : '이번 주 급식 날짜'}
      >
        {mealWeek(today).map((day, i) => (
          <label key={day}>
            <input
              type="radio"
              name={group}
              checked={day === date}
              value={day}
              aria-label={day + ' ' + weekdays[i] + '요일' + (day === currentDay ? ' 오늘' : '')}
              aria-current={day === currentDay ? 'date' : undefined}
              onChange={() => selectDate(day)}
            />
            <span>
              {weekdays[i]}
              <strong>
                {Number(day.slice(5, 7))}.{Number(day.slice(8))}
              </strong>
            </span>
          </label>
        ))}
      </fieldset>
      <div aria-live="polite" aria-atomic="true" className="meal-body">
        {result.state === 'loading' && (
          <div role="status" className="meal-loading">
            급식을 불러오는 중입니다.
          </div>
        )}
        {result.state === 'error' && (
          <div role="alert">
            <p>급식 정보를 불러오지 못했습니다.</p>
            <button type="button" className="desk-line-button" onClick={result.retry}>
              급식 다시 조회
            </button>
          </div>
        )}
        {unlinked && (
          <>
            <p>학교 급식이 연동되지 않았습니다.</p>
            {openSchoolSettings ? (
              <button type="button" className="desk-line-button" onClick={openSchoolSettings}>
                학교 연동 설정
              </button>
            ) : (
              <p>연동하려면 학교 관리자에게 문의하세요.</p>
            )}
          </>
        )}
        {data && !unlinked && (
          <>
            {data.status === 'STALE' && (
              <p className="meal-notice">최신 정보를 확인할 수 없어 이전 조회 자료를 표시합니다.</p>
            )}
            {data.status === 'DEMO' && <p className="meal-notice">시연용 가상 급식</p>}
            {selectedMeal ? (
              <MealDetails key={date + '/' + code} meal={selectedMeal} />
            ) : (
              <p>선택한 날짜와 끼니에 등록된 급식 정보가 없습니다.</p>
            )}
            <p className="meal-source">
              출처 {data.source === 'DEMO' ? 'School42 실습 자료' : '나이스 교육정보 개방 포털'}
              {data.fetchedAt && (
                <>
                  {' '}
                  · 마지막 조회{' '}
                  <time dateTime={data.fetchedAt}>
                    {seoulTime.format(new Date(data.fetchedAt))} KST
                  </time>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </section>
  )
}
