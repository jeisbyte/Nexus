import { z } from 'zod'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Must be a time in HH:mm format')

// ─── Recurrence ───────────────────────────────────────────────────────────────

export const RecurrenceRuleSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  endDate: isoDate.optional()
})

// ─── Task ─────────────────────────────────────────────────────────────────────

export const TaskFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').optional(),
  status: z.enum(['todo', 'in-progress', 'done', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: isoDate.optional().or(z.literal('')).transform(v => v || undefined),
  estimatedMinutes: z
    .number()
    .int()
    .min(1, 'Must be at least 1 minute')
    .max(1440, 'Must be 1440 minutes or fewer (24 h)')
    .optional(),
  category: z.string().max(100).optional(),
  recurrence: RecurrenceRuleSchema.optional()
})

export type TaskFormData = z.infer<typeof TaskFormSchema>

// Full task record (with generated fields)
export const TaskSchema = TaskFormSchema.extend({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export type TaskRecord = z.infer<typeof TaskSchema>

// ─── Commitment ───────────────────────────────────────────────────────────────

export const CommitmentFormSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: hhmm,
    endTime: hhmm,
    category: z.string().max(100).optional(),
    color: z.string().optional()
  })
  .refine(data => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime']
  })

export type CommitmentFormData = z.infer<typeof CommitmentFormSchema>

export const CommitmentSchema = CommitmentFormSchema.extend({
  id: z.string().uuid()
})

// ─── Settings ─────────────────────────────────────────────────────────────────

export const WorkHoursSchema = z
  .object({
    start: hhmm,
    end: hhmm
  })
  .refine(d => d.start < d.end, {
    message: 'End time must be after start time',
    path: ['end']
  })

export const AppSettingsSchema = z.object({
  workHours: WorkHoursSchema,
  minBreakMinutes: z.number().int().min(0).max(120),
  workDays: z.array(z.number().int().min(0).max(6)).min(1, 'Select at least one work day'),
  maxDailyWorkMinutes: z.number().int().min(60).max(1440),
  lastExportAt: z.string().datetime().optional()
})

// ─── Export envelope ──────────────────────────────────────────────────────────

export const ExportEnvelopeSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  tasks: z.array(TaskSchema),
  commitments: z.array(CommitmentSchema),
  scheduledBlocks: z.array(
    z.object({
      id: z.string().uuid(),
      taskId: z.string().uuid().optional(),
      commitmentId: z.string().uuid().optional(),
      date: isoDate,
      startTime: hhmm,
      endTime: hhmm,
      type: z.enum(['commitment', 'task-session', 'break']),
      label: z.string(),
      isUserApproved: z.boolean()
    })
  ),
  settings: AppSettingsSchema
})
