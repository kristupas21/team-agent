import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Pill from '@/components/ui/Pill'

describe('Pill', () => {
  it('renders its children', () => {
    render(<Pill variant="slate">Hello</Pill>)

    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('applies the base classes (rounded-full, inline-flex, text-xs, font-medium)', () => {
    render(<Pill variant="slate">Tag</Pill>)

    const pill = screen.getByText('Tag')

    expect(pill).toHaveClass('inline-flex', 'items-center', 'rounded-full', 'text-xs', 'font-medium')
  })

  it('applies the bordeaux variant tokens', () => {
    render(<Pill variant="bordeaux">Urgent</Pill>)

    const pill = screen.getByText('Urgent')

    expect(pill).toHaveClass('bg-bordeaux-50', 'text-bordeaux-700')
  })

  it('applies the amber variant tokens', () => {
    render(<Pill variant="amber">High</Pill>)

    const pill = screen.getByText('High')

    expect(pill).toHaveClass('bg-amber-50', 'text-amber-700')
  })

  it('applies the slate variant tokens', () => {
    render(<Pill variant="slate">Medium</Pill>)

    const pill = screen.getByText('Medium')

    expect(pill).toHaveClass('bg-slate-50', 'text-slate-700')
  })

  it('applies the light-blue variant tokens', () => {
    render(<Pill variant="light-blue">Low</Pill>)

    const pill = screen.getByText('Low')

    expect(pill).toHaveClass('bg-light-blue-50', 'text-light-blue-700')
  })

  it('merges a consumer-provided className', () => {
    render(
      <Pill variant="slate" className="ml-4">
        With margin
      </Pill>
    )

    expect(screen.getByText('With margin')).toHaveClass('ml-4', 'bg-slate-50')
  })
})
