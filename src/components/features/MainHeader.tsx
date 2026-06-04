import { auth } from '@/lib/auth'
import MainHeaderNav from './MainHeaderNav'

export default async function MainHeader() {
  const session = await auth()
  const signedIn = !!session?.user
  const userName = session?.user?.name ?? undefined

  return (
    <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-neutral-100">
      <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3">
        <MainHeaderNav signedIn={signedIn} userName={userName} />
      </div>
    </header>
  )
}
