import { useEffect, useId, useState } from 'react'
import { canSelect, type SchoolOption } from '@/api/neisSchool'
import { useSchoolSearch } from '@/hooks/useNeisSchool'
import type { HomeSession } from '@/hooks/useHomeSession'
import './neisSchool.css'

const offices = [
  ['B10', '서울'],
  ['C10', '부산'],
  ['D10', '대구'],
  ['E10', '인천'],
  ['F10', '광주'],
  ['G10', '대전'],
  ['H10', '울산'],
  ['I10', '세종'],
  ['J10', '경기'],
  ['K10', '강원'],
  ['M10', '충북'],
  ['N10', '충남'],
  ['P10', '전북'],
  ['Q10', '전남'],
  ['R10', '경북'],
  ['S10', '경남'],
  ['T10', '제주'],
]
const kinds = ['초등학교', '중학교', '고등학교', '특수학교', '각종학교']
type Props = {
  session: HomeSession
  value: SchoolOption | null
  onChange: (option: SchoolOption | null) => void
}

export default function SchoolPicker({ session, value, onChange }: Props) {
  const group = useId()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [office, setOffice] = useState('')
  const [kind, setKind] = useState('')
  const [page, setPage] = useState(1)
  const q = query.trim()
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q), 300)
    return () => clearTimeout(timer)
  }, [q])
  const ready = q.length >= 2 && debounced === q
  const result = useSchoolSearch(
    session,
    {
      q: debounced,
      officeCode: office || undefined,
      schoolKind: kind || undefined,
      page,
    },
    ready,
  )
  const pageData = ready && !result.isError ? result.data : undefined
  function changed() {
    onChange(null)
    setPage(1)
  }
  return (
    <fieldset className="neis-picker">
      <legend>나이스 학교 검색</legend>
      <label>
        학교명
        <input
          type="search"
          value={query}
          placeholder="두 글자 이상 입력"
          maxLength={100}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.preventDefault()
          }}
          onChange={(event) => {
            changed()
            setQuery(event.target.value)
          }}
        />
      </label>
      <div className="neis-filters">
        <label>
          교육청
          <select
            aria-label="교육청"
            value={office}
            onChange={(event) => {
              changed()
              setOffice(event.target.value)
            }}
          >
            <option value="">전체 교육청</option>
            {offices.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          학교급
          <select
            aria-label="학교급"
            value={kind}
            onChange={(event) => {
              changed()
              setKind(event.target.value)
            }}
          >
            <option value="">전체 학교급</option>
            {kinds.map((label) => (
              <option key={label}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      {q.length >= 2 && (!ready || result.isLoading) && (
        <p role="status">검색 중…</p>
      )}
      {ready && result.isError && (
        <div role="alert">
          학교를 검색하지 못했습니다.{' '}
          <button type="button" onClick={() => result.refetch()}>
            다시 검색
          </button>
        </div>
      )}
      {pageData && (
        <>
          <p role="status">
            {pageData.items.length
              ? `검색 결과 ${pageData.totalCount}건 · ${pageData.page}페이지`
              : '검색 결과가 없습니다.'}
          </p>
          {pageData.items.map((option, index) => (
            <label
              className="neis-option"
              key={`${option.officeCode}-${option.standardSchoolCode}-${index}`}
            >
              <input
                type="radio"
                name={group}
                disabled={!canSelect(option)}
                checked={
                  canSelect(option) &&
                  value?.officeCode === option.officeCode &&
                  value?.standardSchoolCode === option.standardSchoolCode
                }
                onChange={() => onChange(option)}
              />
              <span>
                <strong>{option.schoolName || '이름 미제공'}</strong>
                <small>
                  {[option.officeName, option.schoolKind]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
                <small>{option.address || '주소 미제공'}</small>
                {!canSelect(option) && <small>코드 미확인 · 선택 불가</small>}
              </span>
            </label>
          ))}
          {(page > 1 || pageData.hasNext) && (
            <div className="neis-actions">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => {
                  onChange(null)
                  setPage(page - 1)
                }}
              >
                이전 페이지
              </button>
              <button
                type="button"
                disabled={!pageData.hasNext}
                onClick={() => {
                  onChange(null)
                  setPage(page + 1)
                }}
              >
                다음 페이지
              </button>
            </div>
          )}
        </>
      )}
    </fieldset>
  )
}
