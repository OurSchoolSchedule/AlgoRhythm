import { describe, expect, it } from 'vitest'
import type { HomeMemberDto, HomeNoticeDto, HomeRead } from '@/types/home'
import { homeAccess, homeWeekAccess } from './homeAccess'
import { failedHomeRead, schoolDate, toHomeNotifications, toHomeProfile } from './homeContract'

const success = <T>(data: T): HomeRead<T> => ({ state: 'success', data })
const school = { schoolId: 540001, position: 'TEACHER', employmentStatus: 'HIRED' }
const teacher = homeAccess(true, school)
// School42 seed gives this teacher no homeroom link. The roster suggests 1-6.
// These two tests change only the server's homeroomClasses response.
const room = { classId: 544006, academicYear: 2026, grade: 1, classNumber: 6 }
const profile = { userId: 541004, username: '최도현' }
const member: HomeMemberDto = {
  userId: profile.userId,
  schoolUserId: 542004,
  subjects: [],
  homeroomClasses: [],
}
function myProfile(directory: HomeRead<readonly HomeMemberDto[]>) {
  return toHomeProfile(profile.userId, 2026, success(profile), directory)
}

describe('홈 프로필과 담임 선택', () => {
  it('서버가 담임을 반환하지 않으면 등록값 없음이며 내 시간표만 허용한다', () => {
    const model = myProfile(success([member]))
    expect(model).toMatchObject({
      name: { state: 'value', value: '최도현' },
      schoolUserId: { state: 'value', value: 542004 },
      subjects: { state: 'empty' },
      homerooms: { state: 'empty' },
      deputyHomeroom: { state: 'unsupported' },
      positionTitle: { state: 'unsupported' },
    })
    expect(homeWeekAccess(teacher, model.homerooms, room.classId)).toEqual({
      canSwitchHomeroom: false,
      selection: { view: 'mine' },
      queries: { myWeek: true, schoolWeek: false },
    })
  })

  it('본인 userId 및 해당 학년도의 담임 학급만 선택하고 목록 밖의 선택을 취소한다', () => {
    const subject = { subjectId: 543001, subjectName: '국어' }
    const formerRoom = { ...room, classId: 40, academicYear: 2025 }
    const otherRoom = { ...room, classId: 41, classNumber: 5 }
    const model = myProfile(
      success([
        { ...member, userId: 100, schoolUserId: profile.userId, homeroomClasses: [otherRoom] },
        { ...member, subjects: [subject], homeroomClasses: [formerRoom, room] },
      ]),
    )
    expect(model.subjects).toEqual({ state: 'value', value: [subject] })
    expect(model.homerooms).toEqual({ state: 'value', value: [room] })
    expect(homeWeekAccess(teacher, model.homerooms, room.classId)).toEqual({
      canSwitchHomeroom: true,
      selection: { view: 'homeroom', classId: room.classId },
      queries: { myWeek: false, schoolWeek: true },
    })
    for (const choice of [null, formerRoom.classId, otherRoom.classId]) {
      expect(homeWeekAccess(teacher, model.homerooms, choice).selection.view).toBe('mine')
    }
  })

  it('본인 명부 미확인, 로딩, 403과 조회 실패를 구분하며 독립적인 프로필 값을 유지한다', () => {
    const error = new Error('명부 조회 실패')
    const missing = myProfile(success([]))
    expect(missing.homerooms.state).toBe('unconfirmed')
    for (const source of [
      { state: 'pending' } as const,
      failedHomeRead(403, error),
      failedHomeRead(503, error),
    ]) {
      const model = myProfile(source)
      expect(model.name.state).toBe('value')
      expect(model.homerooms).toEqual(source)
      expect(homeWeekAccess(teacher, model.homerooms, room.classId).queries.schoolWeek).toBe(false)
    }
    expect(failedHomeRead(403, error)).toEqual({ state: 'forbidden', error })
    expect(failedHomeRead(undefined, error)).toEqual({ state: 'error', error })
    expect(
      toHomeProfile(profile.userId, 2026, success({ ...profile, username: null }), success([])).name
        .state,
    ).toBe('empty')
    expect(
      toHomeProfile(profile.userId, 2026, success({ ...profile, userId: 99 }), success([])).name
        .state,
    ).toBe('unconfirmed')
  })
})

