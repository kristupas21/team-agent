# Build Summary: Auth — Sign In

## Files Created

### Utilities
- `src/lib/env.ts` — `requireEnv(name): string` helper extracted from `db.ts` so the seed script can reuse it.
- `src/lib/password.ts` — bcryptjs-backed `hashPassword(plain)` and `verifyPassword(plain, hash)`; cost factor 12.
- `src/lib/users.ts` — Mongoose-backed `findUserByName(name)` and `countUsers()` helpers. Both `await connectDB()` and return plain shapes (`.lean()`).
- `src/lib/validation/signIn.ts` — Zod `signInSchema` (name 1–64, password 8–128) + inferred `SignInInput`.

### Model
- `src/models/User.ts` — Mongoose schema/model. Hot-reload-safe via `mongoose.models.User ?? mongoose.model(...)`. Establishes the `/src/models` directory.

### Server actions
- `src/actions/signIn.ts` — `signInAction({ name, password })`. Zod re-validation (server-side), `countUsers()` short-circuit for the unseeded case (logs `'[signIn] no admin user — seed required'`), then `signIn('credentials', { ..., redirect: false })`. Any failure → `{ success: false, error: 'Invalid name or password.' }`.
- `src/actions/signOut.ts` — `signOutAction()` calls Auth.js `signOut({ redirect: false })`.

### UI
- `src/app/(auth)/sign-in/page.tsx` — server component. `await auth()`, redirect to `/` if a session exists, otherwise render `<SignInForm />`. Sets page metadata `title: 'Sign In'`. No styling.
- `src/app/(auth)/sign-in/SignInForm.tsx` — `'use client'` component. `useState` for `name`, `password`, `error`; `useTransition` for the in-flight state. On submit: client-side Zod first, then server action; success → `router.push('/')`. Inputs and button disabled during pending; button label becomes `"Signing in..."`. Error rendered as `<p>{error}</p>` below the button.

### Script
- `scripts/seed-admin.ts` — `tsx`-runnable. Reads `ADMIN_NAME` and `ADMIN_PASSWORD` via `requireEnv`. Connects, checks for an existing user by name, either skips (idempotent) or creates with a freshly bcrypt-hashed password. Closes the Mongoose connection at the end so the process exits cleanly. Exit code 1 on error.

## Files Modified

- `src/lib/auth.ts` — switched session strategy `database` → `jwt`; added the Credentials provider with an `authorize` that re-validates with Zod, looks up the user, and verifies the bcrypt hash; updated `jwt` and `session` callbacks to plumb `user.name` through to `session.user.name`. The `MongoDBAdapter` is kept wired (harmless under JWT; ready for future OAuth).
- `src/lib/db.ts` — replaced the inline `requireEnv` declaration with `import { requireEnv } from '@/lib/env'`. Behaviour unchanged.
- `src/app/page.tsx` — now `async`. Calls `await auth()`. Signed-out branch renders an `<a href="/sign-in">Sign In</a>` (no styling). Signed-in branch renders `<p>{name}</p>` followed by a `<form action={signOutAction}><button type="submit">Sign Out</button></form>` (no styling). The existing centered Tailwind wrapper from `initial-setup` is preserved; no new Tailwind classes are added.
- `package.json` — added `bcryptjs`, `@types/bcryptjs`, `tsx`; added `"seed:admin": "tsx --env-file=.env.local scripts/seed-admin.ts"`.
- `.env.example` — appended `ADMIN_NAME=admin` and `ADMIN_PASSWORD=` (with a comment that real values never land here).
- `.env.local` — appended the same two keys; `ADMIN_PASSWORD` left blank for the developer to fill before seeding.
- `README.md` — added an `## Admin User` section with the seed-and-sign-in walkthrough; added a numbered seed step to "Getting Started"; added `npm run seed:admin` to the Scripts list.

## Deviations

1. **Home page signed-in markup uses a `<>` fragment containing `<p>` and `<form>` as siblings**, not the original `<p>name<form>...</form></p>` interpretation. Rationale: a `<form>` is block-level and nesting it inside a `<p>` is invalid HTML and triggers a React hydration warning. The plan/spec did not specify markup, only "name node immediately followed by a Sign Out form/button", which the sibling layout satisfies.
2. **`SignInForm` has no `SignInFormProps` type** — followed the post-plan clarification ("remove SignInFormProps; empty Readonly<{}> is not used"). CLAUDE.md was updated in the same exchange to codify the rule.

## Ambiguities
None required `// NOTE:` markers. Two minor judgment calls handled inline:

- **What to do when the user submits both an invalid name AND an invalid password client-side?** The plan said "join with `" "`". I emit the issues in the order Zod returns them (which mirrors the schema definition: name first, password second), matching AC #5 exactly.
- **Hostile-input handling on the server.** Per the architect's note, the server action collapses *all* Zod failures to the generic credential error. Specific field messages are never echoed from the server.

## Known Issues

- **AC #12 plaintext-password handling.** The password is never logged. It does pass through `signInAction` and the Credentials provider's `authorize` as a plain string in memory, which is necessary for bcrypt comparison. No log statement touches it. There's no way to verify this beyond code review.
- **AC #16 second clause** ("without `AUTH_SECRET`, Auth.js refuses to handle credentials") is not exercised by code we wrote; it's Auth.js behaviour. The acceptance criterion is satisfied by leaving Auth.js's defaults in place.
- **Seed script log uses `console.info`/`console.error`** — no structured logger in the project yet. If/when one lands, the script and `[signIn]` log line should switch over.
- **`UserModel` hot-reload guard** uses `mongoose.models.User as Model<UserDoc> | undefined`. This is a deliberate type assertion in a narrow location (Mongoose's `.models` is typed as `{ [key: string]: Model<any> }`, making narrower typing tricky). It is the standard, idiomatic pattern for Mongoose + Next.js hot reload. Reviewer may flag — defended here.
- **`SignInForm`'s submit button does not have an `aria-busy` attribute** during pending. No accessibility requirements were in the spec, but a future a11y pass should add it.
- **No `revalidatePath('/')` is called after sign-out.** The form submission to a server action triggers Next.js's automatic page re-render, so the new signed-out state shows on next request. Tested via `next build` only; verify in dev when the user runs `npm run dev`.

## Verification Run

All required commands executed locally:

- `npx tsc --noEmit` → exit 0, no diagnostics.
- `npm run lint` → "No ESLint warnings or errors".
- `npm run test:run` → exit 0, "No test files found".
- `npx next build` → succeeded; routes detected: `ƒ /`, `ƒ /sign-in`, `ƒ /api/auth/[...nextauth]`, `○ /_not-found`.
- `mcp__ide__getDiagnostics` → no diagnostics in any `src` or `scripts` file.

Runtime path (sign-in form → server action → JWT cookie → home page re-render) was not exercised by the builder — `next build` covers all type and resolution boundaries but does not establish a session. The user should run `docker compose up -d`, `npm run seed:admin`, and `npm run dev` to drive the happy path manually.
