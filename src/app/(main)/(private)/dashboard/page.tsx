import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import DashboardWidgetCard from '@/components/features/dashboard/DashboardWidgetCard'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-content space-y-6">
        <h1 className="font-display text-4xl text-neutral-900">Dashboard</h1>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />
          <DashboardWidgetCard href="/dashboard/notes" title="Notes" imageKey="notes" />
        </div>
      </div>
    </main>
  )
}
