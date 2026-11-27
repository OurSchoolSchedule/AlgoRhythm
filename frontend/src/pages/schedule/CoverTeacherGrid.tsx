import type { DirectoryMember } from '@/api/home'
import './cover-teacher-grid.css'

interface Props {
  teachers: readonly DirectoryMember[]
  candidateIds: readonly number[]
  selectedIds: readonly number[]
  onChange: (ids: number[]) => void
}

export default function CoverTeacherGrid({ teachers, candidateIds, selectedIds, onChange }: Props) {
  const eligible = new Set(candidateIds)
  const choices = teachers.filter((teacher) => eligible.has(teacher.schoolUserId))
  if (!choices.length) return null

  return (
    <ul className="cover-teacher-grid" aria-label="보결 가능한 교사">
      {choices.map((teacher) => {
        const id = teacher.schoolUserId
        const name = teacher.displayName || teacher.username || `교사 #${id}`
        const subjects = [
          ...new Set(
            [...(teacher.rosterSubjects ?? []), ...(teacher.subjects ?? [])].map(
              (s) => s.subjectName,
            ),
          ),
        ]
        return (
          <li key={id}>
            <label>
              <input
                type="checkbox"
                value={id}
                checked={selectedIds.includes(id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selectedIds, id]
                      : selectedIds.filter((v) => v !== id),
                  )
                }
              />
              <span>
                {name}-{subjects.join(', ') || '담당 과목 미등록'}
              </span>
            </label>
          </li>
        )
      })}
    </ul>
  )
}
