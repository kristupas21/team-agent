'use client'

import { forwardRef, type SelectHTMLAttributes } from 'react'
import { MdKeyboardArrowDown } from 'react-icons/md'
import { cn } from '@/lib/utils'

type DropdownVariant = 'primary' | 'secondary' | 'danger'

export type DropdownOption = Readonly<{
  value: string
  label: string
}>

export type DropdownProps = Readonly<
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
    options: ReadonlyArray<DropdownOption>
    variant?: DropdownVariant
    error?: string
  }
>

const BASE_CLASSES =
  'peer block w-full appearance-none rounded-md border bg-white pl-3 pr-8 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

const VARIANT_CLASSES: Record<DropdownVariant, string> = {
  primary: 'border-neutral-200 focus-visible:ring-primary-500',
  secondary: 'border-neutral-200 focus-visible:ring-secondary-500',
  danger: 'border-danger-500 focus-visible:ring-danger-500',
}

const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(function Dropdown(
  { options, variant = 'primary', error, className, ...props },
  ref
) {
  const effectiveVariant: DropdownVariant = error ? 'danger' : variant

  return (
    <>
      <div className="relative">
        <select
          ref={ref}
          className={cn(BASE_CLASSES, VARIANT_CLASSES[effectiveVariant], className)}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <MdKeyboardArrowDown
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xl text-neutral-500 transition-transform peer-focus:rotate-180"
        />
      </div>
      {error ? <p className="mt-1 text-base text-danger-500">{error}</p> : null}
    </>
  )
})

Dropdown.displayName = 'Dropdown'

export default Dropdown
