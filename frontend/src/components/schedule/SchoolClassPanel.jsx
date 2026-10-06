import { useState } from 'react'
import { useCreateSchoolClass, useDeleteSchoolClass, useSchoolClasses } from '@/hooks'

const inputStyle = {
  padding: '7px 12px',
  borderRadius: 8,
  border: '1px solid var(--color-border-input)',
  fontSize: 13,
  color: 'var(--color-text)',
  width: 88,
}

export default function SchoolClassPanel() {
  const classesQuery = useSchoolClasses()
  const createClass = useCreateSchoolClass()
  const deleteClass = useDeleteSchoolClass()
  const [draft, setDraft] = useState({
    academicYear: String(new Date().getFullYear()),
    grade: '',
    classNumber: '',
  })

  const classes = classesQuery.data ?? []

  const handleCreate = (event) => {
    event.preventDefault()
    const academicYear = Number(draft.academicYear)
    const grade = Number(draft.grade)
    const classNumber = Number(draft.classNumber)
    if (!academicYear || !grade || !classNumber) return
    createClass.mutate(
      { academicYear, grade, classNumber },
      { onSuccess: () => setDraft((current) => ({ ...current, grade: '', classNumber: '' })) },
    )
  }

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 12, border: '1px solid var(--color-border)', padding: '20px 24px' }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>학급</p>

      {classesQuery.isLoading && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>불러오는 중...</p>
      )}
      {classesQuery.isError && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-danger)' }}>
          학급 목록을 불러오지 못했습니다.
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
            {classes.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>{item.academicYear}</td>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--color-text)' }}>
                  {item.grade}-{item.classNumber}
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                  {item.homeroomTeacherName || '—'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    disabled={deleteClass.isPending}
                    onClick={() => deleteClass.mutate(item.id)}
                    style={{ border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 12, cursor: 'pointer' }}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
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
        <button
          type="submit"
          disabled={createClass.isPending}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary-button)',
            color: 'var(--color-on-primary)',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          학급 추가
        </button>
      </form>
      {createClass.isError && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-danger)' }}>
          학급을 추가하지 못했습니다.
        </p>
      )}
    </div>
  )
}
