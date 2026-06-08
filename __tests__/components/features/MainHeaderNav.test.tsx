import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockPush = vi.fn()
const pathnameRef = { current: '/' }

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
  useRouter: () => ({ back: vi.fn(), push: mockPush, replace: vi.fn() }),
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
    vi.clearAllMocks()
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

  it('does NOT render the Back button on /', () => {
    setPath('/')
    render(<MainHeaderNav signedIn={false} />)

    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })

  it('calls router.push("/") exactly once when the Back button is clicked on /sign-in', async () => {
    setPath('/sign-in')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn={false} />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('calls router.push("/") exactly once when the Back button is clicked on /sign-up', async () => {
    setPath('/sign-up')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn={false} />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})

describe('MainHeaderNav — signed-in', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('renders the Back button on nested /dashboard/<sub> paths (generic rule)', () => {
    setPath('/dashboard/sub')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('renders the Back button on /dashboard/tasks', () => {
    setPath('/dashboard/tasks')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('renders the Back button on /dashboard/tasks/new and /dashboard/tasks/<id>', () => {
    setPath('/dashboard/tasks/new')
    const { unmount } = render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()

    unmount()

    setPath('/dashboard/tasks/abc123')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('calls router.push("/dashboard") exactly once when the Back button is clicked on /dashboard/tasks', async () => {
    setPath('/dashboard/tasks')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn userName="admin" />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('calls router.push("/dashboard/tasks") exactly once when the Back button is clicked on /dashboard/tasks/new', async () => {
    setPath('/dashboard/tasks/new')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn userName="admin" />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks')
  })

  it('calls router.push("/dashboard/tasks") exactly once when the Back button is clicked on /dashboard/tasks/<id>', async () => {
    setPath('/dashboard/tasks/abc123')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn userName="admin" />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/tasks')
  })

  it('renders the Back button with the ghost variant class set', () => {
    setPath('/dashboard/tasks')
    render(<MainHeaderNav signedIn userName="admin" />)

    const backButton = screen.getByRole('button', { name: /back/i })

    expect(backButton).toHaveClass('bg-transparent', 'text-neutral-700')
  })

  it('wraps the Back button text in a span hidden on mobile (`hidden md:inline`)', () => {
    setPath('/dashboard/tasks')
    render(<MainHeaderNav signedIn userName="admin" />)

    const backText = screen.getByText('Back')

    expect(backText.tagName).toBe('SPAN')
    expect(backText).toHaveClass('hidden', 'md:inline')
  })

  it('wraps the Sign Out button text in a span hidden on mobile (`hidden md:inline`)', () => {
    setPath('/dashboard')
    render(<MainHeaderNav signedIn userName="admin" />)

    const signOutText = screen.getByText('Sign Out')

    expect(signOutText.tagName).toBe('SPAN')
    expect(signOutText).toHaveClass('hidden', 'md:inline')
  })

  it('renders the user-info block ("Signed in as:" + username) when signedIn && userName', () => {
    setPath('/dashboard')
    render(<MainHeaderNav signedIn userName="alice" />)

    expect(screen.getByText('Signed in as:')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('does NOT render the user-info block when userName is omitted', () => {
    setPath('/dashboard')
    render(<MainHeaderNav signedIn />)

    expect(screen.queryByText('Signed in as:')).toBeNull()
  })

  it('renders the Back button on /dashboard/notes', () => {
    setPath('/dashboard/notes')
    render(<MainHeaderNav signedIn userName="admin" />)

    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('calls router.push("/dashboard") exactly once when the Back button is clicked on /dashboard/notes', async () => {
    setPath('/dashboard/notes')
    const user = userEvent.setup()
    render(<MainHeaderNav signedIn userName="admin" />)

    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })
})
