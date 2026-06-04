# Spec: Private Routes + Styling Refresh

## Summary
Three independent threads in one shipping unit. (1) **Route protection** moves from per-page `auth()` redirects to a single `middleware.ts` powered by Auth.js v5. A new `/dashboard` route (the first private route) becomes the home for signed-in users; `/` reverts to a purely signed-out landing page; the home page's signed-in branch is deleted. Sign-in and sign-up both flip their post-auth destination from `/` to `/dashboard`, and both server actions adopt the `redirectTo` pattern for consistency. (2) **Visual identity** swaps the global font from Inter to Copse via `next/font/google` and replaces the colour palette with a fixed pastel set (muted teal primary, dusty rose secondary, warmer stone neutrals, terracotta danger, sage success — exact hexes locked under Assumptions). (3) **Autofocus**: the Name input on `/sign-in` and `/sign-up` receives focus on initial render via the HTML `autoFocus` attribute. No new dependencies, no new domain models, no new tests beyond the existing 19.

## Assumptions

1. **Route protection lives in `middleware.ts`.** Auth.js v5's `auth((req) => ...)` wrapper is used. The matcher covers exactly the four routes that need active redirect rules: `/dashboard/:path*`, `/`, `/sign-in`, `/sign-up`. Static assets, the `/api/auth/[...nextauth]` route handler, and any future public asset are excluded by default. The per-page `auth()` redirects in `src/app/(auth)/sign-in/page.tsx` and `src/app/(auth)/sign-up/page.tsx` are removed — middleware is the single source of truth.

2. **`/dashboard/page.tsx`** keeps a defensive `if (!session?.user) redirect('/')` even though middleware should never let a signed-out request reach it. Cheap; protects against middleware misconfiguration in isolation.

3. **Home page (`/`) signed-in branch is deleted.** With middleware bouncing signed-in visitors to `/dashboard` before render, the branch is dead code. The page becomes a server component that renders the signed-out content unconditionally (heading "Hello there", paragraph "Please sign in to continue.", and the two stacked Sign In / Sign Up links). The `await auth()` call and the `name` derivation are removed.

4. **`signInAction` aligns with `signUpAction`** — switches from `{ redirect: false }` + client `router.push('/')` to `signIn('credentials', { ..., redirectTo: '/dashboard' })`. The action's `{ success: true }` return becomes unreachable (the `NEXT_REDIRECT` throws first), matching `signUpAction`'s shape; the type stays for symmetry with the `ActionResult<T>` convention. `SignInForm.tsx` drops the `router.push('/')` call from its `onValid` (the action handles navigation). The `useRouter` import goes with it.

5. **`signUpAction`** changes one line: `redirectTo: '/'` → `redirectTo: '/dashboard'`. Nothing else.

6. **Sign-out destination stays `/`.** `signOutAction` continues to call `signOut({ redirectTo: '/' })`. Signed-out user lands on the public home; middleware lets them stay.

7. **New route group `(private)`** sits parallel to `(auth)`. The dashboard lives at `src/app/(private)/dashboard/page.tsx`. The group has no URL effect (parentheses). It exists to co-locate future private routes and to signal intent.

8. **Dashboard content** (signed-in only):
   - Heading text exactly: `"Welcome, {name}."` (period at the end, distinguishing it from the old home heading `"Welcome, {name}"`).
   - Paragraph text exactly: `"This is your dashboard."`
   - Below the paragraph: `<form action={signOutAction}><Button type="submit" variant="primary">Sign Out</Button></form>`.
   - Wrapped in `<main className="flex min-h-screen items-center justify-center p-4"><Card>...</Card></main>` — identical layout to the existing pages.
   - Metadata: `{ title: 'Dashboard' }`.

