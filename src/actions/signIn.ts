'use server'

import { signIn } from '@/lib/auth/auth'
import { isRedirectError } from '@/lib/errors'
import { signInSchema } from '@/lib/validation/signIn'
import { countUsers } from '@/lib/db/users'

export type SignInResult = { success: true } | { success: false; error: string }

const GENERIC_ERROR = 'Invalid name or password.'

export async function signInAction(input: {
  name: string
  password: string
}): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR }
  }

  let userCount: number

  try {
    userCount = await countUsers()
  } catch {
    return { success: false, error: GENERIC_ERROR }
  }

  if (userCount === 0) {
    console.info('[signIn] no admin user — seed required')

    return { success: false, error: GENERIC_ERROR }
  }

  try {
    await signIn('credentials', {
      name: parsed.data.name,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (err) {
    if (isRedirectError(err)) {
      throw err
    }

    return { success: false, error: GENERIC_ERROR }
  }

  return { success: true }
}
