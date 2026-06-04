import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Copse } from 'next/font/google'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'

const copse = Copse({
  subsets: ['latin'],
  variable: '--font-copse',
  display: 'swap',
  weight: '400',
})

export const metadata: Metadata = {
  title: 'Next.js App',
  description: 'Foundation app.',
}

type RootLayoutProps = Readonly<{
  children: ReactNode
}>

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={copse.variable}>
      <body className={cn('bg-neutral-50 font-sans text-base text-neutral-900')}>{children}</body>
    </html>
  )
}
