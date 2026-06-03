import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from '@/components/ui/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies the primary variant classes by default', () => {
    render(<Button>Default</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary-500')
    expect(button).toHaveClass('text-white')
    expect(button).toHaveClass('hover:bg-primary-700')
  })

  it('applies the secondary variant classes when variant="secondary"', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-secondary-500')
    expect(button).toHaveClass('hover:bg-secondary-700')
  })

  it('applies the danger variant classes when variant="danger"', () => {
    render(<Button variant="danger">Danger</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-danger-500')
    expect(button).toHaveClass('hover:bg-danger-700')
  })

  it('is disabled and does not fire onClick when disabled is true', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Disabled
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-60')
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows "Loading..." text, sets aria-busy, is disabled, and does not fire onClick when loading is true', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Loading...')
    expect(button).not.toHaveTextContent('Submit')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    await user.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('fires onClick exactly once on click when not disabled and not loading', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Go</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
