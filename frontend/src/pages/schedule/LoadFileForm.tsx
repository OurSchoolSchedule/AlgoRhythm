import { useState, type ReactNode } from 'react'
import { useSubjects } from '@/hooks/useSchoolCatalog'
import type { LoadUpload } from '@/types/loadValidation'

interface Props {
  locked: boolean
  status: string
  onEdit: () => void
  onValidate: (input: LoadUpload) => void
  children: ReactNode
}

export default function LoadFileForm({ locked, status, onEdit, onValidate, children }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [sheet, setSheet] = useState('')
  const [alias, setAlias] = useState('')
  const [subject, setSubject] = useState('')
  const [aliases, setAliases] = useState<Record<string, number>>({})
  const subjects = useSubjects()

  return (
    <section className="work-card">
      <h2>시수표 검증</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (file && !locked)
            onValidate({
              file,
              sheet: sheet.trim() || undefined,
              subjectAliases: Object.keys(aliases).length ? aliases : undefined,
            })
        }}
      >
        <fieldset disabled={locked}>
          <legend className="desk-sr">시수표 입력</legend>
          <div className="work-row">
            <label>
              시수표 엑셀 파일
              <input
                type="file"
                accept=".xlsx"
                required
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  onEdit()
                }}
              />
            </label>
            {file && <span role="status">{status}</span>}
          </div>
          <details>
            <summary>시트·과목 별칭 설정</summary>
            <p>‘학급담당’ 시트가 있으면 관리자 도구의 ‘명부 일괄 등록’에서 같은 파일로 담임·부담임을 적용하세요.</p>
            <label>
              시트 이름
              <input
                value={sheet}
                onChange={(e) => {
                  setSheet(e.target.value)
                  onEdit()
                }}
              />
            </label>
            <div className="work-row">
              <label>
                엑셀의 과목 별칭
                <input value={alias} onChange={(e) => setAlias(e.target.value)} />
              </label>
              <label>
                연결할 과목
                <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">과목 선택</option>
                  {subjects.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!alias.trim() || !subject}
                onClick={() => {
                  setAliases({ ...aliases, [alias.trim()]: Number(subject) })
                  setAlias('')
                  onEdit()
                }}
              >
                별칭 적용
              </button>
            </div>
            {Object.entries(aliases).map(([name, id]) => (
              <div className="work-row" key={name}>
                <span>
                  {name} → {subjects.data?.find((s) => s.id === id)?.name ?? id}
                </span>
                <button
                  type="button"
                  aria-label={name + ' 별칭 삭제'}
                  onClick={() => {
                    const next = { ...aliases }
                    delete next[name]
                    setAliases(next)
                    onEdit()
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
          </details>
          <button className="work-primary" disabled={!file}>
            시수표 검증
          </button>
        </fieldset>
      </form>
      {children}
    </section>
  )
}
