import { useMemo, useState } from 'react'
import { useMyTimetable, useSchoolTimetableList, useCreateShiftSwapRequest } from '@/hooks'
import { toISODate } from '@/utils'

const DAY_LABEL = {
  MON: '월',
  TUE: '화',
  WED: '수',
  THU: '목',
  FRI: '금',
  SAT: '토',
  SUN: '일',
}

/** @param {import('@/types/timetable.js').TimetableDto} slot */
function timetableLabel(slot) {
  const day = DAY_LABEL[slot.dayOfWeek] ?? slot.dayOfWeek ?? ''
  const klass =
    slot.grade != null && slot.classNumber != null ? `${slot.grade}-${slot.classNumber}` : ''
  return [day, slot.periodNumber != null ? `${slot.periodNumber}교시` : '', klass, slot.subjectName, slot.teacherName]
    .filter(Boolean)
    .join(' · ')
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginBottom: 8,
  padding: '8px 10px',
  borderRadius: 6,
  border: '0.5px solid #d3d1c7',
  fontSize: 12,
}

export default function CreateShiftSwapForm() {
  const mineQuery = useMyTimetable()
  const schoolQuery = useSchoolTimetableList()
  const createSwap = useCreateShiftSwapRequest()
  const today = toISODate()
  const [requesterTimetableId, setRequesterTimetableId] = useState('')
  const [requesterDate, setRequesterDate] = useState(today)
  const [receiverTimetableId, setReceiverTimetableId] = useState('')
  const [receiverDate, setReceiverDate] = useState(today)
  const [reason, setReason] = useState('')

  const mySlots = mineQuery.data ?? []
  const otherSlots = useMemo(() => {
    const selected = Number(requesterTimetableId)
    return (schoolQuery.data ?? []).filter((slot) => slot.id !== selected)
  }, [schoolQuery.data, requesterTimetableId])

  const canSubmit =
    requesterTimetableId &&
    receiverTimetableId &&
    requesterDate &&
    receiverDate &&
    reason.trim() &&
    !createSwap.isPending

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canSubmit) return
    createSwap.mutate(
      {
        requesterTimetableId: Number(requesterTimetableId),
        requesterDate,
        receiverTimetableId: Number(receiverTimetableId),
        receiverDate,
        reason: reason.trim(),
      },
      {
        onSuccess: () => {
          setRequesterTimetableId('')
          setReceiverTimetableId('')
          setReason('')
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#2c2c2a' }}>
        수업 교환 요청
      </p>
      {mineQuery.isLoading && (
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>내 수업 목록 불러오는 중...</p>
      )}
      {mineQuery.isError && (
        <p style={{ margin: 0, fontSize: 12, color: '#d85a30' }}>
          내 시간표를 불러오지 못했습니다.
        </p>
      )}
      {!mineQuery.isLoading && !mineQuery.isError && mySlots.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: '#b4b2a9' }}>
          등록된 내 수업이 없습니다.
        </p>
      )}
      {mySlots.length > 0 && (
        <>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            내 수업
          </label>
          <select
            value={requesterTimetableId}
            onChange={(e) => {
              setRequesterTimetableId(e.target.value)
              if (e.target.value === receiverTimetableId) setReceiverTimetableId('')
            }}
            style={fieldStyle}
          >
            <option value="">수업 선택</option>
            {mySlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {timetableLabel(slot)}
              </option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            내 수업 날짜
          </label>
          <input
            type="date"
            value={requesterDate}
            onChange={(e) => setRequesterDate(e.target.value)}
            style={fieldStyle}
          />

          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            바꿀 수업
          </label>
          {schoolQuery.isLoading && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#888' }}>학교 시간표 불러오는 중...</p>
          )}
          {schoolQuery.isError && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#d85a30' }}>
              학교 시간표를 불러오지 못했습니다. 상대 수업을 고르려면 전체 시간표 조회 권한이 필요합니다.
            </p>
          )}
          {!schoolQuery.isLoading && !schoolQuery.isError && (
            <select
              value={receiverTimetableId}
              onChange={(e) => setReceiverTimetableId(e.target.value)}
              style={fieldStyle}
            >
              <option value="">수업 선택</option>
              {otherSlots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {timetableLabel(slot)}
                </option>
              ))}
            </select>
          )}
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            상대 수업 날짜
          </label>
          <input
            type="date"
            value={receiverDate}
            onChange={(e) => setReceiverDate(e.target.value)}
            style={fieldStyle}
          />

          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            사유
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="교환 사유를 입력하세요"
            style={fieldStyle}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              height: 40,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: canSubmit ? 'var(--color-primary-500)' : 'var(--color-primary-100)',
              color: 'var(--color-surface)',
              fontSize: 'var(--font-body)',
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'default',
            }}
          >
            {createSwap.isPending ? '요청 중...' : '수업 교환 요청 보내기'}
          </button>
        </>
      )}
      {createSwap.isError && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#d85a30' }}>
          요청에 실패했습니다.
        </p>
      )}
      {createSwap.isSuccess && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#1d9e75' }}>
          교환 요청을 보냈습니다.
        </p>
      )}
    </form>
  )
}
