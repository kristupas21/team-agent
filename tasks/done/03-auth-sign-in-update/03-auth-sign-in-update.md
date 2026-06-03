# Task: Auth — Sign In Update

## Description
Three refinements on top of the shipped `auth-sign-in` feature: (1) drop the password length validation on the sign-in path — bound rules belong in sign-up, not sign-in; (2) migrate the sign-in form from manual `useState` + Zod to `react-hook-form` with the Zod resolver for cleaner state and error handling; (3) replace the scaffold placeholder copy on the home page with a welcome message that nudges signed-out visitors toward sign-in. Pure refactor + copy task — no new routes, no new business logic, no styling, no tests.

## Scope

### In scope
- Update `signInSchema` (in `src/lib/validation/signIn.ts`) so the password field is only checked for "non-empty" and an upper bound, not minimum length 8.
- The same schema is used in the form, in `signInAction`, and inside the Credentials provider's `authorize` callback in `src/lib/auth.ts` — change propagates automatically.
- Install `react-hook-form` and `@hookform/resolvers` (zod adapter), then refactor `src/app/(auth)/sign-in/SignInForm.tsx` to use `useForm({ resolver: zodResolver(signInSchema) })`. Surface server-action failures via `setError('root', ...)` instead of a parallel `useState`.
- Replace the home-page placeholder heading and paragraph (currently `"Next.js App"` / `"Foundation in place. Build features from here."`) with a welcoming heading + copy block that encourages signed-out visitors to sign in.
- Update README if any user-facing flow text changed materially. (Likely a no-op — the seeding/sign-in steps are unchanged.)

### Out of scope
- Sign-up flow and the stricter sign-up password schema (will arrive in its own task).
- Password reset / "forgot password".
- Sign-out behaviour, route protection, authorization changes.
- Tests — defer per the precedent set by `initial-setup` and `auth-sign-in`.
- Styling — no Tailwind classes added or changed in this task. The existing centered Tailwind wrapper on the home page stays exactly as it is.
- Migrating any other form to react-hook-form (there are no other forms — `signOutAction` uses a server-action `<form action={...}>`, no client state).

## Specific Changes

### 1. Password length validation — remove from sign-in
- **Today** (`src/lib/validation/signIn.ts`):
  ```ts
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
  ```
- **After**:
  ```ts
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(128, 'Password is too long.'),
  ```
- **Why keep the upper bound**: defends against a DoS where a malicious client posts a multi-megabyte string into bcrypt. Best practice; should stay.
- **Why drop the min(8) requirement on this path**: a user with an existing valid account whose password happens to be 6 characters must still be able to sign in. Length rules are about *new* passwords; the sign-in form should not enforce them. When sign-up arrives, it will introduce a separate `signUpSchema` (or extend a shared base) with the strict rules.
- **Resulting acceptance criterion**: submitting an empty password still fails (`"Password is required."`). Submitting a short-but-non-empty password is allowed through validation; whether sign-in succeeds depends on whether the password matches the stored hash.

### 2. Form state — move to react-hook-form
- **Today**: `SignInForm.tsx` uses three `useState`s (`name`, `password`, `error`), `useTransition` for the pending state, and a manual `signInSchema.safeParse(...)` inside `handleSubmit`.
- **After**: `useForm<SignInInput>({ resolver: zodResolver(signInSchema) })`.
  - `register('name')`, `register('password')` replace the manual controlled inputs.
  - `handleSubmit(onValid)` replaces the manual `event.preventDefault()` + safeParse.
  - `formState.errors.name` / `formState.errors.password` replace the joined error string for field-level Zod failures.
  - `formState.isSubmitting` replaces `useTransition`'s `isPending`.
  - Server-returned error (`{ success: false, error: 'Invalid name or password.' }`) is plumbed via `setError('root', { message: result.error })`, then displayed below the button.
