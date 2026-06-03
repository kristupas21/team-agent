# Spec: Auth — Sign Up

## Summary
Add account creation. A new public route renders a styled form (name + password) inside the existing `<Card>`. Client and server both validate the same Zod schema. On submit, the server action hashes the password with bcrypt, inserts a `User` document, and — on success — auto-signs-in the new user via `signIn('credentials', { redirectTo: '/' })`. Failure modes: per-field validation errors render under each input; duplicate username surfaces as a single root error `"Username is already taken."`; any other server error surfaces as a generic `"Something went wrong. Please try again."`. The home page's signed-out card gains a Sign Up link next to the existing Sign In link, styled the same way. No styling changes beyond placement; no tests in this task (carries the precedent).

## Assumptions

1. **Route path: `/sign-up`**, mirroring `/sign-in`. The page lives at `src/app/(auth)/sign-up/page.tsx`, reusing the existing `(auth)` route group so neither sign-in nor sign-up gets a literal `auth/` path segment. The home page link is `<Link href="/sign-up">`. This is Option B from the brief — picked for symmetry with the existing `/sign-in` route.
2. **Validation schema** lives at `src/lib/validation/signUp.ts` (parallel to `signIn.ts`). Exact shape:
   ```ts
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
   Note: a `trim().min(5, …)` chain emits the `"Name must be at least 5 characters."` message for both an empty string AND a 4-character string. We do NOT have a separate `"Name is required."` for the empty case in sign-up — `signInSchema` had a separate `min(1, 'Name is required.')` because its lower bound was 1; here the lower bound is 5, so the single message suffices. This is deliberately different from sign-in's per-field copy and is consistent.
3. **`signUpAction` lives at `src/actions/signUp.ts`** as a `'use server'` server action.
4. **Auto-sign-in mechanism: `signIn('credentials', { name, password, redirectTo: '/' })`** inside the action after successful user creation. This throws `NEXT_REDIRECT`; Next.js handles the redirect; the subsequent GET to `/` carries the freshly-set session cookie. Same pattern as the fixed `signOutAction` — avoids the "can't read your own cookie write" issue that bit us in the previous task.
5. **Duplicate-username detection**: catch the MongoDB duplicate-key error after `UserModel.create(...)`. The architect/builder use `'code' in error && error.code === 11000` (the well-known Mongo duplicate-key code). Any OTHER thrown error falls through to the generic catch and produces `"Something went wrong. Please try again."` Action returns `{ success: false, error: 'Username is already taken.' }` on the dup-key branch.
6. **No `findUserByName` pre-check before insert.** Relying on the unique index + the `code 11000` catch is race-free and idiomatic. A pre-check would introduce a TOCTOU window between the read and the write.
7. **Hashing**: reuse `hashPassword` from `src/lib/password.ts` (bcryptjs, cost 12). No new hashing code.
8. **User document fields**: `name`, `passwordHash`, `createdAt`, `updatedAt`. Same shape as the seeded admin. No additional fields (e.g. `role`, `email`) introduced.
9. **Server action signature**:
   ```ts
   'use server'
   export type SignUpResult =
     | { success: true }
     | { success: false; error: string }
   export async function signUpAction(input: { name: string; password: string }): Promise<SignUpResult>
   ```
   The `{ success: true }` branch is *unreachable in practice* because `signIn('credentials', { ..., redirectTo: '/' })` throws `NEXT_REDIRECT` before the action returns. The branch is kept for type-safety symmetry with `signInAction`'s `SignInResult` shape — its presence signals intent and matches the CLAUDE.md "All server action return types must be explicit" rule. The client doesn't act on `{ success: true }` in this task; the redirect lands them on `/` before any client code runs.
10. **`SignUpForm.tsx`** is a client component (`'use client'`) using `react-hook-form` + `zodResolver` — same shape as `SignInForm.tsx`. Per-field errors via `Input`'s `error` prop. Server-returned errors via `setError('root', { message })` and rendered as a plain `<p className="text-base text-danger-500">` below the submit button.
11. **Sign-up page** (`src/app/(auth)/sign-up/page.tsx`) is a server component that calls `await auth()`; if `session?.user` is present → `redirect('/')`. Otherwise renders `<main>` + `<Card>` + `<SignUpForm />` exactly like `/sign-in`.
12. **Home page link layout**: vertical stack of two links inside the centred card, separated by `space-y-3`. Order: Sign In first, Sign Up second. Both use `buttonClass('primary', 'mt-6')` for the first and `buttonClass('primary')` for the second (with `space-y-3` applying the inter-element gap). Both wear the same primary visual — they're equally weighted actions, and choosing a `secondary` variant for one would suggest hierarchy that doesn't exist.
13. **No README update**. The seed/admin docs stay accurate; the new flow is discoverable from the home page itself.
14. **No new dependencies**. Everything needed (`zod`, `bcryptjs`, `mongoose`, `react-hook-form`, `@hookform/resolvers`, `next-auth`) is already installed.
15. **No new components, no new colour tokens, no new Tailwind classes outside the existing scale.** Sign-up reuses `Button`, `Input`, `Card`, and the `buttonClass()` helper.
16. **`'use client'` boundaries unchanged**: client directives stay on `SignInForm.tsx`, `Button.tsx`, `Input.tsx`. One new directive is added: `SignUpForm.tsx`. No others.
17. **No tests** in this task. Same precedent as `auth-sign-in` and `auth-sign-in-update`. The `04-basic-styling` task introduced tests, but those are scoped to the design-system primitives. Form-level RTL coverage for `SignUpForm` is a sensible follow-up.
18. **No middleware changes.** `middleware.ts` still has no protected routes; `/sign-up` is publicly reachable when signed out.

## Open Questions
None remaining. The brief's only open call was the route-path question, resolved under Assumption 1 (Option B — `/sign-up`).

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/sign-up` (new) | `src/app/(auth)/sign-up/page.tsx` | `"Sign Up"` (page-level metadata) | Server component. Calls `auth()`; if a session exists, `redirect('/')`. Otherwise renders `<main>` wrapper → `<Card>` → `<SignUpForm />`. |
| `/` (modify) | `src/app/page.tsx` | unchanged | Signed-out branch now renders **two** links inside the card: Sign In then Sign Up, styled with `buttonClass('primary', …)` and separated by `space-y-3`. Signed-in branch unchanged. |

