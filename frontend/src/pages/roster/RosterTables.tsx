import { TableScroll } from '@/components/ui/DetailPage'
import type { Assignment, CellIssue, RosterEntry, RosterPreview } from '@/types/rosterImport'

const subjects = (a: Assignment) => a.subjects.map((s) => s.subjectName).join(', ') || '미배정'
const room = (a: Assignment) =>
  a.homeroomClass ? `${a.homeroomClass.grade}학년 ${a.homeroomClass.classNumber}반` : '없음'
const actionLabel = { ADD: '신규', UPDATE: '변경', UNCHANGED: '동일' }

function ChangedValue({ before, after }: { before?: string; after: string }) {
  return (
    <>
      {before !== undefined && before !== after && (
        <>
          <span className="ri-old">기존 {before}</span>
          <span className="desk-sr">변경 후 </span>
        </>
      )}
      {after}
    </>
  )
}

export function CellErrors({ errors }: { errors: CellIssue[] }) {
  if (!errors.length) return null
  return (
    <div className="ri-errors" role="alert">
      <h4>셀 오류 {errors.length}건</h4>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>
            <strong>
              {[e.sheet, e.cell || (e.row != null && `${e.row}행`)].filter(Boolean).join(' · ')}
            </strong>{' '}
            {e.message}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PreviewTable({ preview }: { preview: RosterPreview }) {
  const { counts, changes, errors } = preview
  return (
    <>
      <dl className="ri-counts">
        {(
          [
            ['신규', counts.add],
            ['변경', counts.update],
            ['동일 (중복)', counts.unchanged],
            ['셀 오류', counts.errors],
          ] as const
        ).map(([label, count]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{count}</dd>
          </div>
        ))}
      </dl>
      <CellErrors errors={errors} />
      {changes.length > 0 && (
        <TableScroll label="교사별 변경 미리보기">
          <table>
            <thead>
              <tr>
                {['구분', '교사 / 인증 이메일', '담당 과목', '담임 학급', '엑셀 행'].map((h) => (
                  <th key={h} scope="col">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {changes.map((c) => (
                <tr key={c.authEmail}>
                  <td>
                    <span className={'ri-action ri-' + c.action}>{actionLabel[c.action]}</span>
                  </td>
                  <td>
                    <ChangedValue before={c.before?.displayName} after={c.after.displayName} />
                    <small>{c.authEmail}</small>
                  </td>
                  <td>
                    <ChangedValue
                      before={c.before ? subjects(c.before.term) : undefined}
                      after={subjects(c.after)}
                    />
                  </td>
                  <td>
                    <ChangedValue
                      before={c.before ? room(c.before.term) : undefined}
                      after={room(c.after)}
                    />
                  </td>
                  <td>{c.rows.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      )}
    </>
  )
}

export function SavedRoster({ entries }: { entries: RosterEntry[] }) {
  if (!entries.length) return <p>이 학기에 등록된 교사가 없습니다.</p>
  return (
    <details className="ri-directory">
      <summary>등록된 교사 {entries.length}명 보기</summary>
      <TableScroll label="등록된 교사별 과목과 담임">
        <table>
          <thead>
            <tr>
              {['표시 이름', '인증 이메일', '담당 과목', '담임 학급'].map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.rosterId}>
                <td>{e.displayName}</td>
                <td>{e.authEmail}</td>
                <td>{subjects(e.term)}</td>
                <td>{room(e.term)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroll>
    </details>
  )
}
