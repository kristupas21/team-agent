import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import Card from '@/components/ui/Card'
import TaskForm from '@/components/features/tasks/TaskForm'
import { updateTaskAction } from '@/actions/updateTask'
import { getTaskById } from '@/lib/db/tasks'

export const metadata: Metadata = {
  title: 'Edit task',
}

type EditTaskPageProps = Readonly<{
  params: Promise<{ id: string }>
}>

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const session = await auth()

  if (!session?.user?.name) {
    redirect('/')
  }

  const { id } = await params
  const task = await getTaskById(id, session.user.name)

  if (!task) {
    notFound()
  }

  async function action(input: { title: string; description?: string }) {
    'use server'

    return updateTaskAction(task!._id, input)
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-20">
      <div className="w-full space-y-6 md:max-w-2xl">
        <h1 className="font-display text-4xl text-neutral-900">Edit task</h1>

        <Card className="md:max-w-none">
          <TaskForm
            submitLabel="Save Task"
            initialValues={{
              title: task.title,
              description: task.description,
              priority: task.priority,
            }}
            action={action}
          />
        </Card>
      </div>
    </main>
  )
}
