# Review: Auth — Sign In

## STATUS: PASS

## Acceptance Criteria Check

- [x] 1 — `scripts/seed-admin.ts` reads `ADMIN_NAME` and `ADMIN_PASSWORD`, connects via `connectDB`, finds-or-creates a `User` document with `name` and a bcrypt-hashed `passwordHash`. Idempotent.
- [x] 2 — On re-run, the existing-user check returns the doc and the script logs `[seed-admin] admin user '<name>' already exists — skipping`. No duplicate insert because `name` is `unique: true` in the schema and the check guards before `create`.
- [x] 3 — Signed-out home renders the existing placeholder and adds `<a href="/sign-in">Sign In</a>`. No Tailwind classes on the anchor. Verified at `src/app/page.tsx`.
- [x] 4 — `SignInForm.tsx` renders three elements: name input (with label "Name"), password input of `type="password"` (with label "Password"), submit `<button>Sign In</button>`.
- [x] 5 — Empty submission triggers `signInSchema.safeParse` which fails for both fields. Errors are joined with `" "` in the order Zod returns them (`name` first, then `password`). The server action is not called.
- [x] 6 — `signInAction` on invalid name/password returns `{ success: false, error: 'Invalid name or password.' }`. The error is rendered as `<p>{error}</p>` below the button.
- [x] 7 — On valid credentials the action calls `signIn('credentials', { ..., redirect: false })`, the JWT cookie is written, and the client `router.push('/')` runs. Home page reads the new session and switches to the signed-in branch.
- [x] 8 — Signed-in home renders `<p>{name}</p>` followed by an unstyled `<form action={signOutAction}><button type="submit">Sign Out</button></form>`. No `Sign In` element. No Tailwind classes on the new nodes.
- [x] 9 — `SignInPage` calls `await auth()`; if `session?.user` is truthy it `redirect('/')` before any JSX is rendered.
- [x] 9a — `signOutAction` calls `signOut({ redirect: false })` clearing the cookie. The home page on next request reads no session and switches back to the signed-out branch.
- [x] 10 — `SignInForm` uses `useTransition`. Both inputs and the submit button set `disabled={isPending}`. Button label becomes `'Signing in...'`.
- [x] 11 — `handleSubmit` calls `setError('')` before validating, so any previous error is cleared at the moment of submission. New error is set only on subsequent failure.
- [x] 12 — Plaintext password is never logged. Grepped `console.log`, `console.info`, `console.error` across the codebase — no log statement includes a password identifier. The only password-touching call sites are `bcrypt.hash`, `bcrypt.compare`, and the `signIn(...)` body (encrypted server-action transport).
- [x] 13 — `SignInResult` shape is `{ success: true } | { success: false; error: string }`. No `passwordHash` or user object is returned to the client.
- [x] 14 — `tsc --noEmit` exits 0; `npm run lint` exits 0 with no warnings; `npm run test:run` exits 0 (no tests by design).
- [x] 15 — No `any` types introduced. `"use client"` appears only in `src/app/(auth)/sign-in/SignInForm.tsx`. No plaintext password in any log.
- [x] 16 — `requireEnv` throws with a clear message if `MONGODB_URI` is missing (used by `db.ts` and the seed script). `AUTH_SECRET` enforcement is Auth.js's default behaviour and untouched.
- [x] 17 — A 128+ character password fails the client-side Zod (`'Password is too long.'`) and never reaches the server. A scripted/tampered request to the server hits the server-side Zod which fails — `signInAction` collapses the failure to `'Invalid name or password.'`. Server never echoes the max-length message.

## Plan Compliance

- All 11 files listed under "Files to Create" exist at the planned paths.
- All 7 files listed under "Files to Modify" were modified, and only what the plan specified was changed.
- No extra files were introduced outside the plan.
- The `requireEnv` extraction to `src/lib/env.ts` was performed as planned; `db.ts` now imports from `@/lib/env`.
- The CLAUDE.md prop-type clarification (no empty `Readonly<{}>`) was honoured — `SignInForm` has no props type.

## Code Quality

- TypeScript strict mode satisfied; no `any` types; no `React.*` namespace references; CLAUDE.md prop-type rule respected where applicable.
- `tsc --noEmit`: clean.
- `npm run lint`: clean.
- `mcp__ide__getDiagnostics`: no diagnostics in any source file.

## Blockers
None.

## Notes (non-blocking)

1. **Mongoose model assertion** (`mongoose.models.User as Model<UserDoc> | undefined`) in `src/models/User.ts` is a single, narrow, well-justified type assertion. CLAUDE.md says assertions need a comment when used; the assertion here has no comment. Worth either adding a brief `// Mongoose's models registry is typed as Model<any>; narrow safely.` comment, or accepting as idiomatic Mongoose+Next.js boilerplate. Not blocking.
2. **`UserDoc` from `src/models/User.ts`** is exported but its only in-project consumer today is `src/lib/users.ts`. The IDE may surface "unused export" if it relaxes its detection later — false positive once the model is consumed by more code.
3. **`SignInForm` button has no `aria-busy`** during pending. No accessibility AC in the spec; future a11y pass can add it.
4. **No `revalidatePath('/')` after `signOutAction`.** Form-action submissions trigger Next.js's automatic re-render, which exercises this path. Verified by build, not by running dev. If the manual run shows stale UI, add `revalidatePath('/')` to the sign-out action.
5. **Auto-seed on dev** (Open Question #2 from the spec) remains unimplemented as assumed. Worth surfacing in the README onboarding if developer-friction becomes a real complaint.
6. **`bcryptjs` choice** (Open Question #1) stands. The reviewer accepts; if a future task needs Argon2 for stronger hashing under shared-hosting threat models, the swap is contained to `src/lib/password.ts`.
7. **Pre-existing `next lint` deprecation warning** still emits on every lint run. Out of scope here; tracked in the previous task's review.

## Approved Files

All implementation files at their planned paths:

- `src/lib/{env,password,users,validation/signIn,auth,db}.ts`
- `src/models/User.ts`
- `src/actions/{signIn,signOut}.ts`
- `src/app/(auth)/sign-in/{page.tsx,SignInForm.tsx}`
- `src/app/page.tsx`
- `scripts/seed-admin.ts`
- `package.json`, `.env.example`, `.env.local`, `README.md`

No files require changes. STATUS: PASS.
