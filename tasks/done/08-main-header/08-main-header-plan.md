# Build Plan: Main Header

## Overview
Two new component files (`MainHeader.tsx` server + `MainHeaderNav.tsx` client), one new test file (`MainHeaderNav.test.tsx`), four modifications (layout, home, dashboard, tailwind). No new dependencies, no behaviour changes outside the header surface, no test regressions. Structural calls worth flagging:

1. **Server/client split**: `MainHeader.tsx` calls `await auth()` and passes typed props to `MainHeaderNav.tsx`. The split lets `MainHeader` benefit from server-side `auth()` while `MainHeaderNav` owns `usePathname` + `useRouter` + the disabled-state branching.
2. **Disabled-link pattern (Option A)**: enabled state renders a `<Link>`, disabled state renders a `<Button disabled type="button">`. Two rendered shapes, single source of variant classes via `buttonClass('primary', ...)` for the link and the `Button` component for the button. Identical visual.
3. **Empty-left-cluster placeholder**: when Back is hidden, an empty `<div />` keeps the flex `justify-between` alignment intact. Right cluster never shifts.
4. **Sticky wrapper is a single `<header>` element** spanning the viewport width. No max-width container — the bottom border reads as a true horizontal rule. Inside, the row content uses the same `px-*` gutter as the cards below.
5. **The Sign Out form in the header** is functionally identical to the dashboard's previous version — same `<form action={signOutAction}>` + `<Button>` shape — just relocated.
6. **`MainHeader` mounts in `src/app/layout.tsx`** between `<body>` and `{children}`. The `<main>` content below continues to use `min-h-screen flex items-center justify-center`; the sticky header overlays the top of that area on scroll — accepted per the spec.

## Reuse

- `src/lib/auth.ts` — `auth()` reused unchanged by `MainHeader`.
- `src/actions/signOut.ts` — reused unchanged. The form-action target moves from dashboard to header; the action itself is identical.
- `src/components/ui/Button.tsx` + `src/components/ui/buttonClass.ts` + `src/components/ui/Card.tsx` — reused unchanged.
- `src/lib/utils.ts` — `cn()` reused.
- `__tests__/components/features/SignInForm.test.tsx` / `SignUpForm.test.tsx` — reference patterns for the new `MainHeaderNav.test.tsx`.
- `vitest.config.mts`, `vitest.setup.ts`, `package.json` — unchanged.

## Files to Create

### `src/components/features/MainHeader.tsx`
- **Type**: server component
- **Purpose**: read session, render sticky wrapper + `<MainHeaderNav />`.
- **Outline**:
  ```tsx
  import { auth } from '@/lib/auth'
  import MainHeaderNav from './MainHeaderNav'

  export default async function MainHeader() {
    const session = await auth()
    const signedIn = !!session?.user
    const userName = session?.user?.name ?? undefined

    return (
      <header className="sticky top-0 z-10 w-full border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-3 py-2 md:px-4 md:py-3">
          <MainHeaderNav signedIn={signedIn} userName={userName} />
        </div>
      </header>
    )
  }
  ```
- **Key choices**:
  - `<header>` carries the sticky + bg + border classes.
  - Inner `<div>` carries the flex row. `MainHeaderNav` sits inside.
  - `MainHeaderNav` owns the left/right cluster JSX so the layout fragmentation between server and client is minimal.

### `src/components/features/MainHeaderNav.tsx`
- **Type**: client component (`'use client'`)
- **Purpose**: render the Back button (conditional) and the auth buttons (signed-in vs signed-out branches with disabled-state logic).
- **Props**:
  ```ts
  type MainHeaderNavProps = Readonly<{
    signedIn: boolean
    userName?: string
  }>
  ```
- **Imports**:
  - `Link` from `next/link`
  - `usePathname`, `useRouter` from `next/navigation`
  - `Button` from `@/components/ui/Button`
  - `buttonClass` from `@/components/ui/buttonClass`
  - `signOutAction` from `@/actions/signOut`
