'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type TextareaVariant = 'primary' | 'secondary' | 'danger'

export type TextareaProps = Readonly<
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant?: TextareaVariant
    error?: string
  }
>

const BASE_CLASSES =
  'block w-full resize-none rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60'

const VARIANT_CLASSES: Record<TextareaVariant, string> = {
  primary: 'border-neutral-200 focus-visible:ring-primary-500',
  secondary: 'border-neutral-200 focus-visible:ring-secondary-500',
  danger: 'border-danger-500 focus-visible:ring-danger-500',
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { variant = 'primary', error, className, rows = 4, ...props },
  ref
) {
  const effectiveVariant: TextareaVariant = error ? 'danger' : variant

  return (
    <>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(BASE_CLASSES, VARIANT_CLASSES[effectiveVariant], className)}
        {...props}
      />
      {error ? <p className="mt-1 text-base text-danger-500">{error}</p> : null}
    </>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea
