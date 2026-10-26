/**
 * Nexus Coach Engine — rule-based, transparent, offline.
 *
 * Pure function: (tasks, commitments, scheduleBlocks, today) → CoachAdvice
 *
 * Rules are evaluated in priority order and documented inline.
 * The coach never sends data externally and never pretends to be AI.
 * The interface is kept stable so an optional AI provider can be wired
 * in a later milestone without changing the UI.
 */

import { parseISO, format, isToday, isPast, isTomorrow, differenceInCalendarDays, startOfDay } from 'date-fns'
import type { Task, Commitment, ScheduledBlock, CoachAdvice } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false
  return isPast(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'archived'
}

function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false
  return isToday(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'archived'
}

function isDueTomorrow(task: Task): boolean {
  if (!task.dueDate) return false
  return isTomorrow(parseISO(task.dueDate)) && task.status !== 'done' && task.status !== 'archived'
}

function isActive(task: Task): boolean {
  return task.status !== 'done' && task.status !== 'archived'
}

function daysUntilDue(task: Task, today: Date): number {
  if (!task.dueDate) return Infinity
  return differenceInCalendarDays(parseISO(task.dueDate), startOfDay(today))
}

// ─── Coach function ───────────────────────────────────────────────────────────

export interface CoachInput {
  tasks: Task[]
  commitments: Commitment[]
  scheduledBlocks: ScheduledBlock[]
  today?: Date
}

export function generateCoachAdvice(input: CoachInput): CoachAdvice {
  const { tasks, scheduledBlocks } = input
  const today = input.today ?? new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  const urgentItems: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []
  let nextAction: string | undefined

  const activeTasks = tasks.filter(isActive)
  const overdueTasks = activeTasks.filter(isOverdue)
  const dueTodayTasks = activeTasks.filter(isDueToday)
  const dueTomorrowTasks = activeTasks.filter(isDueTomorrow)
  const urgentTasks = activeTasks.filter(t => t.priority === 'urgent')
  const highPriorityTasks = activeTasks.filter(t => t.priority === 'high')

  // ── Rule 1: Overdue tasks ────────────────────────────────────────────────
  for (const t of overdueTasks) {
    const daysPast = Math.abs(daysUntilDue(t, today))
    urgentItems.push(
      `"${t.title}" was due ${daysPast} day${daysPast !== 1 ? 's' : ''} ago and is still ${t.status}.`
    )
  }

  // ── Rule 2: Due today ────────────────────────────────────────────────────
  for (const t of dueTodayTasks) {
    urgentItems.push(`"${t.title}" is due today (${t.status}).`)
  }

  // ── Rule 3: Due tomorrow ─────────────────────────────────────────────────
  for (const t of dueTomorrowTasks) {
    warnings.push(`"${t.title}" is due tomorrow. Make sure it's on today's plan.`)
  }

  // ── Rule 4: Urgency overload ─────────────────────────────────────────────
  if (urgentTasks.length > 3) {
    warnings.push(
      `You have ${urgentTasks.length} tasks marked "urgent". Consider re-prioritising — not everything can be urgent.`
    )
  }

  // ── Rule 5: No tasks today ───────────────────────────────────────────────
  const todayBlocks = scheduledBlocks.filter(
    b => b.date === todayStr && b.type === 'task-session'
  )
  if (activeTasks.length > 0 && todayBlocks.length === 0) {
    recommendations.push(
      'Nothing is scheduled for task work today. Open the Planner to generate a schedule or manually assign tasks to today.'
    )
  }

  // ── Rule 6: Suggested next action ────────────────────────────────────────
  // Priority: overdue → due today → in-progress → highest urgency score
  const inProgress = activeTasks.filter(t => t.status === 'in-progress')

  if (overdueTasks.length > 0) {
    nextAction = `Address the most overdue task: "${overdueTasks[0].title}"`
  } else if (dueTodayTasks.length > 0) {
    nextAction = `Complete today's deadline: "${dueTodayTasks[0].title}"`
  } else if (inProgress.length > 0) {
    nextAction = `Continue where you left off: "${inProgress[0].title}"`
  } else if (urgentTasks.length > 0) {
    nextAction = `Start on your most urgent task: "${urgentTasks[0].title}"`
  } else if (highPriorityTasks.length > 0) {
    nextAction = `Pick up your next high-priority task: "${highPriorityTasks[0].title}"`
  } else if (activeTasks.length > 0) {
    nextAction = `You have ${activeTasks.length} open task${activeTasks.length !== 1 ? 's' : ''}. Tackle the oldest one first.`
  }

  // ── Rule 7: All clear ────────────────────────────────────────────────────
  if (activeTasks.length === 0) {
    recommendations.push('Your task list is clear. Great work — add upcoming tasks to stay ahead.')
  }

  // ── Rule 8: Healthy load check ───────────────────────────────────────────
  const todayTaskMinutes = todayBlocks.reduce((sum, b) => {
    const [sh, sm] = b.startTime.split(':').map(Number)
    const [eh, em] = b.endTime.split(':').map(Number)
    return sum + (eh * 60 + em) - (sh * 60 + sm)
  }, 0)

  if (todayTaskMinutes > 360) {
    warnings.push(
      `Today has ${Math.round(todayTaskMinutes / 60 * 10) / 10}h of task work scheduled. Consider whether that's realistic given your energy levels.`
    )
  }

  // ── Build summary ─────────────────────────────────────────────────────────
  let summary: string
  if (overdueTasks.length > 0 || dueTodayTasks.length > 0) {
    const parts: string[] = []
    if (overdueTasks.length > 0) parts.push(`${overdueTasks.length} overdue task${overdueTasks.length !== 1 ? 's' : ''}`)
    if (dueTodayTasks.length > 0) parts.push(`${dueTodayTasks.length} due today`)
    summary = `Attention needed: ${parts.join(' and ')}.`
  } else if (activeTasks.length === 0) {
    summary = 'All clear — no open tasks.'
  } else {
    summary = `You have ${activeTasks.length} open task${activeTasks.length !== 1 ? 's' : ''}. ${
      todayBlocks.length > 0
        ? `${todayBlocks.length} session${todayBlocks.length !== 1 ? 's' : ''} planned for today.`
        : 'No sessions scheduled for today yet.'
    }`
  }

  return {
    summary,
    urgentItems,
    warnings,
    nextAction,
    recommendations,
    generatedAt: new Date().toISOString()
  }
}
