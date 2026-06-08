import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'

export const metadata: Metadata = {
  title: 'Notes',
}

export default async function NotesPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-content space-y-6">
        <h1 className="font-display text-4xl text-neutral-900">Notes</h1>
      </div>
    </main>
  )
}