9. **Font: Copse via `next/font/google`.**
   - CSS variable: `--font-copse`.
   - Loaded with `subsets: ['latin']`, `weight: '400'` (Copse only ships one weight on Google Fonts), `display: 'swap'`.
   - Applied to `<html className={copse.variable}>`.
   - Tailwind `theme.extend.fontFamily.sans` reads `['var(--font-copse)', 'ui-serif', 'Georgia', 'serif']` because Copse is a serif — the fallback chain is updated to match.
   - Tailwind utility class `font-sans` continues to work and now resolves to Copse; consumers don't have to change anything.
   - The Inter import is removed from `src/app/layout.tsx`. The `--font-inter` variable disappears.

10. **Colour palette (locked under this assumption, override during spec-pause if any hex feels off):**

    | Token | Step | Hex | Reasoning |
    |---|---|---|---|
    | `primary` | 50  | `#e7f0ee` | Muted teal — calm, distinctive vs the generic Tailwind blue family. |
    | `primary` | 500 | `#7faaa3` |
    | `primary` | 700 | `#5f8b85` |
    | `secondary` | 50  | `#f6e6e2` | Dusty rose / mauve — warm complement to the cool primary. |
    | `secondary` | 500 | `#c89b94` |
    | `secondary` | 700 | `#a37b75` |
    | `neutral` | 50  | `#f7f5f2` | Warm stone — softer than slate; reads "natural" against the muted primary. |
    | `neutral` | 200 | `#e7e3dc` |
    | `neutral` | 500 | `#857c70` |
    | `neutral` | 700 | `#5a5247` |
    | `neutral` | 900 | `#2f2a23` |
    | `danger` | 50  | `#f5e1dc` | Pastel terracotta — clearly warning without screaming. |
    | `danger` | 500 | `#c97c6d` |
    | `danger` | 700 | `#a35a4c` |
    | `success` | 50  | `#e7eee0` | Sage green — quiet positive without the chemical pure-green feel. |
    | `success` | 500 | `#8aa775` |
    | `success` | 700 | `#688553` |

    Each hex is intentional. The full set reads as "earthy pastel" — coordinated, distinctive, and recognisably non-default. The existing 19 unit tests reference class names (`bg-primary-500`, `border-danger-500`, `focus-visible:ring-primary-500`, etc.) not hexes, so changing values here does not break them.

11. **Body background** changes from `bg-neutral-50` to the new `neutral-50` value (the warm stone). The class name stays — only the resolved hex changes. Same for `bg-white` on `Card`'s base (unchanged — still pure white as the surface against a warm-stone background).

12. **Autofocus uses HTML `autoFocus` attribute** on the Name `<Input>` in both `SignInForm.tsx` and `SignUpForm.tsx`. Single prop addition; SSR-safe; no `useEffect` / `ref` plumbing. The accessibility caveat (auto-focusing inputs can be jarring for screen-reader users) is acceptable here because the sign-in/sign-up form IS the primary purpose of the page.

13. **No tests added.** The existing 19 design-system tests (Button / Input / Card) must keep passing. The runtime smoke for redirects and the dashboard page is the builder's responsibility — same precedent as `auth-sign-up`.

14. **`AUTH_SECRET` already set, MongoDB already running.** The middleware reads the JWT from the session cookie; no new env vars.

15. **No new dependencies.** Auth.js v5 (`next-auth@beta`) already provides the middleware wrapper. `next/font/google` already imports work — only the font name changes.

16. **No README changes.** The user-facing onboarding (`docker compose up -d` → `npm install` → seed admin → `npm run dev`) is unaffected.

17. **`middleware.ts` matcher excludes static assets and the API auth route.** The matcher uses the negative-lookahead form Next.js recommends — `'/((?!api|_next/static|_next/image|favicon.ico).*)'` — OR an explicit allow-list of the four routes. Pick the allow-list for simplicity (`['/dashboard/:path*', '/', '/sign-in', '/sign-up']`). It's narrow, explicit, and obvious what's protected. As private routes proliferate, this list grows by one entry per route.

## Open Questions

