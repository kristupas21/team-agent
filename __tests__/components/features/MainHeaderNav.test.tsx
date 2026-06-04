import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockBack = vi.fn()
const pathnameRef = { current: '/' }

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/actions/signOut', () => ({
  signOutAction: vi.fn(),
}))

import MainHeaderNav from '@/components/features/MainHeaderNav'

function setPath(p: string) {
  pathnameRef.current = p
}

describe('MainHeaderNav — signed-out', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setPath('/')
  })

  it('renders both Sign In and Sign Up as enabled links on /', () => {
    setPath('/')
    render(<MainHeaderNav signedIn={false} />)

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/sign-in')
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/sign-up')
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })

  it('renders Sign In as a disabled button and Sign Up as a link on /sign-in', () => {
    setPath('/sign-in')
    render(<MainHeaderNav signedIn={false} />)

    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/sign-up')
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('renders Sign Up as a disabled button and Sign In as a link on /sign-up', () => {
    setPath('/sign-up')
    render(<MainHeaderNav signedIn={false} />)

    expect(screen.getByRole('button', { name: /sign up/i })).toBeDisabled()
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/sign-in')
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('calls router.back() exactly once when the Back button is clicked on /sign-in', async () => {
    setPath('/sign-in')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn={false} />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockBack).toHaveBeenCalledTimes(1)
  })

  it('does NOT render the Back button on /', () => {
    setPath('/')
    render(<MainHeaderNav signedIn={false} />)

    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })
})

describe('MainHeaderNav — signed-in', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    setPath('/dashboard')
  })

  it('renders the Sign Out form-button and NOT Sign In / Sign Up on /dashboard', () => {
    setPath('/dashboard')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /sign up/i })).toBeNull()
  })

  it('does NOT render the Back button on /dashboard', () => {
    setPath('/dashboard')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })

  it('renders the Sign Out form without crashing when userName is omitted', () => {
    setPath('/dashboard')
    render(<MainHeaderNav signedIn />)

    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('does NOT render the Back button on nested /dashboard/sub paths', () => {
    setPath('/dashboard/sub')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })
})
