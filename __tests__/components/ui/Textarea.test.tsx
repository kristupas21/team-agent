import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Textarea from '@/components/ui/Textarea'

describe('Textarea', () => {
  it('renders a textarea with the provided placeholder', () => {
    render(<Textarea placeholder="Your note" />)

    expect(screen.getByPlaceholderText('Your note')).toBeInTheDocument()
  })

  it('applies the primary variant classes by default', () => {
    render(<Textarea placeholder="p" />)

    const textarea = screen.getByPlaceholderText('p')

    expect(textarea).toHaveClass('border-neutral-200')
    expect(textarea).toHaveClass('focus-visible:ring-primary-500')
    expect(textarea).toHaveClass('resize-none')
  })

  it('applies the secondary variant classes when variant="secondary"', () => {
    render(<Textarea variant="secondary" placeholder="p" />)

    const textarea = screen.getByPlaceholderText('p')

    expect(textarea).toHaveClass('border-neutral-200')
    expect(textarea).toHaveClass('focus-visible:ring-secondary-500')
  })

  it('applies the danger variant classes when variant="danger"', () => {
    render(<Textarea variant="danger" placeholder="p" />)

    const textarea = screen.getByPlaceholderText('p')

    expect(textarea).toHaveClass('border-danger-500')
    expect(textarea).toHaveClass('focus-visible:ring-danger-500')
  })

  it('is disabled and shows the disabled visual when disabled', () => {
    render(<Textarea placeholder="p" disabled />)

    const textarea = screen.getByPlaceholderText('p')

    expect(textarea).toBeDisabled()
    expect(textarea).toHaveClass('disabled:opacity-60')
    expect(textarea).toHaveClass('disabled:cursor-not-allowed')
  })

  it('renders the error message and applies danger classes when error is set', () => {
    render(<Textarea placeholder="p" error="Bad input" />)

    const textarea = screen.getByPlaceholderText('p')

    expect(textarea).toHaveClass('border-danger-500')
    expect(screen.getByText('Bad input')).toBeInTheDocument()
  })

  it('error overrides an explicit non-danger variant', () => {
    render(<Textarea placeholder="p" variant="primary" error="Bad" />)

    const textarea = screen.getByPlaceholderText('p')

    expect(textarea).toHaveClass('border-danger-500')
    expect(textarea).not.toHaveClass('focus-visible:ring-primary-500')
  })

  it('forwards ref to the underlying textarea element', () => {
    const ref = createRef<HTMLTextAreaElement>()

    render(<Textarea ref={ref} placeholder="p" />)

    expect(ref.current?.tagName).toBe('TEXTAREA')
    expect(ref.current).toBe(screen.getByPlaceholderText('p'))
  })

  it('fires onChange when the user types', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Textarea placeholder="p" onChange={onChange} />)

    await user.type(screen.getByPlaceholderText('p'), 'hi')

    expect(onChange).toHaveBeenCalled()
  })
})
