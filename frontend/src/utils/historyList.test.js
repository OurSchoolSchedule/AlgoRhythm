import { describe, expect, it } from 'vitest'
import {
  countByStatus,
  countByType,
  currentMonthKey,
  substituteToHistoryRecord,
  swapToHistoryRecord,
  countPending,
  emptyMonthMessage,
  filterHistory,
  formatGroupDate,
  formatInlineDate,
  groupHistoryByDate,
  monthsWithData,
  shiftMonth,
  usesInlineDates,
} from './historyList.js'

const records = [
  { date: '2026-05-28', type: '보결', status: '완료', title: '3교시 · 2-3반 · 수학', after: '김민지', search: '김민지 수학' },
  { date: '2026-05-28', type: '변경', status: '완료', title: '6교시 · 1-4반', search: '시청각실' },
  { date: '2026-05-10', type: '보결', status: '미처리', title: '1교시 · 1-2반 · 수학', search: '수학' },
  { date: '2026-04-03', type: '생성', status: '완료', title: '4월 시간표', search: '시간표' },
]

describe('substitute history rows', () => {
  it('uses only fields from the substitute list', () => {
    expect(substituteToHistoryRecord({
      id: 4,
      substituteDate: '2026-05-10',
      dayOfWeek: 'MON',
      periodNumber: 1,
      status: 'OPEN',
      note: '출장',
      createdAt: '2026-05-09T23:10:00Z',
    })).toMatchObject({
      id: 'sub-4',
      date: '2026-05-10',
      type: '보결',
      status: '미처리',
      title: '1교시 · 월 · 출장',
      after: '출장',
    })
  })
})

describe('swap history rows', () => {
  it('maps swap list fields into history records', () => {
    expect(swapToHistoryRecord({
      id: 9,
      requesterDate: '2026-05-12',
      receiverDate: '2026-05-13',
      requesterUsername: '김교사',
      receiverUsername: '이교사',
      reason: '회의',
      status: 'ACCEPTED',
      managerApprovalStatus: 'PENDING',
      createdAt: '2026-05-11T01:00:00Z',
    })).toMatchObject({
      id: 'swap-9',
      date: '2026-05-12',
      type: '교환',
      status: '대기 중',
      title: '김교사 ↔ 이교사 · 회의',
      before: '2026-05-12',
      after: '2026-05-13',
    })
  })
})

describe('history months', () => {
  it('lists only months that have records, newest first', () => {
    expect(monthsWithData(records)).toEqual(['2026-5', '2026-4'])
  })

  it('defaults to the calendar month of today', () => {
    expect(currentMonthKey(new Date(2026, 9, 5))).toBe('2026-10')
  })

  it('moves to the next calendar month even when it has no records', () => {
    expect(shiftMonth('2026-5', 1)).toBe('2026-6')
    expect(emptyMonthMessage('2026-6')).toBe('6월에는 변동 내역이 없습니다')
  })
})

describe('history filters', () => {
  it('counts types and pending items', () => {
    expect(countByType(records.filter((item) => item.date.startsWith('2026-05')))).toMatchObject({
      전체: 3,
      보결: 2,
    })
    expect(countByStatus(records)).toMatchObject({
      미처리: 1,
      완료: 3,
    })
    expect(countPending(records)).toBe(1)
  })

  it('filters by type, pending state, and search text', () => {
    expect(filterHistory(records, { type: '보결' }).map((item) => item.date)).toEqual(['2026-05-28', '2026-05-10'])
    expect(filterHistory(records, { pendingOnly: true })).toHaveLength(1)
    expect(filterHistory(records, { status: '미처리' })).toHaveLength(1)
    expect(filterHistory(records, { status: '완료' }).every((item) => item.status === '완료')).toBe(true)
    expect(filterHistory(records, { query: '김민지' })).toHaveLength(1)
    expect(filterHistory(records, { query: '없는과목' })).toHaveLength(0)
  })
})

describe('history dates', () => {
  it('groups repeated dates and keeps unique dates on the row', () => {
    const may = records.filter((item) => item.date.startsWith('2026-05'))
    expect(usesInlineDates(may)).toBe(false)
    expect(groupHistoryByDate(may).map((group) => group.items.length)).toEqual([2, 1])
    expect(formatGroupDate('2026-05-28')).toBe('5월 28일 (목)')
    expect(usesInlineDates([records[2]])).toBe(true)
    expect(formatInlineDate('2026-05-10')).toBe('5.10 (일)')
  })
})
