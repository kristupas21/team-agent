import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/actions/deleteTask', () => ({
  deleteTaskAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

import TasksList from '@/components/features/tasks/TasksList'
import { deleteTaskAction } from '@/actions/deleteTask'
import type { TaskDoc } from '@/models/Task'

function makeTask(id: string, title: string): TaskDoc {
  return {
    _id: id,
    title,
    userId: 'alice',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

describe('TasksList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders all initial tasks', () => {
    const tasks = [makeTask('1', 'Task A'), makeTask('2', 'Task B'), makeTask('3', 'Task C')]

    render(<TasksList initialTasks={tasks} />)

    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
    expect(screen.getByText('Task C')).toBeInTheDocument()
  })

  it('renders only the "Create new task" link when initialTasks is empty', () => {
    render(<TasksList initialTasks={[]} />)

    expect(screen.getByRole('link', { name: /create new task/i })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('always renders the "Create new task" link pointing at /dashboard/tasks/new', () => {
    render(<TasksList initialTasks={[makeTask('1', 'Task A')]} />)

    expect(screen.getByRole('link', { name: /create new task/i })).toHaveAttribute(
      'href',
      '/dashboard/tasks/new'
    )
  })

  it('removes the task from the DOM after a successful delete', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteTaskAction).mockResolvedValueOnce({ success: true })

    const tasks = [makeTask('1', 'Task A'), makeTask('2', 'Task B')]

    render(<TasksList initialTasks={tasks} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })

    await user.click(deleteButtons[0])

    await waitFor(() => {
      expect(screen.queryByText('Task A')).toBeNull()
    })
    expect(screen.getByText('Task B')).toBeInTheDocument()
  })

  it('leaves the task in the DOM after a failed delete', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteTaskAction).mockResolvedValueOnce({
      success: false,
      error: 'Task not found.',
    })

    render(<TasksList initialTasks={[makeTask('1', 'Task A')]} />)

    await user.click(screen.getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(deleteTaskAction).toHaveBeenCalledTimes(1)
    })
    expect(screen.getByText('Task A')).toBeInTheDocument()
  })
})
