import { useState } from 'react'
import type { Task } from '@/types'
import { TaskFormSchema, type TaskFormData } from '@/lib/validation/schemas'
import { Modal } from '@/components/common/Modal'

interface TaskFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TaskFormData) => Promise<void>
  initialData?: Task
  title?: string
}

const CATEGORY_OPTIONS = [
  'University', 'Assignment', 'Project', 'Research',
  'YouTube', 'Cybersecurity', 'Language', 'Personal', 'Other'
]

const emptyForm = (): TaskFormData => ({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  estimatedMinutes: undefined,
  category: '',
  recurrence: undefined
})

export function TaskForm({ isOpen, onClose, onSubmit, initialData, title = 'New Task' }: TaskFormProps) {
  const [form, setForm] = useState<TaskFormData>(() =>
    initialData
      ? {
          title: initialData.title,
          description: initialData.description ?? '',
          status: initialData.status,
          priority: initialData.priority,
          dueDate: initialData.dueDate ?? '',
          estimatedMinutes: initialData.estimatedMinutes,
          category: initialData.category ?? '',
          recurrence: initialData.recurrence
        }
      : emptyForm()
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setErrors(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = TaskFormSchema.safeParse(form)
    if (!result.success) {
      const newErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string
        newErrors[key] = issue.message
      }
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(result.data)
      setForm(emptyForm())
      setErrors({})
      onClose()
    } catch (err) {
      setErrors({ _form: String(err) })
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setForm(emptyForm())
    setErrors({})
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            form="task-form"
            className="btn btn-primary"
            disabled={submitting}
            id="task-form-submit"
          >
            {submitting ? 'Saving…' : initialData ? 'Save Changes' : 'Create Task'}
          </button>
        </>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {errors._form && (
            <div className="alert alert-danger" role="alert">{errors._form}</div>
          )}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="task-title" className="form-label">Title <span aria-hidden>*</span></label>
            <input
              id="task-title"
              className="form-input"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
              autoFocus
              aria-describedby={errors.title ? 'task-title-error' : undefined}
            />
            {errors.title && <span id="task-title-error" className="form-error" role="alert">{errors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="task-description" className="form-label">Description (optional)</label>
            <textarea
              id="task-description"
              className="form-textarea"
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Additional context or notes…"
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Status + Priority row */}
          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="task-status" className="form-label">Status</label>
              <select
                id="task-status"
                className="form-select"
                value={form.status}
                onChange={e => set('status', e.target.value as TaskFormData['status'])}
              >
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-priority" className="form-label">Priority</label>
              <select
                id="task-priority"
                className="form-select"
                value={form.priority}
                onChange={e => set('priority', e.target.value as TaskFormData['priority'])}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Due date + Duration row */}
          <div className="grid-2">
            <div className="form-group">
              <label htmlFor="task-due-date" className="form-label">Due date</label>
              <input
                id="task-due-date"
                className="form-input"
                type="date"
                value={form.dueDate ?? ''}
                onChange={e => set('dueDate', e.target.value)}
                aria-describedby={errors.dueDate ? 'task-due-error' : undefined}
              />
              {errors.dueDate && <span id="task-due-error" className="form-error">{errors.dueDate}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="task-duration" className="form-label">Estimated duration (min)</label>
              <input
                id="task-duration"
                className="form-input"
                type="number"
                min={1}
                max={1440}
                value={form.estimatedMinutes ?? ''}
                onChange={e => set('estimatedMinutes', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 60"
                aria-describedby={errors.estimatedMinutes ? 'task-dur-error' : undefined}
              />
              {errors.estimatedMinutes && <span id="task-dur-error" className="form-error">{errors.estimatedMinutes}</span>}
            </div>
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="task-category" className="form-label">Category (optional)</label>
            <select
              id="task-category"
              className="form-select"
              value={form.category ?? ''}
              onChange={e => set('category', e.target.value || undefined)}
            >
              <option value="">— No category —</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

        </div>
      </form>
    </Modal>
  )
}