1. **Copse is a serif** — the user named it explicitly so the assumption stands, but if "Copse for body UI" doesn't feel right when seen rendered, alternatives that read similarly distinctive but sans-serif include Nunito, Karla, DM Sans, Plus Jakarta Sans. Affects: `src/app/layout.tsx`, `tailwind.config.ts` `fontFamily.sans`. Preference-driven.
2. **Dashboard paragraph copy** is `"This is your dashboard."` Other reasonable options: `"You're signed in."`, `"You're all set."` Affects: one string in `src/app/(private)/dashboard/page.tsx`. Preference-driven.
3. **Palette hex values** are locked per Assumption 10 with reasoning. If any individual hex feels off (too dark, too saturated, wrong family), patch it during the spec-pause. The Tailwind config will accept any valid hex.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/` (modify) | `src/app/page.tsx` | "Next.js App" (metadata unchanged) | **Drop the signed-in branch entirely.** Page is now sync (no `await auth()`). Renders the existing signed-out content: heading "Hello there", paragraph "Please sign in to continue.", two stacked Sign In / Sign Up links via `buttonClass('primary', 'block w-full text-center')`. |
| `/dashboard` (new) | `src/app/(private)/dashboard/page.tsx` | "Dashboard" | New server component. Calls `await auth()`; defensive `redirect('/')` if no session. Renders a centred `<Card>` with heading `"Welcome, {name}."`, paragraph `"This is your dashboard."`, and a Sign Out form-button. |
| `/sign-in` (modify) | `src/app/(auth)/sign-in/page.tsx` | "Sign In" | **Remove the per-page `auth()` redirect.** Page becomes sync, renders the centred Card containing `<SignInForm />`. Middleware handles the signed-in-redirect upstream. |
| `/sign-up` (modify) | `src/app/(auth)/sign-up/page.tsx` | "Sign Up" | Same change — per-page redirect removed. |
| (no route) | `middleware.ts` | n/a | **Replaced.** New implementation wraps `auth(...)` from `@/lib/auth`, evaluates `req.auth`, and produces the four redirects (signed-out → `/dashboard*` → `/`; signed-in → `/`/`/sign-in`/`/sign-up` → `/dashboard`). |

No other routes added, removed, or relocated.

## Data

### API Endpoints
No new endpoints. `signInAction` and `signUpAction` keep their existing signatures; their redirect destinations change.

### Data Types
No new types. `SignInResult` and `SignUpResult` are unchanged.

### Environment Variables
None added.

### Dependencies
None added.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `DashboardPage` (new) | server component | Renders the dashboard card with welcome + Sign Out. | none |
| `HomePage` (modify) | server component, NOW SYNC | Renders the signed-out landing page only. The async signature, `await auth()`, and signed-in branch are removed. | none |
| `SignInPage` (modify) | server component, NOW SYNC | Renders `<main>` + `<Card>` + `<SignInForm />`. No `auth()` call. | none |
| `SignUpPage` (modify) | server component, NOW SYNC | Same — renders `<main>` + `<Card>` + `<SignUpForm />`. | none |
| `SignInForm` (modify) | client component | Drops `useRouter` import and the `router.push('/')` call. `onValid` now only handles the failure branch — success is the redirect's responsibility. Name input gains `autoFocus` attribute. | none |
| `SignUpForm` (modify) | client component | Name input gains `autoFocus` attribute. No other changes. | none |

No new UI primitives. `Button`, `Input`, `Card`, `buttonClass`, `cn` are reused exactly as before.

## User Interactions

### Happy path — sign in to dashboard
1. Signed-out user visits `/`. Middleware lets the request through (no session, public route). Page renders heading "Hello there", paragraph "Please sign in to continue.", Sign In + Sign Up links.
2. User clicks Sign In → navigates to `/sign-in`. Middleware lets through. Page renders the form. Name input has focus.
3. User submits valid admin credentials. `signInAction` runs: validates → checks user count → `signIn('credentials', { ..., redirectTo: '/dashboard' })`. Cookie is written. `NEXT_REDIRECT` to `/dashboard` is thrown.
4. Browser performs a fresh GET `/dashboard` with the new cookie. Middleware sees `req.auth`, lets it through (private route, signed-in). Dashboard page renders: heading "Welcome, admin.", paragraph "This is your dashboard.", Sign Out button.

### Happy path — sign up to dashboard
1. Signed-out user visits `/`. Clicks Sign Up.
2. `/sign-up` renders. Name input has focus.
3. Submits valid novel credentials. `signUpAction` runs: validates → hashes → `createUser` → `signIn('credentials', { ..., redirectTo: '/dashboard' })`. Cookie written. Redirect.
4. Browser GET `/dashboard` with new cookie. Middleware lets through. Dashboard renders with the new user's name.

### Sign-out from dashboard
1. Signed-in user on `/dashboard` clicks Sign Out. Form submits to `signOutAction`.
2. Action awaits `signOut({ redirectTo: '/' })`. Cookie cleared, `NEXT_REDIRECT` to `/` thrown.
3. Browser GET `/` with no cookie. Middleware lets it through (no session, public route). Signed-out home renders.

### Redirect — signed-out user tries `/dashboard`
1. Browser GET `/dashboard` with no cookie.
2. Middleware sees `req.auth === null`. Path matches the private matcher.
3. Middleware returns `NextResponse.redirect(new URL('/', req.url))`. Browser receives 307/308 → `/`.
4. Public home renders.

### Redirect — signed-in user tries `/`, `/sign-in`, or `/sign-up`
1. Browser GET (any of the three) with a session cookie.
2. Middleware sees `req.auth` populated. Path matches the public matcher set.
3. Middleware returns `NextResponse.redirect(new URL('/dashboard', req.url))`. Browser receives 307/308 → `/dashboard`.
4. Dashboard renders.

### Defensive — middleware bypassed, signed-out user hits `/dashboard`
1. If middleware ever fails (misconfigured matcher, runtime error), the page-level `auth()` in `DashboardPage` runs.
2. `session` is null → `redirect('/')` from `next/navigation`. Same outcome.

### Failure modes — unchanged
- Sign-in with wrong credentials: same generic `"Invalid name or password."` error from `signInAction`.
- Sign-up with duplicate name: same `"Username is already taken."`.
- Field validation: same per-field error display.
- The fix from the previous task (sign-out re-render via `redirectTo: '/'`) continues to hold.

## States

### `/` (signed-out only — modified)
- Background: warm stone (the new `neutral-50` value applied via the existing class on `<body>`).
- Centred `<Card>` containing:
  - `<h1 className="text-4xl font-semibold">Hello there</h1>` — Copse, displayed in the new font family.
  - `<p className="mt-4 text-base text-neutral-500">Please sign in to continue.</p>` — `neutral-500` is the new muted-stone-with-warmth.
  - `<div className="mt-6 space-y-3">` containing two `<Link>` elements (`/sign-in`, `/sign-up`), each carrying `buttonClass('primary', 'block w-full text-center')`. Their visual is now the muted teal primary.

### `/dashboard` (signed-in only — new)
- Centred `<Card>` containing:
  - `<h1 className="text-4xl font-semibold">Welcome, {name}.</h1>` — period at the end.
  - `<p className="mt-4 text-base text-neutral-500">This is your dashboard.</p>`
  - `<form action={signOutAction} className="mt-6"><Button type="submit" variant="primary">Sign Out</Button></form>`.

### `/sign-in`, `/sign-up`
- Unchanged structurally. The Name input now has `autoFocus` and receives focus on render. The font and palette swap apply automatically via Tailwind / global CSS variable.
- Per-field error / root error / pending / disabled states all behave as before, just in the new colours (danger text/border in pastel terracotta, focus rings in muted teal).

### Loading / Error / Empty
- Pages all read auth synchronously (or skip it). No data fetching, no async UI state. No loading.tsx / error.tsx introduced.

## Acceptance Criteria

### Route protection (middleware)
1. Given `middleware.ts`, when read, then it imports `auth` from `@/lib/auth`, default-exports the result of `auth((req) => ...)`, and contains an `export const config = { matcher: [...] }` listing exactly `['/dashboard/:path*', '/', '/sign-in', '/sign-up']` (or an equivalent set that covers the same routes).
2. Given a signed-out user, when they request `/dashboard`, then the response is HTTP 307 or 308 with `Location: /`.
3. Given a signed-in user, when they request `/`, then the response is 307/308 with `Location: /dashboard`.
4. Given a signed-in user, when they request `/sign-in`, then the response is 307/308 with `Location: /dashboard`.
5. Given a signed-in user, when they request `/sign-up`, then the response is 307/308 with `Location: /dashboard`.
6. Given a signed-out user, when they request `/`, `/sign-in`, or `/sign-up`, then the response is HTTP 200 (no redirect; the page renders).
7. Given a signed-in user, when they request `/dashboard`, then the response is HTTP 200 and the dashboard card renders.

### Dashboard page
8. Given `src/app/(private)/dashboard/page.tsx`, when read, then it exports a default `async function DashboardPage()` with `metadata.title === 'Dashboard'`, calls `await auth()`, has a defensive `if (!session?.user) redirect('/')`, and renders `<main>` + `<Card>` containing the heading `"Welcome, ${name}."`, paragraph `"This is your dashboard."`, and a `<form action={signOutAction}>` containing a `<Button type="submit" variant="primary">Sign Out</Button>`.
9. Given a signed-in user on `/dashboard`, when the page renders, then the heading text is exactly `"Welcome, ${name}."` (with the trailing period), the paragraph is exactly `"This is your dashboard."`, and clicking Sign Out signs them out and lands them on `/`.

### Home page
10. Given `src/app/page.tsx`, when read, then it is **not** marked `async`, does not import `auth`, does not call `auth()`, contains no `Welcome, ${name}` string, contains no Sign Out form, and renders the signed-out content unconditionally (heading "Hello there", paragraph "Please sign in to continue.", and the two stacked links).

### Sign-in and sign-up pages
11. Given `src/app/(auth)/sign-in/page.tsx`, when read, then it does NOT call `await auth()` or `redirect(...)` from `next/navigation`. The file is the minimal render shell: metadata + the centred `<main>` + `<Card>` + `<SignInForm />`.
12. Given `src/app/(auth)/sign-up/page.tsx`, same as 11 — no per-page redirect logic.

### Server actions
13. Given `src/actions/signIn.ts`, when read, then `signIn('credentials', { ... })` is called with `redirectTo: '/dashboard'` and there is no `redirect: false` flag anywhere. The action's contract still returns `Promise<SignInResult>`; the `{ success: true }` return after the `signIn(...)` call stays for type-symmetry.
14. Given `src/actions/signUp.ts`, when read, then `signIn('credentials', { ... })` is called with `redirectTo: '/dashboard'` (replacing the previous `'/'`).
15. Given `src/components/features/SignInForm.tsx`, when read, then it does NOT import `useRouter` from `next/navigation` and does NOT call `router.push(...)` anywhere. The `onValid` handler now only handles the failure branch (calls `setError('root', ...)` and returns); success is handled by the action's redirect.

### Font
16. Given `src/app/layout.tsx`, when read, then it imports `Copse` from `next/font/google` (not `Inter`), declares it with `variable: '--font-copse'`, `subsets: ['latin']`, `weight: '400'`, `display: 'swap'`, and applies `copse.variable` to the `<html>` className.
17. Given `tailwind.config.ts`, when read, then `theme.extend.fontFamily.sans` is `['var(--font-copse)', 'ui-serif', 'Georgia', 'serif']`.
18. Given a browser inspecting the running app, when the computed font-family on `<body>` is checked, then it resolves to `Copse` first.

### Colour palette
19. Given `tailwind.config.ts`, when read, then `theme.extend.colors` contains exactly the keys `primary`, `secondary`, `neutral`, `danger`, `success`, each with the hex values from Assumption 10 — no Tailwind defaults remaining and no other tokens added.
20. Given the running app, when any element with `bg-primary-500` is rendered, then its computed background colour is `#7faaa3` (muted teal).
21. Given the existing 19 design-system tests, when `npm run test:run` runs, then all 19 still pass without modification (class-name assertions are unaffected by hex changes).

