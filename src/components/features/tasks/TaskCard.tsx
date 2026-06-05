'use client'

import type { MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { MdClose } from 'react-icons/md'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { TaskDoc } from '@/models/Task'

type TaskCardProps = Readonly<{
  task: TaskDoc
  onDelete: (id: string) => void
  isDeleting: boolean
}>

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

function formatTaskDate(input: Date | string): string {
  return dateFormatter.format(input instanceof Date ? input : new Date(input))
}

export default function TaskCard({ task, onDelete, isDeleting }: TaskCardProps) {
  const router = useRouter()

  const handleCardClick = () => {
    router.push(`/dashboard/tasks/${task._id}`)
  }

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDelete(task._id)
  }

  return (
    <Card
      onClick={handleCardClick}
      className="group relative h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none"
    >
      <h3 className="text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50">
        {task.title}
      </h3>

      <p className="mt-1 text-sm text-neutral-500 transition-colors group-hover:text-neutral-300">
        Updated {formatTaskDate(task.updatedAt)}
      </p>

      {task.description && (
        <p className="mt-2 text-base text-neutral-500 transition-colors group-hover:text-neutral-200">
          {task.description}
        </p>
      )}

      <Button
        type="button"
        variant="ghost"
        aria-label="Delete"
        leftIcon={<MdClose />}
        loading={isDeleting}
        onClick={handleDeleteClick}
        className="absolute top-2 right-2 group-hover:text-neutral-50 group-hover:hover:bg-neutral-700"
      />
    </Card>
  )
}
