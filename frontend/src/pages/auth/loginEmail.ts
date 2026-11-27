export const loginEmailNotice =
  '현재 서비스는 이화여자대학교 이메일(ewha.ac.kr)과 Gmail(gmail.com)만 지원합니다.'

export function normalizeLoginEmail(value: string): string | null {
  const address = value.trim().toLowerCase()
  return /^[^@\s]+@(ewha\.ac\.kr|gmail\.com)$/.test(address) ? address : null
}
