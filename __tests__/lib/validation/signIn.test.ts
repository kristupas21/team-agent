import { describe, expect, it } from 'vitest'
import { signInSchema } from '@/lib/validation/signIn'

function firstIssueMessage(input: unknown): string | undefined {
  const parsed = signInSchema.safeParse(input)

  if (parsed.success) return undefined

  return parsed.error.issues[0]?.message
}

describe('signInSchema', () => {
  it('rejects an empty name with "Name is required."', () => {
    expect(firstIssueMessage({ name: '', password: 'pw' })).toBe('Name is required.')
  })

  it('rejects whitespace-only name as required (trim then min(1))', () => {
    expect(firstIssueMessage({ name: '   ', password: 'pw' })).toBe('Name is required.')
  })

  it('rejects a 65-character name with "Name is too long."', () => {
    expect(firstIssueMessage({ name: 'a'.repeat(65), password: 'pw' })).toBe('Name is too long.')
  })

  it('rejects an empty password with "Password is required."', () => {
    const parsed = signInSchema.safeParse({ name: 'admin', password: '' })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue) => issue.path[0] === 'password')

      expect(passwordIssue?.message).toBe('Password is required.')
    }
  })

  it('rejects a 129-character password with "Password is too long."', () => {
    const parsed = signInSchema.safeParse({ name: 'admin', password: 'p'.repeat(129) })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue) => issue.path[0] === 'password')

      expect(passwordIssue?.message).toBe('Password is too long.')
    }
  })

  it('accepts a valid input and returns parsed data', () => {
    const parsed = signInSchema.safeParse({ name: 'admin', password: 'pw' })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toEqual({ name: 'admin', password: 'pw' })
    }
  })
})
