import type { TaskPriority, TaskStatus } from '@/types'

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  'in-progress': 'In progress',
  done: 'Done',
  archived: 'Archived'
}

interface PriorityBadgeProps { priority: TaskPriority }
interface StatusBadgeProps  { status: TaskStatus }

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`badge badge-priority-${priority}`} aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`badge badge-status-${status}`}
      aria-label={`Status: ${STATUS_LABELS[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
