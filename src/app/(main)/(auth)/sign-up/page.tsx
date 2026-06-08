import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import SignUpForm from '@/components/features/auth/SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up',
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-start justify-center px-4 pt-20">
      <Card className="md:max-w-2xl">
        <SignUpForm />
      </Card>
    </main>
  )
}
