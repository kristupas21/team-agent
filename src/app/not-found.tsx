import Link from 'next/link'
import { buttonClass } from '@/components/ui/buttonClass'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="space-y-6 text-center">
        <h1 className="font-display text-4xl text-neutral-900">Not found</h1>

        <p className="max-w-md text-base text-neutral-500">
          {"We couldn't find that page."}
        </p>

        <Link href="/" className={buttonClass('primary')}>
          Go home
        </Link>
      </div>
    </main>
  )
}
