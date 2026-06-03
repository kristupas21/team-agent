# Spec: Auth — Sign In Update

## Summary
Three narrow changes on top of the shipped `auth-sign-in` feature, with no behavioural regressions: (1) relax the password validation on the sign-in path so an existing user with a short password can still authenticate; (2) replace the manual `useState` + `useTransition` form plumbing in `SignInForm` with `react-hook-form` + the Zod resolver; (3) replace the home-page scaffold placeholder heading and paragraph with a welcoming heading and short paragraph that nudges signed-out visitors toward sign-in. No new routes, no new business logic, no styling adjustments, no tests.

## Assumptions

1. **`signInSchema`'s password field** changes from `.min(8, 'Password must be at least 8 characters.').max(128, 'Password is too long.')` to `.min(1, 'Password is required.').max(128, 'Password is too long.')`. The 128 upper bound stays for DoS defence.
2. **Name field is unchanged** (`trim().min(1, 'Name is required.').max(64, 'Name is too long.')`).
3. **Schema propagates automatically** to `signInAction` (server-side re-validation) and to the `Credentials.authorize` callback in `src/lib/auth.ts`. Both already import `signInSchema` from `@/lib/validation/signIn`. No call-sites change other than removing the now-redundant short-password message from error display.
4. **`react-hook-form` + `@hookform/resolvers`** are added as production dependencies. The Zod adapter lives at `@hookform/resolvers/zod`.
5. **`SignInForm.tsx` becomes the only file refactored for form state**. The signed-out home page's `<form action={signOutAction}>` keeps its server-action binding — no client state, no `react-hook-form` needed.
6. **Pending state comes from `formState.isSubmitting`** (set automatically by react-hook-form for the duration of an `async` `handleSubmit` callback). `useTransition` is removed.
7. **Field-level errors** render directly below their input as plain `<p>{message}</p>`. Server-returned errors render below the submit button as before — same placement, surfaced via `setError('root', { message })` and read from `formState.errors.root?.message`.
8. **Welcome copy** (signed-out and signed-in)
   - **Signed-out heading**: `"Hello there"`.
   - **Signed-out paragraph**: `"Please sign in to continue."`
   - **Signed-in heading**: `"Welcome, {name}"` — interpolates the signed-in user's `name`. For the seeded admin this renders as `"Welcome, admin"`.
   - **Signed-in paragraph**: `"You're signed in."` — same line, no personalisation (the name is already in the heading).
   - **Standalone `<p>{name}</p>` element is removed** from the signed-in branch. Personalisation now lives in the heading; rendering the name twice would be a regression. The Sign Out form/button remains in place, directly below the paragraph.
