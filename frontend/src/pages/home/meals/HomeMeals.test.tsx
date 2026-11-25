// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import client from '@/api/client'
import { clearTokens, setTokens } from '@/api/tokenStorage'
import type { Meals } from '@/api/meals'
import { useHomeSession } from '@/hooks/useHomeSession'
import { lunchFixture } from '@/test/fixtures/neis/meals'
import { schoolDate } from '@/utils/homeContract'
import RehearsalMeals from '@/pages/school42/RehearsalMeals'
import HomeMeals from './HomeMeals'
import { mealWeek } from './mealWeek'

const original = client.defaults.adapter
const schoolId = lunchFixture.schoolId
const today = lunchFixture.from
let cache: QueryClient
let role: string, employment: string, linked: boolean
let calls: string[]
let response: () => Promise<Meals>
const openSettings = vi.fn()

function SessionCard() {
  const session = useHomeSession()
  return <HomeMeals session={session} today={today} onOpenSchoolSettings={openSettings} />
}
function show() {
  return render(
    <QueryClientProvider client={cache}>
      <SessionCard />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  cache = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  role = 'ADMIN'
  employment = 'HIRED'
  linked = true
  calls = []
  openSettings.mockReset()
  setTokens({ accessToken: 'fixture', userId: 51 })
  response = async () => lunchFixture
  client.defaults.adapter = async (config) => {
    const url = config.url ?? ''
    calls.push(url)
    let data
    if (url.endsWith('/active-school'))
      data = { schoolId, position: role, employmentStatus: employment }
    else if (url.endsWith('/link'))
      data = {
        schoolId,
        status: linked ? 'LINKED' : 'NOT_LINKED',
        version: linked ? 1 : 0,
      }
    else data = await response()
    return { config, status: 200, statusText: 'OK', headers: {}, data }
  }
})
afterEach(() => {
  cleanup()
  cache.clear()
  clearTokens()
  client.defaults.adapter = original
})

