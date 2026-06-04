# Build Plan: Private Routes + Styling Refresh

## Overview
One new page (`/dashboard`), a rewritten `middleware.ts`, three thin page-component edits (home page de-asyncs; sign-in/sign-up pages drop their per-page redirects), two action edits (redirect destination flip + try/catch reshape in `signInAction`), two form edits (autofocus + drop the `router.push` in `SignInForm`), and a global swap in `layout.tsx` + `tailwind.config.ts` (font + palette). No new dependencies, no new domain models, no new tests.

Structural calls worth flagging:
1. **Middleware is the single source of truth for route protection.** Both `/sign-in/page.tsx` and `/sign-up/page.tsx` lose their `auth()` redirect calls — middleware bounces signed-in visitors *before* the page-level code runs. `/dashboard/page.tsx` keeps a defensive `if (!session?.user) redirect('/')` because middleware misconfiguration would otherwise expose data.
2. **`signInAction`'s try/catch is reshaped, not just retargeted.** The original wraps the count check *and* the `signIn(...)` call. Once `signIn(...)` throws `NEXT_REDIRECT`, that bare `catch {}` would swallow it. Narrow the catch to `countUsers()` only — the `signIn(...)` call sits outside, exactly like `signUpAction` already does.
3. **`SignInForm` loses `useRouter`** entirely. The server action now performs the navigation via `NEXT_REDIRECT`. The form keeps `setError('root', ...)` for the failure branch.
4. **`(private)` route group** sits parallel to `(auth)` so future private routes (settings, profile, billing) co-locate naturally.
5. **Font Copse is a serif.** Tailwind's `fontFamily.sans` fallback chain becomes `['var(--font-copse)', 'ui-serif', 'Georgia', 'serif']` — the existing `font-sans` utility class continues to work, but its glyphs are now serif.
6. **The palette swap is purely value-level** in `tailwind.config.ts`. Class names and the tests that check them are unaffected.

## Reuse

Existing files used as-is:
- `src/lib/auth.ts` — exports `auth` (used by both `middleware.ts` and the dashboard page) unchanged.
- `src/lib/utils.ts` — `cn()` still used by the new page.
- `src/lib/users.ts`, `src/lib/password.ts`, `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/validation/{signIn,signUp}.ts`, `src/models/User.ts`, `scripts/seed-admin.ts` — untouched.
- `src/actions/signOut.ts` — already calls `signOut({ redirectTo: '/' })` from the cookie-clear fix; unchanged.
- `src/components/ui/{Button,Input,Card}.tsx` + `buttonClass.ts` — unchanged.
- `src/components/features/SignUpForm.tsx` — only the Name `<Input>` gains `autoFocus`.
- `src/app/api/auth/[...nextauth]/route.ts` — unchanged.
- `src/styles/globals.css` — unchanged (the `html { font-size: 62.5% }` rule + Tailwind imports stay; only the font/palette flow through Tailwind config).
- `package.json`, `vitest.config.mts`, `tsconfig.json`, `next.config.ts` — unchanged.

## Files to Create

