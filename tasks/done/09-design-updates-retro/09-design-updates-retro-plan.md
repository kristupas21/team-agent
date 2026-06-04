# Build Plan: Design Updates — Retro-Futuristic

## Overview
Largest single source-tree change since `01-initial-setup`. Two new pages (`error.tsx`, `not-found.tsx`), one new layout (`(main)/layout.tsx`), four existing pages moved into the new route group, plus a styling pass across primitives + features. Plus `react-icons` dependency, plus `Button` API extension, plus the font + palette swap.

Structural calls worth flagging:
1. **Route-group restructure**: `(main)` group contains all current pages with its own layout that mounts `<MainHeader />`. Root layout becomes a minimal shell. `error.tsx`/`not-found.tsx` sit at root, headerless.
2. **`font-display` Tailwind utility** is new — exposes Oleo via a separate utility class. The `font-sans` (Jost) default doesn't change for body text.
3. **`Button` icon rendering**: icons are inline siblings of `children` with `gap-2` (added to `buttonClass` base). Loading state hides icons.
4. **`Card` background** uses a new `neutral-100` step (`#fbf7eb`) — added specifically for this surface.
5. **Existing tests stay green by design**: class-name assertions reference token names (which are stable) not hex values. The only test file modified is `Button.test.tsx`, gaining 4 cases for the new icon props.
6. **The Back button assertion in `MainHeaderNav.test.tsx`** uses `getByRole('button', { name: /back/i })` which matches accessible names from EITHER visible text OR `aria-label`. The test continues to work when the Back button becomes icon-only.

## Reuse

Existing files used unchanged:
- `src/lib/auth.ts`, `auth.config.ts`, `redirect-rules.ts`, `errors.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts` — all unchanged.
- `src/lib/validation/signIn.ts`, `signUp.ts` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts` — unchanged.
- `src/middleware.ts` — unchanged (URL-based matchers; route group folders erased from URLs).
- `src/models/User.ts` — unchanged.
- `src/styles/globals.css` — unchanged.
- `src/components/ui/Input.tsx`, `buttonClass.ts` — unchanged at the TypeScript level. `buttonClass` base string gets `gap-2` added (single edit). `Input` flows through palette changes automatically.
- `src/components/features/SignInForm.tsx`, `SignUpForm.tsx`, `MainHeader.tsx` — unchanged.
- All existing test files except `Button.test.tsx` — unchanged.

## Files to Create

### `src/app/(main)/layout.tsx`
- **Type**: server component layout for the `(main)` route group.
- **Purpose**: mount `<MainHeader />` above the group's pages.
- **Outline**:
  ```tsx
  import type { ReactNode } from 'react'
  import MainHeader from '@/components/features/MainHeader'

  type MainLayoutProps = Readonly<{
    children: ReactNode
  }>

  export default function MainLayout({ children }: MainLayoutProps) {
    return (
      <>
        <MainHeader />
        {children}
      </>
    )
  }
  ```
- **Why**: a per-group layout in Next.js wraps every page inside that group. The root layout doesn't render `MainHeader` anymore — only `(main)/layout.tsx` does. Pages outside the group (error.tsx, not-found.tsx) get the root layout only — no header.

### `src/app/error.tsx`
- **Type**: client component (Next.js requirement for error boundaries)
- **Purpose**: top-level error boundary with the new design, headerless.
- **Outline**:
  ```tsx
  'use client'

  import Link from 'next/link'
  import { buttonClass } from '@/components/ui/buttonClass'

  type ErrorPageProps = Readonly<{
    error: Error & { digest?: string }
    reset: () => void
  }>

  export default function ErrorPage(_: ErrorPageProps) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="space-y-6 text-center">
          <h1 className="font-display text-4xl text-neutral-900">Something went wrong</h1>

          <p className="max-w-md text-base text-neutral-500">
            Please try again, or go back to the start.
          </p>

          <Link href="/" className={buttonClass('primary')}>
            Go home
          </Link>
        </div>
      </main>
    )
  }
  ```
- **Why**: AC #31. `reset` is accepted as a prop but not used (no "Try again" button this iteration). The `_` parameter name signals intentional non-use; TypeScript strict mode accepts this.
- **No `MainHeader`** — root layout doesn't render one, so error.tsx renders without it.

### `src/app/not-found.tsx`
- **Type**: server component (default).
- **Purpose**: 404 page with the new design, headerless.
- **Outline**:
  ```tsx
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
  ```
- **Note on the apostrophe**: `{"We couldn't..."}` wraps the apostrophe in a JSX expression to dodge `react/no-unescaped-entities` (same pattern used in the dashboard page after `08-main-header`).

## Files to Move

These four files keep their content but move into the `(main)` route group:

- `src/app/page.tsx` → `src/app/(main)/page.tsx` *(also modified — see Files to Modify)*
- `src/app/(auth)/sign-in/page.tsx` → `src/app/(main)/(auth)/sign-in/page.tsx` *(unchanged content)*
- `src/app/(auth)/sign-up/page.tsx` → `src/app/(main)/(auth)/sign-up/page.tsx` *(unchanged content)*
- `src/app/(private)/dashboard/page.tsx` → `src/app/(main)/(private)/dashboard/page.tsx` *(also modified — see Files to Modify)*

After moving, the old `src/app/(auth)/` and `src/app/(private)/` directories should be empty and can be deleted.

The `src/app/api/auth/[...nextauth]/route.ts` file STAYS at its current path — API routes don't belong inside the `(main)` group (they have no UI).

## Files to Modify

### `src/app/layout.tsx`
- **What changes**:
  - Add `Oleo_Script_Swash_Caps` import alongside `Jost`.
  - Apply BOTH font variables to `<html>` via `cn(jost.variable, oleo.variable)`.
  - **Remove the `MainHeader` import and the `<MainHeader />` render** — moves to `(main)/layout.tsx`.
- **Outline**:
  ```tsx
  import type { Metadata } from 'next'
  import type { ReactNode } from 'react'
  import { Jost, Oleo_Script_Swash_Caps } from 'next/font/google'
  import { cn } from '@/lib/utils'
  import '@/styles/globals.css'

  const jost = Jost({
    subsets: ['latin'],
    variable: '--font-jost',
    display: 'swap',
    weight: ['400', '500'],
  })

  const oleo = Oleo_Script_Swash_Caps({
    subsets: ['latin'],
    variable: '--font-oleo',
    display: 'swap',
    weight: ['400', '700'],
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
      <html lang="en" className={cn(jost.variable, oleo.variable)}>
        <body className={cn('bg-neutral-50 font-sans text-base text-neutral-900')}>
          {children}
        </body>
      </html>
    )
  }
  ```

### `tailwind.config.ts`
- **What changes**:
  - `theme.extend.colors`: replace each token with the new retro-futuristic hexes from spec Assumption 4. Add `neutral-100` step.
  - `theme.extend.fontFamily.sans`: stays at `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']`.
  - `theme.extend.fontFamily.display`: NEW entry, `['var(--font-oleo)', 'cursive']`.
  - `theme.extend.fontSize`, `spacing` — unchanged.
