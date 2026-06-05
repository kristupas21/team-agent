import { describe, expect, it } from 'vitest'
import { taskSchema } from '@/lib/validation/task'

describe('taskSchema', () => {
  it('rejects a 2-character title with "Title must be at least 3 characters."', () => {
    const parsed = taskSchema.safeParse({ title: 'ab' })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === 'title')

      expect(issue?.message).toBe('Title must be at least 3 characters.')
    }
  })

  it('rejects a 65-character title with "Title is too long."', () => {
    const parsed = taskSchema.safeParse({ title: 'a'.repeat(65) })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === 'title')

      expect(issue?.message).toBe('Title is too long.')
    }
  })

  it('rejects a 257-character description with "Description is too long."', () => {
    const parsed = taskSchema.safeParse({
      title: 'valid title',
      description: 'd'.repeat(257),
    })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === 'description')

      expect(issue?.message).toBe('Description is too long.')
    }
  })

  it('transforms an empty-string description to undefined on parse', () => {
    const parsed = taskSchema.safeParse({ title: 'valid title', description: '' })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.description).toBeUndefined()
    }
  })

  it('accepts a missing description key (undefined)', () => {
    const parsed = taskSchema.safeParse({ title: 'valid title' })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.description).toBeUndefined()
    }
  })

  it('accepts a valid title with a valid description', () => {
    const parsed = taskSchema.safeParse({
      title: 'valid title',
      description: 'some description',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.title).toBe('valid title')
      expect(parsed.data.description).toBe('some description')
    }
  })
})