### `src/app/(private)/dashboard/page.tsx`
- **Type**: server component
- **Purpose**: signed-in landing surface.
- **Implementation outline**:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import { signOutAction } from '@/actions/signOut'
  import Button from '@/components/ui/Button'
  import Card from '@/components/ui/Card'

  export const metadata: Metadata = {
    title: 'Dashboard',
  }

  export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user) {
      redirect('/')
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <div className="text-center">
            <h1 className="text-4xl font-semibold">Welcome, {session.user.name}.</h1>
            <p className="mt-4 text-base text-neutral-500">This is your dashboard.</p>
            <form action={signOutAction} className="mt-6">
              <Button type="submit" variant="primary">
                Sign Out
              </Button>
            </form>
          </div>
        </Card>
      </main>
    )
  }
  ```
- **Reference pattern**: matches `src/app/(auth)/sign-in/page.tsx` for the wrapper layout and `src/app/page.tsx` (current signed-in branch) for the welcome card markup.

## Files to Modify

### `middleware.ts`
- **What changes**: replace the bare re-export with a full implementation.
- **Outline**:
  ```ts
  import { auth } from '@/lib/auth'

  export default auth((req) => {
    const isAuth = !!req.auth
    const path = req.nextUrl.pathname
    const isPrivate = path === '/dashboard' || path.startsWith('/dashboard/')
    const isPublicOnly = path === '/' || path === '/sign-in' || path === '/sign-up'

    if (!isAuth && isPrivate) {
      return Response.redirect(new URL('/', req.url))
    }

    if (isAuth && isPublicOnly) {
      return Response.redirect(new URL('/dashboard', req.url))
    }
  })

  export const config = {
    matcher: ['/dashboard/:path*', '/', '/sign-in', '/sign-up'],
  }
  ```
- **Why**:
  - `auth((req) => ...)` is Auth.js v5's middleware wrapper. The wrapper populates `req.auth` from the JWT cookie and invokes the inner function for each request matching the matcher.
  - The matcher's allow-list of four routes is the simpler-than-negative-lookahead form. The `/dashboard/:path*` segment also covers future nested dashboard routes (e.g. `/dashboard/orders`).
  - Returning `undefined` from the inner function tells Next.js "no rewrite, no redirect — let the route render normally".
- **Build-order constraint**: this must land before the page-level `auth()` calls in `/sign-in/page.tsx` and `/sign-up/page.tsx` get removed, otherwise signed-in users would briefly be able to see the auth pages between deploys (irrelevant in dev; matters for the build-order discipline).

### `src/app/page.tsx`
- **What changes**: convert from `async function HomePage` (currently calls `auth()`) to a synchronous component that renders the signed-out content unconditionally. Drop the signed-in branch entirely.
- **Diff in spirit**:
  ```tsx
  // BEFORE
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
      ...
      {name ? ( /* signed-in branch */ ) : ( /* signed-out branch */ )}
    )
  }

  // AFTER
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
  ```
- **Why**: AC #10 — the signed-in branch must not exist in the file at all.

### `src/app/(auth)/sign-in/page.tsx`
- **What changes**: drop `await auth()` and the conditional `redirect('/')`. Convert from `async function` to a synchronous function. Keep metadata and the render shell.
- **Outline**:
  ```tsx
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
  ```
- **Why**: AC #11. Middleware handles the signed-in-redirect upstream.

### `src/app/(auth)/sign-up/page.tsx`
- **What changes**: same as sign-in — drop `await auth()` and the conditional redirect.
- **Outline**: same shape as above with `<SignUpForm />` and `title: 'Sign Up'`.
- **Why**: AC #12.

### `src/actions/signIn.ts`
- **What changes**:
  1. `signIn('credentials', { ..., redirect: false })` → `signIn('credentials', { ..., redirectTo: '/dashboard' })`.
  2. **Reshape the try/catch**: narrow it to `countUsers()` only so the subsequent `signIn(...)` call's `NEXT_REDIRECT` throw propagates.
- **Outline (after the changes)**:
  ```ts
  'use server'

  import { signIn } from '@/lib/auth'
  import { signInSchema } from '@/lib/validation/signIn'
  import { countUsers } from '@/lib/users'

  export type SignInResult = { success: true } | { success: false; error: string }

  const GENERIC_ERROR = 'Invalid name or password.'

  export async function signInAction(input: {
    name: string
    password: string
  }): Promise<SignInResult> {
    const parsed = signInSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR }
    }

    let userCount: number

    try {
      userCount = await countUsers()
    } catch {
      return { success: false, error: GENERIC_ERROR }
    }

    if (userCount === 0) {
      console.info('[signIn] no admin user — seed required')

      return { success: false, error: GENERIC_ERROR }
    }

    // signIn throws NEXT_REDIRECT — do NOT wrap in try/catch.
    await signIn('credentials', {
      name: parsed.data.name,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })

    return { success: true }
  }
  ```
- **Critical correctness note**:
  - The original code's broad `try { countUsers; signIn(...) } catch { return GENERIC_ERROR }` would swallow `NEXT_REDIRECT` and trap the user on `/sign-in` with the generic error.
  - The shape above narrows the catch to only `countUsers()` (a real DB error path). The `signIn(...)` call sits outside the catch.
  - If `signIn(...)` itself throws a non-redirect error (rare — e.g. malformed credentials made it past the schema), the unhandled rejection propagates to Next.js's error boundary. This is acceptable because (a) Zod already filtered malformed credentials, (b) the Credentials provider's `authorize` returns `null` for wrong-password, which surfaces as a thrown `CredentialsSignin` error from `signIn(...)`. **That's a complication** — for wrong-password, the user does NOT want to be redirected; they want to see the generic error. See "Auth.js wrong-password handling" below.
- **Auth.js wrong-password handling**: in Auth.js v5, `signIn('credentials', { ..., redirectTo })` throws `CredentialsSignin` when `authorize()` returns `null`. To distinguish this from a real `NEXT_REDIRECT` (success), the action must catch `CredentialsSignin` specifically and re-throw anything else (the `NEXT_REDIRECT` for the success case). Practically:
  ```ts
  try {
    await signIn('credentials', {
      name: parsed.data.name,
      password: parsed.data.password,
      redirectTo: '/dashboard',
    })
  } catch (err) {
    if (isRedirectError(err)) {
      throw err // let Next.js handle the redirect
    }
    return { success: false, error: GENERIC_ERROR }
  }

  return { success: true } // unreachable
  ```
  Where `isRedirectError` is either Next.js's own helper (`import { isRedirectError } from 'next/dist/client/components/redirect'` — internal API, fragile) or a manual check: `err instanceof Error && 'digest' in err && typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT')`.
  - **Architect's recommendation**: use the manual `'digest'` check. It's stable across Next.js versions and avoids importing from `next/dist/...` internal paths.
