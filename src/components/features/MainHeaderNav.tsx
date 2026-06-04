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

export default function MainHeaderNav({ signedIn }: MainHeaderNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const showBack = pathname !== '/' && !pathname.startsWith('/dashboard')

  const onSignInPage = pathname === '/sign-in'
  const onSignUpPage = pathname === '/sign-up'

  return (
    <>
      <div>
        {showBack && (
          <Button
            type="button"
            variant="secondary"
            aria-label="Back"
            leftIcon={<MdArrowBack />}
            onClick={() => router.back()}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        {signedIn ? (
          <form action={signOutAction}>
            <Button type="submit" variant="primary" leftIcon={<MdLogout />}>
              Sign Out
            </Button>
          </form>
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
