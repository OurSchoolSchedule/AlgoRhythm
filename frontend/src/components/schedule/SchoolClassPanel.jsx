import { useState } from 'react'
import {
  useCreateSchoolClass,
  useDeleteSchoolClass,
  useSchoolClasses,
  useStoreStaffSummary,
  useUpdateSchoolClass,
} from '@/hooks'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

const inputStyle = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  fontSize: 13,
  color: 'var(--color-text)',
  width: 88,
}

const selectStyle = {
  ...inputStyle,
  width: 140,
  background: 'var(--color-surface)',
}

const primaryButton = {
  padding: '7px 14px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-primary-button)',
  color: 'var(--color-on-primary)',
  fontSize: 13,
  cursor: 'pointer',
}

const secondaryButton = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer',
}

function emptyDraft(year = new Date().getFullYear()) {
  return {
    academicYear: String(year),
    grade: '',
    classNumber: '',
    homeroomTeacherSchoolUserId: '',
  }
}

function draftFromClass(item) {
  return {
    academicYear: String(item.academicYear ?? ''),
    grade: String(item.grade ?? ''),
    classNumber: String(item.classNumber ?? ''),
    homeroomTeacherSchoolUserId: item.homeroomTeacherSchoolUserId != null
      ? String(item.homeroomTeacherSchoolUserId)
      : '',
  }
}

/** @param {ReturnType<typeof emptyDraft>} draft @param {{ allowClearHomeroom?: boolean }} [options] */
function toPayload(draft, options = {}) {
  const academicYear = Number(draft.academicYear)
  const grade = Number(draft.grade)
  const classNumber = Number(draft.classNumber)
  if (!academicYear || !grade || !classNumber) return null
  /** @type {import('@/types/schoolCatalog.js').SchoolClassRequest} */
  const payload = { academicYear, grade, classNumber }
  if (draft.homeroomTeacherSchoolUserId) {
    payload.homeroomTeacherSchoolUserId = Number(draft.homeroomTeacherSchoolUserId)
  } else if (options.allowClearHomeroom) {
    payload.homeroomTeacherSchoolUserId = null
  }
  return payload
}

