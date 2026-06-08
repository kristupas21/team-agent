import mongoose, { Schema, type Model } from 'mongoose'
import { TASK_PRIORITIES, type TaskPriority } from '@/lib/task-priority'

export type TaskDoc = {
  _id: string
  title: string
  description?: string
  priority: TaskPriority
  userId: string
  createdAt: Date
  updatedAt: Date
}

const taskSchema = new Schema<TaskDoc>(
  {
    title: { type: String, required: true },
    description: { type: String },
    priority: { type: String, required: true, enum: TASK_PRIORITIES, default: 'medium' },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
)

export const TaskModel: Model<TaskDoc> =
  (mongoose.models.Task as Model<TaskDoc> | undefined) ??
  mongoose.model<TaskDoc>('Task', taskSchema)
