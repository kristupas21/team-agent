import Link from 'next/link'
import { buttonClass } from '@/components/ui/buttonClass'
import Card from '@/components/ui/Card'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <div className="text-center">
          <h1 className="text-4xl font-semibold">Hello there</h1>
          <p className="mt-4 text-base text-neutral-500">Please sign in to continue.</p>
          <div className="mt-6 space-y-3">
            <Link href="/sign-in" className={buttonClass('primary', 'block w-full text-center')}>
              Sign In
            </Link>
            <Link href="/sign-up" className={buttonClass('primary', 'block w-full text-center')}>
              Sign Up
            </Link>
          </div>
        </div>
      </Card>
    </main>
  )
}
