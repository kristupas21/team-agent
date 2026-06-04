import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import SignInForm from '@/components/features/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <SignInForm />
      </Card>
    </main>
  )
}
