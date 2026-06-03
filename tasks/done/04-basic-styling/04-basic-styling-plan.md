# Build Plan: Basic Styling

## Overview
First design-system pass: extend `tailwind.config.ts` with palette + scaled spacing/typography, drop `next/font/google` Inter into the root layout, add `html { font-size: 62.5% }` to globals, then ship three primitive components (`Button`, `Input`, `Card`) under `src/components/ui/` plus their Vitest tests. The home page and sign-in page are rewired to use the new primitives; `signOutAction` gains `revalidatePath('/')`. `vitest.config.mts` loses `passWithNoTests: true`.

Key structural decisions:
1. **Variant maps are hand-rolled `Record<Variant, string>`** — no `class-variance-authority`. Three components don't justify the dep.
2. **Tailwind size scaling done by writing the full scale rather than referencing internals.** The spec calls for "all of Tailwind's named tokens × 1.6". Concretely, the architect writes `fontSize` and `spacing` keys verbatim so the multiplication is auditable and removable later. Listed values below.
3. **Two-component file boundary**: `Button`, `Input` are client components (own `'use client'`); `Card` is a server component. Tests for client components render fine in jsdom; the Card test renders the static markup and inspects classes.
4. **The Sign In link on the home page is a plain `<Link>` carrying the exact same Tailwind class string as `Button variant="primary"`.** A small `buttonClass(variant)` helper export from `Button.tsx` keeps both call-sites honest (the page reuses the same map). Justification: avoids a second variant authoring surface in JSX.
5. **`Input` exports the default via `forwardRef`** so RHF's `register(...)` keeps working unchanged. The displayName is set explicitly so React DevTools / RTL queries are clean.
6. **Layout-level background**: `bg-neutral-50` is set on `<body>` in `RootLayout`. Pages do not need to repeat it.
7. **Page background contrast**: `next/font` is configured at the layout level. Pages do not import the font directly.

## Reuse

Existing files used as-is:
- `src/lib/utils.ts` — `cn()` is the canonical class-merger. All three new components use it.
- `src/lib/auth.ts` — `auth`/`signOut` unchanged. The sign-out invalidation is added to the action wrapper, not here.
- `src/actions/signIn.ts` — unchanged.
- `src/lib/validation/signIn.ts` — unchanged.
- `src/styles/globals.css` — modified, not replaced (one rule added at the top: `html { font-size: 62.5%; }`).
- `src/app/(auth)/sign-in/page.tsx` — modified to add the centring `<main>` wrapper and `<Card>`.
- `vitest.config.mts` — modified (one key removed).
- `vitest.setup.ts` — unchanged.
- `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` — unchanged.

The existing `__tests__/components/ui/` folder (`.gitkeep` from `initial-setup`) becomes the home of the new test files; the `.gitkeep` can be removed once real test files land but it's harmless if left.

## Files to Create

### `src/components/ui/Button.tsx`
- **Type**: client component
- **Purpose**: reusable button with `primary` / `secondary` / `danger` variants plus a `loading` state.
- **Exports**:
  - `default` — the `Button` React component.
  - `ButtonProps` — `Readonly<Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & { children: ReactNode; variant?: ButtonVariant; loading?: boolean }>`.
  - `buttonClass(variant?: ButtonVariant, extras?: string)` — small helper returning the full Tailwind class string for the named variant; used by the Home page's Sign In `<Link>` so it shares the exact same look as a Button without re-authoring the variant logic.
