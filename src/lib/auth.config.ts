import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.name) {
        token.name = user.name
      }

      return token
    },
    session: async ({ session, token }) => {
      if (token.name) {
        session.user.name = token.name
      }

      return session
    },
  },
} satisfies NextAuthConfig
