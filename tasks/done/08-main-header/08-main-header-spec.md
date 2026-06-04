# Spec: Main Header

## Summary
Introduce a sticky `MainHeader` mounted in the root layout that lives on every page. The header owns the auth-action buttons that previously lived on the home card (Sign In / Sign Up when signed out, Sign Out when signed in) and adds a session-aware Back button on the left. Disabled-state rules tie the auth buttons to the current pathname (Sign In disabled on `/sign-in`, Sign Up disabled on `/sign-up`). The Home and Dashboard cards become welcome-only. Sign-in and Sign-up cards continue to host their forms unchanged. Global font swaps from Copse (serif) to Jost (sans-serif). One new RTL test file (`MainHeaderNav.test.tsx`) covers the interactive logic per the new mandatory-tests policy from `07-unit-tests`.

## Assumptions

1. **`MainHeader` is a server component** at `src/components/features/MainHeader.tsx`. Calls `await auth()`, derives `signedIn: boolean` and `userName: string | null`, renders a sticky wrapper containing `<MainHeaderNav signedIn={...} userName={...} />`.

2. **`MainHeaderNav` is a client component** (`'use client'`) at `src/components/features/MainHeaderNav.tsx`. Receives `{ signedIn, userName }` as props. Uses `usePathname()` (from `next/navigation`) for the disabled-state and Back-button-visibility rules. Uses `useRouter()` for the Back button's `router.back()` call. Renders the actual button JSX.

