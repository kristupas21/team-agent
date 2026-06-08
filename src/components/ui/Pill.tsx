import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PillVariant = 'bordeaux' | 'amber' | 'slate' | 'light-blue'

type PillProps = Readonly<{
  variant: PillVariant
  children: ReactNode
  className?: string
}>

const BASE_CLASSES = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'

const VARIANT_CLASSES: Record<PillVariant, string> = {
  bordeaux: 'bg-bordeaux-50 text-bordeaux-700',
  amber: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-50 text-slate-700',
  'light-blue': 'bg-light-blue-50 text-light-blue-700',
}

export default function Pill({ variant, children, className }: PillProps) {
  return <span className={cn(BASE_CLASSES, VARIANT_CLASSES[variant], className)}>{children}</span>
}
