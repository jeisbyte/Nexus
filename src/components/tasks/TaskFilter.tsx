import type { TaskFilters } from '@/hooks/useTaskStore'
import type { TaskStatus, TaskPriority } from '@/types'
import { Search, X } from 'lucide-react'
import './TaskFilter.css'

interface TaskFilterProps {
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
  categories: string[]
}

const STATUSES: Array<{ value: TaskStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To do' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'archived', label: 'Archived' },
]

const PRIORITIES: Array<{ value: TaskPriority | 'all'; label: string }> = [
  { value: 'all', label: 'All priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export function TaskFilter({ filters, onChange, categories }: TaskFilterProps) {
  const hasActiveFilters =
    (filters.status && filters.status !== 'all') ||
    (filters.priority && filters.priority !== 'all') ||
    (filters.category && filters.category !== 'all') ||
    filters.search

  return (
    <div className="task-filter">
      {/* Search */}
      <div className="task-filter-search">
        <Search size={16} className="task-filter-search-icon" />
        <input
          id="task-search"
          className="form-input task-filter-search-input"
          type="search"
          placeholder="Search tasks…"
          value={filters.search ?? ''}
          onChange={e => onChange({ ...filters, search: e.target.value || undefined })}
          aria-label="Search tasks by title or description"
        />
      </div>

      {/* Status tabs */}
      <div className="task-filter-tabs" role="group" aria-label="Filter by status">
        {STATUSES.map(s => (
          <button
            key={s.value}
            className={`task-filter-tab${(filters.status ?? 'all') === s.value ? ' task-filter-tab--active' : ''}`}
            onClick={() => onChange({ ...filters, status: s.value })}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Priority + Category selects */}
      <div className="task-filter-selects">
        <select
          id="task-filter-priority"
          className="form-select"
          value={filters.priority ?? 'all'}
          onChange={e => onChange({ ...filters, priority: e.target.value as TaskPriority | 'all' })}
          aria-label="Filter by priority"
          style={{ width: 'auto', minWidth: 140 }}
        >
          {PRIORITIES.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {categories.length > 0 && (
          <select
            id="task-filter-category"
            className="form-select"
            value={filters.category ?? 'all'}
            onChange={e => onChange({ ...filters, category: e.target.value })}
            aria-label="Filter by category"
            style={{ width: 'auto', minWidth: 140 }}
          >
            <option value="all">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {hasActiveFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onChange({ status: 'all', priority: 'all', category: 'all', search: undefined })}
            aria-label="Clear all filters"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  )
}
