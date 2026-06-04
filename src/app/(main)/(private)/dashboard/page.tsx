import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="space-y-6 text-center">
        <h1 className="font-display text-4xl text-neutral-900">
          Welcome, {session.user.name}.
        </h1>

        <p className="text-base text-neutral-500">{"You're signed in."}</p>
      </div>
    </main>
  )
}
