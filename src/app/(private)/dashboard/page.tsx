import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { signOutAction } from '@/actions/signOut'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <div className="text-center">
          <h1 className="text-4xl font-semibold">Welcome, {session.user.name}.</h1>
          <p className="mt-4 text-base text-neutral-500">This is your dashboard.</p>
          <form action={signOutAction} className="mt-6">
            <Button type="submit" variant="primary">
              Sign Out
            </Button>
          </form>
        </div>
      </Card>
    </main>
  )
}