- **Outline**:
  ```tsx
  'use client'

  import Link from 'next/link'
  import { usePathname, useRouter } from 'next/navigation'
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
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {signedIn ? (
            <form action={signOutAction}>
              <Button type="submit" variant="primary">
                Sign Out
              </Button>
            </form>
          ) : (
            <>
              {onSignInPage ? (
                <Button type="button" variant="primary" disabled>
                  Sign In
                </Button>
              ) : (
                <Link href="/sign-in" className={buttonClass('primary')}>
                  Sign In
                </Link>
              )}

              {onSignUpPage ? (
                <Button type="button" variant="primary" disabled>
                  Sign Up
                </Button>
              ) : (
                <Link href="/sign-up" className={buttonClass('primary')}>
                  Sign Up
                </Link>
              )}
            </>
          )}
        </div>
      </>
    )
  }
  ```
- **Key choices**:
  - The component returns a fragment with two top-level children — left cluster and right cluster. The parent `MainHeader` wraps them in the flex row, so `justify-between` pushes them apart.
  - The empty `<div>` on the left when `!showBack` preserves the flex layout — `justify-between` keeps the right cluster right-aligned.
  - The disabled `<Button>` and the enabled `<Link>` share the same `buttonClass('primary')` set of classes — the `Button` component already uses the same `buttonClass()` under the hood, so visual parity is automatic.
  - `userName` is declared in the props type (for forward use) but not destructured / rendered — silent prop.
- **Forbidden-pattern compliance**:
  - No bare `<a>` for internal routes — uses `Link`.
  - No `any`, no `Readonly<{}>` empty type (the type has actual fields).
  - `'use client'` is at the deepest interactive leaf.

### `__tests__/components/features/MainHeaderNav.test.tsx`
- **Mock setup** (top of file):
  ```ts
  import { beforeEach, describe, expect, it, vi } from 'vitest'
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'

  const mockBack = vi.fn()
  const pathnameRef = { current: '/' }

  vi.mock('next/navigation', () => ({
    usePathname: () => pathnameRef.current,
    useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
  }))

  vi.mock('@/actions/signOut', () => ({
    signOutAction: vi.fn(),
  }))

  import MainHeaderNav from '@/components/features/MainHeaderNav'
  ```
- **Helper**:
  ```ts
  function setPath(p: string) { pathnameRef.current = p }
  ```
  This indirection is needed because `vi.mock` is hoisted to the top of the file before imports. The mocked `usePathname` reads from `pathnameRef.current` at call time, so we can update it per test via `setPath('/sign-in')`.
- **`beforeEach`**: `vi.resetAllMocks()` and reset `pathnameRef.current = '/'` so each test starts from a clean default.
- **Cases** (at least 8 — match the spec):
  1. Signed-out on `/`: both Sign In and Sign Up rendered as `<a>` (Link) tags. Back NOT rendered.
  2. Signed-out on `/sign-in`: Sign In rendered as a `<button>` with `disabled` attribute; Sign Up rendered as an `<a>`. Back rendered as a `<button>`.
  3. Signed-out on `/sign-up`: Sign Up rendered as a `<button>` with `disabled`; Sign In rendered as an `<a>`. Back rendered.
  4. Signed-in on `/dashboard`: Sign Out button rendered inside a `<form>`. Sign In, Sign Up, and Back NOT rendered.
  5. Signed-in without `userName` prop: renders the Sign Out form without crashing.
  6. Clicking the Back button on `/sign-in` calls `mockBack` exactly once.
  7. Back hidden on `/` (assertion against the rendered tree).
  8. Back hidden on `/dashboard` (assertion against the rendered tree).
- **Query patterns**:
  - Use `screen.getByRole('link', { name: /sign in/i })` and `screen.getByRole('button', { name: /sign in/i })` to differentiate enabled (link role) vs disabled (button role) Sign In.
  - For the Back button: `screen.getByRole('button', { name: /back/i })`.
  - For Sign Out: `screen.getByRole('button', { name: /sign out/i })`.
  - For "absence": `screen.queryByRole('button', { name: /back/i })` and assert `.toBeNull()`.

## Files to Modify

### `src/app/layout.tsx`
- **What changes**:
  1. Swap `Copse` → `Jost`. Variable name `--font-copse` → `--font-jost`. Weights become `['400', '500']`.
  2. Apply `jost.variable` to `<html>` (replaces `copse.variable`).
  3. Import `MainHeader` from `@/components/features/MainHeader`.
  4. Render `<MainHeader />` between `<body>` and `{children}`.
