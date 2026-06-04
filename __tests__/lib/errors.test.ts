import { describe, expect, it } from 'vitest'
import { isDuplicateKeyError, isRedirectError } from '@/lib/errors'
import { makeRedirectError } from '../test-utils/redirect-error'

describe('isRedirectError', () => {
  it('returns true for a NEXT_REDIRECT-shaped Error', () => {
    expect(isRedirectError(makeRedirectError())).toBe(true)
  })

  it('returns false for a plain Error without a digest', () => {
    expect(isRedirectError(new Error('oops'))).toBe(false)
  })

  it('returns false for a plain object that is not an Error instance', () => {
    expect(isRedirectError({ digest: 'NEXT_REDIRECT;push;/dashboard;307;' })).toBe(false)
  })

  it('returns false when digest does not start with NEXT_REDIRECT', () => {
    const err = new Error('x') as Error & { digest: string }
    err.digest = 'NEXT_NOT_FOUND;'

    expect(isRedirectError(err)).toBe(false)
  })

  it('returns false for null', () => {
    expect(isRedirectError(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isRedirectError(undefined)).toBe(false)
  })
})

describe('isDuplicateKeyError', () => {
  it('returns true for an Error with code === 11000', () => {
    const err = Object.assign(new Error('dup'), { code: 11000 })

    expect(isDuplicateKeyError(err)).toBe(true)
  })

  it('returns false for an Error with a different code', () => {
    const err = Object.assign(new Error('other'), { code: 11001 })

    expect(isDuplicateKeyError(err)).toBe(false)
  })

  it('returns false for an Error without a code property', () => {
    expect(isDuplicateKeyError(new Error('no code'))).toBe(false)
  })

  it('returns false for a plain object that is not an Error instance', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isDuplicateKeyError(null)).toBe(false)
  })
})