- **Outline of the new `theme.extend`**:
  ```ts
  theme: {
    extend: {
      colors: {
        primary: { 50: '#e3eaea', 500: '#3c7e7e', 700: '#2c5f5f' },
        secondary: { 50: '#f9e2d3', 500: '#d97e4b', 700: '#a85d33' },
        neutral: {
          50: '#f5efe1',
          100: '#fbf7eb',
          200: '#e6dcc6',
          500: '#8a7d63',
          700: '#4a4030',
          900: '#2a2418',
        },
        danger: { 50: '#f3dcce', 500: '#b8543b', 700: '#8a3e2a' },
        success: { 50: '#e4e6cc', 500: '#8a8a3e', 700: '#666627' },
      },
      fontFamily: {
        sans: ['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-oleo)', 'cursive'],
      },
      fontSize: { /* unchanged */ },
      spacing: { /* unchanged */ },
    },
  },
  ```

### `src/components/ui/buttonClass.ts`
- **What changes**: add `gap-2` to the `BASE_CLASSES` string so icons + label space cleanly.
- **Outline**: change `BASE_CLASSES` from:
  ```
  inline-flex items-center justify-center rounded-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60
  ```
  to:
  ```
  inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60
  ```
  No other change. The variant classes (`bg-primary-500 hover:bg-primary-700 ...` etc.) stay byte-identical — the hex values they resolve to change via `tailwind.config.ts`, but the class names are stable.

### `src/components/ui/Button.tsx`
- **What changes**:
  - `ButtonProps`: `children` becomes optional (`children?: ReactNode`); add `leftIcon?: ReactNode` and `rightIcon?: ReactNode`.
  - Render: `loading ? 'Loading...' : <>{leftIcon}{children}{rightIcon}</>`.
