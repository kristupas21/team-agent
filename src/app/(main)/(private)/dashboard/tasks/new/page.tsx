import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import Card from '@/components/ui/Card'
import TaskForm from '@/components/features/tasks/TaskForm'
import { createTaskAction } from '@/actions/createTask'

export const metadata: Metadata = {
  title: 'Create task',
}

export default async function CreateTaskPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-20">
      <div className="w-full space-y-6 md:max-w-2xl">
        <h1 className="font-display text-4xl text-neutral-900">New task</h1>

        <Card className="md:max-w-none">
          <TaskForm submitLabel="Create Task" action={createTaskAction} />
        </Card>
      </div>
    </main>
  )
}
