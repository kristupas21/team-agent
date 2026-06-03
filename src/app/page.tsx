import Link from 'next/link'
import { auth } from '@/lib/auth'
import { signOutAction } from '@/actions/signOut'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonClass'
import Card from '@/components/ui/Card'

export default async function HomePage() {
  const session = await auth()
  const name = session?.user?.name

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card>
        <div className="text-center">
          <h1 className="text-4xl font-semibold">{name ? `Welcome, ${name}` : 'Hello there'}</h1>
          <p className="mt-4 text-base text-neutral-500">
            {name ? "You're signed in." : 'Please sign in to continue.'}
          </p>
          {name ? (
            <form action={signOutAction} className="mt-6">
              <Button type="submit" variant="primary">
                Sign Out
              </Button>
            </form>
          ) : (
            <div className="mt-6 space-y-3">
              <Link href="/sign-in" className={buttonClass('primary', 'block w-full text-center')}>
                Sign In
              </Link>
              <Link href="/sign-up" className={buttonClass('primary', 'block w-full text-center')}>
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </Card>
    </main>
  )
}
