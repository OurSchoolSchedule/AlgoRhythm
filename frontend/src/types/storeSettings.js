/**
 * 매장 설정(Store Settings) 타입.
 */

/**
 * @typedef {Object} SegmentDto
 * @property {string} startTime "HH:mm:ss"
 * @property {string} endTime "HH:mm:ss"
 */

/**
 * @typedef {Object} StoreSettingDto
 * @property {string} openTime "HH:mm:ss"
 * @property {string} closeTime "HH:mm:ss"
 * @property {boolean} useSegments true: 파트타임 구간 분할, false: 30분 단위 N명 배정
 * @property {SegmentDto[]} [segments]
 * @property {boolean} hasBreakTime
 * @property {string} [breakStartTime] "HH:mm:ss"
 * @property {string} [breakEndTime] "HH:mm:ss"
 */

/**
 * 임시 설정 저장 응답 (Redis key).
 * @typedef {Object} TemporarySettingKeyResponse
 * @property {string} temporaryKey
 */

export {}
