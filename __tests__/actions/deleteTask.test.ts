import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('mongoose', () => ({
  default: { models: {}, model: vi.fn(), Schema: vi.fn() },
}))
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn(),
}))
vi.mock('@/lib/db/tasks', () => ({
  deleteTask: vi.fn(),
}))

import { deleteTaskAction } from '@/actions/deleteTask'
import { auth } from '@/lib/auth/auth'
import { deleteTask } from '@/lib/db/tasks'

describe('deleteTaskAction', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns "Not authorised." and does NOT call deleteTask when there is no session', async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never)

    const result = await deleteTaskAction('some-id')

    expect(result).toEqual({ success: false, error: 'Not authorised.' })
    expect(deleteTask).not.toHaveBeenCalled()
  })

  it('returns "Task not found." when deleteTask reports { deleted: false }', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { name: 'alice' },
      expires: '2099-01-01T00:00:00.000Z',
    } as never)
    vi.mocked(deleteTask).mockResolvedValueOnce({ deleted: false })

    const result = await deleteTaskAction('some-id')

    expect(result).toEqual({ success: false, error: 'Task not found.' })
  })

  it('returns "Task not found." when deleteTask throws (e.g. CastError)', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { name: 'alice' },
      expires: '2099-01-01T00:00:00.000Z',
    } as never)
    vi.mocked(deleteTask).mockRejectedValueOnce(new Error('CastError'))

    const result = await deleteTaskAction('malformed-id')

    expect(result).toEqual({ success: false, error: 'Task not found.' })
  })

  it('returns { success: true } when deleteTask reports { deleted: true }', async () => {
    vi.mocked(auth).mockResolvedValueOnce({
      user: { name: 'alice' },
      expires: '2099-01-01T00:00:00.000Z',
    } as never)
    vi.mocked(deleteTask).mockResolvedValueOnce({ deleted: true })

    const result = await deleteTaskAction('some-id')

    expect(result).toEqual({ success: true })
    expect(deleteTask).toHaveBeenCalledWith('some-id', 'alice')
  })
})
