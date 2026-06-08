'use client'

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { buttonClass, type ButtonVariant } from './buttonClass'

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children?: ReactNode
    variant?: ButtonVariant
    loading?: boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
    compact?: boolean
  }
>

export default function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  compact = false,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      className={cn(buttonClass(variant), compact && 'p-2', className)}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        'Loading...'
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}
