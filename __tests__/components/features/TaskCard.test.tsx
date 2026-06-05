import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}))

import TaskCard from '@/components/features/TaskCard'
import type { TaskDoc } from '@/models/Task'

const baseTask: TaskDoc = {
  _id: 'task-1',
  title: 'Buy groceries',
  description: 'Eggs, milk, bread',
  userId: 'alice',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('TaskCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the task title', () => {
    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    expect(screen.getByText('Buy groceries')).toBeInTheDocument()
  })

  it('renders the description when present', () => {
    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    expect(screen.getByText('Eggs, milk, bread')).toBeInTheDocument()
  })

  it('does NOT render a description paragraph when task.description is undefined', () => {
    const task: TaskDoc = { ...baseTask, description: undefined }

    render(<TaskCard task={task} onDelete={vi.fn()} isDeleting={false} />)

    expect(screen.queryByText('Eggs, milk, bread')).toBeNull()
  })

  it('calls onDelete with the task id when the Delete button is clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(<TaskCard task={baseTask} onDelete={onDelete} isDeleting={false} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('task-1')
  })

  it('navigates to /dashboard/tasks/{id} when the card is clicked', async () => {
    const user = userEvent.setup()

    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    await user.click(screen.getByText('Buy groceries'))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks/task-1')
  })

  it('renders the Delete button as icon-only via aria-label (no visible text "Delete")', () => {
    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    const deleteButton = screen.getByRole('button', { name: 'Delete' })

    expect(deleteButton).toBeInTheDocument()
    expect(deleteButton).not.toHaveTextContent('Delete')
  })

  it('does NOT navigate when the Delete button is clicked (stopPropagation)', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(<TaskCard task={baseTask} onDelete={onDelete} isDeleting={false} />)

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('renders the "Updated <date>" line below the title with small neutral-toned text', () => {
    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    const dateLine = screen.getByText(/^Updated /)

    expect(dateLine).toBeInTheDocument()
    expect(dateLine).toHaveClass('text-sm', 'text-neutral-500')
    expect(dateLine.textContent).toMatch(/^Updated \w+ \d{1,2}, \d{4}$/)
  })

  it('positions the Delete button absolutely at the top-right of the Card', () => {
    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    const deleteButton = screen.getByRole('button', { name: 'Delete' })

    expect(deleteButton).toHaveClass('absolute', 'top-2', 'right-2')
  })

  it('applies the dark-on-hovered-card background override to the Delete button', () => {
    render(<TaskCard task={baseTask} onDelete={vi.fn()} isDeleting={false} />)

    const deleteButton = screen.getByRole('button', { name: 'Delete' })

    expect(deleteButton).toHaveClass('group-hover:text-neutral-50', 'group-hover:hover:bg-neutral-700')
  })
})
