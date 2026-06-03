# Build Summary: Auth — Sign Up

## Files Created

- `src/lib/validation/signUp.ts` — Zod `signUpSchema` (name `trim().min(5).max(64)`, password `min(5).max(128)`) + inferred `SignUpInput`. Per-bound error messages match the spec exactly.
- `src/actions/signUp.ts` — `'use server'` action with the narrow try/catch around `createUser(...)` only. `signIn('credentials', { name, password, redirectTo: '/' })` sits outside the catch so the `NEXT_REDIRECT` propagates. Module-level constants `GENERIC_ERROR` and `DUPLICATE_ERROR`. Local helper `isDuplicateKeyError(err)` checks the MongoDB `code === 11000` shape with the `err instanceof Error && 'code' in err && (err as { code?: unknown }).code === 11000` pattern.
- `src/app/(auth)/sign-up/page.tsx` — server component; `await auth()` → `redirect('/')` if signed in; else renders `<main>` + `<Card>` + `<SignUpForm />`. Page metadata `title: 'Sign Up'`.
- `src/app/(auth)/sign-up/SignUpForm.tsx` — `'use client'` form mirroring `SignInForm.tsx`: `useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) })`; per-field errors via `Input.error`; root error via `setError('root', ...)`; `formState.isSubmitting` drives Button `loading`. No `useRouter` — the action handles navigation via `redirectTo`.

## Files Modified

- `src/lib/users.ts` — added `createUser({ name, passwordHash }): Promise<UserDoc>`. Sibling to the existing `findUserByName` / `countUsers`. Calls `await connectDB()` then `UserModel.create(...)` and returns the new document as a plain object via `toObject<UserDoc>()`. Duplicate-key errors propagate up unchanged.
- `src/app/page.tsx` — the signed-out branch now renders a `<div className="mt-6 space-y-3">` containing two `<Link>` elements: Sign In and Sign Up. Each link carries `buttonClass('primary', 'block w-full text-center')` so the two button-shaped links stack at full card width. Signed-in branch is unchanged.

## Files NOT Modified

`src/lib/auth.ts`, `src/actions/signIn.ts`, `src/actions/signOut.ts`, `src/models/User.ts`, `src/lib/password.ts`, `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/utils.ts`, `src/components/ui/*`, `middleware.ts`, `tailwind.config.ts`, `package.json`, `next.config.ts`, `vitest.config.mts`, `src/styles/globals.css`, `src/app/layout.tsx`. The Credentials provider's `authorize` callback continues to handle the new user's auto-sign-in unchanged.

## Deviations

None. The plan was followed step-for-step, including the explicit comment on the `signIn(...)` line warning future maintainers not to wrap it in try/catch.

## Ambiguities

None required `// NOTE:` markers. One micro-decision in execution:

- **`createUser` returns the result of `doc.toObject<UserDoc>()`** rather than just the Mongoose document. The action discards the return value (it doesn't use the created doc — it just needs the side effect), but returning the plain object keeps the helper symmetric with `findUserByName` (which already returns `UserDoc | null` via `.lean()`). Future consumers that DO need the doc don't have to re-fetch.

## Known Issues

- **`createUser` doesn't validate uniqueness explicitly** — it relies on the unique index on `name`. If the index is ever dropped or its uniqueness flag flipped, a race could produce duplicate documents. Acceptable today; the spec's AC #19 documents this as the intentional mechanism.
- **`signUpAction`'s `{ success: true }` return is unreachable in practice.** Static TypeScript can't see this — `signIn(...)` throws `NEXT_REDIRECT` synchronously after writing the cookie. The line stays for type-symmetry with `SignInResult` and to satisfy the explicit return type rule from CLAUDE.md. ESLint and `tsc` both accept it without complaint.
- **`bcryptjs` audit warnings** still surface — out of scope, tracked since `auth-sign-in`.
- **`next lint` deprecation warning** still emits — out of scope, tracked since `01-initial-setup`.
- **No tests in this task** — same precedent as `auth-sign-in`, `auth-sign-in-update`. Reviewer can flag this if they disagree.

## Verification Run

- `npx tsc --noEmit` — exit 0, no diagnostics.
- `npm run lint` — "No ESLint warnings or errors".
- `npm run test:run` — exit 0, **19/19 passing** (no regressions; no new tests).
- `npx next build` — succeeded. Routes: `ƒ /`, `ƒ /sign-in`, `ƒ /sign-up` (new), `ƒ /api/auth/[...nextauth]`, `○ /_not-found`. Sign-up route size 1.43 kB First Load 133 kB — matches sign-in's footprint as expected (same RHF + Zod + shared primitives).
- `mcp__ide__getDiagnostics` — no diagnostics in any source file.

### Runtime smoke (dev server)

Drove the actual end-to-end via `curl` against `npm run dev` with the live MongoDB container:

1. **Home page renders both links**: `curl /` → contains `href="/sign-in"` and `href="/sign-up"`. ✓
2. **`/sign-up` reachable**: `curl /sign-up` → HTTP 200. ✓
3. **Duplicate-username path**:
   - POST `signUpAction({ name: "admin", password: "admin12345" })` to `/sign-up` with the action ID `40bbbcb535daa9f182674096dbe4e297287432f12a`.
   - Response: HTTP 200, body contains `{"success":false,"error":"Username is already taken."}`. ✓
4. **Happy path**:
   - POST `signUpAction({ name: "alice<unique>", password: "pass12345" })`.
   - Response: **HTTP 303 See Other → `Location: /`**, `Set-Cookie: authjs.session-token=<JWT>` (the new user's session). The redirect fires; the cookie is set; the action does NOT swallow the `NEXT_REDIRECT`. ✓
5. **Post-sign-up render**: `curl /` with the new cookie → page renders the signed-in branch with heading `"Welcome, alice<unique>"`. ✓
6. **Session check**: `curl /api/auth/session` with the new cookie → `{"user":{"name":"alice<unique>"},"expires":"..."}`. ✓
7. **Already-signed-in guard**: `curl /sign-up` with the new cookie → HTTP 307 → `Location: /`. ✓

This is the first task where the builder ran a full runtime smoke. The earlier sign-out cookie-clear bug taught us that compile-time checks alone don't catch redirect/cookie-set behaviour; live HTTP exercise is the only way to be sure. The redirect path validated here matches the same `redirectTo: '/'` pattern that fixed the sign-out bug — and now we've confirmed it works for the symmetric sign-in-after-sign-up flow.
