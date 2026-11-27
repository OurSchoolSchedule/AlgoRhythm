import { useState } from 'react'
import { useCreateExtraShiftRequest } from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

/**
 * 보결 요청. 교시는 선택한 시간표에 이미 들어 있어 보여 주기만 한다.
 * @param {{ timetableId?: number, datedTarget?: { termId: number, datedLessonId: number, expectedLessonRev: number }, defaultDate: string, periodLabel: string }} props
 */
export default function CreateSubstituteForm({ timetableId, datedTarget, defaultDate, periodLabel }) {
  const create = useCreateExtraShiftRequest()
  const [date, setDate] = useState(defaultDate)
  const [note, setNote] = useState('')

  if (timetableId == null && !datedTarget) {
    return (
      <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
        이 수업은 시간표 번호가 없어 보결을 요청할 수 없습니다.
      </p>
    )
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!date || create.isPending || create.isSuccess) return
    create.mutate({
      ...(datedTarget ?? { timetableId }),
      substituteDate: date,
      note: note.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 10 }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>공개 보결 모집</p>
      <p>해당 교시에 보결 가능한 교사들에게 모집 알림을 보냅니다. 지원한 교사 중 한 명을 최종 승인하세요.</p>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>날짜</label>
      <input
        type="date"
        aria-label="보결 모집 날짜"
        readOnly={!!datedTarget}
        value={date}
        onChange={(event) => setDate(event.target.value)}
        required
        style={fieldStyle}
      />
      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--color-text-muted)' }}>교시 · {periodLabel}</p>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>사유</label>
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="사유 (선택)"
        style={fieldStyle}
      />
      <button
        type="submit"
        disabled={create.isPending || create.isSuccess || !date}
        style={{
          width: '100%',
          padding: '8px 0',
          borderRadius: 6,
          border: 'none',
          background: 'var(--color-primary-button)',
          color: 'var(--color-on-primary)',
          fontSize: 12,
          fontWeight: 600,
          cursor: create.isPending ? 'default' : 'pointer',
        }}
      >{create.isPending ? '요청 중...' : '보결 요청 보내기'}</button>
      {create.isError && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>
          {getApiErrorMessage(create.error, '보결 요청에 실패했습니다.')}{' '}
          <button type="button" className="history-link" onClick={() => create.reset()}>다시 시도</button>
        </p>
      )}
      {create.isSuccess && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-success)' }}>보결 요청을 보냈습니다.</p>
      )}
    </form>
  )
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  marginBottom: 8,
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  fontSize: 12,
}
