import { Menu, Plus } from 'lucide-react'
import './TopBar.css'

interface TopBarProps {
  title: string
  onMenuToggle: () => void
  onQuickCapture?: () => void
}

export function TopBar({ title, onMenuToggle, onQuickCapture }: TopBarProps) {
  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          className="btn btn-icon btn-ghost topbar-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation"
          id="topbar-menu-toggle"
        >
          <Menu size={20} />
        </button>
        <span className="topbar-title">{title}</span>
      </div>

      <div className="topbar-right">
        {onQuickCapture && (
          <button
            className="btn btn-primary btn-sm"
            onClick={onQuickCapture}
            id="quick-capture-btn"
            aria-label="Quick capture — add a new task"
          >
            <Plus size={16} />
            <span className="topbar-capture-label">New Task</span>
          </button>
        )}
      </div>
    </header>
  )
}
