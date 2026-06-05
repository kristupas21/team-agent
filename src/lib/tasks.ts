import { connectDB } from '@/lib/db'
import { TaskModel, type TaskDoc } from '@/models/Task'

export async function getTasksForUser(userName: string): Promise<TaskDoc[]> {
  await connectDB()

  const docs = await TaskModel.find({ userId: userName }).sort({ createdAt: -1 }).lean().exec()

  return docs.map((doc) => ({ ...doc, _id: String(doc._id) })) as TaskDoc[]
}

export async function createTask(input: {
  title: string
  description?: string
  userId: string
}): Promise<TaskDoc> {
  await connectDB()

  const doc = await TaskModel.create(input)
  const obj = doc.toObject<TaskDoc>()

  return { ...obj, _id: String(obj._id) }
}

export async function deleteTask(
  id: string,
  userName: string
): Promise<{ deleted: boolean }> {
  await connectDB()

  const result = await TaskModel.deleteOne({ _id: id, userId: userName })

  return { deleted: result.deletedCount > 0 }
}

export async function getTaskById(id: string, userName: string): Promise<TaskDoc | null> {
  await connectDB()

  const doc = await TaskModel.findOne({ _id: id, userId: userName }).lean().exec()

  if (!doc) return null

  return { ...doc, _id: String(doc._id) } as TaskDoc
}

export async function updateTask(
  id: string,
  userName: string,
  input: { title: string; description?: string }
): Promise<TaskDoc | null> {
  await connectDB()

  const doc = await TaskModel.findOneAndUpdate(
    { _id: id, userId: userName },
    { title: input.title, description: input.description },
    { new: true, lean: true }
  ).exec()

  if (!doc) return null

  return { ...doc, _id: String(doc._id) } as TaskDoc
}