- **Outline**:
  ```tsx
  'use client'

  import type { ButtonHTMLAttributes, ReactNode } from 'react'
  import { buttonClass, type ButtonVariant } from './buttonClass'

  export type ButtonProps = Readonly<
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
      children?: ReactNode
      variant?: ButtonVariant
      loading?: boolean
      leftIcon?: ReactNode
      rightIcon?: ReactNode
    }
  >

  export default function Button({
    children,
    variant = 'primary',
    loading = false,
    disabled,
    leftIcon,
    rightIcon,
    className,
    ...props
  }: ButtonProps) {
    const isDisabled = disabled || loading

    return (
      <button
        className={buttonClass(variant, className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          'Loading...'
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    )
  }
  ```
- **Why**: AC #16–20. Loading wins over icons (AC #20).

### `src/components/ui/Card.tsx`
- **What changes**: `bg-white` → `bg-neutral-100` in the base class string. No other change.
- **Outline**: the `cn(...)` argument changes from:
  ```
  'w-full rounded-lg border border-neutral-200 bg-white p-6 md:max-w-md'
  ```
  to:
  ```
  'w-full rounded-lg border border-neutral-200 bg-neutral-100 p-6 md:max-w-md'
  ```

### `src/components/features/MainHeader.tsx`
- **What changes**: `bg-white` → `bg-neutral-100` on the `<header>` element (matches Card's surface for visual consistency).
- **Outline**: only the className string changes — `bg-white` → `bg-neutral-100`.

### `src/components/features/MainHeaderNav.tsx`
- **What changes**:
  - Add icon imports: `import { MdArrowBack, MdLogin, MdPersonAdd, MdLogout } from 'react-icons/md'`.
  - Back button becomes icon-only: `<Button type="button" variant="secondary" aria-label="Back" leftIcon={<MdArrowBack />} onClick={() => router.back()} />` (no children).
  - Sign In link: `<Link href="/sign-in" className={buttonClass('primary')}><MdLogin /> Sign In</Link>`.
  - Sign In disabled `<Button>`: `<Button type="button" variant="primary" disabled leftIcon={<MdLogin />}>Sign In</Button>`.
  - Sign Up link / disabled button: mirror with `MdPersonAdd`.
  - Sign Out `<Button>`: `<Button type="submit" variant="primary" leftIcon={<MdLogout />}>Sign Out</Button>`.
- **Outline**:
  ```tsx
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
  ```
- **Why**: AC #15, #21–24. The enabled `<Link>` cases render the icon as a sibling inside the link's content — the `buttonClass` `gap-2` handles spacing.

### `src/app/(main)/page.tsx` (the moved file, also modified)
- **What changes**:
  - Remove `Card` import (no longer used).
  - Remove the `<Card>` wrapper.
  - Heading gets `font-display`.
  - Heading and paragraph wrap in `<div className="space-y-6 text-center">`. The `mt-4` on the paragraph is dropped in favour of the wrapper's `space-y-6`.
- **Outline**:
  ```tsx
  export default function HomePage() {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="space-y-6 text-center">
          <h1 className="font-display text-4xl text-neutral-900">Hello there</h1>

          <p className="text-base text-neutral-500">Please sign in to continue.</p>
        </div>
      </main>
    )
  }
  ```

### `src/app/(main)/(private)/dashboard/page.tsx` (moved + modified)
- **What changes**:
  - Remove `Card` import.
  - Remove the `<Card>` wrapper.
  - Heading gets `font-display`.
  - Heading and paragraph wrap in `<div className="space-y-6 text-center">`.
- **Outline**:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'

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
        <div className="space-y-6 text-center">
          <h1 className="font-display text-4xl text-neutral-900">
            Welcome, {session.user.name}.
          </h1>

          <p className="text-base text-neutral-500">{"You're signed in."}</p>
        </div>
      </main>
    )
  }
  ```

### `src/app/(main)/(auth)/sign-in/page.tsx`, `sign-up/page.tsx` (moved only)
- **What changes**: nothing beyond the path move. Content unchanged.

### `package.json`
- **What changes**: add `react-icons` to `dependencies`. Version `^5.x` (latest at time of build).

### `__tests__/components/ui/Button.test.tsx`
- **What changes**: add 4 new test cases for the icon API:
  1. `leftIcon` renders before children (assert order by rendering an icon with a `data-testid` and the visible text, then check `compareDocumentPosition`).
  2. `rightIcon` renders after children.
  3. Icon-only button (`leftIcon` only, no children, with `aria-label`): the button has accessible name from `aria-label`, contains the icon.
  4. Loading hides both icons; button text is `"Loading..."`.
- **Mock-free** — no new mocks needed; the existing test file has no mocks beyond `vi.fn()` for `onClick`.

## Files NOT Modified

- `src/middleware.ts`, `src/lib/redirect-rules.ts`, `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/lib/errors.ts`, `src/lib/users.ts`, `src/lib/password.ts`, `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/utils.ts`, `src/lib/validation/*` — unchanged.
- `src/actions/*` — unchanged.
- `src/components/ui/Input.tsx` — unchanged (palette changes flow through Tailwind class names).
- `src/components/features/SignInForm.tsx`, `SignUpForm.tsx` — unchanged. Submit Buttons stay text-only per the spec.
- `src/styles/globals.css`, `vitest.config.mts`, `vitest.setup.ts`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` — unchanged.
- All other test files — unchanged.
- `CLAUDE.md`, `agents/*` — unchanged.
- `README.md`, `.env*`, `docker-compose.yml` — unchanged.
- `src/app/api/auth/[...nextauth]/route.ts` — unchanged.

## Data Flow

### Route resolution after restructure
1. Browser GET `/` → Next.js resolves the file at `src/app/(main)/page.tsx`. Route group `(main)` is erased; URL stays `/`.
2. The `(main)/layout.tsx` wraps the page → renders `<MainHeader />` then the page content.
3. Root `src/app/layout.tsx` wraps the group layout → loads fonts + bg.

### Error / Not-Found resolution
1. Browser GET `/no-such-page` → Next.js can't find a matching file → falls back to `src/app/not-found.tsx`.
2. `not-found.tsx` is wrapped by the root layout (no header) — not by `(main)/layout.tsx` because `not-found.tsx` lives at root.
3. Page renders without `MainHeader`.
4. Same logic for thrown errors → `src/app/error.tsx` wraps the error boundary inside the root layout's tree.

### Button icon render
- Per-render: `loading ? 'Loading...' : <>{leftIcon}{children}{rightIcon}</>`. `loading` always wins.
- Icons are React nodes — typically `<MdLogin />` style SVGs. They render inside the `<button>` element next to `children`. The `gap-2` base class provides horizontal spacing.

### Middleware
- Unchanged. Matcher patterns are URL-based; route group folders erased; the same URLs still match.

## State Management
No state changes. All edits are markup, type, or class-name changes.

## Types

```ts
// src/components/ui/Button.tsx — extended
type ButtonVariant = 'primary' | 'secondary' | 'danger'

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children?: ReactNode      // now optional
    variant?: ButtonVariant
    loading?: boolean
    leftIcon?: ReactNode
    rightIcon?: ReactNode
  }
>
```

```ts
// src/app/error.tsx
type ErrorPageProps = Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>
```

```ts
// src/app/(main)/layout.tsx
type MainLayoutProps = Readonly<{ children: ReactNode }>
```

No other types added.

## File Tree

```
/
├── package.json                                       (modified — +react-icons)
├── tailwind.config.ts                                 (modified — palette + font-display)
└── src/
    ├── app/
    │   ├── layout.tsx                                 (modified — no MainHeader; +Oleo)
    │   ├── error.tsx                                  (new — client, headerless)
    │   ├── not-found.tsx                              (new — server, headerless)
    │   ├── api/auth/[...nextauth]/route.ts            (unchanged)
    │   └── (main)/
    │       ├── layout.tsx                             (new — mounts MainHeader)
    │       ├── page.tsx                               (moved + modified — no Card)
    │       ├── (auth)/
    │       │   ├── sign-in/page.tsx                   (moved only)
    │       │   └── sign-up/page.tsx                   (moved only)
    │       └── (private)/dashboard/page.tsx           (moved + modified — no Card)
    └── components/
        ├── ui/
        │   ├── Button.tsx                             (modified — +leftIcon/rightIcon)
        │   ├── buttonClass.ts                         (modified — +gap-2)
        │   └── Card.tsx                               (modified — bg-white → bg-neutral-100)
        └── features/
            ├── MainHeader.tsx                         (modified — bg-white → bg-neutral-100)
            └── MainHeaderNav.tsx                      (modified — icons everywhere)

__tests__/components/ui/Button.test.tsx                (modified — +4 icon cases)
```

## Build Order

1. **Install `react-icons`** — `npm install react-icons` (and update package.json).
2. **`tailwind.config.ts`** — palette swap + `fontFamily.display` entry + `neutral-100` step.
3. **`src/components/ui/buttonClass.ts`** — add `gap-2` to base.
4. **`src/components/ui/Button.tsx`** — extend props + render logic. Backward-compatible — calls without icon props still work.
5. **Intermediate `tsc --noEmit`** — confirm clean.
6. **`src/components/ui/Card.tsx`** — `bg-neutral-100`.
7. **`src/components/features/MainHeader.tsx`** — `bg-neutral-100`.
8. **`src/components/features/MainHeaderNav.tsx`** — icon-only Back + icons on Sign In/Up/Out.
9. **`src/app/layout.tsx`** — drop MainHeader import + render; add Oleo font.
10. **`src/app/(main)/layout.tsx`** (new) — mount MainHeader.
11. **Move route files** into `(main)`:
    - `mv src/app/page.tsx src/app/(main)/page.tsx`
    - `mv src/app/(auth)/sign-in src/app/(main)/(auth)/sign-in`
    - `mv src/app/(auth)/sign-up src/app/(main)/(auth)/sign-up`
    - `mv src/app/(private)/dashboard src/app/(main)/(private)/dashboard`
    - `rmdir src/app/(auth)` and `rmdir src/app/(private)` if empty.
12. **Modify the moved files**:
    - `src/app/(main)/page.tsx` — drop Card, add `font-display`.
    - `src/app/(main)/(private)/dashboard/page.tsx` — drop Card, add `font-display`.
13. **Create `src/app/error.tsx`** — client component with new design.
14. **Create `src/app/not-found.tsx`** — server component with new design.
15. **Extend `__tests__/components/ui/Button.test.tsx`** — 4 new cases.
16. **Verify**:
    - `npx tsc --noEmit` exit 0.
    - `npm run lint` exit 0.
    - `npm run test:run` exit 0 with **91 tests across 13 files**. No regressions.
    - `rm -rf .next && npx next build` exit 0; route table contains `/`, `/sign-in`, `/sign-up`, `/dashboard`, plus generated entries for `/_not-found` and error handling.
17. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Should be empty in `/src` and `/__tests__`.
18. **No runtime smoke required** per the spec. The middleware behaviour is locked by `middleware.test.ts`; the form interactions by `SignInForm.test.tsx` / `SignUpForm.test.tsx`; the Button API by the extended `Button.test.tsx`; and the route-group restructure by `next build`'s route table.

## Notes for the Builder

- **Route-group `mv` ordering**: when moving directories, the destination parent (`src/app/(main)/`) must exist first. The `mv` calls should be ordered: create `src/app/(main)/`, then move `page.tsx`, then move `(auth)`, etc.
- **`(main)/layout.tsx` is server, not client.** It doesn't need a `'use client'` directive — it just renders `<MainHeader />` and `{children}`.
- **The Oleo font name has underscores in the Next.js export**: `Oleo_Script_Swash_Caps`, not `OleoScriptSwashCaps`. Next.js follows Google's font name with underscores in place of spaces.
- **Tailwind `font-display` utility**: adding `fontFamily.display` in the config automatically generates a `font-display` utility class. Tailwind's name-collision rule: `font-display` is a utility name Tailwind already reserves for `font-display: swap` CSS — but Tailwind's `font-*` utilities under `fontFamily` take precedence in this context. Watch for any oddity; if a conflict appears, switch the utility name to `font-heading` (architect's fallback).
  - **Verify** during the intermediate tsc step: `npx next build` then grep the compiled CSS for `.font-display{font-family:` — should reference `var(--font-oleo)`. If something's off, rename.
- **Button icon test queries**: when asserting icon order, use the existence + position check. One approach:
  ```ts
  const { container } = render(<Button leftIcon={<svg data-testid="lefticon" />}>Click</Button>)
  const icon = screen.getByTestId('lefticon')
  const text = screen.getByText('Click')
  expect(icon.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  ```
- **The `_` parameter in `ErrorPage`**: when destructuring is unused, prefix with `_`. ESLint accepts `_error` style names; we can also accept `(props: ErrorPageProps)` and never reference `props`. Either is fine.
- **`next-env.d.ts`**: it should automatically pick up any new ambient types. No manual edit needed.
- **API route placement**: `src/app/api/auth/[...nextauth]/route.ts` STAYS at `src/app/api/...`. Do NOT move it inside `(main)/`. API routes don't need layout wrapping.
- **CSS palette verification (optional)**: after `next build`, grep `.next/static/css/*.css` for `rgb(60 126 126)` to confirm `primary-500` resolves to the new teal. Same for the other tokens.
- **Visual rhythm**: follow CLAUDE.md's "Code Layout — Visual Rhythm" rules in all new and modified files. Blank lines between distinct steps; tightly-coupled idioms kept together; non-trivial returns preceded by a blank line.
