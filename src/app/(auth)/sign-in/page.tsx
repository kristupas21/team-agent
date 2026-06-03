import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Card from '@/components/ui/Card'
import SignInForm from '@/components/features/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default async function SignInPage() {
  const session = await auth()
  if (session?.user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <SignInForm />
      </Card>
    </main>
  )
}