describe('메뉴와 조회 권한', () => {
  it.each(['STUDENT', 'OWNER', '', 'future-role'])(
    '%s에는 교직원 조회 경로가 하나도 열리지 않는다',
    (position) => {
      const access = homeAccess(true, { ...school, position })
      const { activeSchool, ...schoolQueries } = access.queries
      const week = homeWeekAccess(access, { state: 'value', value: [room] }, room.classId)
      expect(activeSchool).toBe(true)
      for (const permissions of [schoolQueries, week.queries, access.actions, access.menus]) {
        expect(Object.values(permissions)).not.toContain(true)
      }
      expect(week.selection.view).toBe('unavailable')
      expect(week.canSwitchHomeroom).toBe(false)
    },
  )
  it('재직 관리자와 교사에게 각각 해당 명부, 시간표, 신청·응답·승인 경로를 연다', () => {
    const admin = homeAccess(true, { ...school, position: 'ADMIN' })
    expect(admin.queries).toMatchObject({
      members: true,
      teachers: false,
      adminProfile: true,
      teacherProfile: false,
      datedLessons: true,
    })
    expect(teacher.queries).toMatchObject({
      members: false,
      teachers: true,
      adminProfile: false,
      teacherProfile: true,
      datedLessons: true,
    })
    expect(admin.menus).toMatchObject({
      generate: true,
      publish: true,
      requestSubstitute: true,
      approve: true,
      requestSwap: false,
    })
    expect(teacher.actions).toMatchObject({
      generate: false,
      publish: false,
      requestSubstitute: true,
      approve: false,
      requestSwap: true,
      respondToChange: true,
    })
    expect(homeWeekAccess(admin, { state: 'value', value: [room] }, room.classId)).toMatchObject({
      selection: { view: 'school' },
      canSwitchHomeroom: false,
    })
  })
  it('학교를 아직 모르면 역할별 조회를 보류하고 로그아웃하면 모든 조회를 막는다', () => {
    const { activeSchool, ...other } = homeAccess(true, null).queries
    expect(activeSchool).toBe(true)
    expect(Object.values(other)).not.toContain(true)
    expect(Object.values(homeAccess(false, school).queries)).not.toContain(true)
    const onLeave = homeAccess(true, { ...school, employmentStatus: 'ON_LEAVE' })
    expect(onLeave.queries.datedLessons).toBe(false)
    expect(Object.values(onLeave.actions)).not.toContain(true)
  })
})

describe('학교 날짜와 알림', () => {
  it('서울 자정과 연도 경계에서 학교 날짜를 바꾸며 명시한 다른 시간대도 따른다', () => {
    expect(schoolDate(new Date('2026-12-31T14:59:59.999Z'))).toBe('2026-12-31')
    const midnight = new Date('2026-12-31T15:00:00Z')
    expect(schoolDate(midnight)).toBe('2027-01-01')
    expect(schoolDate(midnight, 'America/New_York')).toBe('2026-12-31')
  })
  it('보결·승인·교환을 서버 유형으로 분류하고 낯선 유형을 학교공지로 취급하지 않는다', () => {
    const first: HomeNoticeDto = {
      id: 12,
      category: 'SUBSTITUTE',
      type: 'SUBSTITUTE_REQUEST_INVITE',
      message: '요청',
      schoolName: null,
      createdAt: '2026-11-23T08:02:00',
      read: true,
      timetableSwapRequestId: null,
      substituteRequestId: 42,
      substituteResponseId: null,
    }
    const rows = [
      first,
      { ...first, id: 13, type: 'SUBSTITUTE_NOTIFY_ADMIN' },
      { ...first, id: 14, category: 'TIMETABLE_SWAP', type: 'TIMETABLE_SWAP_REQUEST' },
      { ...first, id: 15, type: 'NEW_TYPE' },
    ]
    const model = toHomeNotifications(success(rows))
    expect(model.scope).toBe('account')
    expect(model.schoolAnnouncements.state).toBe('unsupported')
    expect(model.items.state).toBe('value')
    if (model.items.state !== 'value') throw new Error('expected mapped notifications')
    expect(model.items.value.map((row) => row.group)).toEqual([
      'substitute',
      'approval',
      'swap',
      'unclassified',
    ])
    expect(model.items.value[0]).toMatchObject({
      read: true,
      schoolName: null,
      related: { swapRequestId: null, substituteRequestId: 42, substituteResponseId: null },
    })
  })
  it('정상 빈 알림과 조회 실패를 구별한다', () => {
    expect(toHomeNotifications(success([])).items.state).toBe('empty')
    const failed = failedHomeRead(503, new Error('알림 조회 실패'))
    expect(toHomeNotifications(failed).items).toEqual(failed)
  })
})
