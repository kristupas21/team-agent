import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRedirectError } from '../test-utils/redirect-error'

vi.mock('mongoose', () => ({
  default: { models: {}, model: vi.fn(), Schema: vi.fn() },
}))
vi.mock('@/lib/users', () => ({
  createUser: vi.fn(),
}))
vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-pw'),
}))
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
}))

import { signUpAction } from '@/actions/signUp'
import { createUser } from '@/lib/users'
import { signIn } from '@/lib/auth'

const GENERIC = 'Something went wrong. Please try again.'
const DUPLICATE = 'Username is already taken.'

describe('signUpAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the generic error and does NOT call createUser/signIn when schema fails', async () => {
    const result = await signUpAction({ name: 'abcd', password: 'secret' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(createUser).not.toHaveBeenCalled()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('returns the duplicate error when createUser throws a code-11000 error', async () => {
    vi.mocked(createUser).mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }))

    const result = await signUpAction({ name: 'alice', password: 'secret' })

    expect(result).toEqual({ success: false, error: DUPLICATE })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('returns the generic error when createUser throws an unrelated error', async () => {
    vi.mocked(createUser).mockRejectedValueOnce(new Error('disk full'))

    const result = await signUpAction({ name: 'alice', password: 'secret' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('re-throws when signIn throws a NEXT_REDIRECT-shaped error after createUser succeeds', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({
      name: 'alice',
      passwordHash: 'hashed-pw',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(signIn).mockRejectedValueOnce(makeRedirectError('/dashboard'))

    await expect(signUpAction({ name: 'alice', password: 'secret' })).rejects.toThrow(
      /NEXT_REDIRECT/
    )
  })

  it('returns { success: true } when createUser and signIn both resolve without throwing', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({
      name: 'alice',
      passwordHash: 'hashed-pw',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    vi.mocked(signIn).mockResolvedValueOnce(undefined as never)

    const result = await signUpAction({ name: 'alice', password: 'secret' })

    expect(result).toEqual({ success: true })
  })
})
