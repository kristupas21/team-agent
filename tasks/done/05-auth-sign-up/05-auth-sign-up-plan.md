# Build Plan: Auth — Sign Up

## Overview
Three new files plus two small modifications. Structurally a near-mirror of the existing `auth-sign-in` feature: server-component page → client-component form → server action → reused `UserModel`/`hashPassword`/`signIn`. The only novel logic is the duplicate-username catch around `UserModel.create(...)`. Key structural decisions:
1. **Route lives at `src/app/(auth)/sign-up/page.tsx`** — reuses the existing `(auth)` route group, mirrors `/sign-in`, satisfies AC #1/#2/#4 with one route segment.
2. **`createUser` helper added to `src/lib/users.ts`** so the action stays terse and so the unique-index error path is documented in one place. Future tasks that need to create users (admin tools, OAuth account linkage) reuse it.
3. **Strict try/catch boundary**: only `UserModel.create(...)` is wrapped. `signIn(..., { redirectTo: '/' })` is *deliberately* outside the catch — its `NEXT_REDIRECT` throw must propagate. Spec's Notes for Downstream Agents flagged this explicitly.
4. **No pre-existence check**. Duplicate-key catch + unique index is the only correctness mechanism. Race-free and idiomatic.
5. **Home-page link block** ports to a two-row stack via `<div className="mt-6 space-y-3">` wrapping the two links. Each link uses `buttonClass('primary', 'block w-full text-center')` to span the card width.

## Reuse

Existing files used as-is:
- `src/lib/auth.ts` — `signIn` is reused. The `Credentials.authorize` callback already calls `verifyPassword` against the just-inserted `passwordHash`, so the auto-login flow works without any auth-config change.
- `src/lib/password.ts` — `hashPassword(plain): Promise<string>` reused.
- `src/lib/db.ts` — `connectDB()` reused via `createUser` in `src/lib/users.ts`.
- `src/models/User.ts` — reused unchanged. The `unique: true` index on `name` is what enforces uniqueness at the DB level.
- `src/lib/utils.ts` — `cn()` used by the home-page link wrapping.
- `src/components/ui/{Button,Input,Card}.tsx` — reused unchanged.
- `src/components/ui/buttonClass.ts` — reused for the home-page Sign Up link.
- `src/app/(auth)/sign-in/SignInForm.tsx` — *reference pattern* for `SignUpForm.tsx`.
- `src/app/(auth)/sign-in/page.tsx` — *reference pattern* for the new sign-up page.
- `src/actions/signIn.ts` — *reference pattern* for `signUpAction`.

## Files to Create

### `src/lib/validation/signUp.ts`
- **Type**: type + zod schema
- **Purpose**: validation schema shared by `SignUpForm` (client) and `signUpAction` (server).
- **Key shape**:
  ```ts
  import { z } from 'zod'

  export const signUpSchema = z.object({
    name: z
      .string()
      .trim()
      .min(5, 'Name must be at least 5 characters.')
      .max(64, 'Name is too long.'),
    password: z
      .string()
      .min(5, 'Password must be at least 5 characters.')
      .max(128, 'Password is too long.'),
  })

  export type SignUpInput = z.infer<typeof signUpSchema>
  ```
- **Reference pattern**: `src/lib/validation/signIn.ts`.

### `src/actions/signUp.ts`
- **Type**: server action
- **Purpose**: validate, hash password, create user, auto-sign-in via redirect.
- **Key signature**:
  ```ts
  'use server'
  export type SignUpResult = { success: true } | { success: false; error: string }
  export async function signUpAction(input: { name: string; password: string }): Promise<SignUpResult>
  ```
- **Implementation outline**:
  ```ts
  'use server'

  import { signIn } from '@/lib/auth'
  import { hashPassword } from '@/lib/password'
  import { createUser } from '@/lib/users'
  import { signUpSchema } from '@/lib/validation/signUp'

  export type SignUpResult = { success: true } | { success: false; error: string }

  const GENERIC_ERROR = 'Something went wrong. Please try again.'
  const DUPLICATE_ERROR = 'Username is already taken.'

  export async function signUpAction(input: {
    name: string
    password: string
  }): Promise<SignUpResult> {
    const parsed = signUpSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR }
    }

    const { name, password } = parsed.data
    try {
      const passwordHash = await hashPassword(password)
      await createUser({ name, passwordHash })
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        return { success: false, error: DUPLICATE_ERROR }
      }
      return { success: false, error: GENERIC_ERROR }
    }

    // signIn throws NEXT_REDIRECT — do NOT wrap in try/catch.
    await signIn('credentials', { name, password, redirectTo: '/' })
    return { success: true } // unreachable in practice
  }

  function isDuplicateKeyError(err: unknown): boolean {
    return (
      err instanceof Error &&
      'code' in err &&
      (err as { code?: unknown }).code === 11000
    )
  }
  ```
