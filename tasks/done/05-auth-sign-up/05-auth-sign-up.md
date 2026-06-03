# Task: Auth — Sign Up

## Description
Add account creation. Until now the app has only had a single pre-seeded admin user; this task introduces a public sign-up flow that creates new users at runtime. New route with a small form (username + password), validation on both client and server, optimistic auto-sign-in on success, and a Sign Up link on the home page next to Sign In. Reuses the styled primitives (`Button`, `Input`, `Card`) and the `react-hook-form` + `zod` + server-action pattern established in earlier tasks.

## Scope

### In scope
- New route at `/auth/sign-up` (see Note on route path below) showing a styled form with two inputs (Name, Password) and a Sign Up button.
- New `signUpSchema` (separate from `signInSchema`) validating:
  - `name`: trimmed, required, min 5 chars, max 64 chars.
  - `password`: required, min 5 chars, max 128 chars.
- New `signUpAction` server action that re-validates with `signUpSchema`, hashes the password with `bcryptjs`, inserts a `UserModel` document, handles the duplicate-name case, and on success auto-signs-in the new user and lands them on `/`.
- On success: an authenticated session is established for the new user; the user is redirected to `/` and sees the signed-in card with their `name` in the heading.
- On failure: a plain-text error message renders in the same place and style as the sign-in form's errors — field-level messages directly below each input via `Input`'s `error` prop, and a root-level message (e.g. "Username is already taken.", "Something went wrong.") in `text-danger-500` below the submit button.
- Home page: when signed-out, render a Sign Up link next to the existing Sign In link. Both are styled like primary buttons (the `buttonClass()` helper from `04-basic-styling` is available). Order: Sign In first, Sign Up second.
- Already-signed-in user visiting `/auth/sign-up` is redirected to `/` (mirrors the sign-in page's behaviour).
- README: brief mention of the new flow.

### Out of scope
- Email verification, password reset, magic-link sign-up.
- Roles, authorization beyond "signed-in vs signed-out".
- Profile pages, account settings, user listing, deleting accounts.
- CAPTCHA / bot protection. (Sensible follow-up but not for this task.)
- Rate limiting on the sign-up endpoint. (Same — follow-up.)
- Any change to `signInSchema` or to the sign-in flow.
- Any change to the admin-seed flow. The seed admin remains; sign-up adds *additional* users alongside it.
- Styling — all visuals come from the existing primitives + Tailwind tokens. No new colours, no new components, no new fonts.

## Specific Behaviour

### Sign-up form (`/auth/sign-up`)
- Layout: identical to `/sign-in` — centred `<main>` wrapper, `<Card>` containing the form.
- Form fields:
  - Name (`<Input type="text">`).
  - Password (`<Input type="password">`).
- Submit: `<Button type="submit" variant="primary" loading={formState.isSubmitting}>Sign Up</Button>`.
- State plumbing: `useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) })`. Server-returned error via `setError('root', { message })`.

### Validation
- Client-side via `react-hook-form` + `zodResolver(signUpSchema)`.
  - Per-field errors render under their input as plain `<p>` in danger color.
  - Allowed copy: `"Name is required."`, `"Name must be at least 5 characters."`, `"Name is too long."`, `"Password is required."`, `"Password must be at least 5 characters."`, `"Password is too long."`.
- Server-side: `signUpAction` re-runs the same schema (defence-in-depth). On a tampered request that fails the schema, collapse to a single generic error (`"Something went wrong. Please try again."`) — no field-level echo from the server, same hostile-input policy as `signInAction`.

### Username collision
- Source of truth: `UserModel`'s `unique: true` index on `name` enforces this at the DB level.
- On collision: the server action returns `{ success: false, error: 'Username is already taken.' }`. Unlike the sign-in path, exposing this is acceptable because the user typed the name themselves — there's no enumeration attack to defend against.
- Detection: the action catches the MongoDB duplicate-key error (`code === 11000`) thrown by `UserModel.create(...)`. The architect decides the exact catch shape; the spec-agent can suggest using `error.code` or `error.name === 'MongoServerError' && error.code === 11000`.

### Success path
- After `UserModel.create(...)` succeeds, the user is auto-signed-in. Two acceptable mechanisms (spec-agent picks):
  1. Server action returns `{ success: true }`; the client calls `router.push('/')` (same pattern as `signInAction`).
  2. Server action calls `signIn('credentials', { name, password, redirectTo: '/' })` which both sets the cookie and redirects (avoids the "can't read your own cookie write" issue we hit in sign-out).
- Either path lands the user on `/` with an authenticated session. The home page renders the signed-in card with the new user's `name` in the heading.

### Home page integration
- Signed-out branch (in `src/app/page.tsx`): keep the existing Sign In link; add a Sign Up link beside it.
- Both links use `buttonClass('primary', ...)` (or one uses `'secondary'` if the spec-agent prefers visual differentiation — they're equally primary actions, so a single primary style is also reasonable).
- Layout: vertical stack with `space-y-3` (or similar) inside the card, or a horizontal flex row — spec-agent picks. Stay mobile-readable.

### Already signed in
- `/auth/sign-up` is a server component that calls `auth()`. If `session?.user` is truthy → `redirect('/')`. Mirrors `/sign-in`.

## Note on Route Path
The draft specifies `/auth/sign-up`. The existing sign-in route is at `/sign-in` (the `(auth)` route group has parentheses, so it doesn't appear in the URL). There are two reasonable interpretations the spec-agent should resolve as a flagged assumption:

- **Option A (literal)**: a new path segment `auth/` under `src/app/auth/sign-up/page.tsx`. URL = `/auth/sign-up`. This matches the draft verbatim but breaks the symmetry — sign-in stays at `/sign-in` while sign-up sits at `/auth/sign-up`.
- **Option B (consistent)**: place sign-up inside the existing `(auth)` route group at `src/app/(auth)/sign-up/page.tsx`. URL = `/sign-up`. The draft's `/auth/sign-up` is read as a shorthand for "the sign-up page under the auth feature folder".

The spec-agent picks one, documents the choice as an Assumption, and is consistent with the home-page link href. If picking Option A, the existing sign-in path can stay at `/sign-in` (no migration required) or be flagged separately as a Note suggesting a future symmetrising task.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

- `src/lib/validation/signUp.ts` — new Zod schema + `SignUpInput` type.
- `src/actions/signUp.ts` — new server action.
- `src/app/(auth)/sign-up/page.tsx` *or* `src/app/auth/sign-up/page.tsx` — new server component (per route-path decision).
- `src/app/(auth)/sign-up/SignUpForm.tsx` *or* `src/app/auth/sign-up/SignUpForm.tsx` — new client component, sibling to the page.
- `src/app/page.tsx` — modify to render the new Sign Up link in the signed-out branch.
- `src/lib/users.ts` — optionally add a `createUser({ name, passwordHash }): Promise<UserDoc>` helper if the architect wants the DB write co-located with the existing lookup helpers. Not strictly required.
- `README.md` — brief mention of the sign-up step (optional; the README's existing seed flow stays).

No model changes — `UserModel` already has the `unique: true` index that enforces username uniqueness.

## Done Criteria
- A signed-out visitor on `/` sees both a Sign In and a Sign Up link, styled like primary buttons.
- Clicking the Sign Up link navigates to the sign-up route.
- The sign-up route renders the form inside the centred styled card; field labels are `Name` and `Password`; the submit button reads `Sign Up`.
- Submitting empty fields produces the exact per-field messages `"Name is required."` and `"Password is required."` rendered under each input, with no server call made.
- Submitting a 4-character name produces `"Name must be at least 5 characters."` under the name input.
- Submitting a 4-character password produces `"Password must be at least 5 characters."` under the password input.
- Submitting an already-taken name (e.g. `admin`) renders `"Username is already taken."` in danger color below the submit button.
- Submitting valid, novel credentials results in: a new `UserModel` document, a session established for the new user, and a redirect to `/`. The home page renders the signed-in card with the new user's name in the heading.
- Reloading the sign-up route while already signed in redirects to `/`.
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, and `npx next build` all exit 0.
- No new Tailwind class strings, no new colour tokens, no `'use client'` outside the new form component.

## What This Task Does NOT Include
- Email verification, password reset, magic links, OAuth.
- CAPTCHA, rate limiting.
- Profile editing or deletion.
- Tests for the new code path. (Same precedent we've been carrying — only `04-basic-styling` introduced tests, and for the three primitives only. The spec-agent may flag a single high-value test if it's essentially free; otherwise defer.)
- Any change to the sign-in flow or the admin seed flow.

## Notes for the Spec-Agent

- The cookie-clear bug solved in `04-basic-styling` (via `signOut({ redirectTo: '/' })`) is worth reusing here: if you choose the `signIn(..., { redirectTo: '/' })` mechanism for auto-login, you sidestep the same "can't read your own cookie write" issue inside a server action. The client-side `router.push('/')` pattern also works (sign-in proves it).
- The duplicate-key catch should be precise: only collapse to "Username is already taken." when the error is *actually* a unique-index violation; other DB errors should produce the generic "Something went wrong." Avoid catching `error.code === 11000` literally if the architect picks a more typed Mongoose error path.
- For the home-page link layout, the simplest pattern is two stacked Sign In / Sign Up links with `space-y-3` (or `flex flex-col gap-3`) inside the existing centred card. Horizontal layout is fine too if it stays readable on mobile.
- The `signUpSchema` belongs in `src/lib/validation/signUp.ts` to keep it parallel with `src/lib/validation/signIn.ts`. Architect/builder should not consolidate into a single shared file — separate schemas signal separate concerns.
- The route-path question (Option A vs B above) is the single open call this brief leaves to the spec-agent. Lean toward Option B (consistent with sign-in's `/sign-in`) unless there's a reason to prefer Option A.
