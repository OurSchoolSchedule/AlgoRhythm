import { useState } from 'react'
import { useMyWeekShifts, useCreateShiftSwapRequest } from '@/hooks'
import { DOMAIN } from '@/constants/domainLabels.js'
import { getSchoolWeekRange } from '@/utils/weekRange.js'
import { formatShiftRange } from '@/utils/formatShift.js'

export default function CreateShiftSwapForm() {
  const week = getSchoolWeekRange()
  const { data: shifts = [], isLoading, isError } = useMyWeekShifts(week)
  const createSwap = useCreateShiftSwapRequest()
  const [shiftId, setShiftId] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!shiftId || !reason.trim()) return
    createSwap.mutate(
      { shiftId: Number(shiftId), reason: reason.trim() },
      {
        onSuccess: () => {
          setShiftId('')
          setReason('')
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: '#2c2c2a' }}>
        {DOMAIN.substitute} 요청
      </p>
      {isLoading && (
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>내 수업 목록 불러오는 중...</p>
      )}
      {isError && (
        <p style={{ margin: 0, fontSize: 12, color: '#d85a30' }}>
          수업 목록을 불러오지 못했습니다. 시간표가 등록되어 있는지 확인해 주세요.
        </p>
      )}
      {!isLoading && !isError && shifts.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: '#b4b2a9' }}>
          이번 주 등록된 수업이 없습니다.
        </p>
      )}
      {shifts.length > 0 && (
        <>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            대상 수업
          </label>
          <select
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            style={{
              width: '100%',
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 6,
              border: '0.5px solid #d3d1c7',
              fontSize: 12,
            }}
          >
            <option value="">수업 선택</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {formatShiftRange(s.startDatetime, s.endDatetime)}
                {s.storeName ? ` · ${s.storeName}` : ''}
              </option>
            ))}
          </select>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
            {DOMAIN.reason}
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="보결 사유를 입력하세요"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 6,
              border: '0.5px solid #d3d1c7',
              fontSize: 12,
            }}
          />
          <button
            type="submit"
            disabled={createSwap.isPending || !shiftId || !reason.trim()}
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 6,
              border: 'none',
              background: createSwap.isPending ? '#bfe3cd' : '#f09500',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: createSwap.isPending ? 'default' : 'pointer',
            }}
          >
            {createSwap.isPending ? '요청 중...' : `${DOMAIN.substitute} 요청 보내기`}
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
          보결 요청을 보냈습니다. 가능한 교사에게 알림이 전달됩니다.
        </p>
      )}
    </form>
  )
}
