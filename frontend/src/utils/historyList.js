const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export const HISTORY_TYPES = ['전체', '보결', '교환']
export const HISTORY_STATUSES = ['미처리', '대기 중', '완료', '취소됨']
export const HISTORY_PAGE_SIZE = 30

/** @param {string} iso YYYY-MM-DD */
export function parseHistoryDate(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** @param {string} iso */
export function historyMonthKey(iso) {
  const date = parseHistoryDate(iso)
  return `${date.getFullYear()}-${date.getMonth() + 1}`
}

/** @param {string} key */
export function formatMonthTitle(key) {
  const [year, month] = key.split('-')
  return `${year}년 ${Number(month)}월`
}

/** @param {string} key */
export function emptyMonthMessage(key) {
  return `${Number(key.split('-')[1])}월에는 변동 내역이 없습니다`
}

/** @param {string} key @param {number} delta */
export function shiftMonth(key, delta) {
  const [year, month] = key.split('-').map(Number)
  const next = new Date(year, month - 1 + delta, 1)
  return `${next.getFullYear()}-${next.getMonth() + 1}`
}

/** @param {string} iso */
export function formatInlineDate(iso) {
  const date = parseHistoryDate(iso)
  return `${date.getMonth() + 1}.${date.getDate()} (${WEEKDAYS[date.getDay()]})`
}

/** @param {string} iso */
export function formatGroupDate(iso) {
  const date = parseHistoryDate(iso)
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`
}

/**
 * 데이터가 있는 월만, 최신순.
 * @param {{ date: string }[]} records
 */
export function monthsWithData(records) {
  return [...new Set(records.map((record) => historyMonthKey(record.date)))]
    .sort((a, b) => {
      const [ay, am] = a.split('-').map(Number)
      const [by, bm] = b.split('-').map(Number)
      return by - ay || bm - am
    })
}

/** @param {{ date: string }[]} records @param {string} monthKey */
export function recordsInMonth(records, monthKey) {
  return records
    .filter((record) => historyMonthKey(record.date) === monthKey)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.time || '').localeCompare(String(a.time || '')))
}

/** @param {{ type: string }[]} records */
export function countByType(records) {
  const counts = { 전체: records.length }
  for (const type of HISTORY_TYPES.slice(1)) {
    counts[type] = records.filter((record) => record.type === type).length
  }
  return counts
}

const SUBSTITUTE_DAY = { MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일' }
const SUBSTITUTE_STATUS = {
  OPEN: '미처리',
  FILLED: '완료',
  CANCELLED: '취소됨',
  EXPIRED: '취소됨',
}

const SWAP_STATUS = {
  PENDING: '대기 중',
  ACCEPTED: '대기 중',
  REJECTED: '취소됨',
  CANCELLED: '취소됨',
}

const SWAP_APPROVAL = {
  PENDING: '대기 중',
  APPROVED: '완료',
  REJECTED: '취소됨',
}

/** 보결 목록에 있는 필드만 내역 행으로 만든다. 요청자 이름은 응답에 없다. */
export function substituteToHistoryRecord(item) {
  const date = item.substituteDate || String(item.createdAt || '').slice(0, 10)
  const created = item.createdAt ? new Date(item.createdAt) : null
  const time = created && !Number.isNaN(created.getTime())
    ? created.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const title = [
    item.periodNumber != null ? `${item.periodNumber}교시` : '',
    SUBSTITUTE_DAY[item.dayOfWeek],
    item.note,
  ].filter(Boolean).join(' · ') || '보결'
  return {
    id: `sub-${item.id}`,
    date,
    type: '보결',
    status: SUBSTITUTE_STATUS[item.status] || '미처리',
    title,
    before: '',
    after: item.note || '',
    actor: '',
    time,
    search: title,
  }
}

/**
 * 내 교환 요청을 내역 행으로 만든다.
 * @param {import('@/types/shiftSwap.js').TimetableSwapResponseDto} item
 */
export function swapToHistoryRecord(item) {
  const date = item.requesterDate || String(item.createdAt || '').slice(0, 10)
  const created = item.createdAt ? new Date(item.createdAt) : null
  const time = created && !Number.isNaN(created.getTime())
    ? created.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : ''
  const people = [item.requesterUsername, item.receiverUsername].filter(Boolean).join(' ↔ ')
  const title = [people, item.reason].filter(Boolean).join(' · ') || '수업 교환'
  const status = SWAP_APPROVAL[item.managerApprovalStatus]
    || SWAP_STATUS[item.status]
    || '대기 중'
  return {
    id: `swap-${item.id}`,
    date,
    type: '교환',
    status,
    title,
    before: item.requesterDate || '',
    after: item.receiverDate || '',
    actor: people,
    time,
    search: `${title} ${item.reason || ''}`,
  }
}

/** @param {{ status?: string }[]} records */
export function countPending(records) {
  return records.filter((record) => record.status === '미처리').length
}

/**
 * @param {object[]} records
 * @param {{ type?: string, query?: string, pendingOnly?: boolean, status?: string }} filter
 */
export function filterHistory(records, { type = '전체', query = '', pendingOnly = false, status = '' } = {}) {
  const needle = query.trim().toLowerCase()
  return records.filter((record) => {
    if (type !== '전체' && record.type !== type) return false
    if (status && record.status !== status) return false
    if (pendingOnly && record.status !== '미처리') return false
    if (!needle) return true
    const haystack = [record.title, record.before, record.after, record.actor, record.search]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(needle)
  })
}

/** 날짜가 모두 다르면 행 안에 날짜를 둔다. */
export function usesInlineDates(records) {
  const dates = records.map((record) => record.date)
  return new Set(dates).size === dates.length
}

/** @param {{ date: string }[]} records */
export function groupHistoryByDate(records) {
  const groups = []
  for (const record of records) {
    const last = groups[groups.length - 1]
    if (last && last.date === record.date) last.items.push(record)
    else groups.push({ date: record.date, items: [record] })
  }
  return groups
}
