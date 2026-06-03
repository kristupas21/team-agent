# Build Plan: Auth — Sign In

## Overview
Implement Credentials-based sign-in for a single pre-seeded admin user, plus sign-out, on top of the existing NextAuth.js v5 skeleton. Key structural decisions:
1. **Switch `src/lib/auth.ts` to JWT session strategy.** Required by the Credentials provider. Keep the `MongoDBAdapter` wired for forward compatibility; it is harmless under JWT.
2. **Mongoose `User` model** lives in `src/models/User.ts` (new top-level `/src/models` folder — first model in the project). The Auth.js MongoDB adapter operates on raw collections, but our seed script and the credential lookup use Mongoose for type safety and reuse with future features.
3. **Server action `signInAction`** is the only path from the client to the credential check. It validates with Zod, looks up the user via Mongoose, verifies bcrypt, and calls `signIn('credentials', { redirect: false })` inside the action. No client-side `signIn()` is exposed.
4. **`SignInForm` is the only new client component.** The sign-in page and the home page remain server components. The home page's "Sign Out" button is wrapped in a `<form action={signOutAction}>` which Next.js handles server-side — no client wrapper needed.
5. **`/sign-in` lives under `src/app/(auth)/sign-in/page.tsx`** — reuses the existing `(auth)` route group from `initial-setup`.
6. **Component prop types follow CLAUDE.md's `Readonly<>` pattern** (e.g. `type SomethingProps = Readonly<...>`) only when a component actually has props. `SignInForm` has no props in this iteration, so no `SignInFormProps` type is declared.

## Reuse

- `src/lib/auth.ts` — modified, not replaced (see Files to Modify). Re-exports of `auth`, `signIn`, `signOut` are kept; consumers don't change.
- `src/lib/db.ts` — used as-is. `connectDB()` is now consumed by the seed script and by `src/lib/users.ts` (DB lookup helper).
- `src/lib/utils.ts` — used as-is (`cn`); not required for this task since nothing is styled, but stays available.
- `src/app/api/auth/[...nextauth]/route.ts` — used as-is. Re-exports `handlers`; the underlying handlers respond correctly once providers are added.
- `middleware.ts` — used as-is. No new protected routes in this task; the `matcher` example stays commented.
- `src/styles/globals.css` — used as-is.
- `.env.example` and `.env.local` — modified (see Files to Modify) to add `ADMIN_NAME` / `ADMIN_PASSWORD` keys.

## Files to Create

### `src/models/User.ts`
- **Type**: type + Mongoose model
- **Purpose**: typed `User` model backed by the `users` collection. Used by the seed script and the credential lookup.
- **Key shape**:
  ```ts
  // exports
  export type UserDoc = {
    name: string
    passwordHash: string
    createdAt: Date
    updatedAt: Date
  }
  export const UserModel: Model<UserDoc>
  ```
- **Implementation notes for builder**:
  - Schema: `name` String required unique indexed, `passwordHash` String required, `timestamps: true`.
  - Guard against hot-reload model re-registration: `mongoose.models.User ?? mongoose.model<UserDoc>('User', schema)`.
- **Reference pattern**: none (first model). Establishes the pattern.

### `src/lib/password.ts`
- **Type**: util
- **Purpose**: bcrypt hash + compare helpers. Centralises the choice and the cost factor.
- **Key signature**:
  ```ts
  export function hashPassword(plain: string): Promise<string>
  export function verifyPassword(plain: string, hash: string): Promise<boolean>
  ```
- **Implementation notes**:
  - Use `bcryptjs` (pure JS).
  - Cost factor constant `BCRYPT_COST = 12` declared at the top of the file.
- **Reference pattern**: `src/lib/utils.ts` for file style.

### `src/lib/users.ts`
- **Type**: util (data-access helper)
- **Purpose**: small, typed accessor for user records used inside the credential check. Keeps Mongoose imports out of the auth config.
- **Key signature**:
  ```ts
  export async function findUserByName(name: string): Promise<UserDoc | null>
  ```
- **Implementation notes**:
  - Calls `connectDB()` first.
  - Returns the plain `UserDoc` (Mongoose `.lean()`), not a Mongoose Document. Never returns the password hash to anything that touches the client — but at this layer the consumer is `signInAction`, which is server-only.

