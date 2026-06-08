import { describe, expect, it } from 'vitest'
import {
  PRIORITY_WEIGHTS,
  compareTasksByPriorityThenDate,
  type TaskPriority,
} from '@/lib/task-priority'

type TaskShape = { priority: TaskPriority; updatedAt: Date | string }

describe('PRIORITY_WEIGHTS', () => {
  it('maps each priority to the expected numeric weight (urgent highest, low lowest)', () => {
    expect(PRIORITY_WEIGHTS).toEqual({
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    })
  })
})

describe('compareTasksByPriorityThenDate', () => {
  const olderDate = new Date('2026-01-01T00:00:00.000Z')
  const newerDate = new Date('2026-06-08T00:00:00.000Z')

  it('returns a negative value when a has a higher priority than b', () => {
    const a: TaskShape = { priority: 'urgent', updatedAt: olderDate }
    const b: TaskShape = { priority: 'medium', updatedAt: newerDate }

    expect(compareTasksByPriorityThenDate(a, b)).toBeLessThan(0)
  })

  it('returns a positive value when a has a lower priority than b', () => {
    const a: TaskShape = { priority: 'low', updatedAt: newerDate }
    const b: TaskShape = { priority: 'high', updatedAt: olderDate }

    expect(compareTasksByPriorityThenDate(a, b)).toBeGreaterThan(0)
  })

  it('orders by updatedAt descending when priorities are equal', () => {
    const a: TaskShape = { priority: 'medium', updatedAt: olderDate }
    const b: TaskShape = { priority: 'medium', updatedAt: newerDate }

    expect(compareTasksByPriorityThenDate(a, b)).toBeGreaterThan(0)
    expect(compareTasksByPriorityThenDate(b, a)).toBeLessThan(0)
  })

  it('returns 0 when both priority and updatedAt are equal', () => {
    const a: TaskShape = { priority: 'medium', updatedAt: olderDate }
    const b: TaskShape = { priority: 'medium', updatedAt: new Date(olderDate) }

    expect(compareTasksByPriorityThenDate(a, b)).toBe(0)
  })

  it('accepts updatedAt as a string', () => {
    const a: TaskShape = { priority: 'high', updatedAt: '2026-06-08T00:00:00.000Z' }
    const b: TaskShape = { priority: 'high', updatedAt: '2026-01-01T00:00:00.000Z' }

    expect(compareTasksByPriorityThenDate(a, b)).toBeLessThan(0)
  })

  it('sorts a realistic 4-item array as urgent → high → medium → low (date-tiebroken)', () => {
    const tasks: ReadonlyArray<TaskShape & { id: string }> = [
      { id: 'low-old', priority: 'low', updatedAt: olderDate },
      { id: 'urgent-old', priority: 'urgent', updatedAt: olderDate },
      { id: 'medium-new', priority: 'medium', updatedAt: newerDate },
      { id: 'high-old', priority: 'high', updatedAt: olderDate },
    ]

    const sorted = [...tasks].sort(compareTasksByPriorityThenDate)

    expect(sorted.map((t) => t.id)).toEqual(['urgent-old', 'high-old', 'medium-new', 'low-old'])
  })
})
