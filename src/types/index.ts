// ─── Core enumerations ────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'in-progress' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface RecurrenceRule {
  frequency: RecurrenceFrequency
  /** Days of week for weekly recurrence (0=Sun … 6=Sat) */
  daysOfWeek?: number[]
  /** Day of month for monthly recurrence */
  dayOfMonth?: number
  /** ISO date string — stop generating instances after this date */
  endDate?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  /** ISO date string (date only: YYYY-MM-DD) */
  dueDate?: string
  /** Estimated work duration in minutes */
  estimatedMinutes?: number
  category?: string
  recurrence?: RecurrenceRule
  /** ISO datetime string */
  createdAt: string
  /** ISO datetime string */
  updatedAt: string
}

// ─── Weekly commitment (fixed recurring time block) ───────────────────────────

export interface Commitment {
  id: string
  title: string
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** "HH:mm" 24-hour format */
  startTime: string
  /** "HH:mm" 24-hour format */
  endTime: string
  category?: string
  color?: string
}

// ─── Scheduled block ──────────────────────────────────────────────────────────

export type ScheduledBlockType = 'commitment' | 'task-session' | 'break'

export interface ScheduledBlock {
  id: string
  taskId?: string
  commitmentId?: string
  /** ISO date string (YYYY-MM-DD) */
  date: string
  /** "HH:mm" */
  startTime: string
  /** "HH:mm" */
  endTime: string
  type: ScheduledBlockType
  label: string
  /** User has explicitly accepted this suggestion */
  isUserApproved: boolean
}

// ─── Scheduler output ─────────────────────────────────────────────────────────

export interface ScheduleWarning {
  date: string
  message: string
  taskIds: string[]
}

export interface ScheduleResult {
  blocks: ScheduledBlock[]
  warnings: ScheduleWarning[]
  explanations: string[]
}

// ─── Coach ────────────────────────────────────────────────────────────────────

export interface CoachAdvice {
  summary: string
  urgentItems: string[]
  warnings: string[]
  nextAction?: string
  recommendations: string[]
  generatedAt: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface WorkHours {
  /** "HH:mm" */
  start: string
  /** "HH:mm" */
  end: string
}

export interface AppSettings {
  /** Work-day start/end times used by scheduler */
  workHours: WorkHours
  /** Minimum break between sessions in minutes */
  minBreakMinutes: number
  /** Days scheduler considers as work days (0=Sun … 6=Sat) */
  workDays: number[]
  /** Maximum daily scheduled work in minutes */
  maxDailyWorkMinutes: number
  /** ISO datetime of last export */
  lastExportAt?: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  workHours: { start: '08:00', end: '22:00' },
  minBreakMinutes: 15,
  workDays: [1, 2, 3, 4, 5],
  maxDailyWorkMinutes: 480, // 8 hours
}

// ─── Export / import envelope ─────────────────────────────────────────────────

export interface ExportEnvelope {
  version: 1
  exportedAt: string
  tasks: Task[]
  commitments: Commitment[]
  scheduledBlocks: ScheduledBlock[]
  settings: AppSettings
}
