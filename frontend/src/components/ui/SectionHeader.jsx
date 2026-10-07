/**
 * 공통 섹션 헤더: 제목 16/600 + 우측 메타/액션 + 아래 1px border-subtle.
 */
export default function SectionHeader({ title, meta, action, onAction, actionLabel = '전체 보기' }) {
  return (
    <div className="section-header">
      <div className="section-header-title-wrap">
        <h2 className="section-header-title">{title}</h2>
        {meta != null && meta !== '' ? <span className="section-header-meta">{meta}</span> : null}
      </div>
      {action != null ? (
        action
      ) : onAction ? (
        <button type="button" className="section-header-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
