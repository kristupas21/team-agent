# Review: Main Header

## STATUS: PASS

## Acceptance Criteria Check

- [x] 1 — `src/components/features/MainHeader.tsx` is a default-exported `async function MainHeader()` that calls `await auth()`, derives `signedIn` and `userName`, and renders `<MainHeaderNav signedIn={signedIn} userName={userName} />` inside a sticky `<header>` wrapper.
- [x] 2 — `src/components/features/MainHeaderNav.tsx` starts with `'use client'`, exports `MainHeaderNavProps` as a readonly type, imports `usePathname` and `useRouter` from `next/navigation`, and renders the left/right cluster layout described in the spec.
- [x] 3 — `src/app/layout.tsx` imports `MainHeader` from `@/components/features/MainHeader` and renders `<MainHeader />` between `<body>` and `{children}`.
- [x] 4 — Every page now has a `<header>` element at the top with `sticky top-0 z-10 w-full border-b border-neutral-200 bg-white`. Verified by code inspection of `MainHeader.tsx`.
- [x] 5 — On `/sign-in` (signed-out), Back button rendered. `MainHeaderNav.test.tsx` case #2 asserts.
- [x] 6 — On `/sign-up` (signed-out), Back button rendered. Case #3 asserts.
- [x] 7 — On `/` (signed-out), Back NOT rendered. Case #1 + case #5.
- [x] 8 — On `/dashboard` (signed-in), Back NOT rendered. Case #7. Case #9 covers nested `/dashboard/sub`.
- [x] 9 — Signed-out on `/`: both Sign In and Sign Up rendered as `<Link>` (verified via `getByRole('link', { name: /sign in/i }).toHaveAttribute('href', '/sign-in')` etc.).
- [x] 10 — Signed-out on `/sign-in`: Sign In is a disabled `<button>` (assertion: `getByRole('button', { name: /sign in/i }).toBeDisabled()`), Sign Up is a `<Link>`. Case #2.
- [x] 11 — Mirror for `/sign-up`. Case #3.
- [x] 12 — Signed-in on `/dashboard`: Sign Out form-button only; no Sign In/Sign Up. Case #5.
- [x] 13 — Sign Out click flow inherits the previously-verified `signOutAction` redirect behaviour. The button still sits inside `<form action={signOutAction}>` (just moved from dashboard card to header). No regression.
- [x] 14 — `src/app/page.tsx` is welcome-only. The `<div className="mt-6 space-y-3">` block with the two `<Link>`s is gone. `Link` and `buttonClass` imports removed.
- [x] 15 — `src/app/(private)/dashboard/page.tsx` is welcome-only. The `<form action={signOutAction}>` block is gone. `Button` and `signOutAction` imports removed.
- [x] 16 — `src/app/layout.tsx` imports `Jost` from `next/font/google` with the correct shape. `<html>` uses `jost.variable`. Copse import gone.
- [x] 17 — `tailwind.config.ts` `fontFamily.sans` is `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']` — sans-serif fallback chain restored.
- [x] 18 — Tailwind compiles `font-sans` to reference `var(--font-jost)` first. (Build succeeded; Jost is loaded via `next/font/google` at build time.)
- [x] 19 — `__tests__/components/features/MainHeaderNav.test.tsx` exists with 9 cases (target was 8); mocks `next/navigation` via the mutable `pathnameRef.current` pattern; mocks `@/actions/signOut`.
- [x] 20 — **87/87 passing across 13 files** (target was ~86/13). 9 new tests landed; no regressions.
- [x] 21 — `tsc --noEmit` exit 0, `npm run lint` exit 0, `npx next build` exit 0. Route table includes `Middleware (85.3 kB)` and the four routes.
- [x] 22 — `mcp__ide__getDiagnostics` returns no diagnostics in any source or test file. The errors visible are in `tasks/incoming/main-header.md` (markdown parsing JSX as code) — cleared on archive.
- [x] 23 — Static sweep returned zero `: any`, zero bare `<a `, zero `<img`, zero `next/router`, zero `window.location`, zero `Readonly<{}>`, zero `React.` references. `'use client'` count = 5 (Button, Input, SignInForm, MainHeaderNav, SignUpForm) — increment of exactly one matches the plan.
- [x] 24 — Visual rhythm honoured. Spot-checked `MainHeaderNav.tsx`, `MainHeader.tsx`, the modified pages and the test file. Blank lines between distinct steps inside function bodies; tightly-coupled idioms kept together; non-trivial returns preceded by a blank line.