### Autofocus
22. Given `src/components/features/SignInForm.tsx`, when read, then the Name `<Input>` has `autoFocus` as a prop.
23. Given `src/components/features/SignUpForm.tsx`, same — the Name input has `autoFocus`.
24. Given a fresh page load of `/sign-in`, when the document is inspected, then `document.activeElement` is the Name input (verified via runtime smoke, not unit test).

### Code layout
25. The new and modified files honour the "Code Layout — Visual Rhythm" rules in CLAUDE.md: blank lines between distinct steps inside function bodies; tightly-coupled idioms (log-then-throw, log-then-return, consecutive setup constants, consecutive `expect`s) kept together; non-trivial returns preceded by a blank line.

### Forbidden-pattern compliance
26. Given the codebase, when grep'd, then no `any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace, no `Readonly<{}>` empty type, and `'use client'` appears in exactly the four expected leaves: `SignInForm.tsx`, `SignUpForm.tsx`, `Button.tsx`, `Input.tsx`. The new `DashboardPage` does NOT carry the directive.

### Build & quality
27. `tsc --noEmit` exits 0; `npm run lint` exits 0; `npm run test:run` exits 0 (19/19 still passing); `npx next build` succeeds and the route table includes `ƒ /dashboard` alongside the existing routes.
28. `mcp__ide__getDiagnostics` returns no diagnostics in any source or test file.

