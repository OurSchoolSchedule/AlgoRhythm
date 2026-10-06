/** 과목 API는 name만 받는다. 과목명 열이 있거나 한 열짜리 파일만 올린다. */
export function subjectNamesFromCsv(text) {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
    .filter((row) => row.some(Boolean))
  if (rows.length === 0) return { names: [], error: '빈 파일입니다.' }
  const header = rows[0].map((cell) => cell.toLowerCase())
  const nameIndex = header.findIndex((cell) => cell === 'name' || cell === '과목명' || cell === '과목')
  if (nameIndex >= 0) {
    const names = [...new Set(rows.slice(1).map((row) => row[nameIndex]).filter(Boolean))]
    return names.length ? { names } : { names: [], error: '과목명이 없습니다.' }
  }
  if (rows.every((row) => row.filter(Boolean).length === 1)) {
    return { names: [...new Set(rows.map((row) => row.find(Boolean)))] }
  }
  return { names: [], error: '과목명 열을 찾지 못했습니다. 서버는 과목 이름만 받습니다.' }
}
