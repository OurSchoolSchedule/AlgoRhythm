// @vitest-environment jsdom
import { setTimeout as delay } from 'node:timers/promises'
import { isAxiosError } from 'axios'
import { expect, it } from 'vitest'
import client from '@/api/client.js'
import { issueDevToken, saveDevLoginTokens } from '@/api/auth.js'
import { clearTokens } from '@/api/tokenStorage.js'
import { getActiveStore, getStaffProfile } from '@/api/mypage.js'
import { getHomeDirectory } from '@/api/home'
import { getSchoolClasses, getSubjects, updateSchoolClass } from '@/api/schoolCatalog.js'
import { validateTeachingLoad } from '@/api/loadValidation'
import { getGenerationStatus, submitGeneration } from '@/api/generationJobs'
import { homeAccess, homeWeekAccess } from '@/utils/homeAccess'
import { toHomeProfile } from '@/utils/homeContract'
import { auditCandidate } from './school42Candidate'
import { readSchool42 } from './school42Fixture'
import { verifySchool42Publication } from './school42Publication'

declare const jsdom: { reconfigure(options: { url: string }): void }

async function withLocalSchool(run: (adminToken: string) => Promise<void>) {
  const origin = new URL(process.env.SCHOOL42_LOCAL_URL || 'http://127.0.0.1:8080')
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) ||
    !['http:', 'https:'].includes(origin.protocol)
  ) {
    throw new Error('School42 로컬 데모 서버 주소를 지정하세요.')
  }
  const originalUrl = window.location.href
  jsdom.reconfigure({ url: origin.origin })
  const originalBase = client.defaults.baseURL
  client.defaults.baseURL = origin.origin
  try {
    const adminToken = await issueDevToken('admin42@example.invalid')
    saveDevLoginTokens(adminToken)
    expect(await getActiveStore()).toMatchObject({
      schoolId: 540001,
      position: 'ADMIN',
      employmentStatus: 'HIRED',
    })
    await run(adminToken)
  } catch (error) {
    // Axios configuration contains the demo credential. Report only the failing route and HTTP status.
    if (isAxiosError(error))
      throw new Error(
        `${error.config?.method} ${error.config?.url}: ${error.response?.status ?? error.code}`,
      )
    throw error
  } finally {
    clearTokens()
    client.defaults.baseURL = originalBase
    jsdom.reconfigure({ url: originalUrl })
  }
}