### `src/lib/validation/signIn.ts`
- **Type**: type + zod schema
- **Purpose**: shared validation schema, imported by both `SignInForm` (client) and `signInAction` (server).
- **Key shape**:
  ```ts
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
- **Reference pattern**: none. Establishes `src/lib/validation/` as the home for shared Zod schemas (matches CLAUDE.md's mention of shared validation contracts).

### `src/actions/signIn.ts`
- **Type**: server action
- **Purpose**: validate, look up user, verify password, establish session.
- **Key signature**:
  ```ts
  'use server'
  export type SignInResult =
    | { success: true }
    | { success: false; error: string }
  export async function signInAction(input: { name: string; password: string }): Promise<SignInResult>
  ```
- **Implementation outline**:
  1. Parse `input` with `signInSchema`. On Zod failure: return `{ success: false, error: <issues joined with " "> }` ONLY if the failure is field-level (client should have caught it; we still re-validate to defend against tampering). If the issues look "hostile" (e.g. wrong type, missing keys), collapse to the generic error.
     - **Simpler rule for builder**: on Zod failure, always return the generic `"Invalid name or password."` This matches AC #6 and AC #17 and avoids leaking length bounds. Field-level Zod messages are surfaced only via the client-side parse in `SignInForm`, not from the server.
  2. Call `findUserByName(parsed.name)`. If null → `{ success: false, error: 'Invalid name or password.' }`. (Log a single line at server: `'[signIn] no admin user — seed required'` if the collection is empty; cheap heuristic — only log when `User.estimatedDocumentCount()` returns 0.)
  3. Call `verifyPassword(parsed.password, user.passwordHash)`. If false → `{ success: false, error: 'Invalid name or password.' }`.
  4. Call `signIn('credentials', { name: parsed.name, password: parsed.password, redirect: false })` to let Auth.js write the session cookie. Catch any error → `{ success: false, error: 'Invalid name or password.' }` (defensive; the prior steps should mean this doesn't fail).
  5. Return `{ success: true }`.
- **Reference pattern**: none. Establishes the server-action shape for the project. Future actions follow it.

### `src/actions/signOut.ts`
- **Type**: server action
- **Purpose**: end the session.
- **Key signature**:
  ```ts
  'use server'
  export async function signOutAction(): Promise<void>
  ```
- **Implementation**:
  - Call `await signOut({ redirect: false })` from `@/lib/auth`.
  - No try/catch — if it throws, Next's error boundary handles it. The form lives on `/` and the page boundary is the root error boundary.

### `src/app/(auth)/sign-in/page.tsx`
- **Type**: page (server component)
- **Purpose**: pre-check session and either redirect or render the form.
- **Key signature**:
  ```ts
  export const metadata: Metadata = { title: 'Sign In' }
  export default async function SignInPage(): Promise<JSX.Element>
  ```
- **Implementation**:
  1. `const session = await auth()`.
  2. If `session?.user` → `redirect('/')` from `next/navigation`.
  3. Render `<SignInForm />`.
- No styling. No Tailwind classes anywhere in this page.

### `src/app/(auth)/sign-in/SignInForm.tsx`
- **Type**: client component
- **Purpose**: form state, error display, submit transition.
- **Key signature**:
  ```ts
  'use client'
  export default function SignInForm(): JSX.Element
  ```
  No props today, so no `SignInFormProps` type is declared (per the CLAUDE.md rule clarification — empty `Readonly<{}>` is not used).
- **Implementation outline**:
  - `useState` for `name`, `password`, `error`.
  - `useTransition` for the submit pending state.
  - On submit:
    1. `event.preventDefault()`.
    2. Run `signInSchema.safeParse({ name, password })` client-side. If fail: set `error` to `result.error.issues.map(i => i.message).join(' ')`. Return.
    3. `startTransition(async () => { const res = await signInAction({ name, password }); if (res.success) router.push('/'); else setError(res.error); })`.
  - During pending: disable both inputs, change the button text to `"Signing in..."`, disable the button.
  - Error rendering: if `error` is non-empty, render `<p>{error}</p>` below the button. No styling.
- **Reference pattern**: none. First interactive form in the project. Establishes the form-handling pattern.

### `src/lib/auth.ts` — **modified**, see Files to Modify.
### `src/app/page.tsx` — **modified**, see Files to Modify.

### `scripts/seed-admin.ts`
- **Type**: script
- **Purpose**: create the admin user if it doesn't already exist.
- **Key signature**:
  ```ts
  // Runnable with: tsx scripts/seed-admin.ts
  // Or via npm: npm run seed:admin
  ```
- **Implementation outline**:
  1. Load env: rely on the script being run via `tsx` with `--env-file=.env.local` (added via npm script flag); fallback note in README.
  2. `requireEnv('ADMIN_NAME')`, `requireEnv('ADMIN_PASSWORD')` — reuse the same helper pattern as `src/lib/db.ts` (`requireEnv`). To avoid duplication, extract `requireEnv` to `src/lib/env.ts` (see new file below) and import it from both `db.ts` and the seed script.
  3. `await connectDB()`.
  4. `const existing = await UserModel.findOne({ name }).lean()`. If found → log `"[seed-admin] admin user '<name>' already exists — skipping"`, exit 0.
  5. Else → `await UserModel.create({ name, passwordHash: await hashPassword(password) })`. Log `"[seed-admin] created admin user '<name>'"`, exit 0.
  6. On any error → log to stderr, `process.exit(1)`.
  7. Close the Mongoose connection at the end so the process actually exits.

### `src/lib/env.ts`
- **Type**: util
- **Purpose**: extract `requireEnv` from `db.ts` so the seed script can reuse it.
- **Key signature**:
  ```ts
  export function requireEnv(name: string): string
  ```
- **Reference pattern**: the current inline implementation in `src/lib/db.ts`.

## Files to Modify

### `src/lib/auth.ts`
- **What changes**:
  1. Switch `session: { strategy: 'database' }` → `session: { strategy: 'jwt' }`.
  2. Add `Credentials` provider from `next-auth/providers/credentials`:
     ```ts
     Credentials({
       name: 'Credentials',
       credentials: {
         name: { label: 'Name', type: 'text' },
         password: { label: 'Password', type: 'password' },
       },
       authorize: async (raw) => {
         const parsed = signInSchema.safeParse(raw)
         if (!parsed.success) return null
         const user = await findUserByName(parsed.data.name)
         if (!user) return null
         const ok = await verifyPassword(parsed.data.password, user.passwordHash)
         if (!ok) return null
         return { id: user.name, name: user.name }
       },
     })
     ```
  3. Update the `jwt` callback to seed `token.name = user.name` on first call.
  4. Update the `session` callback to populate `session.user.name = token.name` when present.
- **Why**: Credentials provider requires JWT strategy; the home page reads `session.user.name` to decide which UI to render.
- **Note on adapter**: keep `MongoDBAdapter(clientPromise)`. Auth.js v5 allows the adapter to coexist with JWT sessions; it has no effect on the credentials flow but stays useful if OAuth is added later.

### `src/app/page.tsx`
- **What changes**:
  1. Convert from sync `function HomePage()` to `async function HomePage()`.
  2. `const session = await auth()`.
  3. Inside the existing `<div className="text-center">`:
     - Keep the existing `<h1>` and `<p>`.
     - If `session?.user?.name`: append `<p>{session.user.name}</p>` followed by `<form action={signOutAction}><button type="submit">Sign Out</button></form>`.
     - Else: append `<a href="/sign-in">Sign In</a>`.
  4. Imports: `import { auth } from '@/lib/auth'` and `import { signOutAction } from '@/actions/signOut'`.
- **Why**: AC #3, #8, #9a require session-aware rendering and a Sign Out button.
- **Style note**: the spec is explicit — no Tailwind classes on the new `<a>`, `<p>` (the name), `<form>`, or `<button>`. The existing centering wrapper stays as-is.

### `src/lib/db.ts`
- **What changes**: replace the inline `requireEnv` declaration with `import { requireEnv } from '@/lib/env'`.
- **Why**: deduplicate so the seed script can reuse the same helper without circular import concerns.

### `package.json`
- **What changes**:
  1. Add to `dependencies`: `bcryptjs`.
  2. Add to `devDependencies`: `@types/bcryptjs`, `tsx`.
  3. Add to `scripts`: `"seed:admin": "tsx --env-file=.env.local scripts/seed-admin.ts"`.
- **Why**: AC #1, #2 require the seed flow.

### `.env.example`
- **What changes**: append:
  ```
  # Admin seed (used only by `npm run seed:admin`)
  ADMIN_NAME=admin
  ADMIN_PASSWORD=                # set in .env.local; never commit a real value
  ```
- **Why**: AC #1 and reviewer AC about committed env contract.

### `.env.local`
- **What changes**: append the same two keys, with `ADMIN_PASSWORD` left blank for the developer to fill (e.g. `correcthorsebatterystaple`). README documents how.
- **Why**: same as above; allows the developer to run `npm run seed:admin` immediately.

### `README.md`
- **What changes**: add a `## Admin User` section after the `## Getting Started` section:
  - "Set `ADMIN_NAME` (default `admin`) and `ADMIN_PASSWORD` in `.env.local`."
  - "Run `npm run seed:admin` once. The script is idempotent — re-running it does not create duplicates."
  - Brief note on signing in (`/sign-in`) and signing out (home page button when authenticated).
