# Build Plan: Auth — Sign In Update

## Overview
Three narrow modifications on top of the existing `auth-sign-in` feature: relax `signInSchema.password`, refactor `SignInForm.tsx` to `react-hook-form`, and update `src/app/page.tsx` copy + remove the redundant `<p>{name}</p>` in the signed-in branch. No new files. Two new production dependencies (`react-hook-form`, `@hookform/resolvers`). Structural decisions worth noting:
1. **`SignInInput` continues to be inferred from `signInSchema`.** The relaxed bound does not change the inferred type — both fields are `string` either way. All call-sites (`signInAction`, `Credentials.authorize`, the form) transparently inherit the change.
2. **react-hook-form pattern**: register each input with `register('name')` / `register('password')`. Wire validation via `resolver: zodResolver(signInSchema)`. Surface server-action failures through `setError('root', { message })`. No manual `useState` for inputs or errors. No `useTransition` — `formState.isSubmitting` replaces it. `useRouter` stays for the success redirect.
3. **Home page heading is now session-aware**, not static. The whole heading + paragraph + footer block becomes a session-driven render.

## Reuse

All existing files. No new files are introduced.

- `src/lib/validation/signIn.ts` — schema relaxed in place; `SignInInput` continues to be inferred and is consumed unchanged by the form, the action, and the auth provider.
- `src/app/(auth)/sign-in/SignInForm.tsx` — refactored in place.
- `src/app/page.tsx` — copy + structure updated in place.
- `src/actions/signIn.ts` — no changes. Already uses `signInSchema.safeParse` and collapses any failure to the generic error, which is the desired behaviour after the bound relaxes.
- `src/lib/auth.ts` — no changes. The Credentials `authorize` callback already uses `signInSchema.safeParse(raw)`; the relaxed bound only changes which inputs pass through, not the verification path.
- `src/actions/signOut.ts` — no changes.
- All other files (`db.ts`, `env.ts`, `password.ts`, `users.ts`, `models/User.ts`, `middleware.ts`, etc.) — untouched.

## Files to Create
None.

## Files to Modify

### `src/lib/validation/signIn.ts`
- **What changes**: replace the password chain with `z.string().min(1, 'Password is required.').max(128, 'Password is too long.')`.
- **Why**: AC #3, #4 (per-field empty error), #5 (short non-empty reaches server).
- **Side effects**: none. `signInAction`, `Credentials.authorize`, and `SignInForm` all import the schema by name; no consumer edit needed in this file.

### `src/app/(auth)/sign-in/SignInForm.tsx`
- **What changes**: rewrite to use `react-hook-form` with the Zod resolver. Diff in spirit:
  - Remove: `useState` for `name`, `password`, `error`; `useTransition`; `handleSubmit` defined manually with `event.preventDefault()` + safeParse.
  - Add: `useForm<SignInInput>({ resolver: zodResolver(signInSchema) })`; `register('name')`, `register('password')`; `handleSubmit(onValid)` from RHF.
  - Field error rendering: a `<p>` directly under each input, fed by `formState.errors.name?.message` / `formState.errors.password?.message`.
  - Server error rendering: a `<p>` below the submit button, fed by `formState.errors.root?.message`. Set via `setError('root', { message: result.error })` when `signInAction` returns `{ success: false, error }`.
  - Pending state: `formState.isSubmitting` drives `disabled` on inputs and submit button, and toggles the button label between `"Sign In"` and `"Signing in..."`.
  - Cleanup: explicitly call `clearErrors('root')` at the very top of `onValid` to satisfy AC #8 ("previous error is no longer rendered during submission"). RHF clears field errors automatically when validation re-runs, but the root error must be cleared manually because it doesn't correspond to a field.
- **Key signature outline (no full implementation here)**:
  ```ts
  'use client'
  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { useRouter } from 'next/navigation'
  import { signInAction } from '@/actions/signIn'
  import { signInSchema, type SignInInput } from '@/lib/validation/signIn'

  export default function SignInForm() {
    const router = useRouter()
    const { register, handleSubmit, formState, setError, clearErrors } =
      useForm<SignInInput>({ resolver: zodResolver(signInSchema) })

    const onValid = async (data: SignInInput): Promise<void> => {
      clearErrors('root')
      const result = await signInAction(data)
      if (result.success) {
        router.push('/')
        return
      }
      setError('root', { message: result.error })
    }

    return ( ... )
  }
  ```
- **Markup outline** (no styling):
  ```tsx
  <form onSubmit={handleSubmit(onValid)}>
    <label>
      Name
      <input type="text" {...register('name')} disabled={formState.isSubmitting} />
    </label>
    {formState.errors.name && <p>{formState.errors.name.message}</p>}

    <label>
      Password
      <input type="password" {...register('password')} disabled={formState.isSubmitting} />
    </label>
    {formState.errors.password && <p>{formState.errors.password.message}</p>}

    <button type="submit" disabled={formState.isSubmitting}>
      {formState.isSubmitting ? 'Signing in...' : 'Sign In'}
    </button>

    {formState.errors.root && <p>{formState.errors.root.message}</p>}
  </form>
  ```
- **Why**: AC #4, #6, #7 (per-field error placement), #8 (pending state + cleared previous error), #10 (RHF + zodResolver in source), #11 (still single `'use client'` boundary).
- **Reference pattern**: this is the project's first `react-hook-form` form. The structure here becomes the reference for future forms.

