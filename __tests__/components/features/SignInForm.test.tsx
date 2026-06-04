import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/actions/signIn', () => ({
  signInAction: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

import SignInForm from '@/components/features/SignInForm'
import { signInAction } from '@/actions/signIn'

describe('SignInForm', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders two inputs and a Sign In button', () => {
    render(<SignInForm />)

    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('focuses the Name input on render (autoFocus)', () => {
    render(<SignInForm />)

    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /name/i }))
  })

  it('blocks the action call and shows per-field errors when both fields are empty', async () => {
    const user = userEvent.setup()
    render(<SignInForm />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Name is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(signInAction).not.toHaveBeenCalled()
  })

  it('calls signInAction once with the typed values on valid submit', async () => {
    const user = userEvent.setup()
    vi.mocked(signInAction).mockResolvedValueOnce({ success: true })
    render(<SignInForm />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'admin12345')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(signInAction).toHaveBeenCalledTimes(1)
    })
    expect(signInAction).toHaveBeenCalledWith({ name: 'admin', password: 'admin12345' })
  })

  it('renders a root error when the action returns { success: false }', async () => {
    const user = userEvent.setup()
    vi.mocked(signInAction).mockResolvedValueOnce({
      success: false,
      error: 'Invalid name or password.',
    })
    render(<SignInForm />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'wrongpw')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Invalid name or password.')).toBeInTheDocument()
  })

  it('disables inputs and changes button text to "Loading..." while the action is pending', async () => {
    const user = userEvent.setup()
    const pending = new Promise<never>(() => {})
    vi.mocked(signInAction).mockReturnValueOnce(pending as never)
    render(<SignInForm />)

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'admin12345')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled()
    })
    expect(screen.getByRole('textbox', { name: /name/i })).toBeDisabled()
    expect(screen.getByLabelText(/password/i)).toBeDisabled()
  })
})
