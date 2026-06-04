# Build Summary: Main Header

## Files Created

- `src/components/features/MainHeader.tsx` — server component. `await auth()` derives `signedIn` and `userName`; renders the sticky `<header>` wrapper containing the flex row + `<MainHeaderNav signedIn={...} userName={...} />`.
- `src/components/features/MainHeaderNav.tsx` — client component (`'use client'`). Receives `MainHeaderNavProps`, uses `usePathname()` for the disabled/visibility logic, and `useRouter()` for the Back button. Renders the left cluster (Back button or empty `<div />` placeholder) and the right cluster (Sign In/Sign Up links/disabled buttons OR Sign Out form-button).
- `__tests__/components/features/MainHeaderNav.test.tsx` — 9 RTL cases. Mocks `next/navigation` (with a mutable `pathnameRef.current` indirection so tests can change the path between cases) and `@/actions/signOut`.

## Files Modified

- `src/app/layout.tsx`:
  - Swapped `Copse` → `Jost` from `next/font/google`. CSS variable: `--font-copse` → `--font-jost`. Weights: `'400'` → `['400', '500']`.
  - `<html>` className now `jost.variable`.
  - Mounted `<MainHeader />` between `<body>` and `{children}`.
- `tailwind.config.ts`: `theme.extend.fontFamily.sans` is now `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']` — sans-serif fallback chain restored (was serif under Copse).
- `src/app/page.tsx`: dropped the `<div className="mt-6 space-y-3">` block containing the two `<Link>`s. Removed unused `Link` and `buttonClass` imports. Card now contains only heading + paragraph.
- `src/app/(private)/dashboard/page.tsx`: dropped the `<form action={signOutAction}>` block containing the Sign Out button. Removed unused `Button` and `signOutAction` imports. Card now contains only heading + paragraph.

## Files NOT Modified

`src/components/ui/*`, `src/components/features/SignInForm.tsx`, `SignUpForm.tsx`, `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx`, `src/middleware.ts`, `src/lib/*`, `src/models/*`, `src/actions/*`, `src/styles/globals.css`, `vitest.config.mts`, `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `CLAUDE.md`, `agents/*`, README, all env files, docker-compose, and every existing test file. Per-spec policy: this task only adds the header surface + swaps the font.

## Deviations

1. **JSX escape on the dashboard paragraph** — the spec's `"You're signed in."` string lives inside a static JSX text node now (was previously a `{name ? "You're signed in." : ...}` expression). `react/no-unescaped-entities` flagged the raw apostrophe. Wrapped the string in an expression literal: `{"You're signed in."}` — same rendered output, lint-compliant. Visible character is identical to the spec's prescribed string.

2. **9 test cases written, not 8** — the spec's minimum was 8. Added a 9th case ("does NOT render the Back button on nested /dashboard/sub paths") to confirm the `startsWith('/dashboard')` branch works.

## Ambiguities

None required `// NOTE:` markers. Three minor implementation calls handled inline:

- **The `MainHeaderNav` JSX returns a Fragment** with left + right cluster as two top-level children — the parent flex row in `MainHeader` applies `justify-between`. Architect's call; works cleanly.
- **`useRouter` mock returns an object with `back`, `push`, `replace`** even though only `back` is called — keeps the mock surface compatible if other code paths in the component (or future additions) need other methods.
- **The mutable `pathnameRef.current` pattern** in the test enables per-test path switching despite Vitest's `vi.mock` hoisting. Standard Vitest idiom; documented inline.

## Known Issues

- **`'use client'` count is now 5** (Button, Input, SignInForm, SignUpForm, MainHeaderNav). Within expectation.
- **All routes are now `ƒ Dynamic`** in the build output. Previously `/`, `/sign-in`, `/sign-up` were `○ Static`. Mounting `MainHeader` in the root layout means every route calls `await auth()` at the top of the tree, which marks the tree dynamic. This is the correct cost of a global session-aware header. If we ever want static prerendering for the public-only routes again, the header would have to be excluded from those layouts — not in scope here.
- **`autoFocus` warnings from React** continue on the sign-in / sign-up forms — unchanged from `06-private-routes-and-styling`.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
- **No runtime smoke this task.** Per the spec, the new test file covers `MainHeaderNav`'s interactive logic; the page-card simplifications are static-file checks; the font swap is verifiable via `next build` output (Jost is fetched from `fonts.googleapis.com/...` during build — the build succeeded). The redirect matrix from `06-private-routes-and-styling` remains unit-tested in `__tests__/middleware.test.ts`.

## Verification Run

- `npx tsc --noEmit` → exit 0, no diagnostics.
- `npm run lint` → "No ESLint warnings or errors" (after the apostrophe-in-JSX fix).
- `npm run test:run` → **87/87 passing across 13 files** (78 existing + 9 new). Breakdown:
  - errors.test.ts: 11
  - validation/signIn.test.ts: 6
  - validation/signUp.test.ts: 5
  - auth-config.test.ts: 4
  - middleware.test.ts: 10
  - actions/signIn.test.ts: 6
  - actions/signUp.test.ts: 5
  - SignInForm.test.tsx: 6
  - SignUpForm.test.tsx: 6
  - **MainHeaderNav.test.tsx: 9 (new)**
  - Button.test.tsx: 7, Card.test.tsx: 3, Input.test.tsx: 9
- `npx next build` → exit 0. Route table:
  - `ƒ /`, `ƒ /_not-found`, `ƒ /api/auth/[...nextauth]`, `ƒ /dashboard`, `ƒ /sign-in`, `ƒ /sign-up`, `ƒ Middleware (85.3 kB)`.
  - All routes are now Dynamic (was static for `/`, `/sign-in`, `/sign-up`) — see Known Issues.
- `mcp__ide__getDiagnostics` → no diagnostics in any source or test file. (Markdown false positives in the incoming brief — cleared on archive.)

## Static Sweep
- No new `: any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace references, no `Readonly<{}>` empty type.
- `'use client'` count is 5 (was 4): Button, Input, SignInForm, SignUpForm, **MainHeaderNav** (new). All at the deepest interactive leaves.

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)
- **Client form component with state machine**: `MainHeaderNav` has branching logic on `signedIn` and `pathname`. Covered by `MainHeaderNav.test.tsx` (9 cases). Passes the reviewer's mandatory-category gate.