- **Final shape recommended for `signInAction`**:
  ```ts
  'use server'

  import { signIn } from '@/lib/auth'
  import { signInSchema } from '@/lib/validation/signIn'
  import { countUsers } from '@/lib/users'

  export type SignInResult = { success: true } | { success: false; error: string }

  const GENERIC_ERROR = 'Invalid name or password.'

  export async function signInAction(input: {
    name: string
    password: string
  }): Promise<SignInResult> {
    const parsed = signInSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR }
    }

    let userCount: number

    try {
      userCount = await countUsers()
    } catch {
      return { success: false, error: GENERIC_ERROR }
    }

    if (userCount === 0) {
      console.info('[signIn] no admin user — seed required')

      return { success: false, error: GENERIC_ERROR }
    }

    try {
      await signIn('credentials', {
        name: parsed.data.name,
        password: parsed.data.password,
        redirectTo: '/dashboard',
      })
    } catch (err) {
      if (isRedirectError(err)) {
        throw err
      }

      return { success: false, error: GENERIC_ERROR }
    }

    return { success: true }
  }

  function isRedirectError(err: unknown): boolean {
    return (
      err instanceof Error &&
      'digest' in err &&
      typeof (err as { digest?: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    )
  }
  ```
- **Why**: AC #13 — `redirectTo: '/dashboard'`, no `redirect: false`. The Auth.js wrong-password path is what makes this less trivial than `signUpAction`.

### `src/actions/signUp.ts`
- **What changes**: one line — `redirectTo: '/'` → `redirectTo: '/dashboard'`.
- **Outline**: same as today, except the `redirectTo` value. The try/catch boundary around `createUser(...)` stays exactly as is.
- **Why**: AC #14.
- **Auth.js wrong-password handling**: not applicable. `signUpAction` has just created the user, so the `signIn(...)` invocation MUST succeed; the only thrown error is `NEXT_REDIRECT` (success). Wrong-password isn't reachable in practice. Keep the bare `await signIn(...)` outside try/catch.

