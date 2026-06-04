import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Jost, Oleo_Script_Swash_Caps } from 'next/font/google'
import { cn } from '@/lib/utils'
import '@/styles/globals.css'

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-jost',
  display: 'swap',
  weight: ['400', '500'],
})

const oleo = Oleo_Script_Swash_Caps({
  subsets: ['latin'],
  variable: '--font-oleo',
  display: 'swap',
  weight: ['400', '700'],
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
    <html lang="en" className={cn(jost.variable, oleo.variable)}>
      <body className={cn('bg-neutral-50 font-sans text-base text-neutral-900')}>{children}</body>
    </html>
  )
}
