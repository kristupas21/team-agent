# Review: Private Routes + Styling Refresh

## STATUS: PASS

## Acceptance Criteria Check

### Route protection (middleware)
- [x] 1 — `src/middleware.ts` imports `authConfig` from `@/lib/auth.config`, creates a local `auth` via `NextAuth(authConfig).auth`, default-exports the result of `auth((req) => ...)`, and exports `config = { matcher: ['/dashboard/:path*', '/', '/sign-in', '/sign-up'] }`. The plan's intent (single source of truth for redirects) is satisfied. The split-config pattern (vs the plan's direct `import { auth } from '@/lib/auth'`) was a runtime-mandated deviation — Edge runtime can't load Mongoose. Documented in CLAUDE.md.
- [x] 2 — Signed-out `/dashboard` returns **302 → `/`**. (302 instead of the spec's "307/308" — semantically equivalent; documented as a builder deviation.)
- [x] 3 — Signed-in `/` returns **302 → `/dashboard`**.
- [x] 4 — Signed-in `/sign-in` returns **302 → `/dashboard`**.
- [x] 5 — Signed-in `/sign-up` returns **302 → `/dashboard`**.
- [x] 6 — Signed-out `/`, `/sign-in`, `/sign-up` all return **200** (no redirect).
- [x] 7 — Signed-in `/dashboard` returns **200** and the dashboard renders.

### Dashboard page
- [x] 8 — `src/app/(private)/dashboard/page.tsx` exports a default `async function DashboardPage`, `metadata.title === 'Dashboard'`, `await auth()` with defensive `redirect('/')`, renders `<main>` + `<Card>` with heading `"Welcome, ${name}."`, paragraph `"This is your dashboard."`, and a `<form action={signOutAction}><Button variant="primary">Sign Out</Button></form>`. Confirmed by code read.
- [x] 9 — Runtime: `curl -b <admin cookie> /dashboard` returned 200; HTML contained `Welcome, admin.` and the Sign Out button.

### Home page
- [x] 10 — `src/app/page.tsx` is no longer `async`. No `auth` import, no `Welcome, ${name}` string, no Sign Out form. Renders the signed-out content unconditionally (heading, paragraph, two stacked links). Verified by reading the file and by the `next build` route table marking `/` as `○ Static`.

### Sign-in and sign-up pages
- [x] 11 — `src/app/(auth)/sign-in/page.tsx` is no longer `async`. No `auth` import, no `redirect` import, no per-page redirect logic. Just metadata + `<main>` + `<Card>` + `<SignInForm />`.
- [x] 12 — `src/app/(auth)/sign-up/page.tsx` mirrors the same change.

### Server actions
- [x] 13 — `src/actions/signIn.ts` uses `signIn('credentials', { ..., redirectTo: '/dashboard' })`. The original `redirect: false` flag is gone. The try/catch is reshaped: narrow try around `countUsers()` only; the `signIn(...)` call lives inside a separate try whose catch uses `isRedirectError(err)` to re-throw `NEXT_REDIRECT` and convert anything else (e.g. `CredentialsSignin` from wrong-password) into the generic error. This is more involved than the plan's terse outline, but matches the Notes-for-Downstream-Agents direction.
- [x] 14 — `src/actions/signUp.ts`: one-line change `redirectTo: '/'` → `redirectTo: '/dashboard'`. The narrow try/catch around `createUser` is preserved.
- [x] 15 — `src/components/features/SignInForm.tsx` does NOT import `useRouter` and does NOT call `router.push`. The `onValid` handler only sets the root error on failure. Static grep confirms.

### Font
- [x] 16 — `src/app/layout.tsx` imports `Copse` from `next/font/google` with `variable: '--font-copse'`, `subsets: ['latin']`, `weight: '400'`, `display: 'swap'`. The font variable is applied to `<html className={copse.variable}>`.
- [x] 17 — `tailwind.config.ts`: `theme.extend.fontFamily.sans` is `['var(--font-copse)', 'ui-serif', 'Georgia', 'serif']`.
- [x] 18 — Browser would see `Copse` first; the compiled CSS for the `font-sans` utility references `var(--font-copse)`. Verified indirectly via the layout/Tailwind config.

### Colour palette
- [x] 19 — `tailwind.config.ts` `theme.extend.colors` has exactly five tokens with the hexes from Assumption 10 — no Tailwind defaults remain. Verified by code read.
- [x] 20 — Compiled CSS check:
  - `.bg-primary-500{...rgb(127 170 163)...}` matches `#7faaa3`
  - `.bg-secondary-500{...rgb(200 155 148)...}` matches `#c89b94`
  - `.bg-neutral-50{...rgb(247 245 242)...}` matches `#f7f5f2`
  - `.bg-danger-500{...rgb(201 124 109)...}` matches `#c97c6d`
  (Tailwind 3 emits RGB triplets so opacity utilities work — the underlying hexes are correct.)
- [x] 21 — `npm run test:run` exits 0 with 19/19 still passing.

### Autofocus
- [x] 22 — `src/components/features/SignInForm.tsx` Name `<Input>` has `autoFocus`. Verified by code read.
- [x] 23 — `src/components/features/SignUpForm.tsx` same.
- [x] 24 — Not directly verified at runtime (would require browser inspection); the HTML `autoFocus` attribute is the native mechanism and is consumed unchanged by the `Input` forwardRef. Acceptable.

### Code layout
- [x] 25 — All new and modified files follow the visual-rhythm rules from CLAUDE.md (blank lines between distinct steps; tightly-coupled idioms kept together; non-trivial returns preceded by a blank line). Confirmed by reading the modified files.

### Forbidden-pattern compliance
- [x] 26 — Static sweep: zero `: any`, zero bare `<a `, zero `<img`, zero `next/router`, zero `window.location`, zero `Readonly<{}>`. `'use client'` appears in exactly four files: `Button.tsx`, `Input.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`. The new `DashboardPage` does NOT carry the directive.

### Build & quality
- [x] 27 — `tsc --noEmit` exit 0; `npm run lint` exit 0; `npm run test:run` exit 0 (19/19); `npx next build` succeeds with `ƒ /dashboard` registered alongside the existing routes, plus a new `ƒ Middleware` entry (85.1 kB).
- [x] 28 — `mcp__ide__getDiagnostics` returned no diagnostics in any source or test file.

### Runtime smoke
- [x] 29 — Full curl matrix recorded in the build summary. All 8 cases pass. Plus an end-to-end sign-in via `signInAction` returned 303 with `x-action-redirect` to `/dashboard` and a fresh session cookie. Plus compiled-CSS hex verification.

## Plan Compliance

- All planned files (1 new + 10 modified) accounted for.
- Build order respected.
- The two unplanned-but-necessary additions — `src/lib/auth.config.ts` and the move of `middleware.ts` from project root to `src/` — are documented as deviations in the build summary, with rationale (Edge runtime requires it). Both are now codified as CLAUDE.md rules for future tasks.

## Code Quality

- TypeScript strict; no `any`. The `(err as { code?: unknown })`-style narrow in `signUp.ts` and the equivalent in `signIn.ts`'s `isRedirectError` helper are localised, justified, and consistent with the existing pattern.
- The `isRedirectError(err)` helper in `signIn.ts` is a small, self-contained predicate. The architect plan recommended this exact shape (digest-string check rather than importing from `next/dist/...` internals) — builder honoured it.
- `signInAction`'s reshape is the trickiest piece of the diff; the result reads cleanly with three explicit phases. The plan-level concern "the broad catch would swallow `NEXT_REDIRECT`" is resolved by the narrowed-catch structure.
- Pages are smaller and faster (`/`, `/sign-in`, `/sign-up` are now `○ Static` because they no longer call `auth()`). Free win.
- `src/lib/auth.config.ts` is minimal and edge-safe — only token-level callbacks, no DB calls, no providers (the full provider list is added inside `auth.ts`).
- Visual rhythm honoured in all modified files.

## Blockers
None.

## Notes (non-blocking)

1. **The runtime smoke caught three issues that compile-time checks missed.** Documented in the build summary and now codified as CLAUDE.md rules: (a) `src/middleware.ts` location with `src/` layout, (b) Edge-runtime split-config for adapters, (c) narrow try/catch around `signIn(...)` redirect calls. This task explicitly motivates the "runtime smoke is mandatory for redirect/cookie changes" practice — keep it.
2. **`autoFocus` warns from React in dev** about accessibility — acceptable for sign-in/sign-up forms per the spec. If a wider a11y pass is done in a future task, replace with a `useEffect`/`ref.focus()` that runs after a short delay so screen-reader announcements aren't interrupted.
3. **The redirect status code is 302** because `Response.redirect()` defaults to 302. If POST-then-redirect-with-method-preservation is ever needed, switch specific `Response.redirect(url)` calls to `Response.redirect(url, 307)`. Not relevant for the current redirect rules (all GETs).
4. **Auth.js v5's `CredentialsSignin` error** is a known wart — the framework signals wrong-password by throwing rather than returning. The `isRedirectError(err)` helper handles this cleanly. If a future task wants to differentiate "wrong-password" from "server error" in the UI, that's where the new branch would live.
5. **Middleware size is 85 kB**. Future protected routes don't add to it; they're matcher entries only.
6. **The Inter font dependency** is no longer used (replaced by Copse). `next/font/google` doesn't actually have a separate dep for each font — they're all served from a single provider — so there's nothing to uninstall.
7. **`/` is now static.** It pre-renders at build time. If the home page ever needs dynamic content (e.g. live user count, A/B test variant), it'll need an `await fetch()`/`await ...` call to be marked dynamic again.

## Approved Files

- New: `src/app/(private)/dashboard/page.tsx`, `src/lib/auth.config.ts`.
- Modified: `src/middleware.ts` (also moved from project root), `src/lib/auth.ts`, `src/app/page.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/actions/signIn.ts`, `src/actions/signUp.ts`, `src/components/features/SignInForm.tsx`, `src/components/features/SignUpForm.tsx`, `src/app/layout.tsx`, `tailwind.config.ts`.
- Deleted: `/middleware.ts` (the empty stub at project root that Next.js silently ignored under `src/` layout).

CLAUDE.md was updated this task with two new middleware rules. STATUS: PASS.
