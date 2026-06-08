import { connectDB } from '@/lib/db/db'
import { UserModel, type UserDoc } from '@/models/User'

export async function findUserByName(name: string): Promise<UserDoc | null> {
  await connectDB()

  return UserModel.findOne({ name }).lean<UserDoc>().exec()
}

export async function countUsers(): Promise<number> {
  await connectDB()

  return UserModel.estimatedDocumentCount().exec()
}

export async function createUser(input: { name: string; passwordHash: string }): Promise<UserDoc> {
  await connectDB()

  const doc = await UserModel.create(input)

  return doc.toObject<UserDoc>()
}
