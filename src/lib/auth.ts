import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import { clientPromise } from '@/lib/db'
import { findUserByName } from '@/lib/users'
import { verifyPassword } from '@/lib/password'
import { signInSchema } from '@/lib/validation/signIn'
import { authConfig } from '@/lib/auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        name: { label: 'Name', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (raw) => {
        const parsed = signInSchema.safeParse(raw)

        if (!parsed.success) return null

        const user = await findUserByName(parsed.data.name)

        if (!user) return null

        const ok = await verifyPassword(parsed.data.password, user.passwordHash)

        if (!ok) return null

        return { id: user.name, name: user.name }
      },
    }),
  ],
})
