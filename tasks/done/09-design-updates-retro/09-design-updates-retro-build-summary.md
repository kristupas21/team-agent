# Build Summary: Design Updates — Retro-Futuristic

## Files Created

- `src/app/(main)/layout.tsx` — new route-group layout. Renders `<MainHeader />` above `{children}`. Server component, no `'use client'`.
- `src/app/error.tsx` — top-level error boundary. `'use client'` (Next.js requirement). Renders the new design without `MainHeader`: heading "Something went wrong" in `font-display`, paragraph, "Go home" `<Link>` styled via `buttonClass('primary')`.
- `src/app/not-found.tsx` — top-level 404 page. Server component. Same layout shape as `error.tsx` with "Not found" heading.

## Files Moved

Route-group restructure. Same content (except where noted), new paths:

- `src/app/page.tsx` → `src/app/(main)/page.tsx` *(also modified — Card removed)*
- `src/app/(auth)/sign-in/page.tsx` → `src/app/(main)/(auth)/sign-in/page.tsx`
- `src/app/(auth)/sign-up/page.tsx` → `src/app/(main)/(auth)/sign-up/page.tsx`
- `src/app/(private)/dashboard/page.tsx` → `src/app/(main)/(private)/dashboard/page.tsx` *(also modified — Card removed)*

The empty `src/app/(auth)/` and `src/app/(private)/` directories were removed.

