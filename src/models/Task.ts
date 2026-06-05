import mongoose, { Schema, type Model } from 'mongoose'

export type TaskDoc = {
  _id: string
  title: string
  description?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

const taskSchema = new Schema<TaskDoc>(
  {
    title: { type: String, required: true },
    description: { type: String },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true }
)

export const TaskModel: Model<TaskDoc> =
  (mongoose.models.Task as Model<TaskDoc> | undefined) ??
  mongoose.model<TaskDoc>('Task', taskSchema)
