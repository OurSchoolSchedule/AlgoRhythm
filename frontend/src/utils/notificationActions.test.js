import { describe, expect, it } from 'vitest'
import { getNotificationAction } from './notificationActions.js'
import { normalizeNotification } from './normalizeNotification.js'

describe('substitute notification actions', () => {
  it('교사 보결 초대는 ACCEPT 대상으로 requestId를 쓴다', () => {
    const action = getNotificationAction(
      {
        type: 'SUBSTITUTE_REQUEST_INVITE',
        substituteRequestId: 1300,
        substituteStatus: 'OPEN',
      },
      'TEACHER',
    )
    expect(action).toEqual({ kind: 'extra-shift-respond', requestId: 1300 })
  })

  it('관리자 보결 알림은 substituteResponseId로 승인한다', () => {
    const action = getNotificationAction(
      {
        type: 'SUBSTITUTE_NOTIFY_ADMIN',
        substituteRequestId: 1300,
        substituteResponseId: 1400,
      },
      'ADMIN',
    )
    expect(action).toEqual({
      kind: 'extra-shift-approve',
      requestId: 1300,
      responseId: 1400,
    })
  })

  it('responseId가 없으면 관리자 승인 버튼을 만들지 않는다', () => {
    expect(
      getNotificationAction(
        { type: 'SUBSTITUTE_NOTIFY_ADMIN', substituteRequestId: 1300 },
        'ADMIN',
      ),
    ).toBeNull()
  })
})

describe('normalizeNotification', () => {
  it('read와 substituteResponseId를 화면 필드로 옮긴다', () => {
    const notification = normalizeNotification({
      id: 1600,
      type: 'SUBSTITUTE_NOTIFY_ADMIN',
      category: 'SUBSTITUTE',
      read: false,
      substituteRequestId: 1300,
      substituteResponseId: 1400,
    })
    expect(notification.id).toBe(1600)
    expect(notification.isRead).toBe(false)
    expect(notification.substituteResponseId).toBe(1400)
  })
})
