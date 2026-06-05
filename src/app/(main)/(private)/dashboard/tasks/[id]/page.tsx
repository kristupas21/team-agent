import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Card from '@/components/ui/Card'
import TaskForm from '@/components/features/TaskForm'
import { updateTaskAction } from '@/actions/updateTask'
import { getTaskById } from '@/lib/tasks'

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
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="md:max-w-lg">
        <TaskForm
          submitLabel="Save Task"
          initialValues={{ title: task.title, description: task.description }}
          action={action}
        />
      </Card>
    </main>
  )
}
