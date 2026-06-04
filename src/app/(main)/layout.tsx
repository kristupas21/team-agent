import type { ReactNode } from 'react'
import MainHeader from '@/components/features/MainHeader'

type MainLayoutProps = Readonly<{
  children: ReactNode
}>

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <MainHeader />
      {children}
    </>
  )
}
