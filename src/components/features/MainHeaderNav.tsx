'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { MdArrowBack, MdLogin, MdLogout, MdPersonAdd } from 'react-icons/md'
import Button from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonClass'
import { signOutAction } from '@/actions/signOut'

type MainHeaderNavProps = Readonly<{
  signedIn: boolean
  userName?: string
}>

export default function MainHeaderNav({ signedIn, userName }: MainHeaderNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const showBack =
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    (pathname.startsWith('/dashboard/') && pathname !== '/dashboard')

  const backTarget = pathname.replace(/\/[^/]+$/, '') || '/'

  const onSignInPage = pathname === '/sign-in'
  const onSignUpPage = pathname === '/sign-up'

  return (
    <>
      <div>
        {showBack && (
          <Button
            type="button"
            variant="ghost"
            aria-label="Back"
            leftIcon={<MdArrowBack />}
            onClick={() => router.push(backTarget)}
          >
            <span className="hidden md:inline">Back</span>
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {signedIn ? (
          <>
            {userName && (
              <div className="flex flex-col items-end leading-tight">
                <span className="text-xs text-neutral-500">Signed in as:</span>
                <span className="text-sm font-medium text-neutral-900">{userName}</span>
              </div>
            )}

            <form action={signOutAction}>
              <Button type="submit" variant="primary" aria-label="Sign out" leftIcon={<MdLogout />}>
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </form>
          </>
        ) : (
          <>
            {onSignInPage ? (
              <Button type="button" variant="primary" disabled leftIcon={<MdLogin />}>
                Sign In
              </Button>
            ) : (
              <Link href="/sign-in" className={buttonClass('primary')}>
                <MdLogin />
                Sign In
              </Link>
            )}

            {onSignUpPage ? (
              <Button type="button" variant="primary" disabled leftIcon={<MdPersonAdd />}>
                Sign Up
              </Button>
            ) : (
              <Link href="/sign-up" className={buttonClass('primary')}>
                <MdPersonAdd />
                Sign Up
              </Link>
            )}
          </>
        )}
      </div>
    </>
  )
}
