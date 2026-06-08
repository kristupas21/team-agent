'use server'

import { signIn } from '@/lib/auth/auth'
import { isDuplicateKeyError } from '@/lib/errors'
import { hashPassword } from '@/lib/auth/password'
import { createUser } from '@/lib/db/users'
import { signUpSchema } from '@/lib/validation/signUp'

export type SignUpResult = { success: true } | { success: false; error: string }

const GENERIC_ERROR = 'Something went wrong. Please try again.'
const DUPLICATE_ERROR = 'Username is already taken.'

export async function signUpAction(input: {
  name: string
  password: string
}): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input)

  if (!parsed.success) {
    return { success: false, error: GENERIC_ERROR }
  }

  const { name, password } = parsed.data

  try {
    const passwordHash = await hashPassword(password)
    await createUser({ name, passwordHash })
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      return { success: false, error: DUPLICATE_ERROR }
    }

    return { success: false, error: GENERIC_ERROR }
  }

  // signIn throws NEXT_REDIRECT — do NOT wrap in try/catch.
  await signIn('credentials', { name, password, redirectTo: '/dashboard' })

  return { success: true }
}
