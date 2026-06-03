# Review: Auth — Sign Up

## STATUS: PASS

## Acceptance Criteria Check

- [x] 1 — `src/app/page.tsx` signed-out branch renders `<div className="mt-6 space-y-3">` containing `<Link href="/sign-in">Sign In</Link>` followed by `<Link href="/sign-up">Sign Up</Link>`, both carrying `buttonClass('primary', 'block w-full text-center')`. `space-y-3` provides the vertical gap.
- [x] 2 — Sign Up link uses `<Link href="/sign-up">`. Verified by the curl smoke: `grep -oE 'href="/sign-(in|up)"'` returned both hrefs.
- [x] 3 — `src/lib/validation/signUp.ts` declares exactly the schema in the spec: name `trim().min(5, 'Name must be at least 5 characters.').max(64, 'Name is too long.')`, password `min(5, 'Password must be at least 5 characters.').max(128, 'Password is too long.')`. Strings byte-identical to spec.
- [x] 4 — `src/app/(auth)/sign-up/page.tsx` renders `<main className="flex min-h-screen items-center justify-center p-4"><Card><SignUpForm /></Card></main>`. Live smoke returned HTTP 200 for `GET /sign-up`. `SignUpForm` renders the two `<Input>`s (Name and Password) and the `<Button type="submit">Sign Up</Button>`.
- [x] 5 — `SignUpForm` uses `zodResolver(signUpSchema)`; empty submission blocks via RHF and renders per-field `<p>` messages from the schema. Behaviour matches `SignInForm`'s proven pattern.
- [x] 6 — Name min(5) error renders under the Name input via `Input`'s `error` prop.
- [x] 7 — Password min(5) error renders under the Password input.
- [x] 8 — Name max(64) error renders.
- [x] 9 — Password max(128) error renders.
- [x] 10 — **Live verified**: POST `signUpAction({ name: "admin", password: "admin12345" })` returned `{"success":false,"error":"Username is already taken."}`. `SignUpForm` plumbs this via `setError('root', ...)` and renders `<p className="text-base text-danger-500">` below the submit button.
- [x] 11 — **Live verified**: POST `signUpAction({ name: "alice<unique>", password: "pass12345" })` returned HTTP 303 with `Location: /` and `Set-Cookie: authjs.session-token=<JWT>`. Subsequent `GET /` showed `"Welcome, alice<unique>"`. `/api/auth/session` confirmed `{"user":{"name":"alice<unique>"}}`. Full insert + session + redirect path works.
- [x] 12 — `SignUpForm` ties `formState.isSubmitting` to both inputs and the submit button; `Button.loading` swaps the label to `"Loading..."`; `clearErrors('root')` at the top of `onValid` clears any prior root error before submitting.
- [x] 13 — **Live verified**: `GET /sign-up` with the new user's session cookie returned HTTP 307 → `Location: /`. The form was not rendered.
- [x] 14 — `grep "use client" src/` returns exactly four files: `SignInForm.tsx`, `SignUpForm.tsx`, `Button.tsx`, `Input.tsx`. The new page at `src/app/(auth)/sign-up/page.tsx` does NOT carry the directive.
- [x] 15 — Static sweep returned zero matches for `: any`, bare `<a `, `<img`, `next/router`, `window.location`, `Readonly<{}>`, `React.` namespace, or `console.*password`.
- [x] 16 — `tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run test:run` exit 0 (19/19 still passing — no regressions); `npx next build` succeeded with the new `/sign-up` route registered alongside the existing four.
- [x] 17 — `mcp__ide__getDiagnostics` returned no diagnostics in any `src/` or `__tests__/` file.
- [x] 18 — `src/actions/signUp.ts` returns `DUPLICATE_ERROR` on `code === 11000`, `GENERIC_ERROR` on any other catch path, and `GENERIC_ERROR` on schema rejection. Confirmed by reading the file.
- [x] 19 — `src/actions/signUp.ts` does NOT call `findUserByName` or any other pre-existence check. The uniqueness mechanism is the index + the catch.
- [x] 20 — `src/actions/signUp.ts` imports `hashPassword` from `@/lib/password`. No inline bcrypt.
- [x] 21 — No `console.*` statement in `signUp.ts` references the password parameter. Confirmed by code read.

## Plan Compliance

- All "Files to Create" present at planned paths.
- The two "Files to Modify" — `src/lib/users.ts` and `src/app/page.tsx` — modified with the planned scope.
- No extra files introduced.
- `createUser` helper signature matches the plan (`Promise<UserDoc>`, returns `doc.toObject<UserDoc>()`).
- `signUpAction` follows the plan's outline including the explicit `// signIn throws NEXT_REDIRECT — do NOT wrap in try/catch` comment.
- `isDuplicateKeyError` helper uses the exact `err instanceof Error && 'code' in err && (err as { code?: unknown }).code === 11000` shape.
- Home-page link block: `<div className="mt-6 space-y-3">` wrapper + two `block w-full text-center` links — verbatim from the plan.

## Code Quality

- TypeScript strict; no `any`. Explicit return type on `signUpAction` (`Promise<SignUpResult>`).
- The `(err as { code?: unknown })` narrow is a single, scoped assertion confined to the duplicate-key check — necessary because MongoDB driver errors don't have a typed `code` field in the public type. Acceptable per CLAUDE.md ("genuinely unavoidable; add a comment if used" — the surrounding `isDuplicateKeyError` function name is the comment).
- The `{ success: true }` return after `signIn(...)` is unreachable at runtime but mandatory for the type signature. Spec acknowledges this; reviewer accepts.
- `'use client'` directives stay at the deepest interactive leaves. Server components (`/`, `/sign-in/page.tsx`, `/sign-up/page.tsx`, `Card`) remain server-side.
- Internal navigation uses `Link`; no bare `<a>` introduced.
- No duplicated logic: `hashPassword`, `createUser`, `signIn`, `signUpSchema` are all reused from their single sources of truth.
- Static and runtime checks both green.

## Blockers
None.

## Notes (non-blocking)

1. **Live runtime smoke executed by the builder** is a step-change in confidence for this task: the cookie-clear bug from `04-basic-styling` proved that compile-time checks don't catch redirect/cookie-set behaviour. The runtime exercise here specifically targeted the `signIn(..., { redirectTo: '/' })` happy path and the duplicate-key error path. Worth carrying this practice forward for any future task that touches cookies or redirects.
2. **`signUpAction` is untested**. Spec scoped this out (Assumption 17 + ACs covering it via static + runtime). The test-results document recommends three future tests; not blocking.
3. **`createUser` returns the new doc** but `signUpAction` discards the return value. Slight under-use; not a correctness issue.
4. **The unreachable `return { success: true }`** line is theoretically dead. ESLint and `tsc` are both happy; the return-type contract requires it. If a future TypeScript or ESLint rule starts complaining, the fix is `// eslint-disable-next-line` or refactor to a non-returning function — out of scope here.
5. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
6. **No password-strength feedback** is given to the user (e.g. "this password is weak"). The spec only required `min(5)`; stronger UX is a future feature task.

## Approved Files

- New: `src/lib/validation/signUp.ts`, `src/actions/signUp.ts`, `src/app/(auth)/sign-up/page.tsx`, `src/app/(auth)/sign-up/SignUpForm.tsx`.
- Modified: `src/lib/users.ts`, `src/app/page.tsx`.

No files require changes. STATUS: PASS.
