import { describe, expect, it } from 'vitest'
import { authConfig } from '@/lib/auth/auth.config'

describe('authConfig (edge-safe split-config)', () => {
  it('does NOT include an adapter (would drag Node-only modules into Edge runtime)', () => {
    expect('adapter' in authConfig).toBe(false)
  })

  it('uses the JWT session strategy', () => {
    expect(authConfig.session?.strategy).toBe('jwt')
  })

  it('declares zero providers (providers belong in the full auth.ts only)', () => {
    expect(authConfig.providers).toHaveLength(0)
  })

  it('exposes jwt and session callbacks as functions', () => {
    expect(typeof authConfig.callbacks?.jwt).toBe('function')
    expect(typeof authConfig.callbacks?.session).toBe('function')
  })
})