- **Dependencies to add**: `react-hook-form` (dependency) and `@hookform/resolvers` (dependency; the zod resolver imports from this package).
- **No `'use client'` change**: SignInForm stays the only client component on the sign-in path.
- **Display rules**:
  - Per-field errors render directly under the input they belong to (still plain text, no styling).
  - The root/server error renders below the submit button, same place as today.
  - All copy strings reused: `"Name is required."`, `"Name is too long."`, `"Password is required."`, `"Password is too long."`, `"Invalid name or password."`. No new copy invented unless the spec-agent identifies a gap.

### 3. Home page — welcome message
- **Today** (`src/app/page.tsx`):
  ```tsx
  <h1 className="text-4xl font-semibold">Next.js App</h1>
  <p className="mt-4 text-base text-gray-600">
    Foundation in place. Build features from here.
  </p>
  ```
- **After**: a welcoming heading and short paragraph that:
  - Greets the visitor.
  - Tells them they need to sign in.
  - Reads naturally on the page when followed by the existing `Sign In` link (signed-out branch) or the admin name + Sign Out form (signed-in branch).
- **Tailwind classes**: keep the existing `text-4xl font-semibold` on the heading and `mt-4 text-base text-gray-600` on the paragraph. No styling changes per task scope.
- **Exact copy is for the spec-agent to nail down.** This task brief intentionally does not lock it in — the spec-agent will propose strings, document them as Assumptions, and surface them in Open Questions if they feel preference-driven.
- **Signed-in copy**: the spec-agent should decide whether the heading/paragraph stays the same when signed in (welcome is generic), or whether a personalised greeting replaces them. This is an Open Question, not a hard requirement.

## Folder / File Touch Points
Rough sketch — the architect produces the precise list.

- `src/lib/validation/signIn.ts` — relax password min.
- `src/app/(auth)/sign-in/SignInForm.tsx` — refactor to `react-hook-form`.
- `src/app/page.tsx` — replace heading/paragraph copy.
- `package.json` — add `react-hook-form`, `@hookform/resolvers`.
- `README.md` — only if developer-facing text materially changed (likely unchanged).

No files are deleted in this task.

## Done Criteria
- `tsc --noEmit`, `npm run lint`, `npm run test:run` all pass.
- Submitting an empty name or empty password from the sign-in form still shows a plain-text error (field-level via react-hook-form).
- Submitting a short but non-empty password no longer triggers a "Password must be at least 8 characters" message — the request now reaches the server, and the bcrypt comparison decides outcome.
- A wrong-but-non-empty credential combination still yields the generic `"Invalid name or password."` error below the submit button.
- A correct admin credential still results in redirect to `/`.
- The home page in the signed-out state shows the new welcome heading + paragraph, followed by the existing `Sign In` link.
- The home page in the signed-in state shows the heading + paragraph (or personalised greeting per the spec-agent's call), followed by the admin name and the Sign Out form/button.
- No new Tailwind classes; existing classes preserved.
- No new `'use client'` boundaries; the existing one on `SignInForm.tsx` remains the only one.
- `next build` succeeds; routes unchanged.

## What This Task Does NOT Include
- Sign-up flow or the stricter sign-up password schema.
- Password reset.
- Any styling adjustments.
- Tests — same scoping rule as the previous two tasks.
- Migration of other forms to react-hook-form (there are no other forms today).
- Any change to authentication, authorization, session strategy, or seeding.

## Notes for the Spec-Agent
- The exact welcome heading and paragraph copy are open. Propose strings (Assumptions), and flag them in Open Questions only if they feel client/preference-driven.
- Whether the welcome copy stays generic when signed in or becomes personalised is an Open Question to surface.
- The Zod schema change is intentionally narrow — do not pre-emptively add a `signUpSchema` here.
- The Credentials provider's `authorize` callback in `src/lib/auth.ts` also runs `signInSchema.safeParse`. Confirm the relaxed bound is still acceptable there (it should be — the same trust model applies on the server credential check).
