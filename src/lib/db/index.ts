import { openDB, type IDBPDatabase } from 'idb'
import type { Task, Commitment, ScheduledBlock, AppSettings } from '@/types'
import { DEFAULT_SETTINGS } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

export interface NexusDB {
  tasks: {
    key: string
    value: Task
    indexes: { 'by-status': string; 'by-due-date': string; 'by-priority': string }
  }
  commitments: {
    key: string
    value: Commitment
  }
  scheduledBlocks: {
    key: string
    value: ScheduledBlock
    indexes: { 'by-date': string }
  }
  settings: {
    key: string
    value: { id: string; data: AppSettings }
  }
}

const DB_NAME = 'nexus-db'
const DB_VERSION = 1
const SETTINGS_KEY = 'app-settings'

// ─── Singleton connection ──────────────────────────────────────────────────────

let dbPromise: Promise<IDBPDatabase<NexusDB>> | null = null

export function getDB(): Promise<IDBPDatabase<NexusDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NexusDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Tasks store
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' })
        taskStore.createIndex('by-status', 'status')
        taskStore.createIndex('by-due-date', 'dueDate')
        taskStore.createIndex('by-priority', 'priority')

        // Commitments store
        db.createObjectStore('commitments', { keyPath: 'id' })

        // Scheduled blocks store
        const blockStore = db.createObjectStore('scheduledBlocks', { keyPath: 'id' })
        blockStore.createIndex('by-date', 'date')

        // Settings store
        db.createObjectStore('settings', { keyPath: 'id' })
      }
    })
  }
  return dbPromise
}

/** For tests only — reset the singleton so tests get a fresh DB */
export function _resetDBForTesting() {
  dbPromise = null
}

// ─── Task CRUD ────────────────────────────────────────────────────────────────

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB()
  return db.getAll('tasks')
}

export async function getTask(id: string): Promise<Task | undefined> {
  const db = await getDB()
  return db.get('tasks', id)
}

export async function putTask(task: Task): Promise<void> {
  const db = await getDB()
  await db.put('tasks', task)
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tasks', id)
}

export async function getTasksByStatus(status: Task['status']): Promise<Task[]> {
  const db = await getDB()
  return db.getAllFromIndex('tasks', 'by-status', status)
}

// ─── Commitment CRUD ──────────────────────────────────────────────────────────

export async function getAllCommitments(): Promise<Commitment[]> {
  const db = await getDB()
  return db.getAll('commitments')
}

export async function putCommitment(c: Commitment): Promise<void> {
  const db = await getDB()
  await db.put('commitments', c)
}

export async function deleteCommitment(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('commitments', id)
}

// ─── Scheduled blocks CRUD ───────────────────────────────────────────────────

export async function getAllScheduledBlocks(): Promise<ScheduledBlock[]> {
  const db = await getDB()
  return db.getAll('scheduledBlocks')
}

export async function getBlocksByDate(date: string): Promise<ScheduledBlock[]> {
  const db = await getDB()
  return db.getAllFromIndex('scheduledBlocks', 'by-date', date)
}

export async function putScheduledBlock(block: ScheduledBlock): Promise<void> {
  const db = await getDB()
  await db.put('scheduledBlocks', block)
}

export async function putScheduledBlocks(blocks: ScheduledBlock[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('scheduledBlocks', 'readwrite')
  await Promise.all(blocks.map(b => tx.store.put(b)))
  await tx.done
}

export async function deleteScheduledBlock(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('scheduledBlocks', id)
}

export async function clearScheduledBlocks(): Promise<void> {
  const db = await getDB()
  await db.clear('scheduledBlocks')
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const record = await db.get('settings', SETTINGS_KEY)
  return record?.data ?? DEFAULT_SETTINGS
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { id: SETTINGS_KEY, data: settings })
}

// ─── Bulk import (replace all) ────────────────────────────────────────────────

export async function importAll(data: {
  tasks: Task[]
  commitments: Commitment[]
  scheduledBlocks: ScheduledBlock[]
  settings: AppSettings
}): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['tasks', 'commitments', 'scheduledBlocks', 'settings'], 'readwrite')
  await tx.objectStore('tasks').clear()
  await tx.objectStore('commitments').clear()
  await tx.objectStore('scheduledBlocks').clear()
  await tx.objectStore('settings').clear()
  await Promise.all([
    ...data.tasks.map(t => tx.objectStore('tasks').put(t)),
    ...data.commitments.map(c => tx.objectStore('commitments').put(c)),
    ...data.scheduledBlocks.map(b => tx.objectStore('scheduledBlocks').put(b)),
    tx.objectStore('settings').put({ id: SETTINGS_KEY, data: data.settings })
  ])
  await tx.done
}

// ─── Full export ──────────────────────────────────────────────────────────────

export async function exportAll() {
  const [tasks, commitments, scheduledBlocks, settings] = await Promise.all([
    getAllTasks(),
    getAllCommitments(),
    getAllScheduledBlocks(),
    getSettings()
  ])
  return { tasks, commitments, scheduledBlocks, settings }
}
