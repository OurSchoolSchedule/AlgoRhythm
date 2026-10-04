const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export const HISTORY_TYPES = ['전체', '보결', '변경', '생성', '수정', '교환']
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
