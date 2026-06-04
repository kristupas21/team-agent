import type { Metadata } from 'next'
import Card from '@/components/ui/Card'
import SignUpForm from '@/components/features/SignUpForm'

export const metadata: Metadata = {
  title: 'Sign Up',
}

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <SignUpForm />
      </Card>
    </main>
  )
}
