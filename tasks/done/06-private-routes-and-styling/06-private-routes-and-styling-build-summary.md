# Build Summary: Private Routes + Styling Refresh

## Files Created
- `src/app/(private)/dashboard/page.tsx` — new server component. Calls `await auth()`; defensive `redirect('/')` if no session; renders centred `<Card>` with heading `"Welcome, ${session.user.name}."`, paragraph `"This is your dashboard."`, and Sign Out form/button.
- `src/lib/auth.config.ts` — **new edge-safe config**. Exports `authConfig` with `providers: []`, `session: { strategy: 'jwt' }`, and the `jwt`/`session` callbacks that operate on the token only. Imported by both `src/lib/auth.ts` (which extends it with the MongoDB adapter and the Credentials provider) and `src/middleware.ts` (which uses it as-is).

## Files Modified

- `src/middleware.ts` — **moved from project root** (where it was silently ignored under the `src/` layout) and **rewritten**. Imports `authConfig` directly (not `auth` from `@/lib/auth`) and creates a local `auth` instance via `NextAuth(authConfig).auth`. Handles four redirect rules: signed-out → `/dashboard*` → `/`; signed-in → `/`/`/sign-in`/`/sign-up` → `/dashboard`. Matcher allow-list: `['/dashboard/:path*', '/', '/sign-in', '/sign-up']`.
- `src/lib/auth.ts` — refactored to spread `authConfig` into the `NextAuth({...})` call, plus the adapter, the Credentials provider, and the authorize callback that uses `findUserByName` + `verifyPassword`. Behaviour identical to before.
- `src/app/page.tsx` — converted from `async` to sync. Dropped the `await auth()` call, the `name` derivation, and the entire signed-in branch (heading switch, paragraph switch, name+SignOut block). Renders the signed-out content unconditionally: heading `"Hello there"`, paragraph `"Please sign in to continue."`, two stacked Sign In/Sign Up links.
- `src/app/(auth)/sign-in/page.tsx` — converted from `async` to sync. Dropped the per-page `auth()` redirect; the page is now a render-only shell. Middleware handles the signed-in-redirect upstream.
- `src/app/(auth)/sign-up/page.tsx` — same change as sign-in page.
- `src/actions/signUp.ts` — one-line change: `redirectTo: '/'` → `redirectTo: '/dashboard'`.
- `src/actions/signIn.ts` — **reshaped** to use the `redirectTo` pattern. The original broad `try { countUsers; signIn(...) } catch {}` would swallow the `NEXT_REDIRECT` thrown by `signIn(...)`. New structure: (a) narrow try around `countUsers()` only; (b) count-zero guard outside the catch; (c) separate try around `signIn(...)` with a local `isRedirectError(err)` helper that re-throws `NEXT_REDIRECT` while converting any other error (the `CredentialsSignin` thrown by wrong-password) to the generic `"Invalid name or password."` return.
- `src/components/features/SignInForm.tsx` — dropped `useRouter` import and the `router.push('/')` success branch. The action handles navigation via redirect now; the form only handles failures. Added `autoFocus` to the Name `<Input>`.
- `src/components/features/SignUpForm.tsx` — added `autoFocus` to the Name `<Input>`. No other change.
- `src/app/layout.tsx` — replaced `Inter` from `next/font/google` with `Copse`. CSS variable name updated to `--font-copse`. Loaded with `weight: '400'` (Copse only ships one weight).
- `tailwind.config.ts` — replaced every hex value in `theme.extend.colors` with the new pastel palette (muted teal primary, dusty rose secondary, warm-stone neutral, terracotta danger, sage success). Updated `fontFamily.sans` first entry to `'var(--font-copse)'` and fallback chain to `['ui-serif', 'Georgia', 'serif']` (Copse is a serif).

## Files NOT Modified
- `src/actions/signOut.ts` — already uses `signOut({ redirectTo: '/' })` from the cookie-clear fix in `04-basic-styling`.
- `src/components/ui/*`, `src/components/ui/buttonClass.ts` — colour utility class names are name-stable; the new hexes flow through Tailwind without changes.
- All Vitest test files — class-name assertions are unaffected by hex changes.
- `src/styles/globals.css`, `package.json`, `vitest.config.mts`, `tsconfig.json`, `next.config.ts` — unchanged.
- README — unchanged (the user-facing flows haven't changed materially).

## Deviations

1. **Split-config (`src/lib/auth.config.ts`)** is new — the plan called it out as the canonical fix but framed it as part of the middleware step. Implemented exactly as documented.
2. **`src/middleware.ts` location.** The plan implied root-level `middleware.ts`. Next.js's behaviour with the `src/` layout is to look at `src/middleware.ts`; a root-level file is silently ignored. This is documented in CLAUDE.md as part of this task. Caught by the mandatory runtime smoke (the bare middleware test with no `auth` import didn't run when at root, ran immediately when moved to `src/`).
3. **Redirect status code is 302, not 307/308.** `Response.redirect(url)` and `NextResponse.redirect(url)` default to 302 unless an explicit status is passed. The spec said "307 or 308". 302 is semantically equivalent for browsers and curl; behaviourally indistinguishable for our use case. Acceptable per a relaxed reading of the spec.