describe('13.4 급식 계약과 업무 홈', () => {
  it('KST 자정과 연도 경계를 포함해 월~일을 선택한다', () => {
    const date = schoolDate(new Date('2025-12-31T15:00:00Z'))
    expect(date).toBe('2026-01-01')
    expect(mealWeek(date)).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ])
  })
  it('카드 로딩 후 오늘 중식, 메뉴별 알레르기, 열량·영양·원산지와 KST 조회 시각을 표시한다', async () => {
    let release!: (data: Meals) => void
    response = () =>
      new Promise((resolve) => {
        release = resolve
      })
    show()
    await screen.findByText('급식을 불러오는 중입니다.')
    await waitFor(() => expect(calls).toContain('/api/neis/schools/17/meals/today'))
    release(lunchFixture)
    await screen.findByText('현미밥')
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2')
    expect((screen.getByRole('radio', { name: /수요일 오늘/ }) as HTMLInputElement).checked).toBe(
      true,
    )
    fireEvent.click(screen.getByText('알레르기 · 영양 · 원산지'))
    for (const content of [
      '두부조림 · 5, 6',
      '685.2 kcal',
      '단백질(g) : 25.1',
      '콩 : 국내산',
      /나이스 교육정보/,
      /12:04 KST/,
    ])
      expect(screen.getByText(content)).toBeTruthy()
    expect(
      cache.getQueryCache().find({ queryKey: ['neis', 'meals', 17], exact: false })?.queryKey,
    ).toEqual([
      'neis',
      'meals',
      17,
      1,
      today,
      today,
      expect.objectContaining({
        schoolId: 17,
        userId: 51,
        employment: 'HIRED',
      }),
    ])
  })
  it('주간 응답에서 선택한 날짜·끼니만 표시하고 제공자의 기타 끼니 코드를 보존한다', async () => {
    show()
    await screen.findByText('현미밥')
    response = async () => ({
      ...lunchFixture,
      from: '2026-11-23',
      to: '2026-11-29',
      meals: [
        {
          ...lunchFixture.meals[0],
          date: '2026-11-26',
          mealType: 'OTHER',
          mealCode: '8',
          mealName: '특별식',
        },
      ],
    })
    fireEvent.click(screen.getByRole('radio', { name: /목요일/ }))
    await screen.findByRole('option', { name: '특별식' })
    expect(screen.getByText(/등록된 급식 정보가 없습니다/)).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '8' } })
    await screen.findByText('특별식 메뉴')
    expect(calls.at(-1)).toBe('/api/neis/schools/17/meals')
    fireEvent.click(screen.getByRole('radio', { name: /일요일/ }))
    expect(screen.queryByText('현미밥')).toBeNull()
  })
  it.each(['ADMIN', 'TEACHER'])(
    '미연동 %s의 권한에 맞게 학교 설정을 연결한다',
    async (position) => {
      role = position
      linked = false
      show()
      await screen.findByText('학교 급식이 연동되지 않았습니다.')
      if (position === 'ADMIN') {
        fireEvent.click(screen.getByRole('button', { name: '학교 연동 설정' }))
        expect(openSettings).toHaveBeenCalledOnce()
      } else {
        expect(screen.queryByRole('button', { name: '학교 연동 설정' })).toBeNull()
        expect(screen.getByText(/관리자에게 문의/)).toBeTruthy()
      }
      expect(calls.some((url) => url.includes('/meals'))).toBe(false)
    },
  )
  it('재직 소속 확인 전 급식과 링크 요청을 보내지 않는다', async () => {
    employment = 'PENDING'
    show()
    await waitFor(() => expect(cache.isFetching()).toBe(0))
    expect(calls).toEqual(['/api/mypage/active-school'])
    expect(screen.queryByText('학교 급식')).toBeNull()
  })
  it('급식 응답의 NOT_LINKED도 미연동 안내로 바꾼다', async () => {
    response = async () => ({
      ...lunchFixture,
      status: 'NOT_LINKED',
      source: null,
      fetchedAt: null,
      meals: [],
    })
    show()
    await screen.findByRole('button', { name: '학교 연동 설정' })
    expect(screen.queryByText(/나이스 교육정보/)).toBeNull()
  })
  it('NO_DATA의 빈 상태와 출처를 보여준다', async () => {
    response = async () => ({ ...lunchFixture, status: 'NO_DATA', meals: [] })
    show()
    await screen.findByText(/등록된 급식 정보가 없습니다/)
    expect(screen.getByText(/나이스 교육정보/)).toBeTruthy()
  })
  it('STALE은 마지막 조회 시각과 이전 자료임을 함께 표시한다', async () => {
    response = async () => ({ ...lunchFixture, status: 'STALE', stale: true })
    show()
    await screen.findByText('현미밥')
    expect(screen.getByText(/이전 조회 자료/)).toBeTruthy()
    expect(screen.getByText(/12:04 KST/)).toBeTruthy()
  })
  it('503 이후 급식만 수동으로 다시 조회한다', async () => {
    response = async () => {
      throw new AxiosError('NEIS_UNAVAILABLE', '503')
    }
    show()
    await screen.findByRole('alert')
    calls.length = 0
    response = async () => lunchFixture
    fireEvent.click(screen.getByRole('button', { name: '급식 다시 조회' }))
    await screen.findByText('현미밥')
    expect(calls).toEqual(['/api/neis/schools/17/meals/today'])
  })
  it('버전 불일치 재시도는 연결을 다시 읽은 뒤 급식을 표시한다', async () => {
    response = async () => ({ ...lunchFixture, linkVersion: 2 })
    show()
    await screen.findByRole('alert')
    response = async () => lunchFixture
    calls.length = 0
    fireEvent.click(screen.getByRole('button', { name: '급식 다시 조회' }))
    await screen.findByText('현미밥')
    expect(calls).toEqual(['/api/neis/schools/17/link', '/api/neis/schools/17/meals/today'])
  })
  it.each<Partial<Meals>>([
    { schoolId: 18 },
    { linkVersion: 2 },
    { from: '2026-11-24' },
    { to: '2026-11-26' },
    { fetchedAt: '잘못된 시각' },
    { status: 'DEMO', source: 'DEMO', fetchedAt: null },
  ])('일치하지 않는 응답 %j의 메뉴를 숨긴다', async (overrides) => {
    response = async () => ({ ...lunchFixture, ...overrides })
    show()
    await screen.findByRole('alert')
    expect(screen.queryByText('현미밥')).toBeNull()
  })
  it('실습 전용 카드에 합성 출처를 명시하고 외부 조회 시각을 만들지 않는다', () => {
    render(<RehearsalMeals />)
    expect(screen.getByText('시연용 가상 급식')).toBeTruthy()
    expect(screen.getByText(/출처 School42/)).toBeTruthy()
    expect(screen.queryByText(/마지막 조회/)).toBeNull()
    expect(calls).toEqual([])
  })
})
