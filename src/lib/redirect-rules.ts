import type { Session } from 'next-auth'

type DecideRedirectInput = {
  auth: Session | null
  nextUrl: { pathname: string }
  url: string
}

export function decideRedirect(req: DecideRedirectInput): URL | undefined {
  const isAuth = !!req.auth
  const path = req.nextUrl.pathname
  const isPrivate = path === '/dashboard' || path.startsWith('/dashboard/')
  const isPublicOnly = path === '/' || path === '/sign-in' || path === '/sign-up'

  if (!isAuth && isPrivate) {
    return new URL('/', req.url)
  }

  if (isAuth && isPublicOnly) {
    return new URL('/dashboard', req.url)
  }

  return undefined
}
