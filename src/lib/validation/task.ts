import { z } from 'zod'
import { TASK_PRIORITIES } from '@/lib/task-priority'

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters.')
    .max(64, 'Title is too long.'),
  description: z
    .string()
    .max(256, 'Description is too long.')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
})

export type TaskInput = z.infer<typeof taskSchema>
