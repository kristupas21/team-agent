import { describe, expect, it } from 'vitest'
import type { Session } from 'next-auth'
import { decideRedirect } from '@/lib/redirect-rules'

function req(auth: Session | null, path: string) {
  return {
    auth,
    nextUrl: { pathname: path },
    url: `http://localhost:3000${path}`,
  }
}

const adminSession = { user: { name: 'admin' }, expires: '2099-01-01T00:00:00.000Z' } as Session

describe('decideRedirect — signed-out', () => {
  it('redirects /dashboard to /', () => {
    const dest = decideRedirect(req(null, '/dashboard'))

    expect(dest).toBeInstanceOf(URL)
    expect(dest?.pathname).toBe('/')
  })

  it('redirects nested /dashboard/sub to /', () => {
    const dest = decideRedirect(req(null, '/dashboard/sub'))

    expect(dest?.pathname).toBe('/')
  })

  it('passes through / unchanged', () => {
    expect(decideRedirect(req(null, '/'))).toBeUndefined()
  })

  it('passes through /sign-in unchanged', () => {
    expect(decideRedirect(req(null, '/sign-in'))).toBeUndefined()
  })

  it('passes through /sign-up unchanged', () => {
    expect(decideRedirect(req(null, '/sign-up'))).toBeUndefined()
  })
})

describe('decideRedirect — signed-in', () => {
  it('redirects / to /dashboard', () => {
    const dest = decideRedirect(req(adminSession, '/'))

    expect(dest).toBeInstanceOf(URL)
    expect(dest?.pathname).toBe('/dashboard')
  })

  it('redirects /sign-in to /dashboard', () => {
    const dest = decideRedirect(req(adminSession, '/sign-in'))

    expect(dest?.pathname).toBe('/dashboard')
  })

  it('redirects /sign-up to /dashboard', () => {
    const dest = decideRedirect(req(adminSession, '/sign-up'))

    expect(dest?.pathname).toBe('/dashboard')
  })

  it('passes through /dashboard unchanged', () => {
    expect(decideRedirect(req(adminSession, '/dashboard'))).toBeUndefined()
  })

  it('passes through nested /dashboard/sub unchanged', () => {
    expect(decideRedirect(req(adminSession, '/dashboard/sub'))).toBeUndefined()
  })
})
