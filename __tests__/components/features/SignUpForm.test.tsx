import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/actions/signUp', () => ({
  signUpAction: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

import SignUpForm from '@/components/features/auth/SignUpForm'
import { signUpAction } from '@/actions/signUp'

describe('SignUpForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders two inputs and a Sign Up button', () => {
    render(<SignUpForm />)

    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
  })

  it('focuses the Name input on render (autoFocus)', () => {
    render(<SignUpForm />)

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /name/i }))
  })

  it('blocks the action call and shows the min(5) per-field errors when both fields are empty', async () => {
    const user = userEvent.setup()
    render(<SignUpForm />)

    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText('Name must be at least 5 characters.')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 5 characters.')).toBeInTheDocument()
    expect(signUpAction).not.toHaveBeenCalled()
  })

  it('calls signUpAction once with the typed values on valid submit', async () => {
    const user = userEvent.setup()
    vi.mocked(signUpAction).mockResolvedValueOnce({ success: true })
    render(<SignUpForm />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'alice')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(signUpAction).toHaveBeenCalledTimes(1)
    })
    expect(signUpAction).toHaveBeenCalledWith({ name: 'alice', password: 'secret' })
  })

  it('renders the duplicate error when the action returns { success: false, error: "Username is already taken." }', async () => {
    const user = userEvent.setup()
    vi.mocked(signUpAction).mockResolvedValueOnce({
      success: false,
      error: 'Username is already taken.',
    })
    render(<SignUpForm />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    expect(await screen.findByText('Username is already taken.')).toBeInTheDocument()
  })

  it('disables inputs and changes button text to "Loading..." while the action is pending', async () => {
    const user = userEvent.setup()
    const pending = new Promise<never>(() => {})
    vi.mocked(signUpAction).mockReturnValueOnce(pending as never)
    render(<SignUpForm />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'alice')
    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /sign up/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()
    })
    expect(screen.getByRole('textbox', { name: /name/i })).toBeDisabled()
    expect(screen.getByLabelText(/password/i)).toBeDisabled()
  })
})