3. **`MainHeader` is mounted in `src/app/layout.tsx`** between `<body>` and `{children}`. No layout wrapper changes (the body's `bg-neutral-50 font-sans text-base text-neutral-900` classes stay).

4. **Sticky wrapper CSS** (chosen here, override during spec-pause if any class feels off):
   ```
   sticky top-0 z-10 w-full bg-white border-b border-neutral-200
   ```
   Inside: a flex row with `items-center justify-between px-4 py-3`. No max-width container — the header spans the viewport so the bottom border reads as a true horizontal rule. Content alignment uses the same `px-4` gutter the rest of the pages use, so left/right clusters align visually with page content.

5. **Left cluster** contains the Back button (when visible) and is otherwise empty. The flex layout uses `justify-between` so the right cluster stays right-aligned regardless of whether the left has content. To prevent layout shift when the Back button hides, the left cluster renders an empty `<div />` placeholder.

6. **Right cluster** contains the auth buttons in a horizontal `flex items-center gap-3`.

7. **Back button visibility**:
   - Hidden when `usePathname() === '/'`.
   - Hidden when `usePathname() === '/dashboard'` or `usePathname().startsWith('/dashboard/')`.
   - Visible otherwise — practically, on `/sign-in` and `/sign-up`.

8. **Back button behaviour**: `useRouter().back()` on click. No fallback URL. If history is empty (user deep-links to `/sign-in`), `back()` is a no-op — acceptable per the brief.

9. **Back button visual**: existing `<Button>` primitive with `variant="secondary"`. Label exactly `"Back"`. No icon.

10. **Auth buttons (signed-out branch)** render two elements side-by-side:
    - Sign In — when `pathname !== '/sign-in'`: a `<Link href="/sign-in">` styled via `buttonClass('primary', '...')`. When `pathname === '/sign-in'`: a `<Button variant="primary" disabled type="button">Sign In</Button>` (disabled native button, no link).
    - Sign Up — mirror of the above against `pathname === '/sign-up'`.
    - Order: Sign In first, Sign Up second.

11. **Auth button (signed-in branch)** renders a single Sign Out:
    - `<form action={signOutAction}><Button type="submit" variant="primary">Sign Out</Button></form>`.
    - Never disabled. The form-action sits inside the client component — supported in React 19 / Next 15.

12. **Disabled-link pattern is Option A from the brief**: two rendered shapes (`<Link>` for enabled, `<Button disabled>` for disabled). Cleaner than `aria-disabled` + `preventDefault`. The disabled `<Button>` carries the same visual classes as the enabled link (both go through `buttonClass('primary', ...)` / the `Button` component, which already shares the variant class set with the link via the existing `buttonClass()` helper from `04-basic-styling`).

13. **Welcome-only Home card** (`src/app/page.tsx`):
    - Heading `"Hello there"` + paragraph `"Please sign in to continue."` only.
    - The `<div className="mt-6 space-y-3">` block containing the two `<Link>`s is **removed entirely**. The card's content is now just two text rows.
    - Card max-width and padding stay unchanged — emptier card is acceptable; visual polish for the smaller card is out of scope.
    - `Link`, `buttonClass`, and `Card` imports that are no longer used are removed. `Card` stays imported (it still wraps the content).

14. **Welcome-only Dashboard card** (`src/app/(private)/dashboard/page.tsx`):
    - Heading `"Welcome, ${name}."` + paragraph `"You're signed in."` only.
    - The `<form action={signOutAction}><Button>Sign Out</Button></form>` block is **removed entirely**.
    - `signOutAction`, `Button` imports are removed from this file (they now live in `MainHeaderNav.tsx`). `Card` stays.

15. **Sign-in and Sign-up pages unchanged at the page level.** Their cards host their forms; the header is present via the root layout's mount, with the disabled rules driven by `usePathname()`.

16. **Font swap: Copse → Jost**:
    - `src/app/layout.tsx`: import `Jost` from `next/font/google` with `subsets: ['latin']`, `variable: '--font-jost'`, `display: 'swap'`, `weight: ['400', '500']`. The two weights give us regular body text (400) and a slightly heavier weight (500) for the existing `font-semibold` usage on the heading. The previous `Copse` import + `--font-copse` variable are removed.
    - The `<html>` className changes from `copse.variable` → `jost.variable`.
    - `tailwind.config.ts`: `theme.extend.fontFamily.sans` becomes `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']` — sans-serif fallback chain since Jost is sans.
    - Existing `font-sans` usage (on `<body>`) and `font-semibold` usage (on the `<h1>` in the home page and dashboard) keep working — Tailwind's utility names are stable; only the resolved font and weight values change.

17. **Responsive behaviour**:
    - Mobile (~375 px): header lays out without overflow. The flex row stays a row — three buttons (Back + Sign In + Sign Up, or just Sign Out) fit comfortably at typical mobile widths because each is small. No hamburger / collapse pattern.
    - At small viewports the inner padding can shrink — spec-agent sets `px-3 py-2 md:px-4 md:py-3` (or similar). No additional layout adjustments.
    - The card content below the header continues to use `min-h-screen flex items-center justify-center` on its `<main>` wrapper. With the sticky header taking ~56 px at the top, the card content remains centred in the remaining viewport. This is the same behaviour as before — the sticky header overlays whatever's behind it, the `<main>` wrapper doesn't subtract the header's height. Acceptable; no additional centering work needed.

18. **Tests** — one new test file: `__tests__/components/features/MainHeaderNav.test.tsx`. Eight test cases (see Test Behaviour Specifications). `MainHeader.tsx` itself (the server component) gets no dedicated test — its only logic is `auth()` + prop-forwarding, which is covered indirectly by the integration of the existing tests.

19. **No new dependencies, no new model changes, no new env vars, no new routes.**

20. **CLAUDE.md and reviewer-agent.md are NOT updated** in this task — the testing-policy and feature-component rules they need already landed in `07-unit-tests` and `06-private-routes-and-styling`.

21. **The existing 78 tests stay passing.** No test file from the previous task is modified.

## Open Questions
None remaining. The four flagged in the brief are resolved under Assumptions:
- Back button on `/` → hidden (Assumption 7).
- Jost weights → `['400', '500']` (Assumption 16) — covers both body and `font-semibold`.
- Sticky CSS exact form → `sticky top-0 z-10 w-full bg-white border-b border-neutral-200` (Assumption 4).
- Home card emptiness after the buttons are removed → accepted; not polished further in this task (Assumption 13).

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| (every route) | `src/app/layout.tsx` (modify) | unchanged | Root layout now renders `<MainHeader />` above `{children}`. Font swap from Copse to Jost. |
| `/` (modify) | `src/app/page.tsx` | unchanged | Card becomes welcome-only. The two stacked Sign In / Sign Up links are removed. |
| `/sign-in`, `/sign-up` | unchanged | unchanged | The header is present via layout; the page content is unchanged. |
| `/dashboard` (modify) | `src/app/(private)/dashboard/page.tsx` | unchanged | Card becomes welcome-only. The Sign Out form/button is removed. |

No route additions or deletions.

## Data

### Data Types
```ts
// src/components/features/MainHeaderNav.tsx
type MainHeaderNavProps = Readonly<{
  signedIn: boolean
  userName?: string
}>
```

`userName` is included for future use (e.g. a "Hello, {name}" greeting in the header). For this task it's optional — `MainHeader` still passes it for forward compatibility, but `MainHeaderNav` does not render it.

`MainHeader` has no exported types — it's a default-exported server component with no props.

### API Endpoints
None added.

### Dependencies
None added.

### Environment Variables
None added.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `MainHeader` (new) | server component | Reads session, renders sticky wrapper + `<MainHeaderNav />`. | none |
| `MainHeaderNav` (new) | client component | Renders Back button, auth buttons. Handles disabled-state via `usePathname()`. | `MainHeaderNavProps` |
| `HomePage` (modify) | server component | Card becomes welcome-only. | unchanged |
| `DashboardPage` (modify) | server component | Card becomes welcome-only. | unchanged |
| `RootLayout` (modify) | server component | Mounts `<MainHeader />`; swaps Copse for Jost. | unchanged |

No new UI primitives. `Button`, `Card`, `cn`, `buttonClass` are reused.

## User Interactions

### Signed-out user on `/`
1. Browser GET `/`. Layout renders `<MainHeader>` calling `await auth()` → returns null. `signedIn === false`.
2. `<MainHeaderNav signedIn={false} />` renders: empty left cluster (Back hidden on `/`), right cluster shows enabled Sign In + enabled Sign Up.
3. The Home card below shows the welcome heading + paragraph only.
4. User clicks Sign In in the header → navigates to `/sign-in`.

### Signed-out user on `/sign-in`
1. Header renders: Back button visible on the left, right cluster shows disabled Sign In + enabled Sign Up.
2. Card below contains the sign-in form (unchanged).
3. User clicks Back in the header → `router.back()` → returns to the previous route in history.
4. User clicks Sign Up in the header → navigates to `/sign-up`.

### Signed-out user on `/sign-up`
1. Header renders: Back visible, Sign In enabled, Sign Up disabled.
2. Card below contains the sign-up form (unchanged).

### Signed-in user on `/dashboard`
1. Browser GET `/dashboard`. Layout's `<MainHeader>` reads the session via `auth()` → returns the user. `signedIn === true`, `userName === 'admin'` (or whoever).
2. `<MainHeaderNav signedIn>` renders: empty left cluster (Back hidden on `/dashboard`), right cluster shows the Sign Out form-button.
3. Dashboard card shows welcome heading + paragraph only.
4. User clicks Sign Out → `signOutAction` runs → cookie cleared + redirect to `/`.
5. Browser GET `/`. Header re-renders in the signed-out branch.

### Direct deep-link to `/sign-in` with empty history
1. User pastes `http://localhost:3000/sign-in` into the URL bar.
2. Header renders the Back button (visible on `/sign-in`).
3. User clicks Back. `router.back()` is a no-op (no history entry). UI doesn't change.
4. This is acceptable — the brief did not require a fallback URL.

### Edge case: signed-in user attempts `/sign-in` or `/sign-up`
1. Middleware redirects to `/dashboard` (unchanged from `06-private-routes-and-styling`).
2. Header on `/dashboard` shows Sign Out, no Back.
3. Disabled rules for Sign In / Sign Up never fire because signed-in users can't reach those routes.

## States

### Sticky header
- **Always visible at the top of the viewport** while scrolling on any page.
- **Visual**: `bg-white`, bottom border `border-neutral-200`, `z-10` so it overlays the page content. No shadow.

### Left cluster — Back button
- **Visible** on `/sign-in` and `/sign-up` (and any future non-private, non-home route).
- **Hidden** on `/` and `/dashboard` (including future `/dashboard/...`). The cluster slot is preserved as an empty `<div />` to prevent right-cluster shift.

### Right cluster — signed out
- **On `/`**: enabled Sign In `<Link>` + enabled Sign Up `<Link>`. Both rendered via `buttonClass('primary', '...')`.
- **On `/sign-in`**: disabled Sign In `<Button>` + enabled Sign Up `<Link>`.
- **On `/sign-up`**: enabled Sign In `<Link>` + disabled Sign Up `<Button>`.

### Right cluster — signed in
- **On `/dashboard`**: a `<form action={signOutAction}>` containing a `<Button type="submit" variant="primary">Sign Out</Button>`. No Sign In or Sign Up element.

### Home card (signed-out only — modified)
- Heading: `"Hello there"` (Tailwind `text-4xl font-semibold`).
- Paragraph: `"Please sign in to continue."` (`mt-4 text-base text-neutral-500`).
- Nothing below the paragraph.

### Dashboard card (signed-in only — modified)
- Heading: `"Welcome, ${name}."` (same classes).
- Paragraph: `"You're signed in."` (same classes).
- Nothing below the paragraph.

### Loading / Error
- Not applicable — server components, no async UI state beyond `auth()`.

## Acceptance Criteria

### MainHeader presence and structure
1. Given `src/components/features/MainHeader.tsx`, when read, then it is a default-exported `async function MainHeader()` that calls `await auth()`, derives `signedIn` and `userName`, and renders `<MainHeaderNav signedIn={signedIn} userName={userName} />` inside a sticky wrapper.
2. Given `src/components/features/MainHeaderNav.tsx`, when read, then it starts with `'use client'`, exports a default function accepting `MainHeaderNavProps`, imports `usePathname` and `useRouter` from `next/navigation`, and renders the layout described under Assumptions 5–11.
3. Given `src/app/layout.tsx`, when read, then it imports `MainHeader` and renders `<MainHeader />` between `<body>` and `{children}`.
4. Given any rendered page (`/`, `/sign-in`, `/sign-up`, `/dashboard`), when the HTML is inspected, then a `<header>` element (or a `<div>` with the sticky classes) appears at the top with the bottom border and the right cluster's buttons.

### Back button behaviour
5. Given a signed-out user on `/sign-in`, when the header renders, then a Back button is present in the left cluster. Clicking it calls `router.back()`.
6. Given a signed-out user on `/sign-up`, when the header renders, then the Back button is present.
7. Given a signed-out user on `/`, when the header renders, then the Back button is NOT present.
8. Given a signed-in user on `/dashboard`, when the header renders, then the Back button is NOT present.

### Auth buttons — signed-out branch
9. Given a signed-out user on `/`, when the header renders, then the right cluster contains a Sign In link and a Sign Up link. Both link to their respective routes via `<Link>` and carry the primary button styling. Both are enabled.
10. Given a signed-out user on `/sign-in`, when the header renders, then the Sign In element is a disabled `<button>` (not a `<Link>`) and the Sign Up element is an enabled `<Link>`.
11. Given a signed-out user on `/sign-up`, when the header renders, then the Sign Up element is a disabled `<button>` and the Sign In element is an enabled `<Link>`.

### Auth button — signed-in branch
12. Given a signed-in user on any page (which is only `/dashboard` after middleware), when the header renders, then the right cluster contains exactly one element: a `<form action={signOutAction}>` containing a `<Button type="submit" variant="primary">Sign Out</Button>`. There is no Sign In or Sign Up element.
13. Given the Sign Out button is clicked, when the action runs, then the session cookie is cleared and the user is redirected to `/`. (Behaviour unchanged from `04-basic-styling` / `06-private-routes-and-styling` — verified indirectly.)

### Home card welcome-only
14. Given `src/app/page.tsx`, when read, then it renders heading `"Hello there"` and paragraph `"Please sign in to continue."` inside the existing `<main>` + `<Card>` wrapper. The `<div className="mt-6 space-y-3">` block with the two `<Link>`s is gone. `Link` and `buttonClass` imports are removed (no longer used in the file).

### Dashboard card welcome-only
15. Given `src/app/(private)/dashboard/page.tsx`, when read, then it renders heading `"Welcome, ${name}."` and paragraph `"You're signed in."` inside the existing `<main>` + `<Card>` wrapper. The `<form action={signOutAction}>` block is gone. `Button` and `signOutAction` imports are removed.

### Font swap
16. Given `src/app/layout.tsx`, when read, then it imports `Jost` from `next/font/google` (not `Copse`). The font is instantiated with `subsets: ['latin']`, `variable: '--font-jost'`, `display: 'swap'`, `weight: ['400', '500']`. The `<html>` element receives `className={jost.variable}`.
17. Given `tailwind.config.ts`, when read, then `theme.extend.fontFamily.sans` is `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']`.
18. Given the running app, when the computed font-family on `<body>` is inspected, then Jost resolves first.

### Tests
19. Given `__tests__/components/features/MainHeaderNav.test.tsx`, when read, then it imports `MainHeaderNav` from `@/components/features/MainHeaderNav`, mocks `next/navigation` (so `usePathname` and `useRouter` are controllable per test), and asserts each behaviour listed under "Test Behaviour Specifications" below.
20. Given `npm run test:run`, when run, then it exits 0 with ~86 tests passing across 13 files (78 existing + ~8 new) — no existing test regressions.

### Build & quality
21. Given `tsc --noEmit`, `npm run lint`, and `npx next build`, when each is run, then each exits 0. `next build` route table is unchanged (`/`, `/_not-found`, `/api/auth/[...nextauth]`, `/dashboard`, `/sign-in`, `/sign-up`, `Middleware`).
22. Given `mcp__ide__getDiagnostics`, when called against `/src` and `/__tests__`, then no diagnostics surface in any source or test file.

### Forbidden-pattern compliance
23. Given the codebase, when grep'd, then no new `any`, bare `<a>` for internal routes, `<img>`, `next/router`, `window.location`, `React.*` namespace, or `Readonly<{}>` empty type appear in any new or modified file. The `'use client'` count grows by exactly one (the new `MainHeaderNav.tsx`).

### Code layout (visual rhythm)
24. Given all new and modified files, when read, then they honour CLAUDE.md → "Code Layout — Visual Rhythm Inside Function Bodies": blank lines between distinct steps; tightly-coupled idioms kept together; non-trivial returns preceded by a blank line.

## Test Behaviour Specifications — `MainHeaderNav.test.tsx`

Mock setup at the top of the file (per CLAUDE.md → Testing Rules → Mocking conventions):
```ts
const mockBack = vi.fn()
const mockPathname = vi.fn<[], string>()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
```

Then in `beforeEach`, `vi.resetAllMocks()` and set the pathname default if useful.

### Cases
1. **Signed-out on `/`**: renders both Sign In and Sign Up as enabled links (`<a>` tags pointing at the right hrefs); does NOT render the Back button.
2. **Signed-out on `/sign-in`**: Sign In rendered as a disabled `<button>` (assert `toBeDisabled()`); Sign Up rendered as an enabled link; Back button rendered.
3. **Signed-out on `/sign-up`**: Sign Up disabled `<button>`; Sign In enabled link; Back button rendered.
4. **Signed-in on `/dashboard`**: renders Sign Out form-button; does NOT render Sign In, Sign Up, or Back button.
5. **Signed-in user with no `userName` prop**: still renders Sign Out without crashing (defensive — `userName` is optional).
6. **Click Back on `/sign-in`**: `mockBack` was called exactly once after the click.
7. **Back button hidden on `/` (signed-out)**: confirmed not rendered.
8. **Back button hidden on `/dashboard` (signed-in)**: confirmed not rendered.

Mandatory minimum: 8 test cases. The architect / builder may add more (e.g. nested `/dashboard/sub` paths to confirm `startsWith('/dashboard')` works) but 8 must exist.

## Notes for Downstream Agents

- **Architect**: keep `MainHeader.tsx` as small as possible — just `await auth()` + the wrapper markup + `<MainHeaderNav />`. All interactivity lives in `MainHeaderNav`. This is the deepest-leaf rule again.
- **Architect**: the disabled-link Option A pattern means rendering two different elements depending on disabled-state. Avoid using one component with `disabled={isCurrentPath}` because the enabled version needs to be a `<Link>` for client-side navigation, while the disabled version needs to be a `<button disabled>`. A small inline ternary in `MainHeaderNav` keeps this readable.
- **Builder**: when removing imports from `src/app/page.tsx` and `src/app/(private)/dashboard/page.tsx`, double-check no stragglers remain (`Link`, `buttonClass`, `Button`, `signOutAction`). `tsc --noEmit` catches unused imports as errors under our config? It doesn't by default — but `next lint` flags them via `@typescript-eslint/no-unused-vars`. Confirm clean.
- **Reviewer**: ACs #10, #11 (the disabled-link rendering as `<button>` not `<Link>`) is the linchpin of the disabled-state correctness. Verify the test asserts `toBeDisabled()` on the right element (a `<button>` — `<a>` doesn't accept `disabled`).
- **Reviewer**: AC #20 — test count went 78 → ~86. If a regression knocks any existing test out, that's a Blocker.
- **No runtime smoke is required.** All ACs are unit-testable + statically checkable. The 8 RTL cases for `MainHeaderNav` cover the interactive logic; the static-file checks cover the page-card simplifications and the font swap.