The `/(auth)` route group already exists. No new groups.

## Data

### Data Types

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
// src/actions/signUp.ts return shape (matches the ActionResult<T> convention)
export type SignUpResult =
  | { success: true }
  | { success: false; error: string }
```

No changes to the `UserDoc` shape; no new model.

### API Endpoints
None added. All custom logic flows through the server action `signUpAction`. The pre-existing `/api/auth/[...nextauth]` route is unchanged; `signIn('credentials', …)` invoked inside `signUpAction` reuses the existing NextAuth handler internally.

### Dependencies (added)
None.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `SignUpPage` (new) | server component | Pre-checks session, redirects if signed-in, else renders the form inside a card. | none |
| `SignUpForm` (new) | client component | Owns form state via `react-hook-form` + `zodResolver(signUpSchema)`; surfaces field errors via `Input`'s `error`; surfaces server errors via `setError('root', …)`. | none |
| `HomePage` (modify) | server component | Adds Sign Up link below Sign In link in the signed-out branch. | none |

No new ad-hoc UI primitives. No changes to `Button`/`Input`/`Card`.

## User Interactions

### Happy path: create account + auto sign-in
1. Signed-out user visits `/`. The card shows the heading, paragraph, then two links stacked: Sign In, Sign Up.
2. User clicks Sign Up → navigates to `/sign-up`.
3. The page renders the form (Name + Password inputs and a Sign Up button).
4. User enters `alice` and a password ≥ 5 chars. Submits.
5. `react-hook-form` runs the resolver against `signUpSchema`. Both fields pass. `formState.isSubmitting` becomes `true`; inputs and button are disabled; button reads `"Loading..."`.
6. `signUpAction({ name, password })` runs server-side:
   - Re-validates with `signUpSchema`. Passes.
   - `hashPassword(password)` → bcrypt hash.
   - `UserModel.create({ name: 'alice', passwordHash: <hash> })` → new document.
   - `signIn('credentials', { name: 'alice', password, redirectTo: '/' })` → sets the JWT cookie, then throws `NEXT_REDIRECT` to `/`.
7. Next.js handles the redirect; the browser performs a fresh GET to `/` with the new session cookie.
8. The home page renders the signed-in branch: heading `"Welcome, alice"`, paragraph `"You're signed in."`, Sign Out button.

### Failure: empty fields
1. User clicks Sign Up without entering anything.
2. `react-hook-form` runs the resolver. Both fields fail `min(5)` because an empty string is shorter than 5 characters.
3. Under the Name input renders `"Name must be at least 5 characters."`.
4. Under the Password input renders `"Password must be at least 5 characters."`.
5. The server action is NOT called.

### Failure: 4-character name
1. User enters `bob` (3 chars; same idea for 4 chars). Submits.
2. Client-side resolver rejects with `"Name must be at least 5 characters."` under the Name input.
3. Server action not called.

### Failure: 4-character password
1. User enters `alice` and `pwd1`. Submits.
2. Client-side resolver rejects with `"Password must be at least 5 characters."` under the Password input.
3. Server action not called.

### Failure: username already taken
1. User enters `admin` (already exists from the seed) and a valid password. Submits.
2. Client-side resolver passes (`admin` is 5 chars).
3. Server-side: validation passes. `UserModel.create({...})` throws a MongoDB duplicate-key error (`code === 11000`).
4. Action catches the duplicate, returns `{ success: false, error: 'Username is already taken.' }`.
5. Form shows a single `<p>` below the submit button reading `"Username is already taken."` in `text-danger-500`.
6. Inputs remain populated with the user's entries; the form is not cleared.

### Failure: oversized fields
1. User submits a 65-character name → client renders `"Name is too long."` under the Name input.
2. User submits a 129-character password → client renders `"Password is too long."` under the Password input.

### Failure: tampered request bypassing client validation
1. Client-side validation is bypassed (devtools or scripted POST).
2. Server-side: `signUpSchema.safeParse(input).success` is `false`.
3. Action returns `{ success: false, error: 'Something went wrong. Please try again.' }` — no field-level echo from the server.
4. Form shows that string below the submit button.

### Failure: unexpected server error (DB unavailable, etc.)
1. `UserModel.create(...)` throws for a reason other than duplicate key.
2. Catch falls through. Action returns `{ success: false, error: 'Something went wrong. Please try again.' }`.
3. Form shows that string below the submit button. Inputs remain populated.

### Failure: already signed in
1. User (with an existing session) opens `/sign-up`.
2. `SignUpPage` calls `auth()`, receives a session, and `redirect('/')`.
3. The form is never rendered.

## States

### `/sign-up` page
- **Initial (signed-out)**: form with two empty inputs and an enabled `Sign Up` submit button. No errors.
- **Field-level error**: the failing `Input` carries the `danger` variant classes and renders its plain-text error message via the `error` prop.
- **Submitting**: inputs disabled; submit `<Button>` is `loading={true}` (text `"Loading..."`, `aria-busy="true"`, non-interactive). The root error region (if any from a previous attempt) is no longer rendered during submission — `clearErrors('root')` runs at the top of the submit handler.
- **Server-rejected (duplicate)**: `<p className="text-base text-danger-500">Username is already taken.</p>` below the submit button. Inputs re-enabled with prior values intact.
- **Server-rejected (other)**: same placement, message `"Something went wrong. Please try again."`.
- **Success**: the form unmounts as the browser navigates to `/`. No client-side render of the success branch.
- **Already signed in**: never rendered (server-side `redirect('/')` fires before any JSX).

### `/` home page (signed-out — modified)
- Heading: `"Hello there"` (unchanged copy).
- Paragraph: `"Please sign in to continue."` (unchanged copy).
- Two stacked links inside the card, `space-y-3`:
  - First: `<Link href="/sign-in">Sign In</Link>` with `buttonClass('primary', 'mt-6 block w-full text-center')`. (See note on `block w-full text-center` below.)
  - Second: `<Link href="/sign-up">Sign Up</Link>` with `buttonClass('primary', 'block w-full text-center')`.

Notes on the link styling: `<Link>` (rendered as an `<a>`) is inline by default. With `buttonClass(…)` it already gets `inline-flex items-center justify-center`, which is enough for centering. The vertical gap between the two links comes from a `space-y-3` wrapper. The `mt-6` margin on the first link preserves spacing below the paragraph. The `block` / `w-full` / `text-center` additions ensure each link sits on its own row at full card width — without these the two links would render inline on the same row. (The architect or builder may simplify by wrapping the two links in `<div className="mt-6 space-y-3">` and using `buttonClass('primary')` without the extra `block w-full text-center` — same visual effect. Either approach is acceptable.)

### `/` home page (signed-in — unchanged)
- Heading: `"Welcome, {name}"`.
- Paragraph: `"You're signed in."`.
- Sign Out form with `Button variant="primary">Sign Out</Button>`. No Sign In or Sign Up link.

## Acceptance Criteria

1. Given a signed-out user on `/`, when the page loads, then the card contains the existing heading and paragraph, plus a `<Link href="/sign-in">Sign In</Link>` followed by a `<Link href="/sign-up">Sign Up</Link>`, both styled with the primary `buttonClass()` classes. The two links sit on separate rows; visual gap between them is `space-y-3` (or equivalent).
2. Given a signed-out user, when they click the Sign Up link on `/`, then the browser navigates to `/sign-up`.
3. Given `src/lib/validation/signUp.ts`, when read, then `signUpSchema.shape.name` is `z.string().trim().min(5, 'Name must be at least 5 characters.').max(64, 'Name is too long.')` and `signUpSchema.shape.password` is `z.string().min(5, 'Password must be at least 5 characters.').max(128, 'Password is too long.')` — exact messages.
4. Given `/sign-up`, when a signed-out user visits, then the page renders a `<main>` centring wrapper containing a `<Card>` containing the form. The form has an Input labelled `"Name"`, an Input of `type="password"` labelled `"Password"`, and a submit `<Button>` reading `"Sign Up"`.
5. Given `/sign-up`, when the user submits with both fields empty, then `react-hook-form` blocks the submission; under the Name input renders a `<p>` containing exactly `"Name must be at least 5 characters."`; under the Password input renders a `<p>` containing exactly `"Password must be at least 5 characters."`; `signUpAction` is NOT called.
6. Given `/sign-up`, when the user submits with a 4-character name and a valid password, then under the Name input renders exactly `"Name must be at least 5 characters."`.
7. Given `/sign-up`, when the user submits with a valid name and a 4-character password, then under the Password input renders exactly `"Password must be at least 5 characters."`.
8. Given `/sign-up`, when the user submits with a 65-character name, then under the Name input renders exactly `"Name is too long."`.
9. Given `/sign-up`, when the user submits with a 129-character password, then under the Password input renders exactly `"Password is too long."`.
10. Given a database where `admin` already exists, when the user submits `admin` and a valid password to `signUpAction`, then the action returns `{ success: false, error: 'Username is already taken.' }` and a `<p>` with that exact text renders below the submit button. The form inputs remain populated with the user's entries.
11. Given `/sign-up`, when the user submits valid, novel credentials, then the action: (a) inserts exactly one new `User` document with the given `name` and a bcrypt `passwordHash`; (b) writes a JWT session cookie via `signIn('credentials', { ..., redirectTo: '/' })`; (c) the browser is redirected to `/`; (d) the home page renders the signed-in branch with the new user's name in the heading.
12. Given the form is in flight, when `formState.isSubmitting` is `true`, then both inputs are disabled, the submit button is disabled, the button label is `"Loading..."` (via the `Button` `loading` prop), and any prior root error is no longer rendered.
13. Given a signed-in user, when they visit `/sign-up`, then they are redirected to `/` and the form is never rendered.
14. Given the codebase, when grep'd, then `'use client'` appears in exactly four files: `SignInForm.tsx`, `SignUpForm.tsx`, `Button.tsx`, `Input.tsx`. The new `src/app/(auth)/sign-up/page.tsx` does NOT carry the directive.
15. Given the codebase, when grep'd, then no `any` types are introduced, no plaintext password is logged, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace reference, no `Readonly<{}>` empty type, no helper function called from a server component is exported by a `'use client'` module.
16. Given `tsc --noEmit`, `npm run lint`, `npm run test:run`, and `npx next build`, when each is run, then each exits 0. The test count from the previous task is unchanged at 19 (no new tests in this task; no regressions in the existing tests).
17. Given `mcp__ide__getDiagnostics`, when called against `/src` and `/__tests__`, then no diagnostics surface in any source or test file.
18. Given the server action `signUpAction`, when reviewed, then on duplicate-key error it returns `{ success: false, error: 'Username is already taken.' }`; on any other thrown error it returns `{ success: false, error: 'Something went wrong. Please try again.' }`; on schema rejection it returns `{ success: false, error: 'Something went wrong. Please try again.' }` (the same generic, NOT field-level messages — defence-in-depth against tampered requests).
19. Given `signUpAction`, when reviewed, then it does NOT call `findUserByName` or any other pre-existence check before `UserModel.create(...)`. Uniqueness is enforced solely by the unique index + the duplicate-key catch.
20. Given `signUpAction`, when reviewed, then it imports `hashPassword` from `@/lib/password` (no inline bcrypt setup; no second hashing path).
21. Given `signUpAction`, when reviewed, then the body never logs the plaintext password — no `console.log/info/error/debug` statement includes it.

## Notes for Downstream Agents

- **Architect**: keep `signUpAction` flat and explicit. The duplicate-key catch reads cleanly as a typed narrow (`error instanceof Error && 'code' in error && (error as { code?: unknown }).code === 11000`). One layer of catch — not two — to avoid swallowing the `NEXT_REDIRECT` thrown by `signIn(..., { redirectTo: '/' })`. Auth.js v5's `signIn` rethrows `NEXT_REDIRECT` from inside server actions; this MUST propagate so Next.js can perform the redirect. If the catch is too wide, it'll eat the redirect and the user will stay on `/sign-up` with no feedback. Pattern:
  ```ts
  try {
    await UserModel.create({ name, passwordHash })
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code?: unknown }).code === 11000) {
      return { success: false, error: 'Username is already taken.' }
    }
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
  // signIn THROWS NEXT_REDIRECT — do NOT wrap in try/catch
  await signIn('credentials', { name, password, redirectTo: '/' })
  return { success: true } // unreachable in practice
  ```
- **Builder**: AC #11 hinges on the redirect actually happening. If you accidentally wrap the `signIn(...)` in a try/catch, the redirect throws and your catch swallows it, leaving the user on `/sign-up`. Don't.
- **Reviewer**: AC #18, #19, #20 are static-file checks worth verifying against `src/actions/signUp.ts` directly. AC #11 requires a runtime check — the previous task's `revalidatePath` cookie bug exists precisely to remind us to use `redirectTo` for any cookie-set+navigate flow.
