# Review: Auth — Sign In Update

## STATUS: PASS

## Acceptance Criteria Check

- [x] 1 — `src/app/page.tsx` renders `<h1 className="text-4xl font-semibold">{name ? 'Welcome, …' : 'Hello there'}</h1>` and `<p className="mt-4 text-base text-gray-600">{name ? "You're signed in." : 'Please sign in to continue.'}</p>`. Signed-out branch: heading exactly `"Hello there"`, paragraph exactly `"Please sign in to continue."`, `<Link href="/sign-in">Sign In</Link>` rendered below.
- [x] 2 — Signed-in branch: heading exactly `"Welcome, ${name}"` (renders `"Welcome, admin"` for the seeded user), paragraph exactly `"You're signed in."`, Sign Out `<form action={signOutAction}>` rendered below. No standalone `<p>{name}</p>` anywhere in the file — confirmed by reading `src/app/page.tsx`.
- [x] 3 — `src/lib/validation/signIn.ts` password chain is exactly `.min(1, 'Password is required.').max(128, 'Password is too long.')`. No `min(8)`, no "at least 8 characters" string.
- [x] 4 — `SignInForm` registers `name` and `password` with `zodResolver(signInSchema)`. RHF blocks submission when validation fails; the `onValid` handler (which invokes `signInAction`) does not run. Per-field errors render as `<p>{formState.errors.<field>.message}</p>` directly under each input.
- [x] 5 — A 6-character non-matching password passes `min(1)` client-side, reaches `signInAction`, fails bcrypt, returns `{ success: false, error: 'Invalid name or password.' }`. `setError('root', { message })` renders that string below the submit button. This is the behaviour flip the task targeted — verified by code path.
- [x] 6 — 129-char password fails `max(128, 'Password is too long.')` client-side; per-field error renders under password input; no server call.
- [x] 7 — 65-char name fails `max(64, 'Name is too long.')` client-side; per-field error renders under name input; no server call.
- [x] 8 — `formState.isSubmitting` drives `disabled` on both inputs and the submit button. Button label is `formState.isSubmitting ? 'Signing in...' : 'Sign In'`. `clearErrors('root')` is called at the very top of `onValid`, so any prior root error is removed at the moment a fresh submit starts.
- [x] 9 — On `{ success: true }`, the handler calls `router.push('/')`. The home server component reads the JWT and renders the signed-in branch.
- [x] 10 — `SignInForm.tsx` imports: `useForm` from `react-hook-form`, `zodResolver` from `@hookform/resolvers/zod`. No `useState`, no `useTransition`, no manual `safeParse`. Verified by reading the file.
- [x] 11 — `grep "use client" src/` returns exactly one line: `src/app/(auth)/sign-in/SignInForm.tsx:1:'use client'`. Confirmed via static sweep.
- [x] 12 — Static sweep: zero matches for `: any`, `<a ` (bare anchor), `<img`, `next/router`, `window.location`, `React.` (UMD namespace), or `Readonly<{}>` (empty prop type) anywhere in `/src`.
- [x] 13 — `tsc --noEmit` exits 0; `npm run lint` exits 0; `npm run test:run` exits 0 (no tests by design).
- [x] 14 — `package.json` lists `react-hook-form` (`^7.53.2`) and `@hookform/resolvers` (`^3.9.1`) under `dependencies`, as the plan called for (they ship in the client bundle).
- [x] 15 — `src/app/page.tsx` heading carries `text-4xl font-semibold` and paragraph carries `mt-4 text-base text-gray-600` — exact strings preserved from before. No new Tailwind classes introduced. The centered `<main>` + `<div className="text-center">` wrapper is preserved.
- [x] 16 — `src/lib/auth.ts` `Credentials.authorize` still calls `signInSchema.safeParse(raw)`. Verified by reading the file — the path remains identical; only the inputs admitted by the schema have changed.

## Plan Compliance

- All three files identified as "Files to Modify" were modified, and only those files.
- No "Files to Create" were planned — none were created.
- `npm install` was run after the dep additions. No script changes.
- Build order respected: deps → schema → tsc check → form refactor → page rewrite → final verify → diagnostic sweep. The intermediate `tsc --noEmit` after the schema change passed cleanly (Step 3), confirming the type signature did not break consumers.
- CLAUDE.md rules followed:
  - No `any`, no `React.*` namespace, no `Readonly<{}>`.
  - `'use client'` stays at the deepest interactive leaf.
  - Internal navigation via `Link`, not `<a>`.
  - `Image`/`Script`/`font` rules N/A — none in this diff.

## Code Quality

- TypeScript strict mode satisfied; explicit `Promise<void>` return on `onValid` matches the codebase's preference for explicit async return types.
- ESLint clean.
- `mcp__ide__getDiagnostics`: no diagnostics in any source file. The two false positives in `tasks/incoming/auth-sign-in-update.md` are markdown-parser quirks on JSX-like prose and will disappear when the task is archived to `tasks/done/...`.
- `next build` succeeds; route topology unchanged; the `/sign-in` First Load JS grew by ~10 kB (react-hook-form). Acceptable for the feature gain.

## Blockers
None.

## Notes (non-blocking)

1. **`/sign-in` First Load JS grew ~10 kB.** Attributable to `react-hook-form` shipping with the bundle. Worth tracking once more forms exist — code-splitting by route already minimises the impact.
2. **`useForm`'s `formState` destructure** is wholesale rather than via subscription. RHF documents `useForm({ ... })` + `formState.x` access as fine; if a future form benefits from selective subscription (`useForm(...)` + `useWatch`), revisit. Not needed for a two-field form.
3. **No `revalidatePath('/')`** on `signOutAction`. Same as the prior task — Next's form-action auto-rerender continues to cover it. Add the call if a future manual run shows stale UI.
4. **`@hookform/resolvers` v3.x ships its own type-only re-exports of Zod's namespace**, which means a future Zod major-version bump should be coordinated with a matching resolvers bump. Not relevant today.
5. **The task brief in `tasks/incoming/auth-sign-in-update.md` produces 2 markdown linter false positives** (lines 30 and 37: "Expression expected"). These are caused by JSX-like content inside markdown prose. Cosmetic; cleared by `done task:auth-sign-in-update` once archived.
6. **Pre-existing `next lint` deprecation warning** unchanged — out of scope.

## Approved Files

- `package.json` (deps added).
- `src/lib/validation/signIn.ts` (password chain relaxed).
- `src/app/(auth)/sign-in/SignInForm.tsx` (react-hook-form refactor).
- `src/app/page.tsx` (session-aware copy; standalone name element removed).

No files require changes. STATUS: PASS.