9. **Tailwind classes on the heading and paragraph are preserved verbatim** (`text-4xl font-semibold` on `<h1>`, `mt-4 text-base text-gray-600` on `<p>`). No new utility classes added.
10. **No `revalidatePath('/')` after sign-out is added** (still relying on Next's automatic form-action re-render — same as the prior task).
11. **No tests added**, matching the precedent set by `initial-setup` and `auth-sign-in`.
12. **No `'use client'` movement.** `SignInForm.tsx` remains the only client boundary on the sign-in path.
13. **The `signInSchema` change is global** — when sign-up arrives in a future task, it will introduce its own `signUpSchema` (or a stricter base). This task does not pre-emptively split the schema.
14. **No README update needed** — the user-facing seed and sign-in steps are unchanged. The change in password validation is invisible to documentation.
15. **`SignInInput` type stays inferred** from `signInSchema`. With the password lower bound at 1, the type signature is functionally identical (`string` either way) — no consumer change.

## Routes / Pages

No route or page is added, removed, or relocated. Modified files only:

| Path | File | Title | Purpose |
|---|---|---|---|
| `/` (modify) | `src/app/page.tsx` | "Next.js App" (metadata unchanged) | Heading swaps based on session: signed-out → `"Hello there"`; signed-in → `"Welcome, {name}"`. Paragraph swaps too: signed-out → `"Please sign in to continue."`; signed-in → `"You're signed in."`. The Sign In anchor (signed-out) and Sign Out form (signed-in) remain. The previous standalone `<p>{name}</p>` element in the signed-in branch is removed — the name now lives in the heading. |
| `/sign-in` (modify) | `src/app/(auth)/sign-in/SignInForm.tsx` | "Sign In" (page metadata unchanged) | Form state plumbing refactored to `react-hook-form`. No visible UI change beyond per-field error placement (now under each input, plain text). |

## Data

### API Endpoints
No new endpoints. The `signInAction`, `signOutAction`, and `Credentials.authorize` paths are unchanged in shape; only the internal Zod bound shifts.

### Data Types
The exported types stay the same:

```ts
// src/lib/validation/signIn.ts — unchanged exports, relaxed bound
export const signInSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(64, 'Name is too long.'),
  password: z
    .string()
    .min(1, 'Password is required.')      // was: .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
})
export type SignInInput = z.infer<typeof signInSchema>
```

```ts
// SignInResult unchanged
type SignInResult =
  | { success: true }
  | { success: false; error: string }
```

No new types are introduced. The `react-hook-form` types are consumed directly from the library and do not require local re-exports.

### Environment Variables
None added or removed.

### Dependencies (added)
- `react-hook-form` — production dependency.
- `@hookform/resolvers` — production dependency. The Zod adapter is imported from `@hookform/resolvers/zod`.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `HomePage` (modify) | server component | Reads session; renders welcome heading + paragraph, then either Sign In link or `{name}` + Sign Out form. Copy strings change; rendering structure is preserved. | none |
| `SignInForm` (refactor) | client component | Form state via `react-hook-form`; validation via `zodResolver(signInSchema)`; server error via `setError('root', ...)`. Visible field-level error placement changes (under each input). | none |

No new components, no deletions.

## User Interactions

### Happy path: sign in
1. User opens `/` (signed-out). Page shows the heading `"Hello there"`, the paragraph `"Please sign in to continue."`, and the existing Sign In link.
2. User clicks the link → navigates to `/sign-in`.
3. Form renders empty.
4. User types `admin` and the seeded password (any length ≥ 1, ≤ 128). Submits.
5. `react-hook-form`'s `handleSubmit` invokes the Zod resolver; both fields parse. `formState.isSubmitting` becomes `true`; the inputs and button become disabled, button label becomes `"Signing in..."`.
6. The submit handler invokes `signInAction({ name, password })`. On `{ success: true }`, the client calls `router.push('/')`. Home re-renders in the signed-in state — heading `"Welcome, admin"`, paragraph `"You're signed in."`, and the Sign Out form.

### Happy path: sign out
Unchanged from the prior task. The Sign Out form on `/` submits to `signOutAction`; Next re-renders the page in the signed-out state.

### Failure: empty name and empty password
1. User submits with both fields empty.
2. `react-hook-form` runs the Zod resolver; both fields fail.
3. Per-field errors render as plain text immediately below each input:
   - Under name input: `"Name is required."`
   - Under password input: `"Password is required."`
4. No server call is made.

### Failure: short-but-non-empty password (CHANGED)
1. User submits with a non-empty password under 8 characters (e.g. `admin` and `pw123`).
2. Zod resolver accepts (password is non-empty, within 128). No field-level error renders.
3. `signInAction` runs. Server-side Zod also accepts. `findUserByName` returns the admin doc. `verifyPassword` returns `false` (since the seeded password is different). Action returns `{ success: false, error: 'Invalid name or password.' }`.
4. The form renders the root error `"Invalid name or password."` below the submit button.

This is the behaviour the task explicitly asks for: short passwords are no longer rejected by validation; they are rejected by the credential check, which produces the generic error.

### Failure: invalid credentials (already valid format)
Unchanged path; UI placement of the server error is unchanged (below submit button).

### Failure: oversize password (>128)
1. User submits with a 129+ char password.
2. Zod resolver rejects with `"Password is too long."` under the password field.
3. No server call.

### Failure: oversize name (>64)
1. Zod resolver rejects with `"Name is too long."` under the name field.
2. No server call.

### Failure: client tampered request
Server-side `signInAction` re-validates with the same (relaxed) schema. Any failure collapses to `{ success: false, error: 'Invalid name or password.' }`.

### Already signed in
Unchanged. `/sign-in` `auth()`-based redirect still fires; the form never renders.

## States

### `/` home page

- **Signed-out**:
  - Heading: `"Hello there"` (Tailwind classes `text-4xl font-semibold` preserved).
  - Paragraph: `"Please sign in to continue."` (Tailwind classes `mt-4 text-base text-gray-600` preserved).
  - Below the paragraph: the existing `<Link href="/sign-in">Sign In</Link>` element. Unchanged.
- **Signed-in**:
  - Heading: `"Welcome, {name}"` — interpolates the signed-in user's name (e.g. `"Welcome, admin"`). Same Tailwind classes.
  - Paragraph: `"You're signed in."` (same classes).
  - Below the paragraph: the existing `<form action={signOutAction}><button type="submit">Sign Out</button></form>`. The standalone `<p>{name}</p>` from the prior task is removed.
- **Loading / Error / Empty**: not applicable.

### `/sign-in` page

- **Initial**: form with two empty inputs and the Sign In submit button. No errors.
- **Field-level error** (Zod rejects):
  - Each failing field has a plain-text `<p>` rendered immediately below it. Allowed strings, exactly: `"Name is required."`, `"Name is too long."`, `"Password is required."`, `"Password is too long."`.
  - Multiple field errors render in their respective slots; no joining is needed because rendering is per-field.
- **Submitting**: inputs and button disabled; button label `"Signing in..."`. Any previous root error is cleared at this point.
- **Server error**:
  - A single `<p>` below the submit button with the message from `setError('root', { message })`. Allowed strings: `"Invalid name or password."` (the only message `signInAction` returns at this stage; future error categories would extend this list).
- **Success**: form resolves; client `router.push('/')`. Form unmounts.
- **Already signed in**: never rendered — server-side `redirect('/')` fires first.

## Acceptance Criteria

1. Given a signed-out user on `/`, when the page loads, then the heading reads exactly `"Hello there"` and the paragraph reads exactly `"Please sign in to continue."` — both wrapped in the original Tailwind class strings, with the existing `Sign In` link rendered below them.
2. Given a signed-in user with name `admin` on `/`, when the page loads, then the heading reads exactly `"Welcome, admin"` and the paragraph reads exactly `"You're signed in."` — both wrapped in the original Tailwind class strings, with the existing Sign Out form rendered below them. There is no standalone `<p>{name}</p>` element anywhere on the page.
3. Given `src/lib/validation/signIn.ts`, when read, then the password field is `z.string().min(1, 'Password is required.').max(128, 'Password is too long.')` — exact strings — and contains no `min(8)` or "at least 8 characters" message.
4. Given a signed-out user on `/sign-in`, when they submit the form with both fields empty, then `react-hook-form` blocks the submission, the server action is not called, and a plain `<p>` containing `"Name is required."` renders immediately below the name input and a plain `<p>` containing `"Password is required."` renders immediately below the password input.
5. Given a signed-out user on `/sign-in`, when they submit with a non-empty password shorter than 8 characters and a name that does not match the admin or a wrong password, then the request reaches the server (no field-level rejection), the server returns `{ success: false, error: 'Invalid name or password.' }`, and that exact string renders below the submit button.
6. Given a signed-out user on `/sign-in`, when they submit with a 129-character password, then `react-hook-form` blocks the submission and `"Password is too long."` renders below the password input.
7. Given a signed-out user on `/sign-in`, when they submit with a 65-character name, then `react-hook-form` blocks the submission and `"Name is too long."` renders below the name input.
8. Given a signed-out user on `/sign-in`, when the form is being submitted, then both inputs are disabled, the submit button is disabled, and the button label is `"Signing in..."`. The previous root error (if any) is no longer rendered during submission.
9. Given a signed-out user on `/sign-in`, when they submit valid admin credentials of any non-empty length ≤ 128, then the action returns `{ success: true }`, an authenticated session is established, and the browser is redirected to `/`.
10. Given `src/app/(auth)/sign-in/SignInForm.tsx`, when read, then it imports `useForm` from `react-hook-form` and `zodResolver` from `@hookform/resolvers/zod`. It contains no `useState` for name/password/error and no `useTransition`.
11. Given the codebase, when grep'd for `"use client"`, then exactly one match remains and it is `src/app/(auth)/sign-in/SignInForm.tsx`.
12. Given the codebase, when grep'd, then no `any` types are introduced, no plain `<a>` is used for an internal route, no `<img>`, no `next/router`, no `window.location`.
13. Given `tsc --noEmit`, `npm run lint`, and `npm run test:run`, when each is run, then each exits 0 with no warnings or errors.
14. Given `package.json`, when read, then `react-hook-form` and `@hookform/resolvers` appear under `dependencies` (or both under `devDependencies` if the architect decides — but production seems correct since they ship with the bundle).
15. Given `src/app/page.tsx`, when read, then the Tailwind class strings on the heading (`text-4xl font-semibold`) and paragraph (`mt-4 text-base text-gray-600`) are preserved verbatim, and no new utility classes are added to any element on the page.
16. Given the `Credentials.authorize` callback in `src/lib/auth.ts`, when reviewed, then it still uses `signInSchema.safeParse(raw)` and behaviour is unchanged other than the relaxed password lower bound.

## Notes for Downstream Agents
- **Architect**: react-hook-form integrates with Zod via the `@hookform/resolvers/zod` adapter — the typical import is `import { zodResolver } from '@hookform/resolvers/zod'`. The form fields are registered against `SignInInput` so types flow through.
- **Builder**: be careful around `formState.isSubmitting` — it is `true` only while the `handleSubmit` async callback is in flight. The "previous error cleared during submit" requirement (AC #8) is satisfied automatically because `setError('root', ...)` cleared by the next `handleSubmit` call before user input changes; if needed, call `clearErrors('root')` at the top of the submit handler explicitly.
- **Reviewer**: AC #5 is the linchpin of this task — verify the failure mode flips from "field-level Zod error about length" to "root-level server credential error". A 6-char password should now produce `"Invalid name or password."`, not `"Password must be at least 8 characters."`.
