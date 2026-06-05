import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeRedirectError } from '../test-utils/redirect-error'

vi.mock('mongoose', () => ({
  default: { models: {}, model: vi.fn(), Schema: vi.fn() },
}))
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/tasks', () => ({
  updateTask: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw makeRedirectError(target)
  }),
}))

import { updateTaskAction } from '@/actions/updateTask'
import { auth } from '@/lib/auth'
import { updateTask } from '@/lib/tasks'
import { redirect } from 'next/navigation'

const GENERIC = 'Something went wrong. Please try again.'

const aliceSession = {
  user: { name: 'alice' },
  expires: '2099-01-01T00:00:00.000Z',
}

const updatedTask = {
  _id: 'task-1',
  title: 'New title',
  description: 'New description',
  userId: 'alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
}

describe('updateTaskAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the generic error and does NOT call updateTask/redirect when schema fails', async () => {
    const result = await updateTaskAction('task-1', { title: 'ab' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(updateTask).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns the generic error when there is no session', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const result = await updateTaskAction('task-1', { title: 'Valid title' })

    expect(result).toEqual({ success: false, error: GENERIC })
    expect(updateTask).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('returns "Task not found." when updateTask returns null', async () => {
    vi.mocked(auth).mockResolvedValueOnce(aliceSession as never)
    vi.mocked(updateTask).mockResolvedValueOnce(null)

    const result = await updateTaskAction('task-1', { title: 'Valid title' })

    expect(result).toEqual({ success: false, error: 'Task not found.' })
    expect(redirect).not.toHaveBeenCalled()
  })

  it('calls updateTask with the parsed input and lets NEXT_REDIRECT propagate on success', async () => {
    vi.mocked(auth).mockResolvedValueOnce(aliceSession as never)
    vi.mocked(updateTask).mockResolvedValueOnce(updatedTask)

    await expect(
      updateTaskAction('task-1', { title: 'New title', description: 'New description' })
    ).rejects.toThrow(/NEXT_REDIRECT/)

    expect(updateTask).toHaveBeenCalledTimes(1)
    expect(updateTask).toHaveBeenCalledWith('task-1', 'alice', {
      title: 'New title',
      description: 'New description',
    })
    expect(redirect).toHaveBeenCalledWith('/dashboard/tasks')
  })
})
