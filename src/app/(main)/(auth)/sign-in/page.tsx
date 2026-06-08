import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import SignInForm from '@/components/features/auth/SignInForm'

export const metadata: Metadata = {
  title: 'Sign In',
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-20">
      <Card className="md:max-w-2xl">
        <SignInForm />
      </Card>
    </main>
  )
}
