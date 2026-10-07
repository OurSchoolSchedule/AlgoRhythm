import { useMemo, useState } from 'react'
import {
  useCreateTimetable,
  usePeriodSettings,
  useSchoolClasses,
  useStoreStaffSummary,
  useSubjects,
} from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const DAY_OPTIONS = [
  ['MON', '월'],
  ['TUE', '화'],
  ['WED', '수'],
  ['THU', '목'],
  ['FRI', '금'],
]

const KEY_TO_API = { 월: 'MON', 화: 'TUE', 수: 'WED', 목: 'THU', 금: 'FRI' }

/**
 * 빈 칸에 수업을 추가한다. POST /api/timetable
 * @param {Object} props
 * @param {string} props.dayKey
 * @param {number} props.period
 * @param {number} [props.academicYear]
 * @param {number} [props.semester]
 * @param {() => void} [props.onCreated]
 * @param {() => void} [props.onCancel]
 */
export default function CreateTimetableCellForm({
  dayKey,
  period,
  academicYear,
  semester,
  onCreated,
  onCancel,
}) {
  const subjects = useSubjects()
  const classes = useSchoolClasses(academicYear)
  const periods = usePeriodSettings()
  const staff = useStoreStaffSummary()
  const create = useCreateTimetable()

  const periodSettingId = useMemo(() => {
    const list = periods.data ?? []
    const match = list.find((item) => Number(item.periodNumber) === Number(period))
    return match?.id ?? match?.periodSettingId ?? null
  }, [periods.data, period])

  const [schoolClassId, setSchoolClassId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [teacherSchoolUserId, setTeacherSchoolUserId] = useState('')
  const [error, setError] = useState('')

  const teachers = staff.data?.staffList ?? []

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const dayOfWeek = KEY_TO_API[dayKey] || DAY_OPTIONS.find(([key]) => key === dayKey)?.[0]
    if (!dayOfWeek || periodSettingId == null || !schoolClassId || !subjectId || !teacherSchoolUserId) {
      setError('학급·과목·교사·교시를 모두 고르세요.')
      return
    }
    const payload = {
      periodSettingId: Number(periodSettingId),
      dayOfWeek,
      schoolClassId: Number(schoolClassId),
      subjectId: Number(subjectId),
      teacherSchoolUserId: Number(teacherSchoolUserId),
    }
    if (academicYear != null) payload.academicYear = Number(academicYear)
    if (semester != null) payload.semester = Number(semester)
    try {
      await create.mutateAsync(payload)
      onCreated?.()
    } catch (err) {
      setError(getApiErrorMessage(err, '수업을 추가하지 못했습니다.'))
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
        {dayKey} {period}교시에 수업을 추가합니다.
      </p>
      <label style={labelStyle}>
        학급
        <select value={schoolClassId} onChange={(e) => setSchoolClassId(e.target.value)} style={inputStyle} required>
          <option value="">선택</option>
          {(classes.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.grade}-{item.classNumber}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle}>
        과목
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} style={inputStyle} required>
          <option value="">선택</option>
          {(subjects.data ?? []).map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>
      <label style={labelStyle}>
        교사
        <select value={teacherSchoolUserId} onChange={(e) => setTeacherSchoolUserId(e.target.value)} style={inputStyle} required>
          <option value="">선택</option>
          {teachers.map((item) => (
            <option key={item.schoolUserId} value={item.schoolUserId}>{item.username}</option>
          ))}
        </select>
      </label>
      {periodSettingId == null && (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-warning)' }}>
          {periods.isLoading ? '교시 설정을 확인하는 중...' : '이 교시 번호에 맞는 교시 설정이 없습니다.'}
        </p>
      )}
      {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="tt-secondary" onClick={onCancel}>취소</button>
        <button type="submit" className="tt-create" disabled={create.isPending}>
          {create.isPending ? '추가 중...' : '추가'}
        </button>
      </div>
    </form>
  )
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 12,
  color: 'var(--color-text-muted)',
}

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border-input)',
  fontSize: 14,
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
}
