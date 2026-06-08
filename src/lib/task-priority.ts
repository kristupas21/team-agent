import type { PillVariant } from '@/components/ui/Pill'

export const TASK_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const PRIORITY_PILL_VARIANT: Readonly<Record<TaskPriority, PillVariant>> = {
  urgent: 'bordeaux',
  high: 'amber',
  medium: 'slate',
  low: 'light-blue',
}

export const PRIORITY_WEIGHTS: Readonly<Record<TaskPriority, number>> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function compareTasksByPriorityThenDate<
  T extends { priority: TaskPriority; updatedAt: Date | string }
>(a: T, b: T): number {
  const pw = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]

  if (pw !== 0) return pw

  const aTime = (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)).getTime()
  const bTime = (b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)).getTime()

  return bTime - aTime
}