All 24 ACs met.

## Plan Compliance

- All planned files exist at the planned paths: 2 new components, 1 new test file, 4 modifications. No extra files added.
- The disabled-link Option A pattern is implemented exactly as described in the plan — enabled = `<Link>`, disabled = `<Button disabled type="button">`. Visual parity via the shared `buttonClass()` set under the hood.
- Empty-left-cluster placeholder (`<div />` when `!showBack`) preserves `justify-between` layout.
- Mutable `pathnameRef.current` pattern in the test matches the plan's documented approach.
- The build order was followed; intermediate `tsc` check after the two new components passed before the rest of the diff landed.

## Code Quality

- TypeScript strict; no `any` even in test files.
- `MainHeaderNavProps` follows the CLAUDE.md prop-type convention (`Readonly<{ ... }>`); `userName` is optional and intentionally not destructured to make the silent-prop nature explicit at the destructure site.
- `'use client'` placement matches CLAUDE.md's deepest-interactive-leaf rule.
- Internal navigation uses `<Link>`; no bare `<a>`.
- No `React.*` namespace references; component-prop convention honoured; no empty `Readonly<{}>`.
- Test file mocks at the top via `vi.mock(...)` (hoisted by Vitest); mutable `pathnameRef.current` documented as the per-test-path-switching idiom.

## Blockers
None.

## Notes (non-blocking)

1. **All routes are now `ƒ Dynamic`** in the build report — previously `/`, `/sign-in`, `/sign-up` were `○ Static`. Side effect of mounting `MainHeader` in the root layout (every route reads the session). Acceptable cost of a global session-aware header. If we ever want static prerendering back for the public-only routes, the header would have to be excluded from those layouts.
2. **Lint flagged a single apostrophe in the dashboard** during build (`react/no-unescaped-entities` on `"You're signed in."` as raw JSX text). Fixed by wrapping in `{"..."}` expression literal — visible output identical. Worth keeping in mind: when migrating text from JSX expressions to JSX literals, the apostrophe escape rule applies.
3. **`userName` prop is silent.** The spec carries it through the props type for forward use but doesn't render it. If a future task wants "Hello, {name}" in the header, the wiring is already there.
4. **No runtime smoke this task.** Tests cover the interactive surface; static checks cover the page-card simplifications and the font swap. The redirect matrix from `06-private-routes-and-styling` continues to be unit-tested in `__tests__/middleware.test.ts`. Acceptable per the task's "no runtime smoke required" note.
5. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
6. **Sticky header height + the cards' centring.** The cards use `min-h-screen flex items-center justify-center` and the sticky header sits on top of the same scroll surface (~56 px high). The cards' visual centre is now offset slightly downward because the header overlays the top of the centring area. Acceptable per the spec's Assumption 17 — no fix needed unless visual polish is requested in a follow-up.
7. **9 test cases shipped vs spec's 8 minimum.** The 9th case (nested `/dashboard/sub`) validates the `startsWith('/dashboard')` branch — cheap defense against future nested-dashboard routes regressing the hide-Back-button rule.

## Approved Files

- New: `src/components/features/MainHeader.tsx`, `src/components/features/MainHeaderNav.tsx`, `__tests__/components/features/MainHeaderNav.test.tsx`.
- Modified: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(private)/dashboard/page.tsx`, `tailwind.config.ts`.

No files require changes. STATUS: PASS.