- **Reference pattern**: `src/actions/signIn.ts`.
- **Critical correctness note** (carried forward from the spec): the `signIn(..., { redirectTo: '/' })` call THROWS `NEXT_REDIRECT`. Wrapping it in any catch will swallow the redirect and leave the user on `/sign-up`. The catch above only covers `createUser` — `signIn` is on its own line, outside.

### `src/app/(auth)/sign-up/page.tsx`
- **Type**: server component
- **Purpose**: pre-check session, redirect if signed-in, else render the form inside a card.
- **Key signature**:
  ```ts
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import Card from '@/components/ui/Card'
  import SignUpForm from './SignUpForm'

  export const metadata: Metadata = { title: 'Sign Up' }

  export default async function SignUpPage() {
    const session = await auth()
    if (session?.user) {
      redirect('/')
    }
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <SignUpForm />
        </Card>
      </main>
    )
  }
  ```
- **Reference pattern**: `src/app/(auth)/sign-in/page.tsx`.

### `src/app/(auth)/sign-up/SignUpForm.tsx`
- **Type**: client component (`'use client'`)
- **Purpose**: form state via react-hook-form, per-field errors via Input.error, root error via setError('root').
- **Implementation outline**:
  ```tsx
  'use client'

  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { signUpAction } from '@/actions/signUp'
  import { signUpSchema, type SignUpInput } from '@/lib/validation/signUp'
  import Button from '@/components/ui/Button'
  import Input from '@/components/ui/Input'

  export default function SignUpForm() {
    const { register, handleSubmit, formState, setError, clearErrors } = useForm<SignUpInput>({
      resolver: zodResolver(signUpSchema),
    })

    const onValid = async (data: SignUpInput): Promise<void> => {
      clearErrors('root')
      const result = await signUpAction(data)
      // result.success === true is unreachable — the action redirects.
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
          Sign Up
        </Button>

        {formState.errors.root && (
          <p className="text-base text-danger-500">{formState.errors.root.message}</p>
        )}
      </form>
    )
  }
  ```
- **No `useRouter`**: there's no client-side navigation to perform. On `{ success: true }` the page is already navigating because the server action redirected. On `{ success: false }` we set the root error and stay.
- **Reference pattern**: `src/app/(auth)/sign-in/SignInForm.tsx`.

## Files to Modify

### `src/lib/users.ts`
- **What changes**: add a `createUser` helper.
- **Diff in spirit**:
  ```ts
  import { connectDB } from '@/lib/db'
  import { UserModel, type UserDoc } from '@/models/User'

  export async function findUserByName(name: string): Promise<UserDoc | null> {
    await connectDB()
    return UserModel.findOne({ name }).lean<UserDoc>().exec()
  }

  export async function countUsers(): Promise<number> {
    await connectDB()
    return UserModel.estimatedDocumentCount().exec()
  }

  export async function createUser(input: {
    name: string
    passwordHash: string
  }): Promise<UserDoc> {
    await connectDB()
    const doc = await UserModel.create(input)
    return doc.toObject<UserDoc>()
  }
  ```
- **Why**: keeps Mongoose imports out of the action; matches the pattern set by `findUserByName`/`countUsers`. The duplicate-key error thrown by `UserModel.create(...)` propagates up to the action's catch unchanged.

### `src/app/page.tsx`
- **What changes**: in the signed-out branch, replace the single Sign In `<Link>` with a two-row stack containing Sign In + Sign Up.
- **Outline** (after diff):
  ```tsx
  // ... (signed-out branch)
  ) : (
    <div className="mt-6 space-y-3">
      <Link href="/sign-in" className={buttonClass('primary', 'block w-full text-center')}>
        Sign In
      </Link>
      <Link href="/sign-up" className={buttonClass('primary', 'block w-full text-center')}>
        Sign Up
      </Link>
    </div>
  )
  ```
- **Why**: AC #1.
- **Note on `block w-full text-center`**: `buttonClass` already applies `inline-flex items-center justify-center`. Adding `block w-full` flips the layout to a full-card-width button-shaped link, and `text-center` keeps the label centred when the container becomes block-level. The wrapper `mt-6 space-y-3` provides spacing below the paragraph and between the two links.

## Files NOT Modified

- `src/lib/auth.ts` — unchanged. The Credentials provider's `authorize` callback already loads the user via `findUserByName` and verifies the bcrypt hash. Since the action creates the document *before* calling `signIn(...)`, the credential check succeeds.
- `src/actions/signIn.ts` — unchanged.
- `src/actions/signOut.ts` — unchanged.
- `src/models/User.ts` — unchanged. The existing unique index on `name` enforces uniqueness; no schema changes needed.
- `src/lib/password.ts`, `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/utils.ts`, `src/components/ui/*` — unchanged.
- `middleware.ts` — unchanged; `/sign-up` is publicly reachable when signed out by default.
- `package.json` — no new deps.
- `tailwind.config.ts`, `src/styles/globals.css`, `src/app/layout.tsx` — unchanged. No styling work.

