import type { ComponentType } from 'react'

export type WorkSession = { userId: number; accessToken: string; refreshToken: string }
type SchoolMembership = Record<string, unknown> & { schoolId: number; employmentStatus: string }
export type VerifiedEmail = {
  // AUTHENTICATE identifies a returning account; either verified email grant allows new registration.
  nextStep: 'REGISTER' | 'AUTHENTICATE'
  flowToken: string
  userId: number
  newUser: boolean
  schoolMembership: SchoolMembership | null
}

// Limited email grants cannot enter the workspace. Only a completed ceremony returns a work session.
export type PasskeyContinuation = ComponentType<{
  verification: VerifiedEmail
  onAuthenticated: (session: WorkSession) => void
  onRestart: () => void
}>

const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
const id = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

function isSchoolMembership(value: unknown): value is SchoolMembership {
  return record(value) && id(value.schoolId) && nonempty(value.employmentStatus)
}

export function isWorkSession(value: unknown): value is WorkSession {
  return (
    record(value) && id(value.userId) && nonempty(value.accessToken) && nonempty(value.refreshToken)
  )
}

type Verified =
  | { kind: 'passkey'; verification: VerifiedEmail }
  | { kind: 'session'; session: WorkSession; needsSchool: boolean; approvalPending: boolean }

export function readVerifiedEmail(response: unknown): Verified {
  const invalid = () => new Error('이메일 인증 응답을 확인할 수 없습니다. 다시 인증해 주세요.')
  if (
    !record(response) ||
    response.success !== true ||
    !id(response.userId) ||
    typeof response.newUser !== 'boolean'
  )
    throw invalid()
  const membership = response.schoolMembership
  if (membership != null && !isSchoolMembership(membership)) throw invalid()
  const schoolMembership = membership ?? null
  if ('nextStep' in response || 'flowToken' in response) {
    if (
      (response.nextStep !== 'REGISTER' && response.nextStep !== 'AUTHENTICATE') ||
      !nonempty(response.flowToken)
    )
      throw invalid()
    return {
      kind: 'passkey',
      verification: {
        nextStep: response.nextStep,
        flowToken: response.flowToken,
        userId: response.userId,
        newUser: response.newUser,
        schoolMembership,
      },
    }
  }
  // Deployed pre-passkey servers return both business tokens in the verification response.
  const needsSchool = response.newUser && !schoolMembership
  if (!isWorkSession(response)) throw invalid()
  return {
    kind: 'session',
    needsSchool,
    approvalPending: schoolMembership?.employmentStatus === 'PENDING',
    session: {
      userId: response.userId,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    },
  }
}
