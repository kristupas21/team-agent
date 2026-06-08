import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dropdown from '@/components/ui/Dropdown'

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
] as const

describe('Dropdown', () => {
  it('renders one <option> per entry in options with correct value and label', () => {
    render(<Dropdown aria-label="Choice" options={options} />)

    const select = screen.getByRole('combobox', { name: 'Choice' })

    expect(select).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveValue('a')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveValue('b')
    expect(screen.getByRole('option', { name: 'Gamma' })).toHaveValue('c')
  })

  it('respects defaultValue', () => {
    render(<Dropdown aria-label="Choice" options={options} defaultValue="b" />)

    expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveValue('b')
  })

  it('applies the primary variant focus ring by default', () => {
    render(<Dropdown aria-label="Choice" options={options} />)

    expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveClass('focus-visible:ring-primary-500')
  })

  it('applies the secondary variant tokens', () => {
    render(<Dropdown aria-label="Choice" options={options} variant="secondary" />)

    expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveClass('focus-visible:ring-secondary-500')
  })

  it('applies the danger variant tokens', () => {
    render(<Dropdown aria-label="Choice" options={options} variant="danger" />)

    const select = screen.getByRole('combobox', { name: 'Choice' })

    expect(select).toHaveClass('border-danger-500', 'focus-visible:ring-danger-500')
  })

  it('renders the disabled state', () => {
    render(<Dropdown aria-label="Choice" options={options} disabled />)

    expect(screen.getByRole('combobox', { name: 'Choice' })).toBeDisabled()
  })

  it('renders the error message and forces the danger variant', () => {
    render(<Dropdown aria-label="Choice" options={options} error="Pick one" />)

    const select = screen.getByRole('combobox', { name: 'Choice' })

    expect(select).toHaveClass('border-danger-500', 'focus-visible:ring-danger-500')
    expect(screen.getByText('Pick one')).toBeInTheDocument()
  })

  it('error overrides an explicit secondary variant', () => {
    render(<Dropdown aria-label="Choice" options={options} variant="secondary" error="Nope" />)

    expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveClass('border-danger-500')
  })

  it('forwards ref to the underlying <select>', () => {
    const ref = createRef<HTMLSelectElement>()

    render(<Dropdown aria-label="Choice" options={options} ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLSelectElement)
  })

  it('fires onChange when the user picks a different option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Dropdown aria-label="Choice" options={options} onChange={onChange} defaultValue="a" />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Choice' }), 'c')

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('combobox', { name: 'Choice' })).toHaveValue('c')
  })

  it('applies appearance-none, peer, and the right-edge padding to the select', () => {
    render(<Dropdown aria-label="Choice" options={options} />)

    const select = screen.getByRole('combobox', { name: 'Choice' })

    expect(select).toHaveClass('appearance-none', 'peer', 'pl-3', 'pr-8')
    expect(select).not.toHaveClass('px-3')
  })

  it('renders a custom chevron icon as a sibling of the select within a relative wrapper', () => {
    const { container } = render(<Dropdown aria-label="Choice" options={options} />)

    const select = container.querySelector('select')
    const wrapper = select?.parentElement

    expect(wrapper).not.toBeNull()
    expect(wrapper).toHaveClass('relative')

    const chevron = wrapper?.querySelector('svg')

    expect(chevron).not.toBeNull()
  })

  it('chevron has the peer-focus rotate-180 + pointer-events-none classes', () => {
    const { container } = render(<Dropdown aria-label="Choice" options={options} />)

    const chevron = container.querySelector('select')?.parentElement?.querySelector('svg')

    expect(chevron).not.toBeNull()
    expect(chevron).toHaveClass(
      'pointer-events-none',
      'absolute',
      'right-2',
      'transition-transform',
      'peer-focus:rotate-180',
    )
  })
})
