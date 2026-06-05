'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { MdAdd } from 'react-icons/md'
import TaskCard from './TaskCard'
import { deleteTaskAction } from '@/actions/deleteTask'
import type { TaskDoc } from '@/models/Task'

type TasksListProps = Readonly<{
  initialTasks: TaskDoc[]
}>

export default function TasksList({ initialTasks }: TasksListProps) {
  const [tasks, setTasks] = useState<TaskDoc[]>(initialTasks)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  const handleDelete = async (id: string): Promise<void> => {
    setDeletingIds((prev) => new Set(prev).add(id))

    const result = await deleteTaskAction(id)

    if (result.success) {
      setTasks((prev) => prev.filter((t) => t._id !== id))
    }

    setDeletingIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <AnimatePresence>
        {tasks.map((task) => (
          <motion.div
            key={task._id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <TaskCard
              task={task}
              onDelete={handleDelete}
              isDeleting={deletingIds.has(task._id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      <Link
        href="/dashboard/tasks/new"
        className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 p-6 text-center text-base text-neutral-500 transition-colors hover:border-primary-500 hover:text-primary-500"
      >
        <MdAdd className="text-2xl" />
        Create new task
      </Link>
    </div>
  )
}
