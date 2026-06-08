import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRedirectError } from '../test-utils/redirect-error'

vi.mock('mongoose', () => ({
  default: { models: {}, model: vi.fn(), Schema: vi.fn() },
}))
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db/tasks', () => ({
  createTask: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw makeRedirectError(target)
  }),
}))

import { createTaskAction } from '@/actions/createTask'
import { auth } from '@/lib/auth/auth'
import { createTask } from '@/lib/db/tasks'
import { redirect } from 'next/navigation'

const GENERIC = 'Something went wrong. Please try again.'

describe('createTaskAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the generic error and does NOT call createTask/redirect when schema fails', async () => {
    const result = await createTaskAction({ title: 'ab' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(createTask).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns the generic error when no session is present', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const result = await createTaskAction({ title: 'valid title' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(createTask).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('calls createTask with the parsed input and the session user.name on a valid submission', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { name: 'alice' },
      expires: '2099-01-01T00:00:00.000Z',
    } as never)

    await expect(
      createTaskAction({ title: 'valid title', description: 'some description' })
    ).rejects.toThrow(/NEXT_REDIRECT/)

    expect(createTask).toHaveBeenCalledTimes(1)
    expect(createTask).toHaveBeenCalledWith({
      title: 'valid title',
      description: 'some description',
      priority: 'medium',
      userId: 'alice',
    })
    expect(redirect).toHaveBeenCalledWith('/dashboard/tasks')
  })

  it('lets the NEXT_REDIRECT from redirect() propagate (does not catch)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { name: 'alice' },
      expires: '2099-01-01T00:00:00.000Z',
    } as never)

    await expect(createTaskAction({ title: 'valid title' })).rejects.toThrow(/NEXT_REDIRECT/)
  })
})
