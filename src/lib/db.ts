import mongoose from 'mongoose'
import { MongoClient } from 'mongodb'
import { requireEnv } from '@/lib/env'

const MONGODB_URI = requireEnv('MONGODB_URI')

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalForMongoose = globalThis as unknown as {
  __mongoose?: MongooseCache
}

const cached: MongooseCache = globalForMongoose.__mongoose ?? { conn: null, promise: null }
globalForMongoose.__mongoose = cached

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  cached.promise ??= mongoose.connect(MONGODB_URI).catch((err: unknown) => {
    console.error('[db] MongoDB connection error:', err)
    throw err
  })

  cached.conn = await cached.promise
  return cached.conn
}

const globalForMongoClient = globalThis as unknown as {
  __mongoClientPromise?: Promise<MongoClient>
}

async function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(MONGODB_URI)
  try {
    return await client.connect()
  } catch (err) {
    console.error('[db] MongoDB connection error:', err)
    throw err
  }
}

export const clientPromise: Promise<MongoClient> =
  globalForMongoClient.__mongoClientPromise ?? createClientPromise()

if (process.env.NODE_ENV !== 'production') {
  globalForMongoClient.__mongoClientPromise = clientPromise
}
