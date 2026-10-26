/**
 * Nexus Scheduling Engine — deterministic, rule-based, transparent.
 *
 * This module contains only pure functions. No side effects, no network calls,
 * no randomness. Every decision is traceable through the returned explanations
 * and warnings.
 *
 * Algorithm summary (documented here so users can understand recommendations):
 *  1. Build a map of occupied time ranges per day from commitments.
 *  2. Score and sort unscheduled tasks by urgency = priorityWeight / (daysUntilDue + 1).
 *  3. For each work day in the planning window, fit task sessions into free slots
 *     using a first-fit strategy, inserting mandatory breaks between sessions.
 *  4. Tasks that cannot be scheduled before their due date generate warnings.
 *  5. Days where total scheduled work exceeds maxDailyWorkMinutes generate warnings
 *     rather than silently over-booking the user.
 */

import {
  parseISO,
  format,
  addDays,
  differenceInCalendarDays,
  isWeekend,
  startOfDay
} from 'date-fns'
import type { Task, Commitment, ScheduledBlock, AppSettings, ScheduleWarning } from '@/types'

// ─── Internal types ───────────────────────────────────────────────────────────

interface TimeRange {
  startMinutes: number
  endMinutes: number
  label: string
}

interface DaySlot {
  date: string
  freeRanges: TimeRange[]
  occupiedRanges: TimeRange[]
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Convert "HH:mm" to minutes since midnight */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Convert minutes since midnight to "HH:mm" */
export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Priority numeric weight (higher = more urgent) */
export function priorityWeight(p: Task['priority']): number {
  return { low: 1, medium: 2, high: 4, urgent: 8 }[p]
}

/** Urgency score used for sorting tasks before scheduling */
export function urgencyScore(task: Task, today: Date): number {
  const weight = priorityWeight(task.priority)
  if (!task.dueDate) return weight * 0.5
  const daysLeft = differenceInCalendarDays(parseISO(task.dueDate), startOfDay(today))
  if (daysLeft < 0) return weight * 100 // overdue — highest urgency
  return weight / (daysLeft + 1)
}

/** Total duration of a commitment block in minutes */
export function commitmentDurationMinutes(c: Commitment): number {
  return timeToMinutes(c.endTime) - timeToMinutes(c.startTime)
}

// ─── Free slot computation ────────────────────────────────────────────────────

/**
 * Given a list of occupied ranges within a work window, return the free ranges
 * (gaps between occupied blocks, respecting work-hour boundaries).
 */
export function computeFreeRanges(
  workStart: number,
  workEnd: number,
  occupied: TimeRange[]
): TimeRange[] {
  // Sort occupied by start
  const sorted = [...occupied].sort((a, b) => a.startMinutes - b.startMinutes)

  const free: TimeRange[] = []
  let cursor = workStart

  for (const block of sorted) {
    if (block.startMinutes > cursor) {
      free.push({ startMinutes: cursor, endMinutes: block.startMinutes, label: 'free' })
    }
    cursor = Math.max(cursor, block.endMinutes)
  }

  if (cursor < workEnd) {
    free.push({ startMinutes: cursor, endMinutes: workEnd, label: 'free' })
  }

  return free
}

// ─── Scheduling algorithm ─────────────────────────────────────────────────────

export interface ScheduleInput {
  tasks: Task[]
  commitments: Commitment[]
  settings: AppSettings
  /** ISO date string — first day of planning window */
  fromDate: string
  /** Number of days to plan ahead */
  planDays: number
}

export interface ScheduleOutput {
  blocks: ScheduledBlock[]
  warnings: ScheduleWarning[]
  explanations: string[]
}

export function runScheduler(input: ScheduleInput): ScheduleOutput {
  const { tasks, commitments, settings, fromDate, planDays } = input
  const from = parseISO(fromDate)
  const workStartMin = timeToMinutes(settings.workHours.start)
  const workEndMin = timeToMinutes(settings.workHours.end)
  const breakMin = settings.minBreakMinutes

  const blocks: ScheduledBlock[] = []
  const warnings: ScheduleWarning[] = []
  const explanations: string[] = []

  // Only schedule tasks that are not done or archived
  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'archived')
  const today = startOfDay(from)

  // Sort tasks by urgency score (descending — most urgent first)
  const sorted = [...activeTasks].sort((a, b) => urgencyScore(b, today) - urgencyScore(a, today))

  // Track remaining minutes per task
  const remainingMinutes = new Map<string, number>(
    sorted.map(t => [t.id, t.estimatedMinutes ?? 60])
  )

