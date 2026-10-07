/**
 * 공통 불러오기 오류 행.
 * 문구는 「불러오지 못했어요」로 통일한다.
 */
export default function LoadError({ onRetry, className = '' }) {
  return (
    <div className={`load-error${className ? ` ${className}` : ''}`} role="alert">
      <span className="load-error-mark" aria-hidden="true">!</span>
      <span>불러오지 못했어요</span>
      {typeof onRetry === 'function' ? (
        <button type="button" className="home-text-button home-accent" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  )
}
