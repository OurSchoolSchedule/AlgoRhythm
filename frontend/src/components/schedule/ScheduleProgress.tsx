import { useEffect, useState, useSyncExternalStore } from 'react'
import chick from '@/assets/upload-chick.webp?no-inline'
import { loadingPresentation, type ScheduleProgress as Progress } from '@/utils/scheduleProgress'

const query = '(prefers-reduced-motion: reduce)'
function subscribe(update: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
}

function elapsedLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  return minutes ? `${minutes}분 ${seconds % 60}초` : `${seconds}초`
}

function ElapsedTime({ requestedAt }: { requestedAt: number }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  return (
    <span role="timer" aria-label="요청 후 경과 시간">
      {elapsedLabel(now - requestedAt)}
    </span>
  )
}

export default function ScheduleProgress({
  progress,
  requestedAt,
}: {
  progress: Progress
  requestedAt?: number
}) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
  const { label, bar, mascot } = loadingPresentation(progress, reduced)
  const estimated = progress.phase === 'running' && bar.kind === 'determinate'
  return (
    <div className="work-progress">
      <div role="status">
        {label}
        {progress.phase === 'finished' && progress.outcome === 'READY' && ' · 100%'}
      </div>
      {mascot && (
        <div className="work-track" data-motion={mascot.motion}>
          <img src={chick} alt="" width="46" height="46" />
          {bar.kind !== 'none' && (
            <div
              className="work-rail"
              role="progressbar"
              aria-label={estimated ? '탐색 제한 시간 기준 예상 진행률' : label}
              aria-valuenow={bar.kind === 'determinate' ? bar.percent : undefined}
            >
              <i
                style={bar.kind === 'determinate' ? { width: bar.percent + '%' } : undefined}
                data-mode={bar.kind}
              />
            </div>
          )}
          {(requestedAt !== undefined || bar.kind === 'determinate') && (
            <span className="work-progress-metrics">
              {requestedAt !== undefined && <ElapsedTime requestedAt={requestedAt} />}
              {requestedAt !== undefined && bar.kind === 'determinate' && ' · '}
              {bar.kind === 'determinate' && `${estimated ? '예상 ' : ''}${bar.percent}%`}
            </span>
          )}
        </div>
      )}
      {estimated && <small>예상 진행률은 탐색 제한 시간을 기준으로 계산합니다.</small>}
    </div>
  )
}
