import { useState } from 'react'
import {
  useAddPeriodSetting,
  useDeletePeriodSetting,
  usePeriodSettings,
  useSaveSchoolSetting,
  useSchoolSetting,
  useUpdatePeriodSetting,
} from '@/hooks'

function toInputTime(value) {
  return value ? String(value).slice(0, 5) : ''
}

function toApiTime(value) {
  return value && value.length === 5 ? `${value}:00` : value
}

const inputStyle = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  fontSize: 13,
  color: 'var(--color-text)',
  width: 120,
}

const buttonStyle = {
  padding: '7px 14px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-primary-500)',
  color: 'var(--color-surface)',
  fontSize: 13,
  cursor: 'pointer',
}

export default function SchoolSettingPanel() {
  const settingQuery = useSchoolSetting()
  const periodsQuery = usePeriodSettings()
  const saveSetting = useSaveSchoolSetting()
  const addPeriod = useAddPeriodSetting()
  const updatePeriod = useUpdatePeriodSetting()
  const deletePeriod = useDeletePeriodSetting()

  const missing =
    settingQuery.isError && settingQuery.error?.response?.status === 404
  const settingFailed = settingQuery.isError && !missing

  const [form, setForm] = useState(null)
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({ periodNumber: '', startTime: '', endTime: '' })
  const settingSource = missing ? 'missing' : (settingQuery.data ?? null)
  const [seenSetting, setSeenSetting] = useState(settingSource)
  if (settingSource !== seenSetting) {
    setSeenSetting(settingSource)
    if (missing) {
      setForm({
        periodDuration: '',
        breakDuration: '',
        lunchStartTime: '',
        lunchEndTime: '',
      })
    } else if (settingQuery.data) {
      const setting = settingQuery.data
      setForm({
        periodDuration: setting.periodDuration ?? '',
        breakDuration: setting.breakDuration ?? '',
        lunchStartTime: toInputTime(setting.lunchStartTime),
        lunchEndTime: toInputTime(setting.lunchEndTime),
      })
    }
  }

  const periods = periodsQuery.data ?? null
  const [seenPeriods, setSeenPeriods] = useState(periods)
  if (periods !== seenPeriods) {
    setSeenPeriods(periods)
    if (periods) {
      setRows(
        periods.map((period) => ({
          id: period.id,
          periodNumber: String(period.periodNumber ?? ''),
          startTime: toInputTime(period.startTime),
          endTime: toInputTime(period.endTime),
        })),
      )
    }
  }

  const handleSaveSetting = () => {
    if (!form) return
    saveSetting.mutate({
      periodDuration: Number(form.periodDuration),
      breakDuration: Number(form.breakDuration),
      lunchStartTime: toApiTime(form.lunchStartTime),
      lunchEndTime: toApiTime(form.lunchEndTime),
    })
  }

  const handleSavePeriod = (row) => {
    const payload = {
      periodNumber: Number(row.periodNumber),
      startTime: toApiTime(row.startTime),
      endTime: toApiTime(row.endTime),
    }
    updatePeriod.mutate({ periodId: row.id, payload })
  }

  const handleAddPeriod = () => {
    if (!draft.periodNumber || !draft.startTime || !draft.endTime) return
    addPeriod.mutate(
      {
        periodNumber: Number(draft.periodNumber),
        startTime: toApiTime(draft.startTime),
        endTime: toApiTime(draft.endTime),
      },
      { onSuccess: () => setDraft({ periodNumber: '', startTime: '', endTime: '' }) },
    )
  }

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '20px 24px' }}>
      <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>교시 설정</p>

      {settingQuery.isLoading && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>
      )}
      {settingFailed && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>설정을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.</p>
      )}

      {!settingQuery.isLoading && !settingFailed && form && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="수업 길이(분)">
            <input
              type="number"
              min="1"
              value={form.periodDuration}
              onChange={(e) => setForm((current) => ({ ...current, periodDuration: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="쉬는 시간(분)">
            <input
              type="number"
              min="0"
              value={form.breakDuration}
              onChange={(e) => setForm((current) => ({ ...current, breakDuration: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="점심 시작">
            <input
              type="time"
              value={form.lunchStartTime}
              onChange={(e) => setForm((current) => ({ ...current, lunchStartTime: e.target.value }))}
              style={inputStyle}
            />
          </Field>
          <Field label="점심 종료">
            <input
              type="time"
              value={form.lunchEndTime}
              onChange={(e) => setForm((current) => ({ ...current, lunchEndTime: e.target.value }))}
              style={inputStyle}
            />
          </Field>

          {saveSetting.isError && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-danger)' }}>설정 저장에 실패했습니다. 값을 확인한 뒤 다시 저장하세요.</p>
          )}
          {saveSetting.isSuccess && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-success)' }}>설정을 저장했습니다.</p>
          )}

          <button
            type="button"
            onClick={handleSaveSetting}
            disabled={saveSetting.isPending}
            style={{
              ...buttonStyle,
              alignSelf: 'flex-start',
              background: saveSetting.isPending ? 'var(--color-border)' : 'var(--color-primary-500)',
              color: saveSetting.isPending ? 'var(--color-text-muted)' : 'var(--color-surface)',
            }}
          >
            {saveSetting.isPending ? '저장 중...' : '설정 저장'}
          </button>
        </div>
      )}

      <p style={{ margin: '24px 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>교시 목록</p>
      {periodsQuery.isLoading && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>교시를 불러오는 중...</p>
      )}
      {periodsQuery.isError && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>교시 목록을 불러오지 못했습니다. 새로고침 후 다시 확인하세요.</p>
      )}
      {!periodsQuery.isLoading && !periodsQuery.isError && rows.length === 0 && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-muted)' }}>등록된 교시가 없습니다. 아래에서 교시를 추가하세요.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="number"
              min="1"
              aria-label="교시 번호"
              value={row.periodNumber}
              onChange={(e) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id ? { ...item, periodNumber: e.target.value } : item,
                  ),
                )
              }
              style={{ ...inputStyle, width: 72 }}
            />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>교시</span>
            <input
              type="time"
              aria-label="시작 시각"
              value={row.startTime}
              onChange={(e) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id ? { ...item, startTime: e.target.value } : item,
                  ),
                )
              }
              style={inputStyle}
            />
            <input
              type="time"
              aria-label="종료 시각"
              value={row.endTime}
              onChange={(e) =>
                setRows((current) =>
                  current.map((item) =>
                    item.id === row.id ? { ...item, endTime: e.target.value } : item,
                  ),
                )
              }
              style={inputStyle}
            />
            <button type="button" onClick={() => handleSavePeriod(row)} style={buttonStyle}>
              수정
            </button>
            <button
              type="button"
              onClick={() => deletePeriod.mutate(row.id)}
              style={{ ...buttonStyle, background: 'var(--color-surface)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
        <input
          type="number"
          min="1"
          placeholder="교시"
          aria-label="새 교시 번호"
          value={draft.periodNumber}
          onChange={(e) => setDraft((current) => ({ ...current, periodNumber: e.target.value }))}
          style={{ ...inputStyle, width: 72 }}
        />
        <input
          type="time"
          aria-label="새 교시 시작"
          value={draft.startTime}
          onChange={(e) => setDraft((current) => ({ ...current, startTime: e.target.value }))}
          style={inputStyle}
        />
        <input
          type="time"
          aria-label="새 교시 종료"
          value={draft.endTime}
          onChange={(e) => setDraft((current) => ({ ...current, endTime: e.target.value }))}
          style={inputStyle}
        />
        <button type="button" onClick={handleAddPeriod} disabled={addPeriod.isPending} style={buttonStyle}>
          교시 추가
        </button>
      </div>
      {(addPeriod.isError || updatePeriod.isError || deletePeriod.isError) && (
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>교시 저장에 실패했습니다. 시간을 확인한 뒤 다시 저장하세요.</p>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <label style={{ fontSize: 13, color: 'var(--color-text-muted)', width: 120 }}>{label}</label>
      {children}
    </div>
  )
}
