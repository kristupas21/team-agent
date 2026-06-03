'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { signInAction } from '@/actions/signIn'
import { signInSchema, type SignInInput } from '@/lib/validation/signIn'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function SignInForm() {
  const router = useRouter()

  const { register, handleSubmit, formState, setError, clearErrors } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  const onValid = async (data: SignInInput): Promise<void> => {
    clearErrors('root')

    const result = await signInAction(data)

    if (result.success) {
      router.push('/')
      return
    }

    setError('root', { message: result.error })
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
        Sign In
      </Button>

      {formState.errors.root && (
        <p className="text-base text-danger-500">{formState.errors.root.message}</p>
      )}
    </form>
  )
}