export default function SchoolClassPanel() {
  const classesQuery = useSchoolClasses()
  const staffQuery = useStoreStaffSummary()
  const createClass = useCreateSchoolClass()
  const updateClass = useUpdateSchoolClass()
  const deleteClass = useDeleteSchoolClass()
  const [draft, setDraft] = useState(() => emptyDraft())
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState(() => emptyDraft())

  const classes = classesQuery.data ?? []
  const teachers = staffQuery.data?.staffList ?? []

  const handleCreate = (event) => {
    event.preventDefault()
    const payload = toPayload(draft)
    if (!payload) return
    createClass.mutate(payload, {
      onSuccess: () => setDraft((current) => ({
        ...emptyDraft(Number(current.academicYear) || new Date().getFullYear()),
        academicYear: current.academicYear,
      })),
    })
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditDraft(draftFromClass(item))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(emptyDraft())
  }

  const handleSave = () => {
    if (editingId == null) return
    const payload = toPayload(editDraft, { allowClearHomeroom: true })
    if (!payload) return
    updateClass.mutate(
      { classId: editingId, payload },
      { onSuccess: cancelEdit },
    )
  }

  const teacherOptions = (
    <>
      <option value="">담임 없음</option>
      {teachers.map((item) => (
        <option key={item.schoolUserId} value={item.schoolUserId}>
          {item.username}
        </option>
      ))}
    </>
  )

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '20px 24px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>학급</p>

      {classesQuery.isLoading && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>
      )}
      {classesQuery.isError && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>
          {getApiErrorMessage(classesQuery.error, '학급 목록을 불러오지 못했습니다.')}{' '}
          <button type="button" className="history-link" onClick={() => classesQuery.refetch()}>다시 시도</button>
        </p>
      )}
      {!classesQuery.isLoading && !classesQuery.isError && classes.length === 0 && (
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
          등록된 학급이 없습니다.
        </p>
      )}

      {classes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              {['학년도', '학급', '담임', ''].map((label) => (
                <th key={label || 'action'} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => {
              const isEditing = editingId === item.id
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <input
                        aria-label="학년도"
                        inputMode="numeric"
                        value={editDraft.academicYear}
                        onChange={(event) => setEditDraft((current) => ({ ...current, academicYear: event.target.value }))}
                        style={inputStyle}
                      />
                    ) : item.academicYear}
                  </td>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text)', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <input
                          aria-label="학년"
                          inputMode="numeric"
                          value={editDraft.grade}
                          onChange={(event) => setEditDraft((current) => ({ ...current, grade: event.target.value }))}
                          style={{ ...inputStyle, width: 56 }}
                          placeholder="학년"
                        />
                        <input
                          aria-label="반"
                          inputMode="numeric"
                          value={editDraft.classNumber}
                          onChange={(event) => setEditDraft((current) => ({ ...current, classNumber: event.target.value }))}
                          style={{ ...inputStyle, width: 56 }}
                          placeholder="반"
                        />
                      </span>
                    ) : `${item.grade}-${item.classNumber}`}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <select
                        aria-label="담임"
                        value={editDraft.homeroomTeacherSchoolUserId}
                        onChange={(event) => setEditDraft((current) => ({
                          ...current,
                          homeroomTeacherSchoolUserId: event.target.value,
                        }))}
                        style={selectStyle}
                      >
                        {teacherOptions}
                      </select>
                    ) : (item.homeroomTeacherName || '—')}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={updateClass.isPending || !toPayload(editDraft)}
                          onClick={handleSave}
                          style={{ ...secondaryButton, marginRight: 6 }}
                        >
                          {updateClass.isPending ? '저장 중...' : '저장'}
                        </button>
                        <button type="button" onClick={cancelEdit} style={secondaryButton}>취소</button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          style={{ ...secondaryButton, marginRight: 6 }}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          disabled={deleteClass.isPending}
                          onClick={() => deleteClass.mutate(item.id)}
                          style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 12, cursor: 'pointer' }}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          aria-label="학년도"
          inputMode="numeric"
          value={draft.academicYear}
          onChange={(event) => setDraft((current) => ({ ...current, academicYear: event.target.value }))}
          style={inputStyle}
          placeholder="학년도"
        />
        <input
          aria-label="학년"
          inputMode="numeric"
          value={draft.grade}
          onChange={(event) => setDraft((current) => ({ ...current, grade: event.target.value }))}
          style={inputStyle}
          placeholder="학년"
        />
        <input
          aria-label="반"
          inputMode="numeric"
          value={draft.classNumber}
          onChange={(event) => setDraft((current) => ({ ...current, classNumber: event.target.value }))}
          style={inputStyle}
          placeholder="반"
        />
        <select
          aria-label="담임"
          value={draft.homeroomTeacherSchoolUserId}
          onChange={(event) => setDraft((current) => ({
            ...current,
            homeroomTeacherSchoolUserId: event.target.value,
          }))}
          style={selectStyle}
        >
          {teacherOptions}
        </select>
        <button
          type="submit"
          disabled={createClass.isPending || !toPayload(draft)}
          style={primaryButton}
        >
          {createClass.isPending ? '추가 중...' : '학급 추가'}
        </button>
      </form>
      {(createClass.isError || updateClass.isError || deleteClass.isError) && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>
          {getApiErrorMessage(
            createClass.error || updateClass.error || deleteClass.error,
            '학급을 저장하지 못했습니다.',
          )}{' '}
          <button
            type="button"
            className="history-link"
            onClick={() => {
              createClass.reset()
              updateClass.reset()
              deleteClass.reset()
            }}
          >
            다시 시도
          </button>
        </p>
      )}
    </div>
  )
}
