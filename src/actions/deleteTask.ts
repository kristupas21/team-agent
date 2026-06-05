'use server'

import { auth } from '@/lib/auth'
import { deleteTask } from '@/lib/tasks'

export type DeleteTaskResult = { success: true } | { success: false; error: string }

export async function deleteTaskAction(id: string): Promise<DeleteTaskResult> {
  const session = await auth()

  if (!session?.user?.name) {
    return { success: false, error: 'Not authorised.' }
  }

  let result: { deleted: boolean }

  try {
    result = await deleteTask(id, session.user.name)
  } catch {
    // Mongoose throws CastError for malformed ObjectId strings — collapse to not-found.
    return { success: false, error: 'Task not found.' }
  }

  if (!result.deleted) {
    return { success: false, error: 'Task not found.' }
  }

  return { success: true }
}
