import { useState } from 'react'
import { Actions, Dialog, Icon } from '@/pages/home/HomePanels'

export function WorkspaceNavigation({ items, currentView, navigate, onLogout, id }) {
  return (
    <>
      <nav id={id} aria-label="업무 메뉴">
        <Actions
          items={items.map((item) => ({
            ...item,
            current: item.view === currentView,
            run: () => navigate(item.view),
          }))}
        />
        <a className="desk-line-button" href="/guide">사용 가이드</a>
      </nav>
      <button className="desk-logout" onClick={onLogout}>
        <Icon name="logout" /> 로그아웃
      </button>
    </>
  )
}

export function MenuToggle({ expanded, onToggle, drawer = false }) {
  const label = expanded ? '업무 메뉴 닫기' : '업무 메뉴 열기'
  return (
    <button
      type="button"
      className="desk-icon"
      aria-label={label}
      title={label}
      aria-expanded={expanded}
      aria-controls={drawer && !expanded ? undefined : 'desk-work-menu'}
      aria-haspopup={drawer ? 'dialog' : undefined}
      onClick={onToggle}
    >
      <Icon name="menu" />
    </button>
  )
}

export function MobileNavigation({ navigate, ...props }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <MenuToggle expanded={open} onToggle={() => setOpen((visible) => !visible)} drawer />
      {open && (
        <Dialog title="업무 메뉴" drawer onClose={() => setOpen(false)}>
          <WorkspaceNavigation
            id="desk-work-menu"
            {...props}
            navigate={(view) => {
              setOpen(false)
              navigate(view)
            }}
          />
        </Dialog>
      )}
    </>
  )
}
