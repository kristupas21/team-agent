import mongoose from 'mongoose'
import { connectDB } from '../src/lib/db/db'
import { TaskModel } from '../src/models/Task'

async function main(): Promise<void> {
  await connectDB()

  const result = await TaskModel.updateMany(
    { priority: { $exists: false } },
    { $set: { priority: 'medium' } }
  )

  console.log(`Migration complete: ${result.modifiedCount} tasks updated.`)

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
