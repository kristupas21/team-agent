import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/auth.config'
import { decideRedirect } from '@/lib/redirect-rules'

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const dest = decideRedirect({ auth: req.auth, nextUrl: req.nextUrl, url: req.url })

  if (dest) {
    return Response.redirect(dest)
  }
})

export const config = {
  matcher: ['/dashboard/:path*', '/', '/sign-in', '/sign-up'],
}
