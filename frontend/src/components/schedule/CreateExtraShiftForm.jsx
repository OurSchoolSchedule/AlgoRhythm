import { useState } from 'react'
import { useStoreWeekShifts, useCreateExtraShiftRequest } from '@/hooks'
import { DOMAIN } from '@/constants/domainLabels.js'
import { getSchoolWeekRange } from '@/utils/weekRange.js'
import { formatShiftRange } from '@/utils/formatShift.js'

export default function CreateExtraShiftForm() {
  const week = getSchoolWeekRange()
  const { data: shifts = [], isLoading, isError } = useStoreWeekShifts(week)
  const createExtra = useCreateExtraShiftRequest()
  const [shiftId, setShiftId] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!shiftId) return
    createExtra.mutate(
      { shiftId: Number(shiftId), headcount: 1, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setShiftId('')
          setNote('')
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>
        {DOMAIN.extraWork} 요청
      </p>
      {isLoading && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>수업 목록 불러오는 중...</p>
      )}
      {isError && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-danger)' }}>
          수업 목록을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.
        </p>
      )}
      {!isLoading && !isError && shifts.length === 0 && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
          이번 주 등록된 수업이 없습니다. 시간표가 등록되면 요청할 수 있습니다.
        </p>
      )}
      {shifts.length > 0 && (
        <>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            기준 수업
          </label>
          <select
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            style={{
              width: '100%',
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-input)',
              fontSize: 12,
            }}
          >
            <option value="">수업 선택</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.username ? `${s.username} · ` : ''}
                {formatShiftRange(s.startDatetime, s.endDatetime)}
              </option>
            ))}
          </select>
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)' }}>
            필요 인원: {DOMAIN.headcount}
          </p>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            메모 (선택)
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="추가 근무 안내"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-border-input)',
              fontSize: 12,
            }}
          />
          <button
            type="submit"
            disabled={createExtra.isPending || !shiftId}
            style={{
              width: '100%',
              padding: '8px 0',
              borderRadius: 6,
              border: 'none',
              background: createExtra.isPending ? 'var(--color-border)' : 'var(--color-primary-button)',
              color: createExtra.isPending ? 'var(--color-text-muted)' : 'var(--color-on-primary)',
              fontSize: 12,
              fontWeight: 600,
              cursor: createExtra.isPending ? 'default' : 'pointer',
            }}
          >
            {createExtra.isPending ? '요청 중...' : `${DOMAIN.extraWork} 요청 보내기`}
          </button>
        </>
      )}
      {createExtra.isError && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>
          요청에 실패했습니다. 입력 내용을 확인한 뒤 다시 요청하세요.
        </p>
      )}
      {createExtra.isSuccess && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-success)' }}>
          추가 근무 요청을 보냈습니다.
        </p>
      )}
    </form>
  )
}
