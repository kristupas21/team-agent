# Task: Auth - Sign In

## Description
Add sign-in (not sign-up) to the app. A single pre-seeded admin user is the only account that can authenticate at this stage. The feature has zero styling — this task is purely about wiring up the auth flow end-to-end so future tasks can layer UI and authorization on top. Validation is best-practice on both the frontend and the backend.

## Scope

### In scope
- A pre-seeded admin user with a basic password.
- A `/sign-in` route with a form: name input, password input, "Sign In" button. No styling.
- Frontend validation of both fields (required, length sane).
- Backend validation of both fields (server cannot trust the client).
- On submit: if credentials are correct, create an authenticated session and redirect to `/`.
- On submit: if credentials are wrong (or invalid input), display a single error message as plain text below the form. No styling.
- Modify the home page (`/`): show an unstyled "Sign In" button when signed out; show the signed-in user's name (`admin` in this case) when signed in. No styling.
- Visiting `/sign-in` while already signed in redirects to `/`.

### Out of scope
- Sign-up, password reset, "forgot password", account management.
- Sign-out / log-out UI (no requirement was given — surface in Open Questions if needed).
- Multiple users, roles, permissions, authorization gates beyond "signed in / signed out".
- Email verification, OAuth providers, magic links.
- Any styling — no Tailwind classes on the new elements, plain HTML.
- Tests — kept out of this task per the same scoping rule we used for `initial-setup`. The spec/architect/builder can revisit if it turns out a tiny test is the right call.

## Admin User Seeding
- Seed value source: environment variables in `.env.local`, with matching keys in `.env.example`. Suggested names: `ADMIN_NAME`, `ADMIN_PASSWORD`. The actual secret stays out of `.env.example`.
- The password is stored hashed in MongoDB — never as plaintext. Choose the hashing library following best practice (e.g. `bcrypt` / `argon2`). The architect picks.
- Seeding strategy: prefer a one-time idempotent seed step that creates the admin user only if it does not already exist. Mechanism (separate script vs. on-startup check vs. `package.json` script) is the architect's call.
- Document the seed command in `README.md`.

## Auth Mechanism
- Build on the existing NextAuth.js v5 skeleton in `src/lib/auth.ts`. Add a `Credentials` provider.
- The current setup uses `session: { strategy: 'database' }`. Credentials provider in Auth.js v5 requires `jwt` strategy — the architect must reconcile this. Update `src/lib/auth.ts` accordingly.
- Use `signIn` from `next-auth` on the server (preferred — server action) or client, whichever is more idiomatic for Auth.js v5 + App Router. Best practice wins.
- Session reading: `auth()` server-side; for the home page server component this is straightforward.
- The "name" field in the sign-in form maps to the credential identifier the provider checks against the seeded admin. Whether the column is literally `name` or `username` is the architect's call — match Auth.js v5 / MongoDB-adapter conventions.

## Validation
- Use **Zod** (already installed) for the schema, shared between client and server so the contract cannot drift.
- Frontend: validate on submit, show plain-text error message below the form. No per-field error layouts.
- Backend: re-validate the same Zod schema in the server action / API route. Never trust client validation alone.
- Rules: both fields required, non-empty, trimmed; password minimum length is sane (8+); name has a sensible upper bound (e.g. 64). Architect/spec to nail down exact bounds.

## Pages

### `/` (modify existing home page)
- Read the session server-side with `auth()`.
- If no session: show the placeholder heading and paragraph from the previous task, **plus** an unstyled `<button>` (or `<a>` styled as plain button — no Tailwind) labelled "Sign In". Clicking it navigates to `/sign-in`.
- If session exists: replace the button with a plain text node showing the user's name (e.g. `admin`). No styling.
- Server component (no `"use client"`).

### `/sign-in` (new)
- Renders a form with: `<input>` for name, `<input type="password">` for password, `<button type="submit">Sign In</button>`. Use unstyled native elements.
- On submit: invoke the credentials sign-in flow.
- On success: redirect to `/`.
- On failure (bad credentials or validation error): show a single line of error text below the form. Text content: spec to nail down — generic ("Invalid name or password.") to avoid user enumeration.
- If `auth()` already returns a session at request time, immediately redirect to `/` instead of rendering the form.

## Error Display
- One plain-text line below the form. No icon, no color, no styling.
- Use generic messaging for credential failures to avoid leaking whether a name exists.
- Validation errors (zod) can show specific messages (e.g. "Password must be at least 8 characters") since they're about user input, not account existence.

## Folder / File Touch Points
The architect produces the precise list. As a rough sketch:
- `src/lib/auth.ts` — add Credentials provider, switch to JWT session strategy.
- `src/lib/password.ts` (new) — hashing + verification helpers.
- `src/lib/validation/signIn.ts` (new) — Zod schema shared by client and server.
- `src/actions/signIn.ts` (new) — server action wrapping `signIn('credentials', ...)` with validation, typed `ActionResult<T>` return (per `CLAUDE.md` error-handling rules).
- `src/app/(auth)/sign-in/page.tsx` (new) — the sign-in form. Lives inside the existing `/(auth)` route group.
- `src/app/(auth)/sign-in/SignInForm.tsx` (new) — client component; the form is interactive.
- `src/app/page.tsx` — modify to switch between Sign In button and signed-in name.
- `scripts/seed-admin.ts` or equivalent — admin seeding (architect picks final shape).
- `package.json` — add a seed script.
- `.env.local`, `.env.example` — add `ADMIN_NAME`, `ADMIN_PASSWORD`.
- `README.md` — document seed step and sign-in.

## Done Criteria
- A fresh `git clone` + `docker compose up -d` + `npm install` + seed step + `npm run dev` results in an app where:
  1. Visiting `/` while signed out shows the home placeholder plus an unstyled "Sign In" button.
  2. Clicking the button navigates to `/sign-in`.
  3. Submitting empty or invalid fields shows a plain-text error below the form. Nothing is sent to the server when frontend validation rejects.
  4. Submitting an invalid name/password combination shows a plain-text "Invalid name or password." line. No leak of which field was wrong.
  5. Submitting the correct admin credentials redirects to `/`, where the page now shows `admin` instead of the Sign In button.
  6. Reloading `/sign-in` while signed in redirects to `/`.
  7. Password is stored hashed in MongoDB; plaintext password never touches storage or logs.
  8. `tsc --noEmit`, `npm run lint`, `npm run test:run` all pass.

## What This Task Does NOT Include
- Any styling. No Tailwind classes on new elements unless required to make a native element work.
- Sign-out UI (the next task can add it).
- Sign-up / registration of new users.
- Password reset flow.
- Authorization rules beyond "signed in vs signed out" (the home page reads `auth()`; nothing more).
- Tests — defer like `initial-setup` did, unless spec/architect/builder identifies a specific high-value test that is essentially free to write (the spec-agent can call this out).
