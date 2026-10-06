/**
 * 음성 명령 타입.
 * intentType: SUBSTITUTE_CREATE | SUBSTITUTE_RESPOND | SUBSTITUTE_APPROVE
 * | AVAILABILITY_ADD | AVAILABILITY_REPLACE | UNKNOWN
 */

/**
 * @typedef {Object} CommandPreviewResponse
 * @property {string|null} draftToken
 * @property {string|null} intentType
 * @property {string|null} confidence
 * @property {string|null} description
 * @property {object|null} preview 의도별 객체가 비어 있을 수 있다
 * @property {string|null} expiresAt
 */

export {}