### Runtime smoke (builder's responsibility, mandatory)
29. Given the dev server running with a fresh `.next` build, when curl-ing the four matcher routes both signed-out and signed-in, then the response codes match ACs 2–7 exactly. The builder records the actual response codes in the build summary.

## Notes for Downstream Agents

- **Architect**: write the middleware first, then the dashboard page, then the modifications to the three existing pages, then the actions, then the form changes, then layout + Tailwind config. This order keeps every intermediate state passing `tsc`.
- **Architect**: in Auth.js v5, the canonical middleware shape is:
  ```ts
  import { auth } from '@/lib/auth'
  export default auth((req) => {
    const isAuth = !!req.auth
    const path = req.nextUrl.pathname
    const isPrivate = path.startsWith('/dashboard')
    const isPublicOnly = path === '/' || path === '/sign-in' || path === '/sign-up'
    if (!isAuth && isPrivate) return Response.redirect(new URL('/', req.url))
    if (isAuth && isPublicOnly) return Response.redirect(new URL('/dashboard', req.url))
  })
  export const config = { matcher: ['/dashboard/:path*', '/', '/sign-in', '/sign-up'] }
  ```
  Builder can refine. `Response.redirect` is the standard signature; Next.js's `NextResponse.redirect` is also acceptable.
- **Builder**: the cookie-clear lesson still applies to `signInAction`. The change is from `signIn('credentials', { ..., redirect: false })` to `signIn('credentials', { ..., redirectTo: '/dashboard' })`. Auth.js will write the cookie and throw `NEXT_REDIRECT`. **Do NOT wrap `signIn(...)` in try/catch** — the redirect throw must propagate, same as `signUpAction`. The existing catch in `signInAction` wraps the count check + the signIn call; revisit it during the change so the catch covers only the count check (or the entire body for hostile inputs — re-evaluate; the existing catch is broad but the function returns `GENERIC_ERROR` on any failure, which is the same generic credential-error policy, so the broad catch is acceptable as long as the redirect throw is allowed to bubble up). **Auth.js's `NEXT_REDIRECT` is a special error that catch blocks should re-throw.** The simplest pattern: narrow the try-catch to `await countUsers()` only, then call `signIn(...)` outside.
- **Reviewer**: AC #29 (runtime smoke for the redirect matrix) is the linchpin. Without it, the redirect logic could fail in production and static checks would miss it. Builder runs the smoke and records the codes — reviewer verifies the table.
- **Reviewer**: AC #20 (computed colour on `bg-primary-500`) requires a live browser check OR confidence that Tailwind's compiled CSS produces the expected hex. The builder may verify by grepping the built CSS for the new hex values. Spec accepts either.