- **Variant map** (architect's authored values):
  - Base: `inline-flex items-center justify-center rounded-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed`
  - `primary`: `bg-primary-500 text-white hover:bg-primary-700 focus-visible:ring-primary-500`
  - `secondary`: `bg-secondary-500 text-white hover:bg-secondary-700 focus-visible:ring-secondary-500`
  - `danger`: `bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500`
- **Loading behaviour**:
  - Compute `isDisabled = disabled || loading` and pass that to the underlying `<button>`'s `disabled`.
  - If `loading`, set `aria-busy="true"` on the `<button>`.
  - If `loading`, the rendered children are replaced with the literal string `"Loading..."`. Implementation: ternary on the JSX child position — `{loading ? 'Loading...' : children}`.
- **`'use client'` directive at the top of the file.**

### `src/components/ui/Input.tsx`
- **Type**: client component (because consumers attach `onChange`, `ref`, and the spec requires `forwardRef` for RHF)
- **Purpose**: reusable text input with three variants and an `error` prop that overrides the variant.
- **Exports**:
  - `default` — the `Input` React component wrapped in `forwardRef<HTMLInputElement, InputProps>`.
  - `InputProps` — `Readonly<InputHTMLAttributes<HTMLInputElement> & { variant?: InputVariant; error?: string }>`.
- **Variant map**:
  - Base: `block w-full rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 disabled:cursor-not-allowed`
  - `primary`: `border-neutral-200 focus-visible:ring-primary-500`
  - `secondary`: `border-neutral-200 focus-visible:ring-secondary-500`
  - `danger`: `border-danger-500 focus-visible:ring-danger-500`
- **Error behaviour**:
  - If `error` is a non-empty string, choose `'danger'` for the variant class regardless of the explicit `variant` prop.
  - Render the `<input>` followed by `error ? <p className="mt-1 text-base text-danger-500">{error}</p> : null`.
- **Render shape**:
  ```tsx
  <>
    <input ref={ref} className={cn(base, variantMap[effectiveVariant], extra)} {...props} />
    {error ? <p className="mt-1 text-base text-danger-500">{error}</p> : null}
  </>
  ```
- **`displayName`**: `Input.displayName = 'Input'` (so RTL and DevTools show a clean name on the forwardRef wrapper).
- **`'use client'` directive at the top of the file.**

### `src/components/ui/Card.tsx`
- **Type**: **server component** (no directive, no event handlers, no state)
- **Purpose**: padded centred-friendly surface.
- **Exports**:
  - `default` — `Card`.
  - `CardProps` — `Readonly<HTMLAttributes<HTMLDivElement> & { children: ReactNode }>`.
- **Base classes**: `bg-white rounded-lg border border-neutral-200 p-6 w-full md:max-w-md`.
- **Render**:
  ```tsx
  export default function Card({ children, className, ...props }: CardProps) {
    return (
      <div className={cn('bg-white rounded-lg border border-neutral-200 p-6 w-full md:max-w-md', className)} {...props}>
        {children}
      </div>
    )
  }
  ```
- **Reference pattern for the file style**: matches `src/app/(auth)/sign-in/SignInForm.tsx` for import order and default export style.

### `__tests__/components/ui/Button.test.tsx`
- **Type**: Vitest + RTL test file
- **Coverage** (≥ 6 tests):
  1. renders children
  2. applies `primary` classes by default
  3. applies `secondary` classes when `variant="secondary"`
  4. applies `danger` classes when `variant="danger"`
  5. when `disabled`, has `disabled` attribute and `onClick` does NOT fire on click
  6. when `loading`, has `disabled` attribute, `aria-busy="true"`, text is `"Loading..."`, and `onClick` does NOT fire
  7. without `disabled` or `loading`, `onClick` fires exactly once on click
- **Patterns**:
  - `import { render, screen } from '@testing-library/react'`
  - `import userEvent from '@testing-library/user-event'`
  - Use `screen.getByRole('button')` not `getByText` so variant tests don't depend on label text.

### `__tests__/components/ui/Input.test.tsx`
- **Coverage** (≥ 8 tests):
  1. renders an `<input>` with the provided `placeholder`
  2. applies `primary` classes by default
  3. applies `secondary` classes when `variant="secondary"`
  4. applies `danger` classes when `variant="danger"`
  5. applies `disabled` attribute and disabled visual when `disabled`
  6. when `error="msg"`, renders a `<p>` with text `"msg"` and the input carries the `danger` classes
  7. when `error="msg"` AND `variant="primary"`, the input STILL carries the `danger` classes (error wins)
  8. `ref` forwarding: a `ref` is attached to the underlying `<input>` element
  9. `onChange` fires when the user types
- **Patterns**:
  - For ref forwarding: create a `React.createRef<HTMLInputElement>()`, render `<Input ref={ref} />`, assert `ref.current?.tagName === 'INPUT'`.
  - Query the input with `screen.getByRole('textbox')` (default `<input>` type is text); for variants `secondary`/`danger`, use `getByRole('textbox')` since the type doesn't change.

### `__tests__/components/ui/Card.test.tsx`
- **Coverage** (≥ 3 tests):
  1. renders children
  2. has the base class set (`bg-white`, `rounded-lg`, `border`, `border-neutral-200`, `p-6`, `w-full`, `md:max-w-md`) on its root element
  3. merges a consumer-provided `className` alongside the base classes via `cn()`

## Files to Modify

### `tailwind.config.ts`
- Replace the empty `theme.extend` with the full palette + scaled `fontSize` + scaled `spacing`. Concrete:
  ```ts
  theme: {
    extend: {
      colors: {
        primary:   { 50: '#eff6ff', 500: '#2563eb', 700: '#1d4ed8' },
        secondary: { 50: '#f5f3ff', 500: '#7c3aed', 700: '#5b21b6' },
        neutral:   { 50: '#f9fafb', 200: '#e5e7eb', 500: '#6b7280', 700: '#374151', 900: '#111827' },
        danger:    { 50: '#fef2f2', 500: '#dc2626', 700: '#b91c1c' },
        success:   { 50: '#f0fdf4', 500: '#16a34a', 700: '#15803d' },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs:   ['1.2rem',  { lineHeight: '1.6rem' }],
        sm:   ['1.4rem',  { lineHeight: '2.0rem' }],
        base: ['1.6rem',  { lineHeight: '2.4rem' }],
        lg:   ['1.8rem',  { lineHeight: '2.8rem' }],
        xl:   ['2.0rem',  { lineHeight: '2.8rem' }],
        '2xl':['2.4rem',  { lineHeight: '3.2rem' }],
        '3xl':['3.0rem',  { lineHeight: '3.6rem' }],
        '4xl':['3.6rem',  { lineHeight: '4.0rem' }],
      },
      spacing: {
        0: '0',
        1: '0.4rem',
        2: '0.8rem',
        3: '1.2rem',
        4: '1.6rem',
        5: '2.0rem',
        6: '2.4rem',
        8: '3.2rem',
        10: '4.0rem',
        12: '4.8rem',
        16: '6.4rem',
        20: '8.0rem',
        24: '9.6rem',
      },
    },
  },
  ```
- Tailwind merges `extend` over its defaults. The `fontSize` and `spacing` keys above are the ones the current codebase uses (`text-base`, `text-4xl`, `p-6`, `mt-4`, `mt-6`, `min-h-screen` — `min-h-screen` is a height, not a spacing scale entry — Tailwind's `screen` height is independent of the spacing scale, so it remains unaffected by the rebase. `gap-*`, `space-y-*`, and `w-*`/`h-*` numeric values DO read from `spacing`).
- The architect notes: any scale value NOT listed above (e.g. `p-14`, `mt-1.5`) falls back to Tailwind's default — which is rem-based against the standard 16 px assumption and will therefore visually shrink by 62.5 %. Builder must ensure the codebase only uses values present in the table above; the audit point appears in the build order.

### `src/styles/globals.css`
- Prepend an `html { font-size: 62.5%; }` rule before the Tailwind imports:
  ```css
  html {
    font-size: 62.5%;
  }

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  :root {
    /* Design tokens go here */
  }
  ```
- Why before the Tailwind imports: `@tailwind base` will emit a `*` reset and Tailwind's preflight; the `html` rule sets the inherited font-size; subsequent rem-based utilities resolve correctly.

### `src/app/layout.tsx`
- Add `next/font/google` Inter:
  ```ts
  import type { Metadata } from 'next'
  import type { ReactNode } from 'react'
  import { Inter } from 'next/font/google'
  import { cn } from '@/lib/utils'
  import '@/styles/globals.css'

  const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
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
      <html lang="en" className={inter.variable}>
        <body className={cn('bg-neutral-50 font-sans text-base text-neutral-900')}>{children}</body>
      </html>
    )
  }
  ```
- The `inter.variable` (which is the CSS variable wrapper class) is applied to `<html>` so any descendant — including server-rendered HTML for pages — picks up `var(--font-inter)` via the `font-sans` Tailwind utility.
- `bg-neutral-50` on `<body>` provides the page background; pages no longer need to repeat it.

### `src/actions/signOut.ts`
- Add the post-sign-out invalidation:
  ```ts
  'use server'

  import { revalidatePath } from 'next/cache'
  import { signOut } from '@/lib/auth'

  export async function signOutAction(): Promise<void> {
    await signOut({ redirect: false })
    revalidatePath('/')
  }
  ```
- Single new line: `revalidatePath('/')`. The action signature remains `Promise<void>` — the form-action binding on the home page works unchanged.

### `src/app/page.tsx`
- Replace the inner content with the new structure:
  ```tsx
  import Link from 'next/link'
  import { auth } from '@/lib/auth'
  import { signOutAction } from '@/actions/signOut'
  import Button, { buttonClass } from '@/components/ui/Button'
  import Card from '@/components/ui/Card'

  export default async function HomePage() {
    const session = await auth()
    const name = session?.user?.name

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <div className="text-center">
            <h1 className="text-4xl font-semibold">
              {name ? `Welcome, ${name}` : 'Hello there'}
            </h1>
            <p className="mt-4 text-base text-neutral-500">
              {name ? "You're signed in." : 'Please sign in to continue.'}
            </p>
            {name ? (
              <form action={signOutAction} className="mt-6">
                <Button type="submit" variant="primary">Sign Out</Button>
              </form>
            ) : (
              <Link href="/sign-in" className={cn('mt-6 inline-flex', buttonClass('primary'))}>
                Sign In
              </Link>
            )}
          </div>
        </Card>
      </main>
    )
  }
  ```
- **Note for builder**: `cn(...)` must be imported here too if used inline. Simpler: pass `buttonClass('primary', 'mt-6 inline-flex')` and let the helper do the merging — adjust `buttonClass(variant, extras)` to accept and merge the extras.
- **Tailwind class swap**: `text-gray-600` → `text-neutral-500` (new palette). All other class names preserved.

### `src/app/(auth)/sign-in/page.tsx`
- Wrap the form in `<main>` + `<Card>`:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import Card from '@/components/ui/Card'
  import SignInForm from './SignInForm'

  export const metadata: Metadata = {
    title: 'Sign In',
  }

  export default async function SignInPage() {
    const session = await auth()
    if (session?.user) {
      redirect('/')
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <SignInForm />
        </Card>
      </main>
    )
  }
  ```

### `src/app/(auth)/sign-in/SignInForm.tsx`
- Swap the manual `<input>`s for `<Input>` and the submit `<button>` for `<Button>`:
  ```tsx
  'use client'

  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { useRouter } from 'next/navigation'
  import { signInAction } from '@/actions/signIn'
  import { signInSchema, type SignInInput } from '@/lib/validation/signIn'
  import Button from '@/components/ui/Button'
  import Input from '@/components/ui/Input'

  export default function SignInForm() {
    const router = useRouter()
    const { register, handleSubmit, formState, setError, clearErrors } = useForm<SignInInput>({
      resolver: zodResolver(signInSchema),
    })

    const onValid = async (data: SignInInput): Promise<void> => {
      clearErrors('root')
      const result = await signInAction(data)
      if (result.success) {
        router.push('/')
        return
      }
      setError('root', { message: result.error })
    }

    return (
      <form onSubmit={handleSubmit(onValid)} className="space-y-4">
        <label className="block">
          <span className="block text-base text-neutral-700">Name</span>
          <Input
            type="text"
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
- The previous manual `<p>{formState.errors.name?.message}</p>` lines are removed — the `<Input>` itself now renders field-level errors.
- `space-y-4` provides vertical rhythm between the labels and the submit button.

### `vitest.config.mts`
- Remove `passWithNoTests: true`. Final file:
  ```ts
  import { defineConfig } from 'vitest/config'
  import react from '@vitejs/plugin-react'
  import tsconfigPaths from 'vite-tsconfig-paths'

  export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      globals: true,
    },
  })
  ```

## Data Flow

No new data flows. The bug fix tweaks the existing sign-out path:

1. User clicks Sign Out → form submits to `signOutAction`.
2. `signOutAction` clears the session cookie via `signOut({ redirect: false })`.
3. `signOutAction` calls `revalidatePath('/')`.
4. Next.js invalidates the `/` route cache; the next render of the page reads no session and produces the signed-out branch.

All other data flow (sign-in, server-side session reads, RHF + Zod) is preserved exactly.

## State Management
Unchanged from the previous task. RHF still owns the sign-in form state. Server state still comes from `auth()` in server components. No new global state.

## Types

```ts
// src/components/ui/Button.tsx
type ButtonVariant = 'primary' | 'secondary' | 'danger'

export type ButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    children: ReactNode
    variant?: ButtonVariant
    loading?: boolean
  }
>
```

```ts
// src/components/ui/Input.tsx
type InputVariant = 'primary' | 'secondary' | 'danger'

export type InputProps = Readonly<
  InputHTMLAttributes<HTMLInputElement> & {
    variant?: InputVariant
    error?: string
  }
>
```

```ts
// src/components/ui/Card.tsx
export type CardProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode
  }
>
```

`ButtonVariant` and `InputVariant` are file-local (not exported). The exposed surface is the `*Props` types and the default component export — plus the helper `buttonClass` from `Button.tsx`.

## File Tree

```
/
├── package.json                                          (unchanged; no new deps)
├── tailwind.config.ts                                    (modified — palette + size scales)
├── vitest.config.mts                                     (modified — drop passWithNoTests)
└── src/
    ├── actions/
    │   └── signOut.ts                                    (modified — revalidatePath)
    ├── app/
    │   ├── layout.tsx                                    (modified — next/font + body bg)
    │   ├── page.tsx                                      (modified — Card + Button + Link)
    │   └── (auth)/sign-in/
    │       ├── page.tsx                                  (modified — Card wrapper)
    │       └── SignInForm.tsx                            (modified — Input/Button usage)
    ├── components/
    │   └── ui/
    │       ├── Button.tsx                                (new)
    │       ├── Input.tsx                                 (new)
    │       └── Card.tsx                                  (new)
    └── styles/
        └── globals.css                                   (modified — html font-size 62.5%)

__tests__/
└── components/
    └── ui/
        ├── Button.test.tsx                               (new)
        ├── Input.test.tsx                                (new)
        └── Card.test.tsx                                 (new)
```

## Build Order

1. **Tailwind config**: extend `theme.extend` with palette + `fontSize` + `spacing` + `fontFamily.sans`. (No `npm install`.)
2. **Globals**: prepend `html { font-size: 62.5%; }` to `src/styles/globals.css`.
3. **Layout**: wire `next/font/google` Inter; add `bg-neutral-50 font-sans text-base text-neutral-900` to `<body>`; apply `inter.variable` to `<html>`.
4. **Components — Card first** (no deps on other new files): create `src/components/ui/Card.tsx`. Server component.
5. **Components — Button**: create `src/components/ui/Button.tsx`, including the named `buttonClass` export. Client component.
6. **Components — Input**: create `src/components/ui/Input.tsx` with `forwardRef`. Client component.
7. **Action fix**: add `revalidatePath('/')` to `src/actions/signOut.ts`.
8. **Sign-in page**: wrap `<SignInForm />` in `<main>` + `<Card>`.
9. **Sign-in form**: swap manual `<input>`s and `<button>` for the new components; pipe `formState.errors.<field>?.message` into the new `error` prop; pipe `formState.isSubmitting` into `loading`. Remove the redundant per-field `<p>` lines.
10. **Home page**: wrap content in `<Card>`; switch Sign Out `<button>` → `<Button>`; switch Sign In `<Link>` to use `buttonClass('primary', 'mt-6 inline-flex')`.
11. **Audit**: grep the codebase for any Tailwind class that uses a `spacing` or `fontSize` token NOT covered by the extended scale (e.g. `text-5xl`, `text-7xl`, `p-14`, `gap-7`). Fix or report — the visual shrink from the rem rebase only affects values not in the override table. (Current codebase uses only `text-base`, `text-4xl`, `mt-4`, `p-6`, `p-4`, `mt-6`, `space-y-4`, `min-h-screen` — all covered.)
12. **Vitest config**: delete `passWithNoTests: true`.
13. **Tests — Card**: create `__tests__/components/ui/Card.test.tsx` (smallest, validate test harness still works).
14. **Tests — Button**: create `__tests__/components/ui/Button.test.tsx`.
15. **Tests — Input**: create `__tests__/components/ui/Input.test.tsx`.
16. **Verify**:
    - `npx tsc --noEmit` — exit 0.
    - `npm run lint` — exit 0.
    - `npm run test:run` — exit 0 with > 0 tests passing.
    - `npx next build` — succeeds; same route topology as prior task.
17. **Diagnostic sweep**: call `mcp__ide__getDiagnostics`. Resolve any new "may be converted to async", "prefer nullish coalescing assignment", or "unused export" warnings. False positives on exported component APIs noted, not blockers.
18. **Manual smoke (for the user)**:
    - `npm run dev`. Home shows the styled card, signed-out branch.
    - Sign in flow with the seeded admin → arrives at signed-in card.
    - Click Sign Out → page re-renders to the signed-out state immediately (bug fix verification).
    - Resize to mobile width (~375 px) — card width fits with margin; nothing overflows. Resize to ≥ 768 px — card caps at `md:max-w-md` and stays centred.