### `src/app/page.tsx`
- **What changes**: heading and paragraph become session-aware; the standalone `<p>{name}</p>` is removed; everything else stays.
- **Outline**:
  ```tsx
  import Link from 'next/link'
  import { auth } from '@/lib/auth'
  import { signOutAction } from '@/actions/signOut'

  export default async function HomePage() {
    const session = await auth()
    const name = session?.user?.name

    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-semibold">
            {name ? `Welcome, ${name}` : 'Hello there'}
          </h1>
          <p className="mt-4 text-base text-gray-600">
            {name ? "You're signed in." : 'Please sign in to continue.'}
          </p>
          {name ? (
            <form action={signOutAction}>
              <button type="submit">Sign Out</button>
            </form>
          ) : (
            <Link href="/sign-in">Sign In</Link>
          )}
        </div>
      </main>
    )
  }
  ```
- **Why**: AC #1, #2, #15 (heading + paragraph copy; existing classes preserved; standalone `<p>{name}</p>` removed).
- **Reference pattern**: no other server component currently does session-aware copy switching; this becomes the reference.

### `package.json`
- **What changes**: add to `dependencies`:
  - `react-hook-form` — latest 7.x.
  - `@hookform/resolvers` — latest 3.x.
- **Why**: AC #14. RHF is part of the client bundle and is shipped at runtime, so it belongs under `dependencies`, not `devDependencies`.

## Data Flow

### Sign-in (updated)
1. `SignInForm` renders. RHF holds `name` and `password` internally; the page passes no props.
2. User types and clicks Submit. RHF runs the Zod resolver against `signInSchema`.
3. If validation fails: per-field error messages render under each input. The submit handler does not run. `signInAction` is not called.
4. If validation passes: `onValid(data)` runs, first calling `clearErrors('root')` to drop any stale server-error message. Then `await signInAction(data)`.
5. While `onValid` is in flight, `formState.isSubmitting` is `true`. Inputs disabled, button disabled, label `"Signing in..."`.
6. On `{ success: true }`: `router.push('/')`. The form unmounts on navigation. Home page renders signed-in copy.
7. On `{ success: false, error }`: `setError('root', { message: error })`. The form re-renders with the root error below the submit button.

### Home page (updated)
1. `HomePage` is async, calls `await auth()`, derives `name`.
2. Heading text: ternary on `name`. Paragraph text: ternary on `name`.
3. Action element: ternary on `name` — Sign Out form (signed-in) or Sign In link (signed-out).
4. No `revalidatePath` calls. `signOutAction` continues to rely on Next's automatic form-action re-render to reflect the cleared session.

### Sign-out
Unchanged.

## State Management

- **Server state**: still read via `auth()` in server components. No change.
- **Client UI state** (only `SignInForm`):
  - All form state is owned by `react-hook-form` (`useForm`).
  - The submit handler's pending interval is reflected via `formState.isSubmitting` (read-only, automatic).
  - Server-returned error lives in `formState.errors.root.message` via `setError('root', ...)` — no parallel `useState`.
- **Global state**: none. Unchanged.

## Types

```ts
// src/lib/validation/signIn.ts — unchanged exports, relaxed bound
export const signInSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(64, 'Name is too long.'),
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password is too long.'),
})
export type SignInInput = z.infer<typeof signInSchema>
```

No new types. `react-hook-form`'s `UseFormReturn`, `FieldErrors`, and `SubmitHandler` are consumed inline where needed.

## File Tree

```
/
├── package.json                                       (modified — deps added)
└── src/
    ├── lib/validation/signIn.ts                       (modified — password bound relaxed)
    ├── app/
    │   ├── page.tsx                                   (modified — session-aware copy)
    │   └── (auth)/sign-in/SignInForm.tsx              (modified — react-hook-form refactor)
    └── (all other files unchanged)
```

## Build Order

1. **Dependencies**:
   - Add `react-hook-form` and `@hookform/resolvers` to `package.json` `dependencies`.
   - Run `npm install`.
2. **Schema**:
   - Modify `src/lib/validation/signIn.ts` — relax password lower bound and rename its error message.
3. **Verify schema change in isolation**:
   - Run `npx tsc --noEmit`. Must pass. (`signInAction` and `Credentials.authorize` consume the schema; they should remain green because the type signature is unchanged.)
4. **Form refactor**:
   - Rewrite `src/app/(auth)/sign-in/SignInForm.tsx` to use `react-hook-form` + `zodResolver`. Match the markup outline above. Keep field labels, input names, and button copy strings byte-identical.
5. **Home page copy + structure**:
   - Update `src/app/page.tsx` per the outline above. Preserve `text-4xl font-semibold` and `mt-4 text-base text-gray-600`. Delete the standalone `<p>{name}</p>` element.
6. **Verify**:
   - `npx tsc --noEmit` — must exit 0.
   - `npm run lint` — must exit 0 (no new warnings).
   - `npm run test:run` — must exit 0 (still no tests by design).
   - `npx next build` — must succeed with the same route count as before.
7. **Diagnostic sweep**:
   - Call `mcp__ide__getDiagnostics`. Fix any "may be converted to async", "prefer nullish coalescing assignment", "prefer optional chaining", "redundant await", or similar surfaced inspections. Document any false positives.
8. **Manual smoke (optional, for the user to run)**:
   - With the dev server running and admin seeded, exercise:
     - Visit `/` signed-out → see `"Hello there"` + `"Please sign in to continue."` + Sign In link.
     - Click Sign In → submit empty fields → see per-field errors under each input.
     - Submit a 6-character non-admin password → see `"Invalid name or password."` below submit button (the change in behaviour).
     - Submit correct admin credentials → redirect to `/`.
     - On `/` signed-in → see `"Welcome, admin"` + `"You're signed in."` + Sign Out button, with no standalone name line.
     - Click Sign Out → page re-renders to signed-out state.
