/**
 * 시간표 셀 (GET /api/timetable, GET /api/timetable/me).
 * @typedef {Object} TimetableDto
 * @property {number} id
 * @property {number} schoolId
 * @property {number} academicYear
 * @property {number} semester
 * @property {number} schoolClassId
 * @property {number} grade
 * @property {number} classNumber
 * @property {number} periodSettingId
 * @property {number} periodNumber
 * @property {string} periodStartTime
 * @property {string} periodEndTime
 * @property {string} dayOfWeek
 * @property {number} subjectId
 * @property {string} subjectName
 * @property {number} teacherId
 * @property {string} teacherName
 */

/**
 * 시간표 칸 생성·수정 (POST /api/timetable, PATCH /api/timetable/{timetableId}).
 * 목록의 teacherId를 teacherSchoolUserId로 보낸다.
 * @typedef {Object} TimetableCreateDto
 * @property {number} [academicYear]
 * @property {number} [semester]
 * @property {number} [schoolClassId]
 * @property {number} periodSettingId
 * @property {string} dayOfWeek
 * @property {number} [subjectId]
 * @property {number} [teacherSchoolUserId]
 */

export {}
