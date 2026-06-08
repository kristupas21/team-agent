'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { createTask } from '@/lib/db/tasks'
import type { TaskPriority } from '@/lib/task-priority'
import { taskSchema } from '@/lib/validation/task'

export type CreateTaskResult = { success: true } | { success: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Please try again.'

export async function createTaskAction(input: {
  title: string
  description?: string
  priority?: TaskPriority
}): Promise<CreateTaskResult> {
  const parsed = taskSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR }
  }

  const session = await auth()

  if (!session?.user?.name) {
    return { success: false, error: GENERIC_ERROR }
  }

  await createTask({
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    userId: session.user.name,
  })

  // redirect throws NEXT_REDIRECT — do NOT wrap in try/catch.
  redirect('/dashboard/tasks')
}
