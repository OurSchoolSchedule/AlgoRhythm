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
 * @property {import('./common.js').Position} role "OWNER" | "STAFF"
 * @property {string} [storeCode] STAFF: 기존 매장 참여 코드
 * @property {string} [name] OWNER: 새 매장 이름
 * @property {string} [address] OWNER: 새 매장 주소
 * @property {string} [phoneNumber]
 * @property {string} [businessRegistrationNumber]
 * @property {import('./storeSettings.js').StoreSettingDto} [storeSetting] OWNER
 * @property {number} [bankId]
 * @property {string} [accountNumber]
 * @property {string} [hireDate] ISO date (YYYY-MM-DD)
 */

/**
 * @typedef {Object} OnboardingResponse
 * @property {number} userId
 * @property {number} userStoreId
 * @property {number} storeId
 * @property {string} position
 * @property {string} employmentStatus
 * @property {string} storeCode
 * @property {string} storeName
 * @property {string} address
 * @property {string} phoneNumber
 * @property {string} businessRegistrationNumber
 * @property {number} bankId
 * @property {string} bankName
 * @property {string} accountNumber
 * @property {string} hireDate
 * @property {import('./storeSettings.js').StoreSettingDto} storeSetting
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
 * @property {boolean} [verified]
 * @property {string} [message]
 */

export {}
