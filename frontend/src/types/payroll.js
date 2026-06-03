/**
 * 급여(Payroll) 타입.
 */

/**
 * 직원 시급 설정 요청 (PUT /api/payroll/store/staff/{userStoreId}/wage).
 * @typedef {Object} StaffWageUpdateDto
 * @property {number} hourlyWage 0 이상
 */

/**
 * 최저임금 등록/수정 (POST /api/payroll/admin/minimum-wage).
 * @typedef {Object} MinimumWageUpdateDto
 * @property {number} hourlyWage
 * @property {string} effectiveFrom "YYYY-MM-DD"
 * @property {string} [effectiveTo]
 * @property {string} [description]
 */

/**
 * @typedef {Object} MinimumWage
 * @property {number} id
 * @property {number} hourlyWage
 * @property {string} effectiveFrom
 * @property {string} [effectiveTo]
 * @property {string} description
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 */

/**
 * @typedef {Object} StaffWageInfoDto
 * @property {number} userStoreId
 * @property {string} staffName
 * @property {number|null} hourlyWage null이면 최저임금 적용
 * @property {number} effectiveWage 실제 적용 시급
 */

/**
 * @typedef {Object} StoreStaffWagesResponseDto
 * @property {number} storeId
 * @property {string} storeName
 * @property {number} currentMinimumWage
 * @property {StaffWageInfoDto[]} staffWages
 */

/**
 * @typedef {Object} StaffPayrollResponseDto
 * @property {number} [userStoreId]
 * @property {string} [staffName]
 * @property {string} [totalPay] BigDecimal 직렬화 문자열
 * @property {Object.<string, *>} [extra] 백엔드 변경 가능성에 대비한 확장 필드
 */

/**
 * @typedef {Object} OwnerPayrollSummaryDto
 * @property {number} storeId
 * @property {string} storeName
 * @property {number} year
 * @property {number} month
 * @property {number} totalStaffCount
 * @property {string} totalBasePay
 * @property {string} totalOvertimePay
 * @property {string} totalNightPay
 * @property {string} totalHolidayPay
 * @property {string} totalWeeklyAllowance
 * @property {string} grandTotalPay
 * @property {StaffPayrollResponseDto[]} staffPayrolls
 */

/**
 * @typedef {Object} StaffMyPayrollResponseDto
 * @property {number} storeId
 * @property {string} storeName
 * @property {number} year
 * @property {number} month
 * @property {number} hourlyWage
 * @property {number} totalWorkMinutes
 * @property {number} breakMinutes
 * @property {number} overtimeMinutes
 * @property {number} nightWorkMinutes
 * @property {number} holidayWorkMinutes
 * @property {number} lateMinutes
 * @property {string} basePay
 * @property {string} overtimePay
 * @property {string} nightPay
 * @property {string} holidayPay
 * @property {string} weeklyAllowance
 * @property {string} totalPay
 * @property {number} totalShiftCount
 * @property {number} lateCount
 * @property {number} absenceCount
 */

/**
 * 연/월 조회 파라미터 (대부분의 급여 조회에서 공통).
 * @typedef {Object} PayrollPeriodParams
 * @property {number} [year]
 * @property {number} [month]
 */

export {}
