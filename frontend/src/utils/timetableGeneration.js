export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']

export const GENERATION_STRATEGIES = [
  { id: 'BALANCED', label: '균형 배분', description: '과목별 균형을 맞춥니다.' },
  { id: 'COVERAGE_FIRST', label: '커버리지 우선', description: '수업이 비지 않는 쪽을 먼저 맞춥니다.' },
  { id: 'SENIOR_PRIORITY', label: '경력 우선', description: '경력 교사를 먼저 배정합니다.' },
  { id: 'FAIR_DISTRIBUTION', label: '공평 분배', description: '교사 사이 시수를 맞춥니다.' },
]

/** @param {string} iso YYYY-MM-DD */
export function termFromStartDate(iso) {
  if (!iso || iso.length < 7) return { academicYear: null, semester: null }
  const academicYear = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  if (!academicYear || !month) return { academicYear: null, semester: null }
  const semester = month >= 3 && month <= 7 ? 1 : 2
  return { academicYear, semester }
}

/**
 * 등록된 학급·과목·교시로 생성 요청의 slotRequirements를 만든다.
 * 과목을 교시 순서대로 순환한다.
 */
export function buildSlotRequirements(classes, subjects, periods) {
  const periodNumbers = [...(periods ?? [])]
    .map((period) => period.periodNumber)
    .filter((value) => Number.isInteger(value))
    .sort((a, b) => a - b)
  if (!classes?.length || !subjects?.length || periodNumbers.length === 0) return []

  const slots = []
  let index = 0
  for (const schoolClass of classes) {
    if (schoolClass?.id == null) continue
    for (const dayOfWeek of WEEKDAYS) {
      for (const periodNumber of periodNumbers) {
        const subject = subjects[index % subjects.length]
        if (subject?.id == null) continue
        slots.push({
          schoolClassId: schoolClass.id,
          dayOfWeek,
          periodNumber,
          subjectId: subject.id,
        })
        index += 1
      }
    }
  }
  return slots
}

export function getApiErrorMessage(error, fallback) {
  const message = error?.response?.data?.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  return fallback
}
