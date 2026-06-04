# Task: Private Routes + Styling Refresh

## Description
Three independent threads bundled together because they share a single redeploy window: (1) introduce the concept of authentication-gated routes by adding `/dashboard` as the first private route, plus the cross-cutting redirect rules that drive who-goes-where; (2) refresh the visual identity — switch the global font from Inter to Copse, and replace the colour palette with a more pastel/distinctive set; (3) a small UX fix — autofocus the first input on the sign-in and sign-up pages.

## Scope

### In scope
- **Private routes infrastructure**: a single, idiomatic mechanism for guarding a set of routes such that signed-out users cannot view them and signed-in users cannot view the public-only routes either (the inversion is intentional — once signed in, the user lives on the dashboard, not the marketing home).
- **`/dashboard` route**: first private route. Server component, signed-in only. Content: a welcome message ("Welcome, {name}.") plus an unstyled `<Button>` Sign Out (same component that lives on the home page today after `04-basic-styling`).
- **Redirect rules**:
  - Signed-out user → `/dashboard` → redirected to `/`.
  - Signed-in user → `/` → redirected to `/dashboard`.
  - Signed-in user → `/sign-in` → redirected to `/dashboard` (today this redirects to `/`; flip the destination).
  - Signed-in user → `/sign-up` → redirected to `/dashboard` (same flip).
  - Successful sign-in (`signInAction`) → lands on `/dashboard` (today: `/`; flip via `signIn(..., { redirectTo: '/dashboard' })` if the action uses that pattern, or by leaving the page-level `auth()` redirect to send them on).
  - Successful sign-up (`signUpAction`) → lands on `/dashboard` (same flip; `signIn(..., { redirectTo: '/dashboard' })`).
  - Sign out → lands on `/` (unchanged from `04-basic-styling`'s `signOut({ redirectTo: '/' })`).
- **Home page (`/`) becomes purely the signed-out landing page**: the existing signed-in branch becomes unreachable because the redirect now intercepts; the architect / builder decide whether to delete the dead code path or leave a defensive fallback (leaning delete for cleanliness — once redirects are working, the dead branch is just noise).
- **Font swap**: replace `next/font/google` Inter with Copse. CSS variable name and Tailwind `theme.extend.fontFamily.sans` updated accordingly.
- **Colour palette refresh**: new hex values for `primary`, `secondary`, `neutral`, `danger`, `success`. The new palette must read as "pastel" and "distinctive" — not Tailwind defaults. Number of steps per token stays the same (three for primary/secondary/danger/success; five for neutral). Naming stays the same.
- **Autofocus**: the first input on `/sign-in` and `/sign-up` receives focus on initial render. Mechanism (HTML `autoFocus` attribute vs `useEffect` + `ref.focus()`) — spec-agent picks.
- **No new ad-hoc components.** Reuse `Button`, `Input`, `Card`, `buttonClass`, `cn`.
- **Update the existing 19 tests if any colour-class strings they reference change.** None are expected to change since the test assertions use class names (e.g. `bg-primary-500`), not hex values — the hexes live in `tailwind.config.ts`. Sanity-check anyway.

### Out of scope
- Authorization beyond signed-in / signed-out (no roles, no permissions, no admin-only routes).
- Other private routes — only `/dashboard`.
- Profile, account settings, user listing, deleting accounts.
- New design-system components (e.g. NavBar, Sidebar) — the dashboard is a minimal stub.
- Dark mode / theming.
- Email verification, password reset.
- Tests beyond the existing 19; this task does NOT need to add tests, matching the precedent for non-design-system tasks.
- Migration of the Tailwind `borderRadius` scale (still a follow-up).

## Specific Threads

### 1. Private routes infrastructure

**Recommendation (spec-agent to confirm):** use `middleware.ts`. Auth.js v5 ships first-class middleware support (`export default auth((req) => { ... })` from `@/lib/auth`) which evaluates the session on every request that matches the `config.matcher`. One file owns every redirect; adding the next private route (e.g. `/orders`) becomes a one-line matcher edit. The existing `middleware.ts` already has the scaffold commented.

The alternative — per-page `await auth()` + `redirect(...)` calls in each page's server component — works but duplicates the logic across each route. For a project that will grow private routes, middleware is the strictly better choice.

Matcher for this task: at minimum `['/dashboard/:path*', '/', '/sign-in', '/sign-up']`. Anything in `(auth)` group or under `/dashboard/`.

Behaviour: middleware reads `req.auth`. If `null` and the path is private (`/dashboard*`) → redirect to `/`. If non-null and the path is `/`, `/sign-in`, or `/sign-up` → redirect to `/dashboard`. Otherwise pass through.

The architect must reconcile with the existing per-page redirects:
- `src/app/(auth)/sign-in/page.tsx` currently calls `auth()` and redirects to `/` if signed in. With middleware redirecting first, the page-level call becomes redundant. Either delete the per-page redirect (clean) or leave both (defensive).
- `src/app/(auth)/sign-up/page.tsx` same observation.
- `src/app/page.tsx` currently renders different branches based on `name`. Once middleware redirects signed-in users away, the signed-in branch is dead. Remove it or leave it as fallback.

### 2. `/dashboard` page

- New file: `src/app/(private)/dashboard/page.tsx`, sitting inside a new route group `(private)` parallel to `(auth)`. The route group has no effect on the URL (`/dashboard` stays). The group exists to signal "everything here is signed-in only" and to keep peer private routes co-located.
- Server component, async, calls `await auth()`. After middleware filters out signed-out requests, `auth()` should return a populated session — but defensive code can still handle `null` (e.g. `redirect('/')`). Spec-agent picks the policy.
- Renders a centred `<Card>` containing:
  - `<h1>` with text `"Welcome, {name}."` (or similar — the spec-agent picks the exact copy, but keep it consistent with the existing `"Welcome, {name}"` heading style from the home page that we're removing).
  - A short paragraph (one line). Exact copy is for the spec-agent (e.g. `"This is your dashboard."` — placeholder, no business logic).
  - A `<form action={signOutAction}><Button>Sign Out</Button></form>` — same shape as the existing home-page signed-in branch.
- No new components; no new styling; reuse `Card`, `Button`, `cn`, `buttonClass`.

### 3. Sign-in and sign-up redirect destinations

- `src/actions/signIn.ts`: change `signIn('credentials', { ..., redirect: false })` → `signIn('credentials', { ..., redirectTo: '/dashboard' })`. **This is also a cookie-clear lesson** — currently sign-in returns `{ success: true }` and the client calls `router.push('/')`. If we switch to `redirectTo`, the client `router.push` becomes unreachable (same pattern as `signUpAction`). Spec-agent picks one of:
  - Keep the current "return + client push" pattern; just change the push target to `/dashboard`.
  - Switch to `redirectTo: '/dashboard'`; remove the client-side `router.push`.
  Both work. The second is more consistent with `signUpAction`. Architect picks.
- `src/actions/signUp.ts`: change `signIn('credentials', { ..., redirectTo: '/' })` → `signIn('credentials', { ..., redirectTo: '/dashboard' })`. One-line change.

### 4. Font swap

- `src/app/layout.tsx`: replace `Inter` from `next/font/google` with `Copse`. Variable name: `--font-copse` (or `--font-sans`, since Copse is the sans-serif of choice). Apply via `className={copse.variable}` on `<html>` and keep the `font-sans` body class.
- `tailwind.config.ts`: change `theme.extend.fontFamily.sans` first entry from `'var(--font-inter)'` to `'var(--font-copse)'` (or whatever variable name is chosen).
- Copse is a serif-ish display font — confirm it suits a UI app or fall back. The spec-agent notes this caveat. The user explicitly named Copse so the assumption stands; the spec-agent may flag that Copse is a serif and ask if the user is sure.

### 5. Colour palette refresh

- `tailwind.config.ts`: replace each token's hex values with a pastel/distinctive set. The architect/spec-agent proposes the values. Suggested *direction* (not locked):
  - `primary`: a muted teal / sage (cooler, calmer than the current strong blue).
  - `secondary`: dusty rose / mauve (warm, soft, complementary to primary).
  - `neutral`: stays grey-family but with a slight warmth (e.g. towards stone rather than slate).
  - `danger`: pastel terracotta / muted brick — not the loud pure red.
  - `success`: sage green — not the loud bright green.
- Each token keeps three steps (`50` / `500` / `700`) — neutral keeps five (`50` / `200` / `500` / `700` / `900`).
- The hexes must be picked deliberately, not at random. Spec-agent records them under Assumptions with brief reasoning ("teal-mint for primary because it reads calmer and distinguishes from generic blue brand colours").
- The existing 19 tests reference class names (`bg-primary-500`, `border-danger-500`, etc.), not hexes. They should keep passing. Verify.

### 6. Autofocus

- `SignInForm.tsx` and `SignUpForm.tsx`: the first input (the Name input) receives focus when the page loads.
- Mechanism options:
  - HTML `autoFocus` prop on the first `<Input>`. Simple. SSR-safe.
  - `useEffect(() => ref.current?.focus(), [])` with a `ref` on the first input. Slightly more boilerplate; works around React's `autoFocus` warnings on accessibility tooling but isn't strictly needed.
- Spec-agent picks. HTML `autoFocus` is the simpler default.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

- `middleware.ts` — implement the redirect logic.
- `src/app/(private)/dashboard/page.tsx` — new.
- `src/app/page.tsx` — drop the signed-in branch; signed-out content stays as-is (heading, paragraph, two stacked links).
- `src/app/(auth)/sign-in/page.tsx` — optionally remove the per-page `auth()` redirect since middleware handles it.
- `src/app/(auth)/sign-up/page.tsx` — same.
- `src/actions/signIn.ts` — change redirect target.
- `src/actions/signUp.ts` — change redirect target.
- `src/components/features/SignInForm.tsx` — autofocus.
- `src/components/features/SignUpForm.tsx` — autofocus.
- `src/app/layout.tsx` — swap font.
- `tailwind.config.ts` — swap font variable + palette hexes.
- README — only if onboarding copy changes (likely unchanged).

No new dependencies. No model changes.

## Done Criteria

### Private routes / redirects
- `GET /dashboard` while signed-out → 307/308 → `/`.
- `GET /` while signed-in → 307/308 → `/dashboard`.
- `GET /sign-in` while signed-in → 307/308 → `/dashboard`.
- `GET /sign-up` while signed-in → 307/308 → `/dashboard`.
- Successful sign-in lands on `/dashboard` (after the session cookie is written).
- Successful sign-up lands on `/dashboard` (after the new user is created and the session is written).
- Sign Out from `/dashboard` clears the cookie and lands on `/` (signed-out home).
- `/dashboard` renders the welcome heading + paragraph + Sign Out button inside a `<Card>` for signed-in users.

### Styling
- Loading any page shows Copse as the active font family (verify via DevTools: `font-family` on `<body>` resolves to `Copse` first in the chain).
- `tailwind.config.ts` palette hexes match the pastel set chosen by the spec-agent — no Tailwind defaults remaining.
- Existing 19 tests still pass without modification (their assertions target class names, not hex values).

### Autofocus
- Visiting `/sign-in` places caret focus on the Name input immediately, no click required.
- Visiting `/sign-up` same.

### Quality gates
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` — all exit 0.
- `mcp__ide__getDiagnostics` — no diagnostics in source files.

## What This Task Does NOT Include
- Any styling for the new dashboard page beyond the existing `Card` + `Button` primitives. No new icons, no avatars, no nav bar.
- Authorization rules beyond "signed-in vs signed-out". No roles, permissions, admin-only flags.
- Other private routes (e.g. `/settings`, `/profile`).
- Tests — same precedent as the prior non-design-system tasks. The new redirect behaviour will be covered by the builder's runtime smoke (post-`04-basic-styling`, runtime smoke is now standard for routes that involve cookies + redirects).
- A theming system (light/dark). The palette is fixed.

## Notes for the Spec-Agent

- **Middleware vs per-page redirects** is the central architectural call. Lean middleware — it's the Auth.js v5 idiom, scales to more private routes, and keeps the redirect rules in one file. Document the choice as an Assumption with brief reasoning.
- The cookie-clear bug solved in `04-basic-styling` is back-of-mind for every redirect-on-server-action. `signUpAction` already uses `signIn(..., { redirectTo: '/' })`; updating to `'/dashboard'` is one-line. `signInAction` currently uses `{ redirect: false }` + a client-side `router.push('/')`. Pick one pattern across both actions for consistency — recommendation: align `signInAction` to the `redirectTo` pattern, dropping the client-side `router.push` (still works correctly and matches `signUpAction`).
- **Copse is a serif font.** The user named it explicitly so the assumption stands, but the spec-agent should flag this in Assumptions: Copse may not be the ideal UI font for a modern app — its glyphs are stylised. If the user wants a sans-serif feel, alternatives like "Nunito", "Karla", "DM Sans" are worth surfacing under Open Questions. If Copse is intentional, no action needed.
- **Palette hexes**: don't pick arbitrarily. Propose six values per token (the hex itself), state briefly why ("muted teal because it reads calmer and pairs with a warm secondary"), and let the user override during the spec-pause. If you commit to a set, document it under Assumptions with each hex listed.
- **Defensive `auth()` in `/dashboard/page.tsx`** is acceptable — middleware can fail or be misconfigured; a `if (!session?.user) redirect('/')` line at the top costs nothing and keeps the page safe in isolation. Architect's call.
- The Open Question style established in earlier tasks fits here: surface anything preference-driven (font choice, exact hexes, exact dashboard copy) so the user can patch them during the spec-pause without re-running the architect.
