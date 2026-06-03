# Spec: Auth — Sign In

## Summary
Add credentials-based sign-in for a single pre-seeded admin user. No sign-up, no password reset, no styling. The feature exists to wire NextAuth.js v5 end-to-end so future tasks can layer authorization and UI on top. A `/sign-in` route exposes a plain HTML form (name, password, submit). The home page (`/`) gains a session-aware switch: an unstyled "Sign In" button when signed out, the user's name when signed in. Validation runs on both client and server using a shared Zod schema. Errors surface as a single line of plain text below the form.

## Assumptions

1. **Credential field is `name`.** The form input is literally labelled "name" and the user said "name input". The admin record's identifier column is therefore `name` (a string, e.g. `admin`), not `email` or `username`. NextAuth.js v5 + the MongoDB adapter both support arbitrary fields; we don't reuse the adapter's `email` column.
2. **Session strategy switches to `jwt`.** Auth.js v5's Credentials provider does not support the `database` session strategy currently configured in `src/lib/auth.ts`. The strategy changes to `jwt`. The MongoDB adapter stays wired (so future OAuth flows or session lookups still work) but the credentials login path uses JWT.
3. **Password hashing: `bcrypt`** (`bcryptjs` package — pure JS, no native build, widely used). Cost factor: 12.
4. **Seeding mechanism: a one-time idempotent `npm run seed:admin` script** (`scripts/seed-admin.ts`, runnable via `tsx`). Reads `ADMIN_NAME` and `ADMIN_PASSWORD` from `process.env`. Creates the admin user only if no document with that `name` exists. Logs a clear success / "already exists" message.
5. **Sign-out IS delivered**: when signed in, the home page renders a plain unstyled "Sign Out" button immediately next to the admin name. Clicking it ends the session and the page re-renders in the signed-out state. Implemented as a server action wrapping NextAuth's `signOut()`; the button lives inside a `<form action={signOutAction}>` so no client component is required on the home page.
6. **Tests are NOT written** in this task, matching the precedent set by `initial-setup`. Listed under Open Questions.
7. **Field bounds**: `name` 1–64 characters after trim; `password` 8–128 characters. These come from common best practice (NIST 800-63B suggests min 8, max 64+ for usability). 128 is a sane upper bound to prevent DoS-by-bcrypt.
8. **Generic error copy** is `"Invalid name or password."` for any credential failure (wrong name, wrong password, no admin yet seeded). Zod validation errors surface their own per-field message but are joined into a single line.
9. **`/sign-in` is a server component** that calls `auth()` for the redirect check; the form itself is extracted to a client component (`SignInForm.tsx`) so it can manage `useState` for error display and `useTransition` for the submit pending state.
10. **Server action** is the submission path (not a client `signIn()` call). The action validates with Zod, looks up the user, verifies the password with bcrypt, and on success calls `signIn('credentials', ...)` inside the action. This keeps the password off the network as URL params and aligns with App Router conventions.
11. **No CSRF override.** Auth.js v5 ships CSRF protection on its own routes. The server action uses Next.js's built-in action CSRF handling.
12. **Rate limiting is out of scope** for this task. A future task can add it once basic auth is proven.
13. **The signed-in name** displayed on `/` is the same `name` value used to log in (i.e. `admin`). No display-name field is added.

## Open Questions

1. **`bcryptjs` vs `argon2`?** — Assumed: `bcryptjs`. Argon2 is stronger but requires native build (`argon2` npm package compiles native code; `node-rs/argon2` is an alternative). For a small admin-only system bcrypt is acceptable. Affects: `src/lib/password.ts` deps and Docker image footprint if we ever containerise.
2. **Should the admin seed run automatically on `npm run dev` if no admin exists?** — Assumed: no, manual `npm run seed:admin` only. Alternatives: lifecycle hook, on-startup check inside Mongoose connection. Affects: developer onboarding step in README.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/` (modify) | `src/app/page.tsx` | "Next.js App" (metadata unchanged) | Reads session via `auth()`. If signed-out: render existing placeholder + plain `<a href="/sign-in">Sign In</a>` (rendered as a button-shaped element with no Tailwind). If signed-in: render existing placeholder + the user's `name` as a plain text node, immediately followed by a `<form action={signOutAction}>` containing a `<button type="submit">Sign Out</button>`. |
| `/sign-in` (new) | `src/app/(auth)/sign-in/page.tsx` | "Sign In" (page-level metadata) | Server component. Calls `auth()`; if a session exists, immediately `redirect('/')`. Otherwise renders `<SignInForm />`. Includes a `<form>`-bound `<SignInForm />` client component. |

The `/(auth)` route group already exists from `initial-setup`. No new route groups are created.

## Data

### Data Types

```ts
// src/lib/validation/signIn.ts
import { z } from 'zod'

export const signInSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(64, 'Name is too long.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password is too long.'),
})

