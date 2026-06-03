import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Card from '@/components/ui/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>hello card</Card>)
    expect(screen.getByText('hello card')).toBeInTheDocument()
  })

  it('applies the base class set to its root element', () => {
    render(<Card data-testid="card">content</Card>)
    const root = screen.getByTestId('card')
    expect(root).toHaveClass('w-full')
    expect(root).toHaveClass('rounded-lg')
    expect(root).toHaveClass('border')
    expect(root).toHaveClass('border-neutral-200')
    expect(root).toHaveClass('bg-white')
    expect(root).toHaveClass('p-6')
    expect(root).toHaveClass('md:max-w-md')
  })

  it('merges a consumer-provided className alongside the base classes', () => {
    render(
      <Card data-testid="card" className="extra-class">
        x
      </Card>
    )
    const root = screen.getByTestId('card')
    expect(root).toHaveClass('extra-class')
    expect(root).toHaveClass('bg-white')
  })
})
