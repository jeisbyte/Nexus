import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  Brain,
  Settings,
  Zap,
  X
} from 'lucide-react'
import './Sidebar.css'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks',   icon: CheckSquare,     label: 'Tasks' },
  { to: '/planner', icon: Calendar,        label: 'Planner' },
  { to: '/coach',   icon: Brain,           label: 'Coach' },
  { to: '/settings',icon: Settings,        label: 'Settings' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden />}

      <aside className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Primary navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} />
          </div>
          <span className="sidebar-logo-text">Nexus</span>
          {/* Mobile close button */}
          <button
            className="sidebar-close btn btn-icon btn-ghost"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="sidebar-nav-list" role="list">
            {navItems.map(item => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`
                  }
                  onClick={onClose}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p className="sidebar-version">Nexus v0.1</p>
          <p className="sidebar-version">Milestone 1</p>
        </div>
      </aside>
    </>
  )
}
