'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type InputVariant = 'primary' | 'secondary' | 'danger'

export type InputProps = Readonly<
  InputHTMLAttributes<HTMLInputElement> & {
    variant?: InputVariant
    error?: string
  }
>

const BASE_CLASSES =
  'block w-full rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

const VARIANT_CLASSES: Record<InputVariant, string> = {
  primary: 'border-neutral-200 focus-visible:ring-primary-500',
  secondary: 'border-neutral-200 focus-visible:ring-secondary-500',
  danger: 'border-danger-500 focus-visible:ring-danger-500',
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { variant = 'primary', error, className, ...props },
  ref
) {
  const effectiveVariant: InputVariant = error ? 'danger' : variant

  return (
    <>
      <input
        ref={ref}
        className={cn(BASE_CLASSES, VARIANT_CLASSES[effectiveVariant], className)}
        {...props}
      />
      {error ? <p className="mt-1 text-base text-danger-500">{error}</p> : null}
    </>
  )
})

Input.displayName = 'Input'

export default Input
