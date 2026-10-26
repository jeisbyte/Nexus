import { useState } from 'react'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { Clock, Calendar, Pencil, Trash2, CheckCircle2, Circle } from 'lucide-react'
import type { Task } from '@/types'
import { PriorityBadge, StatusBadge } from '@/components/common/Badge'
import './TaskCard.css'

interface TaskCardProps {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
}

export function TaskCard({ task, onEdit, onDelete, onComplete }: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isDone = task.status === 'done'
  const isOverdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isDone
  const isDueToday = task.dueDate && isToday(parseISO(task.dueDate)) && !isDone

  function handleDelete() {
    if (confirmDelete) {
      onDelete(task.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <article
      className={`task-card${isDone ? ' task-card--done' : ''}${isOverdue ? ' task-card--overdue' : ''}`}
      aria-label={`Task: ${task.title}`}
    >
      <div className="task-card-left">
        <button
          className={`task-card-check${isDone ? ' task-card-check--done' : ''}`}
          onClick={() => !isDone && onComplete(task.id)}
          aria-label={isDone ? 'Task completed' : 'Mark as complete'}
          disabled={isDone}
        >
          {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </button>
      </div>

      <div className="task-card-body">
        <div className="task-card-top">
          <span className={`task-card-title${isDone ? ' task-card-title--done' : ''}`}>
            {task.title}
          </span>
          <div className="task-card-badges">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
          </div>
        </div>

        {task.description && (
          <p className="task-card-desc">{task.description}</p>
        )}

        <div className="task-card-meta">
          {task.dueDate && (
            <span className={`task-card-meta-item${isOverdue ? ' task-card-meta-item--danger' : isDueToday ? ' task-card-meta-item--warning' : ''}`}>
              <Calendar size={13} />
              {isOverdue ? 'Overdue: ' : isDueToday ? 'Due today: ' : ''}
              {format(parseISO(task.dueDate), 'MMM d, yyyy')}
            </span>
          )}
          {task.estimatedMinutes && (
            <span className="task-card-meta-item">
              <Clock size={13} />
              {task.estimatedMinutes >= 60
                ? `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60 ? `${task.estimatedMinutes % 60}m` : ''}`
                : `${task.estimatedMinutes}m`}
            </span>
          )}
          {task.category && (
            <span className="task-card-category">{task.category}</span>
          )}
        </div>
      </div>

      <div className="task-card-actions">
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          <Pencil size={15} />
        </button>
        <button
          className={`btn btn-icon btn-sm${confirmDelete ? ' btn-danger' : ' btn-ghost'}`}
          onClick={handleDelete}
          aria-label={confirmDelete ? 'Confirm delete' : 'Delete task'}
          title={confirmDelete ? 'Click again to confirm deletion' : 'Delete task'}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  )
}