export type SignInInput = z.infer<typeof signInSchema>
```

```ts
// src/actions/signIn.ts return shape
// (uses the CLAUDE.md ActionResult<T> pattern)
type SignInResult =
  | { success: true }
  | { success: false; error: string }
```

```ts
// src/actions/signOut.ts — always succeeds (or throws, in which case Next's
// error boundary handles it). No return value needed because it's bound directly
// to <form action={...}>; after calling next-auth signOut() the action calls
// revalidatePath('/') or relies on the cookie clear to re-render on next request.
export async function signOutAction(): Promise<void>
```

```ts
// Mongoose user model (new — src/models/User.ts)
type UserDoc = {
  name: string          // unique, indexed
  passwordHash: string  // bcrypt hash, never returned to client
  createdAt: Date
  updatedAt: Date
}
```

### API Endpoints
- `POST /api/auth/[...nextauth]` — already exists from `initial-setup`. Auth.js handles its own credential verification when `signIn('credentials', ...)` is invoked inside the server action.
- No bespoke HTTP API endpoints are added in this task. All custom logic flows through the **server action** `signIn` in `src/actions/signIn.ts`.

### Environment Variables (new)
- `ADMIN_NAME` — seed value for the admin user's `name`. Committed example: `admin`.
- `ADMIN_PASSWORD` — seed value for the admin user's password (plaintext at seed time only). **Not** committed in `.env.example`; only the key name appears there with a blank value and a comment.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `HomePage` (modified) | server component | Reads session, conditionally renders Sign In button (signed-out) or signed-in name followed by an unstyled "Sign Out" form/button (signed-in). | none |
| `SignInPage` | server component | Pre-checks session and redirects, else renders `<SignInForm />`. | none |
| `SignInForm` | client component | Owns name/password state, error state, submit pending state. Calls the server action. | none |

Architect decides any further internal breakdown.

## User Interactions

### Happy path: sign in
1. User opens `/`. Page shows placeholder + unstyled `"Sign In"` button.
2. User clicks the button → navigates to `/sign-in`.
3. Form renders with empty name and password fields and the `"Sign In"` submit button.
4. User types `admin` and the seeded password.
5. User clicks `"Sign In"`. Button shows pending state (disabled while the transition is pending — no spinner, just disabled).
6. Server action validates input, looks up the admin, verifies the bcrypt hash, calls `signIn('credentials', { redirect: false })`.
7. Action returns `{ success: true }`. Client receives result and navigates to `/`.
8. `/` reads the session via `auth()`. Page shows placeholder + plain text `admin`.

### Happy path: sign out
1. User is signed in. Home page shows `admin` followed by a `"Sign Out"` button.
2. User clicks `"Sign Out"`. The form submits to the `signOutAction` server action.
3. The action calls NextAuth's `signOut({ redirect: false })`, which clears the session cookie.
4. The action returns (no value). Next.js automatically re-fetches the page, which now reads no session and renders the signed-out state (placeholder + Sign In button).

### Failure: already signed in
1. User (with an existing session cookie) opens `/sign-in`.
2. The server component's `auth()` call returns a session.
3. `redirect('/')` is invoked before the form ever renders.

### Failure: empty fields (client-side)
1. User clicks `"Sign In"` without entering anything.
2. Client-side Zod validation rejects. The action is not called.
3. The form shows a single line of error text below the button (e.g. `"Name is required."`). If multiple fields fail, errors are joined with `" "` into one line (e.g. `"Name is required. Password must be at least 8 characters."`).

### Failure: invalid credentials (server-side)
1. User enters a wrong name/password combination that passes Zod (non-empty, length OK).
2. Server action runs: Zod passes, DB lookup either returns no user OR bcrypt comparison fails.
3. Action returns `{ success: false, error: 'Invalid name or password.' }`.
4. Form shows that exact line of text below the button. No indication of which field was wrong.

### Failure: server-side Zod rejection (client tampered)
1. Client-side validation is bypassed (e.g. dev tools edit).
2. Server action's Zod re-validation rejects.
3. Action returns `{ success: false, error: 'Invalid name or password.' }` (same generic message — we do not leak which field failed in this case either, since a tampered request is treated as hostile).

### Failure: no admin seeded
1. Developer skipped `npm run seed:admin`.
2. Server action's DB lookup returns no user.
3. Same response: `{ success: false, error: 'Invalid name or password.' }`.
4. (Developer-only note: server logs `"[signIn] no admin user — seed required"` at INFO level for debuggability. Not user-visible.)

## States

### `/` (home page)
- **Signed-out**: placeholder heading + paragraph (unchanged from `initial-setup`) + below it, on a new line, an unstyled `<a>` with `href="/sign-in"` and text `"Sign In"`. Plain HTML; no Tailwind classes on this anchor.
- **Signed-in**: placeholder heading + paragraph (unchanged) + below it, on a new line, plain text rendering the user's `name` (`admin`) immediately followed by an unstyled `<form>` containing a `<button type="submit">Sign Out</button>`. No Tailwind classes on the name node, form, or button.
- **Loading / Error / Empty**: not applicable. The home page reads the session synchronously inside a server component.

### `/sign-in` (sign-in page)
- **Initial (signed-out)**: form with empty name + password fields and an enabled `"Sign In"` button. No error text rendered.
- **Submitting**: name and password fields disabled. Submit button disabled and text becomes `"Signing in..."`. No spinner. Error region cleared.
- **Error**: form fields re-enabled; submit button re-enabled. Below the button, a single `<p>` rendering the error string. Possible contents:
  - `"Invalid name or password."` (server credential failure — most common)
  - `"Name is required."` / `"Password must be at least 8 characters."` / `"Name is too long."` / `"Password is too long."` (client-side Zod field errors — joined with `" "` if multiple)
  - `"Something went wrong. Please try again."` (server action threw — generic; never expose raw error)
- **Success**: form action resolves with `{ success: true }`. Client calls `router.push('/')` (or `router.replace('/')` to avoid a back-button loop — architect picks).
- **Already-signed-in**: never renders the form. Server-side `redirect('/')` happens first.

## Acceptance Criteria

1. Given a fresh database with no admin user, when the developer runs `npm run seed:admin` with `ADMIN_NAME=admin` and `ADMIN_PASSWORD=<something>` in `.env.local`, then a single document is created in the `users` collection with `name = 'admin'` and `passwordHash` set to a bcrypt hash of the supplied password.
2. Given the seed script is run twice in a row, when the second run executes, then it does not create a duplicate document and logs an "already exists" message.
3. Given a signed-out user, when they visit `/`, then the page renders the existing placeholder heading and paragraph plus an unstyled `"Sign In"` element that navigates to `/sign-in` when clicked.
4. Given a signed-out user, when they visit `/sign-in`, then a form renders with an input for `name`, an input of type `password`, and a submit button labelled `"Sign In"`.
5. Given a signed-out user on `/sign-in`, when they submit the form with both fields empty, then the server action is NOT called and a plain-text error appears below the form (text: `"Name is required."` joined with `" "` to `"Password must be at least 8 characters."`, in that order).
6. Given a signed-out user on `/sign-in`, when they submit with an invalid name/password combination that passes client validation, then the action runs, the response is `{ success: false, error: 'Invalid name or password.' }`, and that exact text appears below the form.
7. Given a signed-out user on `/sign-in`, when they submit with the correct admin credentials, then the action returns `{ success: true }`, an authenticated session is established, and the browser is redirected to `/`.
8. Given a signed-in user, when they visit `/`, then the page shows the placeholder plus the plain text `admin` (the user's name) immediately followed by a `"Sign Out"` button — no `"Sign In"` button is present.
9. Given a signed-in user, when they visit `/sign-in`, then they are immediately redirected to `/` and the form is never rendered.
9a. Given a signed-in user on `/`, when they click `"Sign Out"`, then the session is cleared, the page re-renders, and the signed-out state is shown (placeholder + `"Sign In"` button); the signed-in name and `"Sign Out"` button are gone.
10. Given any combination of valid inputs (name + password), when the request is in flight, then the form's inputs are disabled and the submit button text is `"Signing in..."`.
11. Given the user types something then submits, when the action is in flight, then the previous error text (if any) is cleared from the DOM during the request and re-rendered only if the new submission fails.
12. Given the password is provided in the form, when the request is sent, then the plaintext password is transmitted only as part of the encrypted server-action body and is never logged on the server.
13. Given the database is queried for the admin user, when retrieving the document, then the document includes `passwordHash` but the password hash is never serialised to the client (the server action never returns the user object).
14. Given `tsc --noEmit`, `npm run lint`, and `npm run test:run`, when each is run, then each exits 0 with no warnings or errors.
15. Given the codebase, when grep'd, then no `any` types are introduced, no `"use client"` appears on the home page or the sign-in page (only on `SignInForm.tsx`), and no plaintext password is written to logs.
16. Given the env, when starting the app without `MONGODB_URI`, then the seed script fails with a clear error and exit code 1; when starting without `AUTH_SECRET`, then Auth.js refuses to handle credentials and the seed script remains unaffected.
17. Given a user submits more than 128 characters in the password field, when the server action validates, then the request is rejected with the generic credential-failure error (we do not echo the Zod max-length message back, to avoid signalling that the upper bound exists).

## Notes for Downstream Agents
- Architect: must reconcile JWT session strategy with the existing MongoDB adapter wiring in `src/lib/auth.ts`. Adapter is allowed but unused for credential sessions in v5.
- Builder: every Tailwind class on the home page that already exists from `initial-setup` stays — this task adds *no* new Tailwind classes. The new Sign In button/anchor and the signed-in name node have no classes.
- Reviewer: pay attention to AC #12, #13, #15 — they encode best-practice secrets handling that is easy to miss.
