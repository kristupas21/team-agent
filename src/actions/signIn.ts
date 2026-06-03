'use server'

import { signIn } from '@/lib/auth'
import { signInSchema } from '@/lib/validation/signIn'
import { countUsers } from '@/lib/users'

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

  try {
    if ((await countUsers()) === 0) {
      console.info('[signIn] no admin user — seed required')

      return { success: false, error: GENERIC_ERROR }
    }

    await signIn('credentials', {
      name: parsed.data.name,
      password: parsed.data.password,
      redirect: false,
    })

    return { success: true }
  } catch {
    return { success: false, error: GENERIC_ERROR }
  }
}