### `src/components/features/SignInForm.tsx`
- **What changes**:
  1. Remove the `import { useRouter } from 'next/navigation'` line.
  2. Remove the `const router = useRouter()` declaration.
  3. Remove the `if (result.success) { router.push('/'); return }` branch from `onValid`.
  4. Add `autoFocus` prop to the Name `<Input>`.
- **Outline (after)**:
  ```tsx
  'use client'

  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { signInAction } from '@/actions/signIn'
  import { signInSchema, type SignInInput } from '@/lib/validation/signIn'
  import Button from '@/components/ui/Button'
  import Input from '@/components/ui/Input'

  export default function SignInForm() {
    const { register, handleSubmit, formState, setError, clearErrors } = useForm<SignInInput>({
      resolver: zodResolver(signInSchema),
    })

    const onValid = async (data: SignInInput): Promise<void> => {
      clearErrors('root')
      const result = await signInAction(data)

      if (!result.success) {
        setError('root', { message: result.error })
      }
    }

    return (
      <form onSubmit={handleSubmit(onValid)} className="space-y-4">
        <label className="block">
          <span className="block text-base text-neutral-700">Name</span>
          <Input
            type="text"
            autoFocus
            {...register('name')}
            disabled={formState.isSubmitting}
            error={formState.errors.name?.message}
          />
        </label>

        <label className="block">
          <span className="block text-base text-neutral-700">Password</span>
          <Input
            type="password"
            {...register('password')}
            disabled={formState.isSubmitting}
            error={formState.errors.password?.message}
          />
        </label>

        <Button type="submit" variant="primary" loading={formState.isSubmitting}>
          Sign In
        </Button>

        {formState.errors.root && (
          <p className="text-base text-danger-500">{formState.errors.root.message}</p>
        )}
      </form>
    )
  }
  ```
- **Why**: ACs #15, #22. The form's `onValid` now only handles the failure branch; success is the server action's redirect.

### `src/components/features/SignUpForm.tsx`
- **What changes**: add `autoFocus` to the Name `<Input>`. Nothing else.
- **Why**: AC #23.

### `src/app/layout.tsx`
- **What changes**: replace `Inter` with `Copse` from `next/font/google`. Update the variable name to `--font-copse`. Apply to `<html>`.
- **Outline**:
  ```tsx
  import type { Metadata } from 'next'
  import type { ReactNode } from 'react'
  import { Copse } from 'next/font/google'
  import { cn } from '@/lib/utils'
  import '@/styles/globals.css'

  const copse = Copse({
    subsets: ['latin'],
    variable: '--font-copse',
    display: 'swap',
    weight: '400',
  })

  export const metadata: Metadata = {
    title: 'Next.js App',
    description: 'Foundation app.',
  }

  type RootLayoutProps = Readonly<{
    children: ReactNode
  }>

  export default function RootLayout({ children }: RootLayoutProps) {
    return (
      <html lang="en" className={copse.variable}>
        <body className={cn('bg-neutral-50 font-sans text-base text-neutral-900')}>{children}</body>
      </html>
    )
  }
  ```
- **Why**: AC #16. `weight: '400'` because Copse only ships one weight on Google Fonts.

### `tailwind.config.ts`
- **What changes**:
  1. `theme.extend.fontFamily.sans`: replace `var(--font-inter)` → `var(--font-copse)`. Update the fallback chain from `['ui-sans-serif', 'system-ui', 'sans-serif']` to `['ui-serif', 'Georgia', 'serif']` because Copse is a serif.
  2. `theme.extend.colors`: replace each token's hex map with the new pastel set from Assumption 10 of the spec.
