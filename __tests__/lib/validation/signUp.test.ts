import { describe, expect, it } from 'vitest'
import { signUpSchema } from '@/lib/validation/signUp'

describe('signUpSchema', () => {
  it('rejects a 4-character name with "Name must be at least 5 characters."', () => {
    const parsed = signUpSchema.safeParse({ name: 'abcd', password: 'secret' })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const nameIssue = parsed.error.issues.find((issue) => issue.path[0] === 'name')

      expect(nameIssue?.message).toBe('Name must be at least 5 characters.')
    }
  })

  it('rejects a 65-character name with "Name is too long."', () => {
    const parsed = signUpSchema.safeParse({ name: 'a'.repeat(65), password: 'secret' })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const nameIssue = parsed.error.issues.find((issue) => issue.path[0] === 'name')

      expect(nameIssue?.message).toBe('Name is too long.')
    }
  })

  it('rejects a 4-character password with "Password must be at least 5 characters."', () => {
    const parsed = signUpSchema.safeParse({ name: 'alice', password: 'pw12' })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue) => issue.path[0] === 'password')

      expect(passwordIssue?.message).toBe('Password must be at least 5 characters.')
    }
  })

  it('rejects a 129-character password with "Password is too long."', () => {
    const parsed = signUpSchema.safeParse({ name: 'alice', password: 'p'.repeat(129) })

    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const passwordIssue = parsed.error.issues.find((issue) => issue.path[0] === 'password')

      expect(passwordIssue?.message).toBe('Password is too long.')
    }
  })

  it('accepts a valid input and returns parsed data', () => {
    const parsed = signUpSchema.safeParse({ name: 'alice', password: 'secret' })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data).toEqual({ name: 'alice', password: 'secret' })
    }
  })
})