- **Why**: AC: "Document the seed command in `README.md`".

## Data Flow

### Sign-in
1. User submits the form in `SignInForm`.
2. `SignInForm` runs `signInSchema.safeParse` client-side. If invalid → render error string locally; stop.
3. If valid → call `signInAction({ name, password })` via the server action transport.
4. Server: `signInAction` re-parses with Zod (defense). On any Zod failure → return generic error.
5. Server: `findUserByName` (Mongoose) → returns `UserDoc | null`.
6. Server: `verifyPassword` (bcrypt) → boolean.
7. Server: `signIn('credentials', ...)` writes the JWT session cookie via Auth.js.
8. Server returns `{ success: true }`.
9. Client `router.push('/')`. The home page server component re-renders, reads `auth()`, sees the JWT, and renders the signed-in branch.

### Sign-out
1. User clicks the `Sign Out` button. The browser submits the form whose `action` is `signOutAction`.
2. Server: `signOutAction` awaits `signOut({ redirect: false })` from `@/lib/auth`, which clears the cookie.
3. Next.js handles the form submission and refetches the page. The home page now sees no session and renders the signed-out branch.

### Seeding
1. Developer runs `npm run seed:admin`.
2. The script loads env, connects via Mongoose, checks for an existing user with the given name, and either skips or inserts a new document with a freshly-hashed password.