- **Outline of the new `theme.extend`**:
  ```ts
  theme: {
    extend: {
      colors: {
        primary: { 50: '#e7f0ee', 500: '#7faaa3', 700: '#5f8b85' },
        secondary: { 50: '#f6e6e2', 500: '#c89b94', 700: '#a37b75' },
        neutral: {
          50: '#f7f5f2',
          200: '#e7e3dc',
          500: '#857c70',
          700: '#5a5247',
          900: '#2f2a23',
        },
        danger: { 50: '#f5e1dc', 500: '#c97c6d', 700: '#a35a4c' },
        success: { 50: '#e7eee0', 500: '#8aa775', 700: '#688553' },
      },
      fontFamily: {
        sans: ['var(--font-copse)', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: { /* unchanged */ },
      spacing: { /* unchanged */ },
    },
  },
  ```
- **Why**: ACs #17, #19. The `fontSize` and `spacing` scales established in `04-basic-styling` stay unchanged.

## Files NOT Modified

- `src/components/ui/{Button,Input,Card}.tsx`, `src/components/ui/buttonClass.ts` — colour utility classes (`bg-primary-500`, `border-danger-500`, etc.) are name-stable; the new hexes flow through Tailwind without code changes.
- `__tests__/components/ui/*.test.tsx` — assertions target class names, not hexes. Still pass.
- `src/actions/signOut.ts` — already uses `signOut({ redirectTo: '/' })`.
- `src/lib/auth.ts` — providers and callbacks unchanged.
- `src/styles/globals.css` — `html { font-size: 62.5% }` + Tailwind base imports unchanged.

## Data Flow

### Signed-out user lands on `/dashboard`
1. Browser GET `/dashboard`.
2. Middleware runs (matcher matches). `req.auth` is `null`. `isPrivate === true`. Returns redirect to `/`.
3. Browser receives 307 → `/`.
4. Public home renders.

### Signed-in user lands on `/`, `/sign-in`, or `/sign-up`
1. Middleware runs. `req.auth` populated. `isPublicOnly === true`. Returns redirect to `/dashboard`.
2. Browser receives 307 → `/dashboard`.
3. Middleware runs again (path = `/dashboard`, matcher matches). `req.auth` populated. Neither condition fires. Returns undefined (pass through).
4. Dashboard page renders.

### Sign-in → dashboard
1. User submits `/sign-in` form. `SignInForm` calls `signInAction(data)`.
2. Server: validate → count check → `signIn('credentials', { ..., redirectTo: '/dashboard' })`. Credentials provider's `authorize` returns the user; Auth.js writes the JWT cookie; throws `NEXT_REDIRECT` with destination `/dashboard`.
3. Action's `try/catch` checks `isRedirectError(err)` → re-throws. Next.js handles the redirect.
4. Browser GET `/dashboard` with new cookie. Middleware lets through. Dashboard renders.

### Sign-up → dashboard
1. User submits `/sign-up` form. `SignUpForm` calls `signUpAction(data)`.
2. Server: validate → hash → `createUser(...)` → `signIn('credentials', { ..., redirectTo: '/dashboard' })`. Cookie set, `NEXT_REDIRECT` thrown.
3. (No try/catch around `signIn(...)` in `signUpAction` — `signUp` always succeeds at this point because the user was just created.)
4. Browser GET `/dashboard` with new cookie. Renders.

### Wrong-password sign-in
1. User submits wrong password. `signInAction` runs validate → count check → `signIn(...)` throws `CredentialsSignin` (NOT a redirect).
2. Action catches, `isRedirectError(err)` returns `false`, returns `{ success: false, error: GENERIC_ERROR }`.
3. `SignInForm` reads `result.success === false`, calls `setError('root', { message: GENERIC_ERROR })`. Form renders the error message.

### Sign-out
1. Dashboard user clicks Sign Out. Form submits to `signOutAction`.
2. Action: `signOut({ redirectTo: '/' })` → cookie cleared, `NEXT_REDIRECT` to `/`.
3. Browser GET `/` with no cookie. Middleware lets through. Home renders.

## State Management

- **Server state**: still read via `auth()` in the dashboard page. `req.auth` in middleware. No client cache.
- **Client state** (`SignInForm` only): RHF owns name/password/error/isSubmitting. `useRouter` removed. No state added.
- **Global state**: none.

## Types

No new types. The existing `SignInResult`, `SignUpResult`, `UserDoc`, `SignInInput`, `SignUpInput` are reused unchanged.