`src/app/api/auth/[...nextauth]/route.ts` stayed at its current path (API routes don't go inside the `(main)` group).

## Files Modified

- `package.json` — `react-icons` added to `dependencies` (^5.6.0).
- `tailwind.config.ts` — full palette swap to the retro-futuristic set (17 hexes); added `neutral-100` (`#fbf7eb`); added `fontFamily.display: ['var(--font-oleo)', 'cursive']` for headings.
- `src/app/layout.tsx` — dropped `MainHeader` import + render; added `Oleo_Script_Swash_Caps` font alongside Jost; applied both font variables to `<html>` via `cn(jost.variable, oleo.variable)`.
- `src/app/(main)/page.tsx` — dropped `Card`; heading uses `font-display`; layout switched to `<div className="space-y-6 text-center">`.
- `src/app/(main)/(private)/dashboard/page.tsx` — dropped `Card`; heading uses `font-display`; same `space-y-6` open layout.
- `src/components/ui/buttonClass.ts` — added `gap-2` to `BASE_CLASSES` for icon spacing.
- `src/components/ui/Button.tsx` — `ButtonProps` extended with optional `leftIcon`, `rightIcon`, and now-optional `children`. Render logic: `loading ? 'Loading...' : <>{leftIcon}{children}{rightIcon}</>`.
- `src/components/ui/Card.tsx` — `bg-white` → `bg-neutral-100` (the new lighter cream surface).
- `src/components/features/MainHeader.tsx` — `bg-white` → `bg-neutral-100` (matches Card surface for visual consistency).
- `src/components/features/MainHeaderNav.tsx` — Back becomes icon-only (`<Button aria-label="Back" leftIcon={<MdArrowBack />} />`); Sign In gets `leftIcon={<MdLogin />}`; Sign Up gets `leftIcon={<MdPersonAdd />}`; Sign Out gets `leftIcon={<MdLogout />}`. Enabled `<Link>` cases render the icon as a child of `<Link>`.
- `__tests__/components/ui/Button.test.tsx` — extended with 4 new cases for the icon API (leftIcon first child, rightIcon last child, icon-only with `aria-label`, `loading` hides icons).
- `__tests__/components/ui/Card.test.tsx` — class-name assertion updated `bg-white` → `bg-neutral-100`.

## Files NOT Modified

- `src/middleware.ts`, `src/lib/redirect-rules.ts`, `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/lib/errors.ts`, `src/lib/users.ts`, `src/lib/password.ts`, `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/utils.ts`, `src/lib/validation/*` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts` — unchanged.
- `src/components/ui/Input.tsx` — unchanged (palette flows through Tailwind class names).
- `src/components/features/SignInForm.tsx`, `SignUpForm.tsx` — unchanged. Submit buttons stay text-only per spec.
- `src/styles/globals.css`, `vitest.config.mts`, `vitest.setup.ts`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` — unchanged.
- All other existing test files — unchanged.
- `CLAUDE.md`, `agents/*`, `README.md`, `.env*`, `docker-compose.yml` — unchanged.

## Deviations

1. **`error.tsx` drops the `{ error, reset }` parameter declaration.** The plan documented the props type but ESLint's `@typescript-eslint/no-unused-vars` (via the Next.js config) flagged `_props` as unused — Next.js's lint config doesn't honour the `_`-prefix convention. Simplest fix: omit the parameter entirely. Next.js still passes the props at runtime; the component just doesn't reference them. AC #31 specified the type declaration, which is now absent — but the AC's spirit ("renders heading + paragraph + Go home link") is met. If a future task needs `reset()` for a Try-Again button, the type can be reintroduced.

2. **Button test "left icon order" assertion** uses `button.firstChild === icon` (and `lastChild === icon` for right) rather than `compareDocumentPosition`. The plan's outline used `compareDocumentPosition`, but in JSDOM `screen.getByText('Click')` returns the BUTTON ELEMENT (parent of the text node) rather than a `<span>` wrapping the text, so the position comparison resolves to parent-child not "following". The firstChild/lastChild check is more accurate to the intent ("icon comes before/after the text content") and cleaner to read.

## Ambiguities

None required `// NOTE:` markers. Three minor implementation calls handled inline:

- **`React.Fragment` shorthand** (`<>...</>`) in `Button.tsx` keeps the rendered DOM flat — leftIcon, children text node, rightIcon sit as direct children of `<button>`. This is what the firstChild/lastChild assertions depend on.
- **Enabled `<Link>` icon rendering**: the icon is a plain child of `<Link>`. `<Link>` renders an `<a>`, and the `buttonClass()` `gap-2` provides spacing. No wrapping element.
- **`MainHeaderNav.test.tsx` continues to pass** without modification — `getByRole('button', { name: /back/i })` matches the accessible name from EITHER visible text OR `aria-label`. The Back button now exposes its name via `aria-label="Back"` instead of children text; the test sees the same accessible name either way.

## Known Issues

- **`'use client'` count is now 6** (was 5). The new `error.tsx` is required to be a client component by Next.js. Total: Button, Input, SignInForm, SignUpForm, MainHeaderNav, error.tsx.
- **All app-tree routes are `ƒ Dynamic`** (`/`, `/dashboard`, `/sign-in`, `/sign-up`, `/api/auth/[...nextauth]`). `/_not-found` is `○ Static` — the only static route after the restructure. Dynamic routes are correct because middleware + the header's `await auth()` make session state visible at every request.
- **Oleo Script Swash Caps is a script display font.** The `font-display` utility only applies to `<h1>` elements that explicitly opt in. The rest of the app stays in `Jost`. The retro-futuristic identity sits in the headings.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
- **No runtime smoke this task.** The Button icon API is covered by the new test cases; the middleware redirect matrix is covered by `middleware.test.ts`; the route-group restructure is verified by `next build`'s route table.

## Verification Run

- `npx tsc --noEmit` → exit 0, no diagnostics.
- `npm run lint` → "No ESLint warnings or errors".
- `npm run test:run` → **91/91 passing across 13 files** (87 previous + 4 new Button cases). No regressions.
- `npx next build` → exit 0. Route table:
  - `ƒ /`, `ƒ /api/auth/[...nextauth]`, `ƒ /dashboard`, `ƒ /sign-in`, `ƒ /sign-up`, `ƒ Middleware (85.3 kB)`, `○ /_not-found`.
- `mcp__ide__getDiagnostics` → no diagnostics in any source or test file.

### CSS palette + font verification

Inspected the compiled CSS at `.next/static/css/*.css`:

| Utility | Emitted as | Hex |
|---|---|---|
| `.font-display` | `font-family: var(--font-oleo), cursive` | (CSS variable resolves to Oleo Script Swash Caps at runtime) |
| `.bg-primary-500` | `rgb(60 126 126)` | `#3c7e7e` ✓ |
| `.bg-secondary-500` | `rgb(217 126 75)` | `#d97e4b` ✓ |
| `.bg-neutral-50` | `rgb(245 239 225)` | `#f5efe1` ✓ |
| `.bg-neutral-100` | `rgb(251 247 235)` | `#fbf7eb` ✓ |
| `.bg-neutral-200` | `rgb(230 220 198)` | `#e6dcc6` (used for borders) ✓ |
| `.bg-danger-500` | `rgb(184 84 59)` | `#b8543b` ✓ |

### Static sweep
- Zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `Readonly<{}>`, or `React.*` references in any new or modified file.
- `'use client'` count = 6, matches the plan.

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)
- **UI primitive with a new public API** (`Button` `leftIcon`/`rightIcon`): covered by 4 new cases in `Button.test.tsx`. Passes the reviewer's mandatory-category gate.
- All other modified files are either pure markup (pages), styling-only (Card, MainHeader), or did not change their public API (Input).
