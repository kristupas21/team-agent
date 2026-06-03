import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type CardProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
  }
>

export default function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={cn('w-full rounded-lg border border-neutral-200 bg-white p-6 md:max-w-md', className)}
      {...props}
    >
      {children}
    </div>
  )
}
