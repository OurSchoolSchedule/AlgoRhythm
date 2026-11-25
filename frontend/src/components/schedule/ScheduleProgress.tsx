import { useSyncExternalStore } from 'react'
import chick from '@/assets/upload-chick.webp?no-inline'
import { loadingPresentation, type ScheduleProgress as Progress } from '@/utils/scheduleProgress'

const query = '(prefers-reduced-motion: reduce)'
function subscribe(update: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
}
export default function ScheduleProgress({ progress }: { progress: Progress }) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
  const { label, bar, mascot } = loadingPresentation(progress, reduced)
  return (
    <div className="work-progress">
      <div role="status">
        {label}
        {bar.kind === 'determinate' && ` · ${bar.percent}%`}
      </div>
      {mascot && (
        <div className="work-track" data-motion={mascot.motion} aria-hidden="true">
          <img src={chick} alt="" width="46" height="46" />
          {bar.kind !== 'none' && (
            <div className="work-rail">
              <i
                style={bar.kind === 'determinate' ? { width: bar.percent + '%' } : undefined}
                data-mode={bar.kind}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
