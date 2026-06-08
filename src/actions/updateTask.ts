'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { updateTask } from '@/lib/db/tasks'
import type { TaskPriority } from '@/lib/task-priority'
import { taskSchema } from '@/lib/validation/task'

export type UpdateTaskResult = { success: true } | { success: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Please try again.'

export async function updateTaskAction(
  id: string,
  input: { title: string; description?: string; priority?: TaskPriority }
): Promise<UpdateTaskResult> {
  const parsed = taskSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR }
  }

  const session = await auth()

  if (!session?.user?.name) {
    return { success: false, error: GENERIC_ERROR }
  }

  const updated = await updateTask(id, session.user.name, parsed.data)

  if (!updated) {
    return { success: false, error: 'Task not found.' }
  }

  // redirect throws NEXT_REDIRECT — do NOT wrap in try/catch.
  redirect('/dashboard/tasks')
}
