'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUpAction } from '@/actions/signUp'
import { signUpSchema, type SignUpInput } from '@/lib/validation/signUp'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function SignUpForm() {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  const onValid = async (data: SignUpInput): Promise<void> => {
    clearErrors('root')

    const result = await signUpAction(data)

    if (!result.success) {
      setError('root', { message: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <label className="block">
        <span className="block text-base text-neutral-700">Name</span>
        <Input
          type="text"
          {...register('name')}
          disabled={formState.isSubmitting}
          error={formState.errors.name?.message}
        />
      </label>

      <label className="block">
        <span className="block text-base text-neutral-700">Password</span>
        <Input
          type="password"
          {...register('password')}
          disabled={formState.isSubmitting}
          error={formState.errors.password?.message}
        />
      </label>

      <Button type="submit" variant="primary" loading={formState.isSubmitting}>
        Sign Up
      </Button>

      {formState.errors.root && (
        <p className="text-base text-danger-500">{formState.errors.root.message}</p>
      )}
    </form>
  )
}