it(
  '실제 로컬 School42 시수표 검증 → 비동기 생성 → 반환된 모든 후보 검산',
  () =>
    withLocalSchool(async () => {
      const termId = 547001
      const demo = await readSchool42()
      const [members, subjects, classes] = await Promise.all([
        getHomeDirectory(true, new AbortController().signal),
        getSubjects(),
        getSchoolClasses(2026),
      ])
      const teachers = new Map(members.map((m) => [String(m.schoolUserId), m]))
      expect(members).toHaveLength(43) // separate administrator
      for (const teacher of demo.roster)
        expect(teachers.get(teacher.schoolUserId)?.username).toBe(teacher.name)
      // The untouched School42 seed does not link the homerooms recorded in the offline roster.
      expect(classes.every((c) => c.homeroomTeacherSchoolUserId === null)).toBe(true)
      expect(teachers.get('542004')?.homeroomClasses).toEqual([])
      expect(subjects).toHaveLength(35)
      expect(classes).toHaveLength(21)
      const subjectIds = new Map(subjects.map((s) => [s.name, String(s.id)]))
      const classIds = new Map(classes.map((c) => [`${c.grade}-${c.classNumber}`, String(c.id)]))
      const expected = demo.demands.map((d) => {
        const subjectId = subjectIds.get(d.subjectId)
        const classId = classIds.get(d.classId)
        if (!subjectId || !classId)
          throw new Error(
            `시수표 과목·학급을 서버 명부에서 찾을 수 없습니다: ${d.subjectId} / ${d.classId}`,
          )
        return { ...d, subjectId, classId }
      })

      const file = new File([new Uint8Array(demo.bytes)], 'teaching_load_42.xlsx')
      const load = await validateTeachingLoad(termId, { file })
      expect(load.totalPeriods).toBe(672)
      expect(load.demands).toHaveLength(252)
      const tuple = (d: (typeof expected)[number]) =>
        JSON.stringify([d.teacherId, d.subjectId, d.classId, d.weeklyPeriods])
      expect(load.demands.map(tuple).sort()).toEqual(expected.map(tuple).sort())

      const accepted = await submitGeneration(termId, {
        ...demo.request,
        validatedLoadId: load.validatedLoadId,
      })
      const deadline = Date.now() + 90_000
      let job = await getGenerationStatus(termId, accepted)
      while (job.state === 'QUEUED' || job.state === 'RUNNING') {
        if (Date.now() >= deadline)
          throw new Error(`작업 ${accepted.jobId} 상태 조회 시간 초과: ${job.state}`)
        await delay(2000)
        job = await getGenerationStatus(termId, accepted)
      }
      if (job.state !== 'READY')
        throw new Error(`편성 종료: ${job.state} (${job.result?.detail ?? ''})`)
      expect(job.result.validatedLoadId).toBe(load.validatedLoadId)
      expect(job.result.candidates.length).toBeGreaterThanOrEqual(1)
      expect(job.result.candidates.length).toBeLessThanOrEqual(4)
      for (const candidate of job.result.candidates) {
        expect(
          auditCandidate(expected, candidate.placements, demo.slots),
          candidate.candidateId,
        ).toEqual({
          periods: 672,
          periodMismatches: [],
          teacherConflicts: [],
          classConflicts: [],
          outsideTeachingSlots: [],
        })
      }
      console.info(
        `School42 job=${job.jobId} state=READY candidates=${job.result.candidates.length} periods=672 per candidate; demand mismatches=0 teacher conflicts=0 class conflicts=0`,
      )
      if (process.env.FE20_VERIFY_PUBLICATION === '1') {
        await verifySchool42Publication(termId, job, job.result.candidates[0])
      }
    }),
  120_000,
)

it('담임 연결 전후의 교사 API 응답으로 보기 전환을 결정하고 원래 학급을 복원한다', () =>
  withLocalSchool(async (adminToken) => {
    const schoolUserId = 542004
    const roomId = 544006
    const original = (await getSchoolClasses(2026)).find((room) => room.id === roomId)
    if (
      !original ||
      original.grade !== 1 ||
      original.classNumber !== 6 ||
      original.homeroomTeacherSchoolUserId !== null
    ) {
      throw new Error('원본 School42 seed의 1학년 6반이 필요합니다.')
    }
    const { academicYear, grade, classNumber } = original
    const teacherToken = await issueDevToken('teacher42-04@example.invalid')
    async function readAsTeacher(termId: number | null = null) {
      saveDevLoginTokens(teacherToken)
      const [activeSchool, identity, members] = await Promise.all([
        getActiveStore(),
        getStaffProfile(),
        getHomeDirectory(false, new AbortController().signal, termId),
      ])
      expect(activeSchool).toMatchObject({
        schoolId: 540001,
        position: 'TEACHER',
        employmentStatus: 'HIRED',
      })
      expect(identity.userId).toBe(541004)
      expect(members).toHaveLength(42)
      const profile = toHomeProfile(
        identity.userId,
        academicYear,
        { state: 'success', data: identity },
        { state: 'success', data: members },
        termId,
      )
      return homeWeekAccess(homeAccess(true, activeSchool), profile.homerooms, roomId)
    }
    async function linkTeacher(homeroomTeacherSchoolUserId: number | null) {
      saveDevLoginTokens(adminToken)
      await updateSchoolClass(roomId, {
        academicYear,
        grade,
        classNumber,
        homeroomTeacherSchoolUserId,
      })
    }
    expect(await readAsTeacher()).toMatchObject({
      canSwitchHomeroom: false,
      selection: { view: 'mine' },
    })
    try {
      await linkTeacher(schoolUserId)
      for (const termId of [null, 547001]) {
        expect(await readAsTeacher(termId)).toMatchObject({
          canSwitchHomeroom: true,
          selection: { view: 'homeroom', classId: roomId },
        })
      }
    } finally {
      await linkTeacher(null)
    }
    expect(await readAsTeacher()).toMatchObject({
      canSwitchHomeroom: false,
      selection: { view: 'mine' },
    })
  }))
