/**
 * 시간표 생성 타입.
 */

/** @typedef {'BALANCED'|'COVERAGE_FIRST'|'SENIOR_PRIORITY'|'FAIR_DISTRIBUTION'} GenerationStrategy */

/**
 * @typedef {Object} GenerationOptionsDto
 * @property {number} [candidateCount]
 * @property {GenerationStrategy[]} [strategies]
 */

/**
 * @typedef {Object} TimetableSlotRequirementDto
 * @property {number} schoolClassId
 * @property {import('./common.js').DayOfWeek} dayOfWeek
 * @property {number} periodNumber
 * @property {number} subjectId
 */

/**
 * 생성 실행 (POST /api/timetable-generation/requests/{id}/generate).
 * @typedef {Object} TimetableGenerationRequestDto
 * @property {number} academicYear
 * @property {number} semester
 * @property {TimetableSlotRequirementDto[]} slotRequirements
 * @property {GenerationOptionsDto} [generationOptions]
 */

/**
 * @typedef {Object} TimetableRequestResponse
 * @property {number} id
 * @property {'REQUESTED'|'GENERATED'|'CONFIRMED'} status
 * @property {string|null} [candidateTimetableKey]
 */

/**
 * generate 응답. 명세 스키마는 비어 있고, 후보 조회 키는 candidateTimetableKey.
 * @typedef {Object} TimetableGenerationResponse
 * @property {string|null} candidateTimetableKey
 */

/**
 * 미제출 교사 (GET /api/timetable-generation/teachers/without-availability).
 * @typedef {Object} TeachersWithoutAvailabilityResponse
 * @property {boolean} allSubmitted
 * @property {number[]} unsubmittedUserIds
 */

/**
 * @typedef {Object} CandidateShift
 * @property {number} schoolUserId
 * @property {string} teacherName
 * @property {number} schoolClassId
 * @property {import('./common.js').DayOfWeek} dayOfWeek
 * @property {number} periodNumber
 * @property {number} subjectId
 * @property {string} [status]
 */

/**
 * @typedef {Object} CandidateSchedule
 * @property {number} schoolId
 * @property {CandidateShift[]} shifts
 * @property {string} strategyName
 * @property {string} strategyDescription
 * @property {number} totalShifts
 * @property {number} unassignedCount
 * @property {number} coverageRate
 */

/**
 * 확정 (POST /api/timetable-generation/requests/{id}/confirm).
 * @typedef {Object} ConfirmTimetableRequestDto
 * @property {number} candidateIndex
 * @property {number} academicYear
 * @property {number} semester
 * @property {string} startDate
 * @property {string} endDate
 */

export {}
