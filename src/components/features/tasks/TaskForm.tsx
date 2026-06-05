'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { taskSchema, type TaskInput } from '@/lib/validation/task'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'

type TaskFormProps = Readonly<{
  submitLabel: string
  initialValues?: { title: string; description?: string }
  action: (input: { title: string; description?: string }) => Promise<
    { success: true } | { success: false; error: string }
  >
}>

export default function TaskForm({ submitLabel, initialValues, action }: TaskFormProps) {
  const { register, handleSubmit, formState, setError, clearErrors } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialValues,
  })

  const onValid = async (data: TaskInput): Promise<void> => {
    clearErrors('root')

    const result = await action(data)

    if (!result.success) {
      setError('root', { message: result.error })
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <label className="block">
        <span className="block text-base text-neutral-700">Title</span>
        <Input
          type="text"
          autoFocus
          {...register('title')}
          disabled={formState.isSubmitting}
          error={formState.errors.title?.message}
        />
      </label>

      <label className="block">
        <span className="block text-base text-neutral-700">Description (optional)</span>
        <Textarea
          {...register('description')}
          disabled={formState.isSubmitting}
          error={formState.errors.description?.message}
        />
      </label>

      <Button type="submit" variant="primary" loading={formState.isSubmitting}>
        {submitLabel}
      </Button>

      {formState.errors.root && (
        <p className="text-base text-danger-500">{formState.errors.root.message}</p>
      )}
    </form>
  )
}