A small local helper inside `src/actions/signIn.ts`:
```ts
function isRedirectError(err: unknown): boolean
```

## File Tree

```
/
├── middleware.ts                                       (modified — full implementation)
├── tailwind.config.ts                                  (modified — palette + fontFamily.sans)
└── src/
    ├── actions/
    │   ├── signIn.ts                                   (modified — redirectTo + try/catch reshape + isRedirectError)
    │   └── signUp.ts                                   (modified — redirectTo /dashboard)
    ├── app/
    │   ├── layout.tsx                                  (modified — Copse font)
    │   ├── page.tsx                                    (modified — drop signed-in branch, sync)
    │   ├── (auth)/
    │   │   ├── sign-in/page.tsx                        (modified — drop auth() redirect, sync)
    │   │   └── sign-up/page.tsx                        (modified — same)
    │   └── (private)/
    │       └── dashboard/page.tsx                      (new)
    └── components/
        └── features/
            ├── SignInForm.tsx                          (modified — drop useRouter, add autoFocus)
            └── SignUpForm.tsx                          (modified — add autoFocus)
```

## Build Order

1. **Middleware**: rewrite `middleware.ts` with the full implementation.
2. **Dashboard page**: create `src/app/(private)/dashboard/page.tsx`.
3. **Server actions** (before pages so the new redirect destination is in place when pages route through):
   - `src/actions/signUp.ts`: one-line change.
   - `src/actions/signIn.ts`: reshape try/catch, switch to `redirectTo`, add `isRedirectError` helper.
4. **Forms**:
   - `src/components/features/SignInForm.tsx`: drop `useRouter`/`router.push`, add `autoFocus`.
   - `src/components/features/SignUpForm.tsx`: add `autoFocus`.
5. **Page-level cleanup**:
   - `src/app/(auth)/sign-in/page.tsx`: drop `auth()`/`redirect()`, convert to sync.
   - `src/app/(auth)/sign-up/page.tsx`: same.
   - `src/app/page.tsx`: drop signed-in branch + `auth()` call, convert to sync.
6. **Layout**:
   - `src/app/layout.tsx`: swap `Inter` → `Copse`, update variable name.
7. **Tailwind config**:
   - `tailwind.config.ts`: update palette + `fontFamily.sans`.
8. **Verify (compile-time)**:
   - `npx tsc --noEmit` — exit 0.
   - `npm run lint` — exit 0.
   - `npm run test:run` — exit 0 (19/19 still passing).
   - `npx next build` — exit 0; route table includes `ƒ /dashboard`.
9. **Diagnostic sweep**: `mcp__ide__getDiagnostics`.
10. **Runtime smoke** (AC #29 — MANDATORY):
    - Stop any stale dev server on port 3000.
    - `rm -rf .next` to defeat cached server-reference manifests.
    - `npm run dev`.
    - Wait for `Ready in`.
    - Curl matrix:
      | Cookie | Path | Expected |
      |---|---|---|
      | (none) | `/dashboard` | 307 → `/` |
      | (none) | `/` | 200 |
      | (none) | `/sign-in` | 200 |
      | (none) | `/sign-up` | 200 |
      | (admin session) | `/dashboard` | 200 |
      | (admin session) | `/` | 307 → `/dashboard` |
      | (admin session) | `/sign-in` | 307 → `/dashboard` |
      | (admin session) | `/sign-up` | 307 → `/dashboard` |
    - Sign in via the credentials endpoint to acquire the admin session cookie.
    - Record the actual response codes in the build summary.
    - Stop the dev server when done.
11. **Optional**: verify the Tailwind compiled CSS contains the new hex values:
    - `grep -E '#7faaa3|#c89b94|#c97c6d|#8aa775' .next/static/css/*.css` (the resulting CSS after `next build`).
    - The hexes should appear in the compiled rule set for `bg-primary-500`, `bg-secondary-500`, `bg-danger-500`, `bg-success-500`.
