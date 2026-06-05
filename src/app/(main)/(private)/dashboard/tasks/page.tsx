import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTasksForUser } from '@/lib/tasks'
import TasksList from '@/components/features/TasksList'

export const metadata: Metadata = {
  title: 'Tasks',
}

export default async function TasksPage() {
  const session = await auth()

  if (!session?.user?.name) {
    redirect('/')
  }

  const tasks = await getTasksForUser(session.user.name)

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-content space-y-6">
        <h1 className="font-display text-4xl text-neutral-900">Your tasks</h1>

        <TasksList initialTasks={tasks} />
      </div>
    </main>
  )
}
