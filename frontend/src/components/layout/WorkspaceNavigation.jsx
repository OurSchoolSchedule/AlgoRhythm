import { useState } from 'react'
import { Actions, Dialog, Icon } from '@/pages/home/HomePanels'

export function WorkspaceNavigation({ items, currentView, navigate, onLogout }) {
  return (
    <>
      <nav aria-label="업무 메뉴">
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

export function MobileNavigation({ navigate, ...props }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="desk-icon desk-menu-trigger"
        aria-label="업무 메뉴 열기"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </button>
      {open && (
        <Dialog title="업무 메뉴" drawer onClose={() => setOpen(false)}>
          <WorkspaceNavigation
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
