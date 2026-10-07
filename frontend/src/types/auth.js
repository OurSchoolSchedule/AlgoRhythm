/**
 * 인증(Auth) / 온보딩 / 이메일 인증 타입.
 */

/**
 * 카카오 콜백 리다이렉트로 전달되는 토큰 묶음.
 * @typedef {Object} AuthTokens
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {string|number} userId
 */

/**
 * @typedef {Object} RefreshTokenResponse
 * @property {string} accessToken
 */

/**
 * 개발용 토큰 발급 요청 (POST /api/auth/dev-token).
 * @typedef {Object} DevTokenRequest
 * @property {string} email
 */

/**
 * 온보딩 요청 (POST /api/auth/onboarding).
 * @typedef {Object} OnboardingRequest
 * @property {'ADMIN'|'TEACHER'} role
 * @property {string} [schoolCode] TEACHER: 기존 학교 코드
 * @property {string} [name] ADMIN: 새 학교 이름
 * @property {string} [address] ADMIN: 새 학교 주소
 * @property {string} [phoneNumber]
 * @property {string} [hireDate] ISO date (YYYY-MM-DD)
 */

/**
 * @typedef {Object} OnboardingResponse
 * @property {number} userId
 * @property {number} schoolUserId
 * @property {number} schoolId
 * @property {string} position
 * @property {string} employmentStatus
 * @property {string} schoolCode
 * @property {string} schoolName
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} hireDate
 */

/**
 * 이메일 인증 코드 발송 요청 (POST /api/auth/email-verification/send).
 * @typedef {Object} EmailVerificationRequest
 * @property {string} email
 */

/**
 * 이메일 인증 코드 확인 요청 (POST /api/auth/email-verification/verify).
 * @typedef {Object} EmailVerificationVerifyRequest
 * @property {string} email
 * @property {string} code
 */

/**
 * @typedef {Object} EmailVerificationResponse
 * @property {boolean} [success]
 * @property {string} [message]
 */

/**
 * @typedef {Object} EmailVerificationAuthResponse
 * @property {boolean} [success]
 * @property {string} [message]
 * @property {string} [accessToken]
 * @property {string} [refreshToken]
 * @property {number} [userId]
 * @property {boolean} [newUser]
 */

export {}
