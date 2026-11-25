import type { KeyboardEvent, ReactNode } from 'react'
import './detail-page.css'

export function DetailHeading({
  title,
  context,
  children,
}: {
  title: string
  context?: string
  children?: ReactNode
}) {
  return (
    <header className="desk-title detail-heading">
      <div>
        {context && <p>{context}</p>}
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  )
}

export function TableScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="detail-table-scroll show-scrollbar"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {children}
    </div>
  )
}

export function DetailTabs({
  label,
  items,
  value,
  onChange,
  counts,
  panelId,
}: {
  label: string
  items: readonly string[]
  value: string
  onChange: (next: string) => void
  counts?: Record<string, number>
  panelId: string
}) {
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    switch (event.key) {
      case 'ArrowRight':
        next = (index + 1) % items.length
        break
      case 'ArrowLeft':
        next = (index - 1 + items.length) % items.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = items.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus()
    onChange(items[next])
  }
  return (
    <div className="detail-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-controls={panelId}
          id={panelId + '-' + index}
          aria-selected={item === value}
          tabIndex={item === value ? 0 : -1}
          onClick={() => onChange(item)}
          onKeyDown={(event) => move(event, index)}
        >
          {item}
          {counts && <span>{counts[item]}</span>}
        </button>
      ))}
    </div>
  )
}
