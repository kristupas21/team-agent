import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/tasks/new',
  useSearchParams: () => new URLSearchParams(),
}))

import TaskForm from '@/components/features/TaskForm'

describe('TaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title and description inputs and the submit button with the provided label', () => {
    render(<TaskForm submitLabel="Create Task" action={vi.fn()} />)

    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument()
  })

  it('focuses the Title input on render (autoFocus)', () => {
    render(<TaskForm submitLabel="Create Task" action={vi.fn()} />)

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /title/i }))
  })

  it('blocks the action call and shows the title error when submitting an empty form', async () => {
    const user = userEvent.setup()
    const action = vi.fn()

    render(<TaskForm submitLabel="Create Task" action={action} />)

    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(await screen.findByText('Title must be at least 3 characters.')).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('calls action once with the typed values on valid submit', async () => {
    const user = userEvent.setup()
    const action = vi.fn().mockResolvedValueOnce({ success: true })

    render(<TaskForm submitLabel="Create Task" action={action} />)

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'My new task')
    await user.type(screen.getByRole('textbox', { name: /description/i }), 'Some description')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1)
    })
    expect(action).toHaveBeenCalledWith({
      title: 'My new task',
      description: 'Some description',
    })
  })

  it('renders the root error when the action returns { success: false }', async () => {
    const user = userEvent.setup()
    const action = vi.fn().mockResolvedValueOnce({
      success: false,
      error: 'Something went wrong. Please try again.',
    })

    render(<TaskForm submitLabel="Create Task" action={action} />)

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'My new task')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(
      await screen.findByText('Something went wrong. Please try again.')
    ).toBeInTheDocument()
  })

  it('disables inputs and changes button text to "Loading..." while the action is pending', async () => {
    const user = userEvent.setup()
    const pending = new Promise<never>(() => {})
    const action = vi.fn().mockReturnValueOnce(pending)

    render(<TaskForm submitLabel="Create Task" action={action} />)

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'My new task')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()
    })
    expect(screen.getByRole('textbox', { name: /title/i })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: /description/i })).toBeDisabled()
  })

  it('pre-fills the form when initialValues is provided (edit mode)', () => {
    render(
      <TaskForm
        submitLabel="Save Task"
        initialValues={{ title: 'Existing title', description: 'Existing description' }}
        action={vi.fn()}
      />
    )

    expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue('Existing title')
    expect(screen.getByRole('textbox', { name: /description/i })).toHaveValue('Existing description')
  })

  it('renders the submitLabel exactly as provided ("Save Task" in edit mode)', () => {
    render(<TaskForm submitLabel="Save Task" action={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Save Task' })).toBeInTheDocument()
  })
})