  // Build per-day commitment slots
  const days: DaySlot[] = []
  for (let i = 0; i < planDays; i++) {
    const date = addDays(from, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dow = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6

    const dayCommitments = commitments.filter(c => c.dayOfWeek === dow)
    const occupied: TimeRange[] = dayCommitments.map(c => ({
      startMinutes: timeToMinutes(c.startTime),
      endMinutes: timeToMinutes(c.endTime),
      label: c.title
    }))

    // Add commitment blocks to output immediately
    for (const c of dayCommitments) {
      blocks.push({
        id: `commitment-${c.id}-${dateStr}`,
        commitmentId: c.id,
        date: dateStr,
        startTime: c.startTime,
        endTime: c.endTime,
        type: 'commitment',
        label: c.title,
        isUserApproved: true
      })
    }

    const freeRanges = computeFreeRanges(workStartMin, workEndMin, occupied)
    days.push({ date: dateStr, freeRanges, occupiedRanges: occupied })
  }

  // ── First-fit scheduling ──────────────────────────────────────────────────
  // For each task (in urgency order), try to place sessions across work days.
  for (const task of sorted) {
    let remaining = remainingMinutes.get(task.id) ?? 0
    if (remaining <= 0) continue

    const taskDueDate = task.dueDate ? parseISO(task.dueDate) : null
    const tasksScheduledOnDays = new Set<string>()

    for (const day of days) {
      if (remaining <= 0) break

      // Don't schedule past due date
      if (taskDueDate && parseISO(day.date) > taskDueDate) break

      // Respect work days setting
      const dow = parseISO(day.date).getDay()
      if (!settings.workDays.includes(dow)) continue

      for (let ri = 0; ri < day.freeRanges.length; ri++) {
        if (remaining <= 0) break
        const slot = day.freeRanges[ri]
        const slotDuration = slot.endMinutes - slot.startMinutes

        // Need at least breakMin of entry room
        if (slotDuration < breakMin + 1) continue

        // Usable slot duration (leave room for break after session unless last block)
        const usable = Math.min(remaining, slotDuration - (ri < day.freeRanges.length - 1 ? breakMin : 0))
        if (usable <= 0) continue

        // Cap session length at 2 hours for focus
        const sessionMinutes = Math.min(usable, 120)

        const blockId = `task-${task.id}-${day.date}-${slot.startMinutes}`
        blocks.push({
          id: blockId,
          taskId: task.id,
          date: day.date,
          startTime: minutesToTime(slot.startMinutes),
          endTime: minutesToTime(slot.startMinutes + sessionMinutes),
          type: 'task-session',
          label: task.title,
          isUserApproved: false
        })

        tasksScheduledOnDays.add(day.date)
        remaining -= sessionMinutes

        // Shrink free range to account for session + break
        const consumed = sessionMinutes + (remaining > 0 ? breakMin : 0)
        slot.startMinutes += consumed
      }
    }

    // Warn if task still has unscheduled time
    if (remaining > 0) {
      const msg = task.dueDate
        ? `"${task.title}" cannot be fully scheduled before its due date (${task.dueDate}). ${remaining} min unscheduled.`
        : `"${task.title}" could not be fully scheduled in the planning window. ${remaining} min unscheduled.`
      warnings.push({ date: fromDate, message: msg, taskIds: [task.id] })
      explanations.push(`⚠ ${msg}`)
    } else if (task.estimatedMinutes) {
      explanations.push(`✓ "${task.title}" scheduled across ${tasksScheduledOnDays.size} day(s).`)
    }
  }

  // ── Overload detection ────────────────────────────────────────────────────
  for (const day of days) {
    const dayBlocks = blocks.filter(b => b.date === day.date && b.type === 'task-session')
    const totalScheduled = dayBlocks.reduce((sum, b) => {
      return sum + timeToMinutes(b.endTime) - timeToMinutes(b.startTime)
    }, 0)

    if (totalScheduled > settings.maxDailyWorkMinutes) {
      const hrs = Math.round(totalScheduled / 60 * 10) / 10
      const msg = `${day.date}: ${hrs}h of task work scheduled — exceeds your daily maximum of ${settings.maxDailyWorkMinutes / 60}h. Consider reducing scope.`
      warnings.push({ date: day.date, message: msg, taskIds: dayBlocks.map(b => b.taskId ?? '') })
      explanations.push(`⚠ ${msg}`)
    }
  }

  return { blocks, warnings, explanations }
}
