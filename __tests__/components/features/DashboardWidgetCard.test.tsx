import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardWidgetCard from '@/components/features/dashboard/DashboardWidgetCard'

describe('DashboardWidgetCard', () => {
  it('renders the title as a heading', () => {
    render(<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />)

    expect(screen.getByRole('heading', { level: 3, name: 'Tasks' })).toBeInTheDocument()
  })

  it('renders as a Link pointing at the provided href', () => {
    render(<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />)

    expect(screen.getByRole('link', { name: /tasks/i })).toHaveAttribute('href', '/dashboard/tasks')
  })

  it('applies the dark-hover styling tokens to the heading and the card surface', () => {
    render(<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />)

    const heading = screen.getByRole('heading', { level: 3, name: 'Tasks' })

    expect(heading).toHaveClass('group-hover:text-neutral-50')

    const card = heading.parentElement

    expect(card).not.toBeNull()
    expect(card).toHaveClass('group', 'hover:bg-neutral-900')
  })

  it('does NOT render a description, an "Updated" date line, or a Delete button', () => {
    render(<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />)

    expect(screen.queryByText(/^Updated /)).toBeNull()
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
  })

  it('renders the mapped image when imageKey is provided', () => {
    const { container } = render(
      <DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />,
    )

    const image = container.querySelector('img')

    expect(image).not.toBeNull()
    expect(image).toHaveAttribute('alt', '')
    expect(image?.getAttribute('src')).toContain('cat.png')
  })

  it('applies the blend and hover-filter classes to the image', () => {
    const { container } = render(
      <DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />,
    )

    const image = container.querySelector('img')

    expect(image).not.toBeNull()
    expect(image).toHaveClass(
      'opacity-60',
      'mix-blend-multiply',
      'group-hover:mix-blend-hard-light',
      'group-hover:grayscale',
      'group-hover:brightness-150',
    )
  })

  it('positions the image absolutely with right-anchored offset and top-[15%]', () => {
    const { container } = render(
      <DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />,
    )

    const image = container.querySelector('img')

    expect(image).not.toBeNull()
    expect(image).toHaveClass('absolute', '-right-20', 'top-[15%]', 'w-[30rem]')
  })

  it('applies the fixed h-64 height to the Card surface', () => {
    render(<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />)

    const heading = screen.getByRole('heading', { level: 3, name: 'Tasks' })
    const card = heading.parentElement

    expect(card).not.toBeNull()
    expect(card).toHaveClass('h-64')
  })

  it('does NOT render any image when imageKey is omitted, but still applies the fixed h-64 height', () => {
    const { container } = render(<DashboardWidgetCard href="/whatever" title="Settings" />)

    expect(container.querySelector('img')).toBeNull()

    const heading = screen.getByRole('heading', { level: 3, name: 'Settings' })
    const card = heading.parentElement

    expect(card).not.toBeNull()
    expect(card).toHaveClass('h-64')
  })
})
