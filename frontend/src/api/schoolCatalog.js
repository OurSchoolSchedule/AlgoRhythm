// 과목·학급 API. slotRequirements의 subjectId, schoolClassId는 여기서 만든다.
import client from './client.js'

/**
 * @returns {Promise<import('@/types/schoolCatalog.js').SubjectResponse[]>}
 */
export async function getSubjects() {
  const { data } = await client.get('/api/school/subjects')
  return Array.isArray(data) ? data : []
}

/**
 * @param {import('@/types/schoolCatalog.js').SubjectRequest} payload
 */
export async function createSubject(payload) {
  const { data } = await client.post('/api/school/subjects', payload)
  return data
}

/**
 * @param {number} subjectId
 * @param {import('@/types/schoolCatalog.js').SubjectRequest} payload
 */
export async function updateSubject(subjectId, payload) {
  const { data } = await client.put(`/api/school/subjects/${subjectId}`, payload)
  return data
}

/** @param {number} subjectId */
export async function deleteSubject(subjectId) {
  await client.delete(`/api/school/subjects/${subjectId}`)
}

/**
 * @param {number} [academicYear]
 * @returns {Promise<import('@/types/schoolCatalog.js').SchoolClassResponse[]>}
 */
export async function getSchoolClasses(academicYear) {
  const { data } = await client.get('/api/school/classes', {
    params: academicYear != null ? { academicYear } : undefined,
  })
  return Array.isArray(data) ? data : []
}

/**
 * @param {import('@/types/schoolCatalog.js').SchoolClassRequest} payload
 */
export async function createSchoolClass(payload) {
  const { data } = await client.post('/api/school/classes', payload)
  return data
}

/**
 * @param {number} classId
 * @param {import('@/types/schoolCatalog.js').SchoolClassRequest} payload
 */
export async function updateSchoolClass(classId, payload) {
  const { data } = await client.put(`/api/school/classes/${classId}`, payload)
  return data
}

/** @param {number} classId */
export async function deleteSchoolClass(classId) {
  await client.delete(`/api/school/classes/${classId}`)
}
