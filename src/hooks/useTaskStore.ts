import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Task, TaskStatus, TaskPriority } from '@/types'
import {
  getAllTasks,
  putTask,
  deleteTask as dbDeleteTask
} from '@/lib/db'
import type { TaskFormData } from '@/lib/validation/schemas'

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface TaskFilters {
  status?: TaskStatus | 'all'
  priority?: TaskPriority | 'all'
  category?: string | 'all'
  dueDateRange?: { from: string; to: string }
  search?: string
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all tasks from IndexedDB on mount
  useEffect(() => {
    getAllTasks()
      .then(setTasks)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const refresh = useCallback(async () => {
    try {
      const all = await getAllTasks()
      setTasks(all)
    } catch (e) {
      setError(String(e))
    }
  }, [])

  const createTask = useCallback(async (data: TaskFormData): Promise<Task> => {
    const now = new Date().toISOString()
    const task: Task = {
      id: uuidv4(),
      ...data,
      dueDate: data.dueDate || undefined,
      status: data.status,
      priority: data.priority,
      createdAt: now,
      updatedAt: now
    }
    await putTask(task)
    setTasks(prev => [...prev, task])
    return task
  }, [])

  const updateTask = useCallback(async (id: string, data: Partial<TaskFormData>): Promise<void> => {
    setTasks(prev => {
      const existing = prev.find(t => t.id === id)
      if (!existing) return prev
      const updated: Task = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString()
      }
      putTask(updated).catch(e => setError(String(e)))
      return prev.map(t => (t.id === id ? updated : t))
    })
  }, [])

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    await dbDeleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }, [])

  const completeTask = useCallback(async (id: string): Promise<void> => {
    await updateTask(id, { status: 'done' })
  }, [updateTask])

  const filterTasks = useCallback((filters: TaskFilters): Task[] => {
    return tasks.filter(task => {
      if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false
      if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) return false
      if (filters.category && filters.category !== 'all' && task.category !== filters.category) return false
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!task.title.toLowerCase().includes(q) && !task.description?.toLowerCase().includes(q)) return false
      }
      if (filters.dueDateRange) {
        if (!task.dueDate) return false
        if (task.dueDate < filters.dueDateRange.from) return false
        if (task.dueDate > filters.dueDateRange.to) return false
      }
      return true
    })
  }, [tasks])

  return { tasks, loading, error, createTask, updateTask, deleteTask, completeTask, filterTasks, refresh }
}
