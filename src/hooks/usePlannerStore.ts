import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format, addDays } from 'date-fns'
import type { Commitment, ScheduledBlock, AppSettings, Task } from '@/types'
import {
  getAllCommitments,
  putCommitment,
  deleteCommitment as dbDeleteCommitment,
  getAllScheduledBlocks,
  putScheduledBlocks,
  clearScheduledBlocks,
  getSettings,
  saveSettings
} from '@/lib/db'
import { runScheduler } from '@/lib/scheduler'
import type { CommitmentFormData } from '@/lib/validation/schemas'

export function usePlannerStore(tasks: Task[]) {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [scheduledBlocks, setScheduledBlocks] = useState<ScheduledBlock[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getAllCommitments(), getAllScheduledBlocks(), getSettings()])
      .then(([c, b, s]) => {
        setCommitments(c)
        setScheduledBlocks(b)
        setSettings(s)
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  const createCommitment = useCallback(async (data: CommitmentFormData): Promise<Commitment> => {
    const c: Commitment = { id: uuidv4(), ...data }
    await putCommitment(c)
    setCommitments(prev => [...prev, c])
    return c
  }, [])

  const updateCommitment = useCallback(async (id: string, data: CommitmentFormData): Promise<void> => {
    const c: Commitment = { id, ...data }
    await putCommitment(c)
    setCommitments(prev => prev.map(x => (x.id === id ? c : x)))
  }, [])

  const deleteCommitment = useCallback(async (id: string): Promise<void> => {
    await dbDeleteCommitment(id)
    setCommitments(prev => prev.filter(c => c.id !== id))
  }, [])

  const runSchedule = useCallback(async (fromDate: string, planDays = 14) => {
    if (!settings) return null
    const result = runScheduler({ tasks, commitments, settings, fromDate, planDays })
    await clearScheduledBlocks()
    await putScheduledBlocks(result.blocks)
    setScheduledBlocks(result.blocks)
    return result
  }, [tasks, commitments, settings])

  const approveBlock = useCallback(async (blockId: string): Promise<void> => {
    setScheduledBlocks(prev => {
      const updated = prev.map(b =>
        b.id === blockId ? { ...b, isUserApproved: true } : b
      )
      putScheduledBlocks(updated).catch(e => setError(String(e)))
      return updated
    })
  }, [])

  const rejectBlock = useCallback(async (blockId: string): Promise<void> => {
    setScheduledBlocks(prev => {
      const filtered = prev.filter(b => b.id !== blockId)
      clearScheduledBlocks()
        .then(() => putScheduledBlocks(filtered))
        .catch(e => setError(String(e)))
      return filtered
    })
  }, [])

  const updateSettings = useCallback(async (s: AppSettings): Promise<void> => {
    await saveSettings(s)
    setSettings(s)
  }, [])

  const getBlocksForDate = useCallback((date: string): ScheduledBlock[] => {
    return scheduledBlocks
      .filter(b => b.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [scheduledBlocks])

  const getBlocksForWeek = useCallback((weekStartDate: string): ScheduledBlock[] => {
    const days = Array.from({ length: 7 }, (_, i) =>
      format(addDays(new Date(weekStartDate), i), 'yyyy-MM-dd')
    )
    return scheduledBlocks.filter(b => days.includes(b.date))
  }, [scheduledBlocks])

  return {
    commitments,
    scheduledBlocks,
    settings,
    loading,
    error,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    runSchedule,
    approveBlock,
    rejectBlock,
    updateSettings,
    getBlocksForDate,
    getBlocksForWeek
  }
}
