import { ExportEnvelopeSchema } from '@/lib/validation/schemas'
import { exportAll, importAll, saveSettings } from '@/lib/db'
import type { ExportEnvelope } from '@/types'

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportToJSON(): Promise<void> {
  const data = await exportAll()

  const envelope: ExportEnvelope = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data
  }

  const json = JSON.stringify(envelope, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `nexus-export-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // Record the export time in settings
  const settings = { ...data.settings, lastExportAt: new Date().toISOString() }
  await saveSettings(settings)
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean
  error?: string
  taskCount?: number
  commitmentCount?: number
}

export async function importFromJSON(file: File): Promise<ImportResult> {
  let raw: unknown

  try {
    const text = await file.text()
    raw = JSON.parse(text)
  } catch {
    return { success: false, error: 'The file is not valid JSON.' }
  }

  const parsed = ExportEnvelopeSchema.safeParse(raw)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return {
      success: false,
      error: `Validation failed at ${firstIssue.path.join('.')}: ${firstIssue.message}`
    }
  }

  const { tasks, commitments, scheduledBlocks, settings } = parsed.data

  await importAll({ tasks, commitments, scheduledBlocks, settings })

  return {
    success: true,
    taskCount: tasks.length,
    commitmentCount: commitments.length
  }
}