## Data Flow

### Sign-up
1. User submits `SignUpForm`. RHF runs `zodResolver(signUpSchema)`.
2. If validation fails: per-field messages render via `Input.error`. `signUpAction` is not called.
3. If validation passes: `onValid(data)` runs.
   - `clearErrors('root')` drops any prior server error.
   - `await signUpAction(data)`.
4. Server: `signUpAction` re-runs `signUpSchema.safeParse(input)` (defence-in-depth). On rejection → return `GENERIC_ERROR`.
5. Server: `hashPassword(parsed.password)` → bcrypt hash.
6. Server: `createUser({ name, passwordHash })` → Mongoose `UserModel.create(...)`.
7. If `create` throws with `code === 11000` (duplicate key) → return `{ success: false, error: 'Username is already taken.' }`.
8. If `create` throws any other reason → return `{ success: false, error: GENERIC_ERROR }`.
9. If `create` succeeds → `signIn('credentials', { name, password, redirectTo: '/' })`. This:
   - Calls the Credentials provider's `authorize`, which calls `findUserByName(name)` (returns the freshly-inserted doc) and `verifyPassword(password, passwordHash)` (matches).
   - Writes the JWT session cookie via Auth.js.
   - Throws `NEXT_REDIRECT` to `/`.
10. Next.js handles the redirect. Browser performs a fresh GET to `/` with the new cookie.
11. Home page reads the session via `auth()`, sees the user, and renders the signed-in branch with the new `name` in the heading.

### Failure paths
- All non-redirect outcomes resolve to `{ success: false, error: <string> }`.
- The `SignUpForm` handler reads `result.success`; if false, `setError('root', { message: result.error })` renders the message below the submit.
- Inputs remain populated with the user's entries (RHF preserves field values).

## State Management

- **Server state**: same as before — `auth()` reads the session server-side; no client cache.
- **Client UI state** (`SignUpForm` only): owned entirely by `react-hook-form` — no parallel `useState` for inputs or errors. `formState.isSubmitting` drives the disabled/loading state. Root error lives in `formState.errors.root.message`.
- **Global state**: none.

## Types

```ts
// src/lib/validation/signUp.ts
import { z } from 'zod'
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(5, 'Name must be at least 5 characters.')
    .max(64, 'Name is too long.'),
  password: z
    .string()
    .min(5, 'Password must be at least 5 characters.')
    .max(128, 'Password is too long.'),
})
export type SignUpInput = z.infer<typeof signUpSchema>
```

```ts
// src/actions/signUp.ts
export type SignUpResult = { success: true } | { success: false; error: string }
```

```ts
// src/lib/users.ts — addition
export async function createUser(input: {
  name: string
  passwordHash: string
}): Promise<UserDoc>
```

No other new types.

## File Tree

```
/
└── src/
    ├── actions/
    │   └── signUp.ts                                   (new)
    ├── app/
    │   ├── page.tsx                                    (modified — Sign Up link added)
    │   └── (auth)/
    │       └── sign-up/
    │           ├── page.tsx                            (new)
    │           └── SignUpForm.tsx                      (new)
    └── lib/
        ├── users.ts                                    (modified — createUser helper)
        └── validation/
            └── signUp.ts                               (new)
```

## Build Order

1. **Validation schema**: create `src/lib/validation/signUp.ts`.
2. **DB helper**: add `createUser` to `src/lib/users.ts`.
3. **`tsc --noEmit`** intermediate check — must still pass before the action lands.
4. **Server action**: create `src/actions/signUp.ts` with the explicit isolated `try/catch` around `createUser` only.
5. **Client form**: create `src/app/(auth)/sign-up/SignUpForm.tsx`.
6. **Page**: create `src/app/(auth)/sign-up/page.tsx` (server component with auth() redirect).
7. **Home page**: modify `src/app/page.tsx` to add the Sign Up link below Sign In in the signed-out branch.
8. **Verify**:
   - `npx tsc --noEmit` — exit 0.
   - `npm run lint` — exit 0.
   - `npm run test:run` — exit 0 (existing 19/19 must still pass; no new tests added).
   - `npx next build` — exit 0; new route `/sign-up` registered alongside the existing four.
9. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Fix any new "may be converted to async", "prefer optional chaining", or "redundant await" findings.
10. **Runtime smoke** (manual, for the user):
    - `docker compose up -d`, `npm run dev`.
    - Visit `/` signed-out → Sign Up link visible alongside Sign In.
    - Click Sign Up → arrives at `/sign-up`.
    - Submit empty → per-field "must be at least 5 characters" errors under each input.
    - Submit `admin` + valid password → root error `"Username is already taken."` below the submit.
    - Submit `alice` + valid password (>= 5 chars) → redirected to `/`, sees `"Welcome, alice"`.
    - With `alice` signed in, visit `/sign-up` → redirected to `/`.
    - Click Sign Out → page re-renders to signed-out state (the prior task's fix continues to hold).