- **Outline (after)**:
  ```tsx
  import type { Metadata } from 'next'
  import type { ReactNode } from 'react'
  import { Jost } from 'next/font/google'
  import { cn } from '@/lib/utils'
  import MainHeader from '@/components/features/MainHeader'
  import '@/styles/globals.css'

  const jost = Jost({
    subsets: ['latin'],
    variable: '--font-jost',
    display: 'swap',
    weight: ['400', '500'],
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
      <html lang="en" className={jost.variable}>
        <body className={cn('bg-neutral-50 font-sans text-base text-neutral-900')}>
          <MainHeader />
          {children}
        </body>
      </html>
    )
  }
  ```

### `tailwind.config.ts`
- **What changes**: `theme.extend.fontFamily.sans` becomes `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']`. The palette, fontSize scale, and spacing scale all stay unchanged.

### `src/app/page.tsx`
- **What changes**: remove the `<div className="mt-6 space-y-3">` block containing the two `<Link>`s. Remove the `Link` and `buttonClass` imports (no longer used). `Card` stays.
- **Outline (after)**:
  ```tsx
  import Card from '@/components/ui/Card'

  export default function HomePage() {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <div className="text-center">
            <h1 className="text-4xl font-semibold">Hello there</h1>
            <p className="mt-4 text-base text-neutral-500">Please sign in to continue.</p>
          </div>
        </Card>
      </main>
    )
  }
  ```

