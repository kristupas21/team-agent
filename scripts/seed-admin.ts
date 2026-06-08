import mongoose from 'mongoose'
import { requireEnv } from '../src/lib/env'
import { connectDB } from '../src/lib/db/db'
import { hashPassword } from '../src/lib/auth/password'
import { UserModel } from '../src/models/User'

async function main(): Promise<void> {
  const name = requireEnv('ADMIN_NAME')
  const password = requireEnv('ADMIN_PASSWORD')

  await connectDB()

  const existing = await UserModel.findOne({ name }).lean().exec()

  if (existing) {
    console.info(`[seed-admin] admin user '${name}' already exists — skipping`)
    return
  }

  await UserModel.create({ name, passwordHash: await hashPassword(password) })

  console.info(`[seed-admin] created admin user '${name}'`)
}

main()
  .catch((err: unknown) => {
    console.error('[seed-admin] failed:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
