import { z } from 'zod'

export const signInSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(64, 'Name is too long.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password is too long.'),
})

export type SignInInput = z.infer<typeof signInSchema>