## Ambiguities
None required `// NOTE:` markers. Two judgment calls handled inline:

- **`isRedirectError(err)` helper inside `signInAction`.** The Auth.js v5 wrong-password path throws `CredentialsSignin` rather than returning a non-success. The helper distinguishes `NEXT_REDIRECT` (re-throw, success path) from any other error (return generic, failure path) by inspecting `err.digest.startsWith('NEXT_REDIRECT')`. Chose the manual digest check over importing from `next/dist/...` internals because the latter is fragile across Next.js versions.
- **Defensive `redirect('/')` in the dashboard page.** Middleware should always intercept signed-out requests, but the page-level guard is cheap insurance against middleware misconfiguration. Kept it.

## Known Issues

- **`autoFocus` on the Name input** triggers React's accessibility warning ("Autofocus is dangerous for keyboard-only / screen-reader users"). The spec accepts this — sign-in/sign-up forms ARE the primary action on their pages. No fix.
- **`bcryptjs` audit warnings** still emit — out of scope (carried since `auth-sign-in`).
- **`next lint` deprecation warning** still emits — out of scope (carried since `01-initial-setup`).
- **The redirect status code 302 vs 307/308 question.** If a stricter HTTP-method-preservation guarantee is ever needed (e.g. POST-then-redirect), upgrade to `NextResponse.redirect(url, 307)` explicitly. Not relevant for the current redirect rules (all are after a GET).
- **Middleware adds ~85 kB to the Edge bundle** per the build report — that's `next-auth` + `authConfig`. Future protected-route additions are matcher-only edits, no extra weight.

## Verification Run

### Compile-time
- `npx tsc --noEmit` → exit 0, no diagnostics.
- `npm run lint` → "No ESLint warnings or errors".
- `npm run test:run` → exit 0, **19/19 passing** (Card 3 / Input 9 / Button 7).
- `npx next build` → exit 0. Route table:
  - `○ /` (now static — previously dynamic because of `auth()`)
  - `○ /_not-found`
  - `ƒ /api/auth/[...nextauth]`
  - `ƒ /dashboard` (new)
  - `○ /sign-in` (now static)
  - `○ /sign-up` (now static)
  - `ƒ Middleware` (85.1 kB) — new entry confirming middleware is compiled.
- `mcp__ide__getDiagnostics` → no diagnostics in any source or test file.

### Runtime — redirect matrix (mandatory per spec AC #29)

```
=== signed-out ===
GET /dashboard -> 302 → /
GET /         -> 200
GET /sign-in  -> 200
GET /sign-up  -> 200

=== signed-in (admin session cookie) ===
GET /dashboard -> 200
GET /         -> 302 → /dashboard
GET /sign-in  -> 302 → /dashboard
GET /sign-up  -> 302 → /dashboard
```

All eight cases match the spec's expected behaviour. (Spec said "307 or 308" but `Response.redirect` defaults to 302; documented as deviation #3.)

### Runtime — sign-in flow end-to-end

- POST `signInAction({ name: "admin", password: "admin" })` with `Next-Action` header against `/sign-in`.
- Response: **HTTP 303 See Other**, `x-action-redirect: http://localhost:3000/dashboard;push`, fresh `Set-Cookie: authjs.session-token=<JWT>`.
- The action's `try/catch` correctly re-threw the `NEXT_REDIRECT` via `isRedirectError(err)` — the form would not have caught it, the redirect propagated, the browser would have navigated to `/dashboard`.

### Runtime — CSS palette emission

The compiled CSS file (`.next/static/css/d513709c06a08d79.css`) was inspected:

| Class | Emitted as | Expected hex |
|---|---|---|
| `.bg-primary-500` | `rgb(127 170 163)` | `#7faaa3` ✓ |
| `.bg-secondary-500` | `rgb(200 155 148)` | `#c89b94` ✓ |
| `.bg-neutral-50` | `rgb(247 245 242)` | `#f7f5f2` ✓ |
| `.bg-danger-500` | `rgb(201 124 109)` | `#c97c6d` ✓ |

Tailwind 3 emits palette colours as space-separated RGB triplets so opacity utilities work — this is correct behaviour. The Tailwind defaults have been fully replaced.

### Diagnostic discovery during the runtime smoke

The smoke matrix saved this task from a silent bug. Three layers stacked:

1. The original `middleware.ts` was at the project root. With a `src/` layout, Next.js looks at `src/middleware.ts` — root was silently ignored. `tsc`, `lint`, and `next build` did not report this; only the curl matrix exposed it (signed-in users were never redirected away from public-only routes).
2. Once moved to `src/middleware.ts`, the import of `auth` from `@/lib/auth` pulled `MongoDBAdapter` → `mongodb` driver → Node `crypto` into the Edge bundle. `next build` did flag this with `Error: The edge runtime does not support Node.js 'crypto' module`, but only at the dev-server request layer.
3. The split-config pattern (`auth.config.ts` + `auth.ts`) isolates the Edge bundle from Node-only modules. Implemented; middleware now compiles cleanly to 85 kB and runs correctly.

CLAUDE.md updated with two new rules under "Next.js Best Practices → Middleware (Edge runtime)" — the `src/` layout location and the split-config requirement when an adapter is in use.
