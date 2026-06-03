/**
 * 스케줄 생성(Schedule Generation) 타입.
 */

/**
 * @typedef {Object} SegmentStaffDto
 * @property {number} segmentIndex 0부터 시작
 * @property {number} requiredStaff 해당 세그먼트 필요 인원수
 */

/**
 * @typedef {Object} StaffRequirementDto
 * @property {SegmentStaffDto[]} [segmentStaffList] 세그먼트 사용 시
 * @property {number} [requiredStaff] 세그먼트 미사용 시 전체 동시 근무 인원
 */

/**
 * 스케줄 요청 생성 (POST /api/schedules/requests).
 * @typedef {Object} ScheduleRequestDto
 * @property {string} startDate "YYYY-MM-DD"
 * @property {string} endDate "YYYY-MM-DD"
 * @property {StaffRequirementDto} staffRequirement
 */

/**
 * @typedef {Object} ScheduleRequestResponseDto
 * @property {number} scheduleRequestId
 * @property {number} storeId
 * @property {string} startDate
 * @property {string} endDate
 * @property {'REQUESTED'|'GENERATED'|'CONFIRMED'} status
 */

/** @typedef {'BALANCED'|'COVERAGE_FIRST'|'SENIOR_PRIORITY'|'FAIR_DISTRIBUTION'} GenerationStrategy */

/**
 * @typedef {Object} GenerationOptionsDto
 * @property {number} [candidateCount] 기본 4
 * @property {GenerationStrategy[]} [strategies] null이면 모든 전략
 */

/**
 * 후보안 생성 요청 (POST /api/schedules/requests/{id}/generate).
 * @typedef {Object} ScheduleGenerationRequestDto
 * @property {GenerationOptionsDto} generationOptions
 */

/**
 * @typedef {Object} ScheduleSettingSegmentResponseDto
 * @property {number} [segmentIndex]
 * @property {string} [startTime]
 * @property {string} [endTime]
 * @property {number} [requiredStaff]
 */

/**
 * @typedef {Object} ScheduleGenerationResponseDto
 * @property {string} status "success" | "error"
 * @property {number} scheduleRequestId
 * @property {number} storeId
 * @property {ScheduleSettingSegmentResponseDto[]} timeSegments
 * @property {string} candidateScheduleKey Redis key
 * @property {number} generatedCount
 * @property {number[]} unsubmittedEmployeeIds
 */

/**
 * @typedef {Object} CandidateShift
 * @property {number} userStoreId
 * @property {string} username
 * @property {string} startTime "HH:mm:ss"
 * @property {string} endTime "HH:mm:ss"
 * @property {import('./common.js').DayOfWeek} day
 * @property {string|null} status "UNASSIGNED" 또는 null
 */

/**
 * @typedef {Object} CandidateSchedule
 * @property {number} storeId
 * @property {CandidateShift[]} shifts
 * @property {string} strategyName
 * @property {string} strategyDescription
 * @property {number} totalShifts
 * @property {number} unassignedCount
 * @property {number} coverageRate 배정률 (%)
 */

/**
 * 후보안 확정 요청 (POST /api/schedules/requests/{id}/confirm).
 * @typedef {Object} ConfirmScheduleRequestDto
 * @property {number} candidateIndex 0부터 시작
 */

/**
 * 제출 현황 (GET /api/schedules/requests/{storeId}/submission-status).
 * @typedef {Object} SubmissionStatusResponse
 * @property {boolean} allSubmitted
 * @property {number[]} unsubmittedUserIds
 */

/**
 * 스케줄 확정 응답.
 * @typedef {Object} ConfirmScheduleResponse
 * @property {string} status
 * @property {string} message
 * @property {number} scheduleId
 */

export {}
