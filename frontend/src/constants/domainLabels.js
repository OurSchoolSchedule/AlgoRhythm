/** 학교 UI용 도메인 라벨 (API/DB 용어는 매장·근무 등 유지) */

export const DOMAIN = {
  school: '학교',
  lesson: '수업',
  admin: '관리자',
  teacher: '교사',
  substitute: '보결',
  extraWork: '추가 근무',
  reason: '사유',
  headcount: '1명',
}

export const ROLE_LABEL = {
  OWNER: DOMAIN.admin,
  STAFF: DOMAIN.teacher,
}

/** API 역할 → App 화면 역할 */
export function positionToUserRole(position) {
  return position === 'OWNER' ? 'admin' : 'worker'
}

/** 알림/백엔드 메시지의 매장 용어를 학교 UI 문구로 치환 */
export function localizeNotificationMessage(message) {
  if (!message) return ''
  return message
    .replaceAll('근무 대타', `${DOMAIN.lesson} ${DOMAIN.substitute}`)
    .replaceAll('대타', DOMAIN.substitute)
    .replaceAll('근무표', '시간표')
    .replaceAll('근무', DOMAIN.lesson)
    .replaceAll('사장님', DOMAIN.admin)
    .replaceAll('알바', DOMAIN.teacher)
    .replaceAll('인력', DOMAIN.teacher)
    .replaceAll('매장', DOMAIN.school)
}

export function categoryLabel(category) {
  switch (category) {
    case 'SHIFT_SWAP':
      return DOMAIN.substitute
    case 'EXTRA_SHIFT':
      return DOMAIN.extraWork
    case 'SCHEDULE_INPUT':
      return '시간표 입력'
    default:
      return null
  }
}
