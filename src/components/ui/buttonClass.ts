import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BASE_CLASSES =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-700 focus-visible:ring-secondary-500',
  danger: 'bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
}

export function buttonClass(variant: ButtonVariant = 'primary', extras?: string): string {
  return cn(BASE_CLASSES, VARIANT_CLASSES[variant], extras)
}
