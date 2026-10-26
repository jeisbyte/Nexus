import { useMemo } from 'react'
import type { Task, Commitment, ScheduledBlock } from '@/types'
import { generateCoachAdvice } from '@/lib/coach'

export function useCoach(
  tasks: Task[],
  commitments: Commitment[],
  scheduledBlocks: ScheduledBlock[]
) {
  const advice = useMemo(
    () => generateCoachAdvice({ tasks, commitments, scheduledBlocks }),
    [tasks, commitments, scheduledBlocks]
  )
  return advice
}