## State Management

- **Server state**: session is read server-side via `auth()`. No client cache. No client-side `useSession` hook.
- **Client UI state** (`SignInForm` only):
  - `name: string`, `password: string` — controlled inputs.
  - `error: string` — single error line.
  - `isPending` from `useTransition` — drives input/button disabled state and button label.
- **Global state**: none. No Context, no Zustand. Matches CLAUDE.md.

## Types

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
// src/models/User.ts
export type UserDoc = {
  name: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}
```

```ts
// src/actions/signIn.ts
export type SignInResult =
  | { success: true }
  | { success: false; error: string }
```

No other types introduced. Auth.js's `Session` and `User` types come from `next-auth`.

## File Tree

```
/
├── package.json                         (modified)
├── .env.example                         (modified)
├── .env.local                           (modified)
├── README.md                            (modified)
├── scripts/
│   └── seed-admin.ts                    (new)
└── src/
    ├── actions/
    │   ├── signIn.ts                    (new)
    │   └── signOut.ts                   (new)
    ├── app/
    │   ├── page.tsx                     (modified)
    │   └── (auth)/
    │       └── sign-in/
    │           ├── page.tsx             (new)
    │           └── SignInForm.tsx       (new)
    ├── lib/
    │   ├── auth.ts                      (modified)
    │   ├── db.ts                        (modified — import requireEnv)
    │   ├── env.ts                       (new)
    │   ├── password.ts                  (new)
    │   ├── users.ts                     (new)
    │   └── validation/
    │       └── signIn.ts                (new)
    └── models/
        └── User.ts                      (new)
```

## Build Order

The builder must follow this order to avoid dependency issues and to keep `tsc` green at each milestone:

1. **Dependencies**:
   - Modify `package.json` to add `bcryptjs`, `@types/bcryptjs`, `tsx`, and the `seed:admin` script.
   - Run `npm install`.
2. **Env files**:
   - Append `ADMIN_NAME` / `ADMIN_PASSWORD` to `.env.example` and `.env.local`.
3. **Foundational utils**:
   - Create `src/lib/env.ts` (extract `requireEnv`).
   - Modify `src/lib/db.ts` to import `requireEnv` from `@/lib/env`.
   - Create `src/lib/password.ts`.
4. **Domain model**:
   - Create `src/models/User.ts`.
   - Create `src/lib/users.ts`.
5. **Validation**:
   - Create `src/lib/validation/signIn.ts`.
6. **Auth wiring**:
   - Modify `src/lib/auth.ts` — switch to JWT, add Credentials provider, update callbacks.
7. **Server actions**:
   - Create `src/actions/signIn.ts`.
   - Create `src/actions/signOut.ts`.
8. **UI**:
   - Create `src/app/(auth)/sign-in/SignInForm.tsx` (client component).
   - Create `src/app/(auth)/sign-in/page.tsx` (server component, redirects if signed-in).
   - Modify `src/app/page.tsx` to read session and switch UI; wire the Sign Out form.
9. **Seed script**:
   - Create `scripts/seed-admin.ts`.
10. **Docs**:
    - Update `README.md`.
11. **Verify**:
    - `npx tsc --noEmit` — must pass.
    - `npm run lint` — must pass.
    - `npm run test:run` — must pass (still no tests by design).
    - Manually: with Mongo running and admin seeded, run `npm run dev`, exercise: home → `/sign-in` → submit empty (error) → submit wrong (generic error) → submit correct (redirect to `/` showing admin + Sign Out) → click Sign Out (back to signed-out state) → manually visit `/sign-in` while signed in (redirect to `/`).
12. **Diagnostic sweep**:
    - Call `mcp__ide__getDiagnostics` (or use the IDE) — fix any "may be converted to async", "prefer nullish coalescing assignment", "redundant await", "unused export" style warnings introduced by this task (per the new reviewer rule). Exported public API symbols flagged as "unused" are acceptable.
