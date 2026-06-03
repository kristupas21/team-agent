import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import Card from '@/components/ui/Card'
import SignUpForm from '@/components/features/SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up',
}

export default async function SignUpPage() {
  const session = await auth()

  if (session?.user) {
    redirect('/')
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <SignUpForm />
      </Card>
    </main>
  )
}
