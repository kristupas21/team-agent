import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Input from '@/components/ui/Input'

describe('Input', () => {
  it('renders an input with the provided placeholder', () => {
    render(<Input placeholder="Your name" />)
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument()
  })

  it('applies the primary variant classes by default', () => {
    render(<Input placeholder="p" />)
    const input = screen.getByPlaceholderText('p')
    expect(input).toHaveClass('border-neutral-200')
    expect(input).toHaveClass('focus-visible:ring-primary-500')
  })

  it('applies the secondary variant classes when variant="secondary"', () => {
    render(<Input variant="secondary" placeholder="p" />)
    const input = screen.getByPlaceholderText('p')
    expect(input).toHaveClass('border-neutral-200')
    expect(input).toHaveClass('focus-visible:ring-secondary-500')
  })

  it('applies the danger variant classes when variant="danger"', () => {
    render(<Input variant="danger" placeholder="p" />)
    const input = screen.getByPlaceholderText('p')
    expect(input).toHaveClass('border-danger-500')
    expect(input).toHaveClass('focus-visible:ring-danger-500')
  })

  it('is disabled and shows the disabled visual when disabled', () => {
    render(<Input placeholder="p" disabled />)
    const input = screen.getByPlaceholderText('p')
    expect(input).toBeDisabled()
    expect(input).toHaveClass('disabled:opacity-60')
    expect(input).toHaveClass('disabled:cursor-not-allowed')
  })

  it('renders the error message and applies danger classes when error is set', () => {
    render(<Input placeholder="p" error="Bad input" />)
    const input = screen.getByPlaceholderText('p')
    expect(input).toHaveClass('border-danger-500')
    expect(screen.getByText('Bad input')).toBeInTheDocument()
  })

  it('error overrides an explicit non-danger variant', () => {
    render(<Input placeholder="p" variant="primary" error="Bad" />)
    const input = screen.getByPlaceholderText('p')
    expect(input).toHaveClass('border-danger-500')
    expect(input).not.toHaveClass('focus-visible:ring-primary-500')
  })

  it('forwards ref to the underlying input element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} placeholder="p" />)
    expect(ref.current?.tagName).toBe('INPUT')
    expect(ref.current).toBe(screen.getByPlaceholderText('p'))
  })

  it('fires onChange when the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Input placeholder="p" onChange={onChange} />)
    await user.type(screen.getByPlaceholderText('p'), 'hi')
    expect(onChange).toHaveBeenCalled()
  })
})
