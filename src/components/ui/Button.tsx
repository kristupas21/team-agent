'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClass, type ButtonVariant } from './buttonClass'

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children: ReactNode
    variant?: ButtonVariant
    loading?: boolean
  }
>

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      className={buttonClass(variant, className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  )
}
