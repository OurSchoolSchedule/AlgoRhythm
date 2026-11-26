import { useState } from 'react'
import { useDeleteSubject, useSubjects, useUpdateSubject } from '@/hooks'
import { useScopedRead } from '@/hooks/useHomeSession'
import { queryKeys } from '@/hooks/queryKeys'
import { getTeachingDirectory } from '@/api/teachingDirectory'
import LoadError from '@/components/LoadError.jsx'
import { getApiErrorMessage } from '@/utils/timetableGeneration.js'

function SubjectRow({
  subject,
  teachers,
  editing,
  startEditing,
  finishEditing,
  update,
  remove,
}) {
  const [name, setName] = useState(subject.name)
  return (
    <li className="directory-row">
      {editing ? (
        <input
          aria-label="수정할 과목명"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      ) : (
        <strong>{subject.name}</strong>
      )}
      {teachers !== undefined && <span>{teachers.join(', ') || '미배정'}</span>}
      <div className="directory-actions">
        {editing ? (
          <button
            type="button"
            className="detail-button"
            disabled={update.isPending || !name.trim()}
            onClick={() =>
              update.mutate(
                { subjectId: subject.id, payload: { name: name.trim() } },
                { onSuccess: finishEditing },
              )
            }
          >
            저장
          </button>
        ) : (
          <button
            type="button"
            className="detail-button"
            onClick={() => {
              setName(subject.name)
              startEditing()
            }}
          >
            수정
          </button>
        )}
        <button
          type="button"
          className="detail-button detail-danger"
          disabled={remove.isPending}
          onClick={() => remove.mutate(subject.id)}
        >
          삭제
        </button>
      </div>
    </li>
  )
}

function teacherKey(teacher) {
  return teacher.rosterId != null
    ? `roster-${teacher.rosterId}`
    : `member-${teacher.schoolUserId}`
}

function gradeLabel(teacher, loadId) {
  if (loadId == null) return '담당 학년 미확정'
  if (!teacher.grades.length) return '배정된 학년 없음'
  return teacher.grades.map((grade) => `${grade}학년`).join(', ')
}

export default function TeachingDirectory({ session, term }) {
  const [mode, setMode] = useState('subject')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const update = useUpdateSubject()
  const remove = useDeleteSubject()
  const catalog = useSubjects({ enabled: !term })
  const directory = useScopedRead(
    session,
    [...queryKeys.schoolCatalog.subjects(), 'directory', term?.termId],
    Boolean(term && session.access.actions.generate),
    (signal) => getTeachingDirectory(term.termId, signal),
    { staleTime: 0 },
  )
  const query = term ? directory : catalog
  const subjects = (term ? directory.data?.subjects : catalog.data) ?? []
  const teachers = directory.data?.teachers ?? []
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]))
  const nameCounts = new Map()
  for (const teacher of teachers) {
    nameCounts.set(
      teacher.displayName,
      (nameCounts.get(teacher.displayName) ?? 0) + 1,
    )
  }
  const teachingNames = new Map()
  const teacherRows = teachers.map((teacher) => {
    const label =
      nameCounts.get(teacher.displayName) === 1
        ? teacher.displayName
        : `${teacher.displayName} (${teacher.rosterId != null ? `명부 ${teacher.rosterId}` : `소속 ${teacher.schoolUserId}`})`
    for (const id of teacher.subjectIds) {
      if (!teachingNames.has(id)) teachingNames.set(id, [])
      teachingNames.get(id).push(label)
    }
    return {
      teacher,
      label,
      subjects: teacher.subjectIds
        .map((id) => subjectNames.get(id))
        .filter(Boolean),
    }
  })
  const needle = search.trim().toLocaleLowerCase()
  const matches = (values) =>
    values.some((value) => value.toLocaleLowerCase().includes(needle))
  const bySubject = mode === 'subject'
  const filteredSubjects = subjects.filter((s) =>
    matches([s.name, ...(teachingNames.get(s.id) ?? [])]),
  )
  const filteredTeachers = teacherRows.filter((row) =>
    matches([row.label, ...row.subjects]),
  )
  const count = bySubject ? filteredSubjects.length : filteredTeachers.length

  return (
    <section className="detail-card" aria-labelledby="teaching-directory">
      <h2 id="teaching-directory">담당 과목과 교사</h2>
      {term ? (
        <p className="subject-help">
          {session.school?.name} · {term.academicYear}학년도 {term.semester}학기
        </p>
      ) : (
        <p className="subject-help">
          업무 홈에서 학기를 선택하면 담당 교사와 학년을 확인할 수 있습니다.
        </p>
      )}
      <div className="directory-tools">
        <div role="group" aria-label="조회 기준" className="directory-modes">
          <button
            type="button"
            className="detail-button"
            aria-pressed={bySubject}
            onClick={() => setMode('subject')}
          >
            과목별
          </button>
          <button
            type="button"
            className="detail-button"
            aria-pressed={!bySubject}
            disabled={!term}
            onClick={() => setMode('teacher')}
          >
            교사별
          </button>
        </div>
        <label>
          검색{' '}
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={term ? '과목명 또는 교사명' : '과목명'}
          />
        </label>
      </div>
      {query.isLoading ? (
        <p role="status">불러오는 중...</p>
      ) : query.isError ? (
        <LoadError onRetry={() => query.refetch()} />
      ) : (
        <>
          <p className="directory-count" role="status">
            {count
              ? `${bySubject ? '과목' : '교사'} ${count}${bySubject ? '개' : '명'}`
              : needle
                ? '검색 결과가 없습니다.'
                : bySubject
                  ? '등록된 과목이 없습니다.'
                  : '등록된 교사가 없습니다.'}
          </p>
          <ul className="directory-list">
            {bySubject
              ? filteredSubjects.map((s) => (
                  <SubjectRow
                    key={s.id}
                    subject={s}
                    teachers={
                      term ? (teachingNames.get(s.id) ?? []) : undefined
                    }
                    editing={editingId === s.id}
                    startEditing={() => setEditingId(s.id)}
                    finishEditing={() => setEditingId(null)}
                    update={update}
                    remove={remove}
                  />
                ))
              : filteredTeachers.map(({ teacher, label, subjects: names }) => (
                  <li key={teacherKey(teacher)} className="directory-row">
                    <strong>{label}</strong>
                    <span>{names.join(', ') || '담당 과목 없음'}</span>
                    <span>{gradeLabel(teacher, directory.data?.loadId)}</span>
                  </li>
                ))}
          </ul>
        </>
      )}
      {(update.isError || remove.isError) && (
        <p className="detail-error" role="alert">
          {getApiErrorMessage(
            update.error || remove.error,
            '과목을 바꾸지 못했습니다.',
          )}{' '}
          <button
            type="button"
            className="history-link"
            onClick={() => {
              update.reset()
              remove.reset()
            }}
          >
            다시 시도
          </button>
        </p>
      )}
    </section>
  )
}
