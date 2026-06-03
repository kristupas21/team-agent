import { z } from 'zod'

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, 'Name must be at least 5 characters.')
    .max(64, 'Name is too long.'),
  password: z
    .string()
    .min(5, 'Password must be at least 5 characters.')
    .max(128, 'Password is too long.'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
