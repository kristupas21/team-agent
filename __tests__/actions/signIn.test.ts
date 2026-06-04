import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRedirectError } from '../test-utils/redirect-error'

vi.mock('mongoose', () => ({
  default: { models: {}, model: vi.fn(), Schema: vi.fn() },
}))
vi.mock('@/lib/users', () => ({
  countUsers: vi.fn(),
  findUserByName: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  signIn: vi.fn(),
}))

import { signInAction } from '@/actions/signIn'
import { countUsers } from '@/lib/users'
import { signIn } from '@/lib/auth'

const GENERIC = 'Invalid name or password.'

describe('signInAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns the generic error and does NOT call countUsers/signIn when schema fails', async () => {
    const result = await signInAction({ name: '', password: 'pw' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(countUsers).not.toHaveBeenCalled()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('returns the generic error when countUsers throws', async () => {
    vi.mocked(countUsers).mockRejectedValueOnce(new Error('db down'))

    const result = await signInAction({ name: 'admin', password: 'pw' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('returns the generic error and skips signIn when countUsers resolves to 0', async () => {
    vi.mocked(countUsers).mockResolvedValueOnce(0)

    const result = await signInAction({ name: 'admin', password: 'pw' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('re-throws when signIn throws a NEXT_REDIRECT-shaped error (the bug-catch case)', async () => {
    vi.mocked(countUsers).mockResolvedValueOnce(1)
    vi.mocked(signIn).mockRejectedValueOnce(makeRedirectError('/dashboard'))

    await expect(signInAction({ name: 'admin', password: 'pw' })).rejects.toThrow(/NEXT_REDIRECT/)
  })

  it('returns the generic error when signIn throws a non-redirect error (wrong password)', async () => {
    vi.mocked(countUsers).mockResolvedValueOnce(1)
    vi.mocked(signIn).mockRejectedValueOnce(new Error('CredentialsSignin'))

    const result = await signInAction({ name: 'admin', password: 'pw' })

    expect(result).toEqual({ success: false, error: GENERIC })
  })

  it('returns { success: true } when signIn resolves without throwing', async () => {
    vi.mocked(countUsers).mockResolvedValueOnce(1)
    vi.mocked(signIn).mockResolvedValueOnce(undefined as never)

    const result = await signInAction({ name: 'admin', password: 'pw' })

    expect(result).toEqual({ success: true })
  })
})