### `src/app/(private)/dashboard/page.tsx`
- **What changes**: remove the `<form action={signOutAction}>` block. Remove the `Button` and `signOutAction` imports (no longer used). `Card`, `auth`, `redirect`, `Metadata` all stay.
- **Outline (after)**:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
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
            <p className="mt-4 text-base text-neutral-500">You're signed in.</p>
          </div>
        </Card>
      </main>
    )
  }
  ```

## Files NOT Modified

- `src/components/ui/*` — Button, Input, Card, buttonClass all unchanged.
- `src/components/features/SignInForm.tsx`, `SignUpForm.tsx` — unchanged.
- `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx` — unchanged. The header is added via the layout's mount.
- `src/middleware.ts`, `src/lib/redirect-rules.ts`, `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/actions/signIn.ts`, `src/actions/signOut.ts`, `src/actions/signUp.ts`, `src/lib/errors.ts`, `src/lib/users.ts`, `src/lib/password.ts`, `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/utils.ts`, `src/lib/validation/*`, `src/models/User.ts` — unchanged.
- `__tests__/components/ui/*.test.tsx`, `__tests__/components/features/SignInForm.test.tsx`, `__tests__/components/features/SignUpForm.test.tsx`, `__tests__/lib/*`, `__tests__/actions/*`, `__tests__/middleware.test.ts`, `__tests__/test-utils/redirect-error.ts` — unchanged.
- `vitest.config.mts`, `vitest.setup.ts`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `src/styles/globals.css`, `CLAUDE.md`, `agents/*.md`, README, `.env.example`, `.env.local`, `docker-compose.yml` — unchanged.

## Data Flow

### Header render
1. Browser GET any route. Layout server-renders.
2. `<MainHeader />` calls `await auth()`. With/without session known.
3. Server renders sticky wrapper + `<MainHeaderNav signedIn={...} userName={...} />`.
4. Client hydrates `MainHeaderNav`. `usePathname()` returns the current path. `useRouter()` is wired.
5. JSX branches on `signedIn` and the disabled-state pathname checks.

### Back click
1. User clicks Back. `router.back()` is invoked.
2. If history has an entry, browser navigates back. Header re-renders for the new route (still mounted via layout).
3. If history is empty, `back()` is a no-op. No error.

### Sign Out click
1. User clicks Sign Out (signed-in branch). Form submits to `signOutAction`.
2. Server action runs: `signOut({ redirectTo: '/' })`. Cookie cleared, `NEXT_REDIRECT` thrown.
3. Browser GET `/` with no cookie. Layout re-renders. `MainHeader` now sees no session. `MainHeaderNav` renders the signed-out branch (Sign In + Sign Up).
4. Home card renders welcome-only content.

### Sign In / Sign Up click
1. User clicks Sign In `<Link>` in the header. `next/link` performs client-side navigation to `/sign-in`.
2. Header re-renders with `usePathname() === '/sign-in'`. Sign In becomes disabled `<Button>`. Back becomes visible.

## State Management
- **Server state**: `auth()` in `MainHeader` (unchanged surface).
- **Client UI state**: none. `MainHeaderNav` derives its branching directly from props + `usePathname()`. No `useState`.
- **Global state**: none.

## Types

```ts
// src/components/features/MainHeaderNav.tsx
type MainHeaderNavProps = Readonly<{
  signedIn: boolean
  userName?: string
}>
```

No other types added. `MainHeader` has no exported types.

## File Tree

```
/
├── tailwind.config.ts                                  (modified — fontFamily.sans)
└── src/
    ├── app/
    │   ├── layout.tsx                                  (modified — Jost + mount MainHeader)
    │   ├── page.tsx                                    (modified — welcome-only)
    │   └── (private)/dashboard/page.tsx                (modified — welcome-only)
    └── components/
        └── features/
            ├── MainHeader.tsx                          (new — server)
            └── MainHeaderNav.tsx                       (new — client)

__tests__/
└── components/
    └── features/
        └── MainHeaderNav.test.tsx                      (new — 8+ RTL cases)
```

## Build Order

1. **`MainHeaderNav.tsx`** (client) — create the leaf with the interactive logic. No dependencies on `MainHeader` yet.
2. **`MainHeader.tsx`** (server) — create the wrapper that imports `MainHeaderNav` and renders the sticky shell.
3. **`tsc --noEmit`** intermediate check — ensures both new components compile before the rest of the diff lands.
4. **`src/app/layout.tsx`** — swap `Copse` → `Jost`, mount `<MainHeader />`.
5. **`tailwind.config.ts`** — `fontFamily.sans` Jost.
6. **`src/app/page.tsx`** — drop the two-link block + obsolete imports.
7. **`src/app/(private)/dashboard/page.tsx`** — drop the Sign Out form + obsolete imports.
8. **`__tests__/components/features/MainHeaderNav.test.tsx`** — write the 8 cases.
9. **Verify**:
   - `npx tsc --noEmit` → exit 0.
   - `npm run lint` → exit 0.
   - `npm run test:run` → exit 0 with **~86 tests passing across 13 files** (78 existing + 8 new). No existing-test regressions.
   - `rm -rf .next && npx next build` → exit 0; route table unchanged.
10. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Resolve any new warnings (most likely "unused import" if any straggler — confirm none).
11. **No runtime smoke** — per the spec. The redirect matrix from `06-private-routes-and-styling` continues to be unit-tested in `__tests__/middleware.test.ts`; the new RTL test for `MainHeaderNav` covers the new interactive logic; static-file checks cover everything else.

## Notes for the Builder

- **Mocking `next/navigation` with mutable pathname**: the indirection through `pathnameRef.current` is the standard Vitest pattern when a hoisted `vi.mock` factory needs to return per-test values. The factory closure captures `pathnameRef`; updating `pathnameRef.current` between tests changes what `usePathname()` returns.
- **`@testing-library/react` rendering a client component is straightforward** — `MainHeaderNav` is fully client and uses no async / suspense. No special wrappers needed.
- **Distinguishing enabled vs disabled buttons by role**:
  - Enabled Sign In = `<a>` (rendered by `<Link>`) — `getByRole('link', { name: /sign in/i })`.
  - Disabled Sign In = `<button disabled>` — `getByRole('button', { name: /sign in/i })`.
  - The two roles never collide because we never render both at the same time.
- **`vi.mocked(signOutAction)` is not exercised** in the test — the Sign Out form's action gets serialised by React but never executed in the test environment. Asserting the form's presence and the button's existence is enough.
- **Unused imports**: when removing imports from `src/app/page.tsx` and `src/app/(private)/dashboard/page.tsx`, run `npm run lint` after each to catch stragglers. `@typescript-eslint/no-unused-vars` (via `next/typescript`) flags them.
- **Visual rhythm**: the new files honour CLAUDE.md's "Code Layout — Visual Rhythm" — blank lines between distinct steps inside function bodies, tightly-coupled idioms kept together.
