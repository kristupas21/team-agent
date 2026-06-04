# Task: Main Header

## Description
Introduce a sticky `MainHeader` that lives on every page, owns the auth-state actions (Sign In / Sign Up / Sign Out) that currently live on the home card, and adds a session-aware Back button on the left. Also swap the global font from Copse to Jost (sans-serif) — Copse is a serif and feels off for this UI. The Home and Dashboard cards become welcome-only (heading + paragraph). Sign In and Sign Up cards keep their forms. The header's buttons are disabled on the matching auth page (Sign In disabled on `/sign-in`, Sign Up disabled on `/sign-up`).

## Scope

### In scope
- **New feature component `MainHeader`** at `src/components/features/MainHeader.tsx`, mounted in the root layout (`src/app/layout.tsx`) above `{children}`. Shows on every route: `/`, `/sign-in`, `/sign-up`, `/dashboard`, and any future route.
- **Header layout**:
  - Sticky to the top of the viewport (`sticky top-0`, `z-*` high enough to sit above page content).
  - Background matches the `Card` look — `bg-white` with a bottom border (`border-b border-neutral-200`). No rounded corners (it spans the full viewport width).
  - Inner content sits in a horizontal flex row with a left cluster (Back button) and a right cluster (auth buttons).
  - Comfortable padding (`px-4 py-3` or similar — spec-agent picks).
  - Inner content is constrained to a sensible max width and centred (or full-width with the same gutter as the rest of the app).
- **Left side — Back button**:
  - When the current route is `/sign-in` or `/sign-up`: render a Back button. Clicking it navigates back via `useRouter().back()` (Next.js App Router).
  - When the current route is `/dashboard` (and any future private route — but only `/dashboard` exists today): do NOT render the Back button.
  - When the current route is `/` (signed-out landing): do NOT render the Back button — see Open Questions for confirmation.
  - The Back button uses the existing design-system `Button` primitive with a secondary or neutral variant — spec-agent picks (lean secondary to differentiate visually from the primary auth buttons).
  - Button label: `"Back"`.
- **Right side — auth buttons**:
  - When signed out: render a `Sign In` link and a `Sign Up` link. Both styled like the existing `buttonClass('primary', ...)` from `04-basic-styling` so they match the visual language of the home links that they're replacing.
  - When signed in: render a `Sign Out` button. Same component shape as the existing dashboard Sign Out (`<form action={signOutAction}>` + `<Button variant="primary">Sign Out</Button>`).
  - Disabled rules:
    - On `/sign-in` (signed-out): Sign In is **disabled** (and rendered as a non-link element so clicking doesn't navigate); Sign Up stays enabled.
    - On `/sign-up` (signed-out): Sign Up is **disabled**; Sign In stays enabled.
    - On any other page: both enabled.
    - Sign Out is never disabled.
  - "Disabled" visually matches the existing `Button disabled` state (60% opacity, `cursor-not-allowed`).
- **Move buttons off the Home card**:
  - `src/app/page.tsx`'s signed-out branch (the only branch now) keeps the heading `"Hello there"` and paragraph `"Please sign in to continue."` only. The two stacked Sign In / Sign Up links are **removed** — they now live in the header.
- **Move Sign Out off the Dashboard card**:
  - `src/app/(private)/dashboard/page.tsx` keeps the heading `"Welcome, ${name}."` and paragraph `"You're signed in."` only. The Sign Out form/button is **removed** — it now lives in the header.
  - Sign-in / sign-up cards are unchanged — they wrap their forms.
- **Responsive**:
  - At mobile widths (~375 px), the header lays out without overflow. Buttons remain accessible. Spec-agent decides whether to shrink padding, stack buttons, or rely on smaller button sizing — but no horizontal scroll.
  - At desktop widths (>= `md`), the header has the comfortable padding described above.
- **Font swap: Copse → Jost** in `src/app/layout.tsx`. CSS variable becomes `--font-jost`. Tailwind `theme.extend.fontFamily.sans` becomes `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']` (back to a sans-serif fallback chain — Jost is sans). Pick a sensible weight set; Jost ships many — `'400'` is the minimum required for body text.

### Out of scope
- Header components beyond the three button-types named above (no nav menu, no profile dropdown, no avatar, no theme toggle, no search bar).
- Any new icons or icon library — Back button is text `"Back"` only, no chevron.
- Animations or transitions on header scroll behaviour.
- Mobile menu / hamburger pattern — the three button-types are few enough to stay inline on mobile.
- Dark mode / theming.
- Changes to the existing palette (the colours stay as they are after `06-private-routes-and-styling`).
- New route additions.
- Logo / brand mark — none yet.
- Authorization rules beyond signed-in vs signed-out.
- Adding the header to the `/api/auth/[...nextauth]` route handler (not a page, no layout).

## Specific Behaviour

### `MainHeader` placement and structure
Mount in `src/app/layout.tsx`:
```tsx
<body ...>
  <MainHeader />
  {children}
</body>
```
`MainHeader` is a **server component** that calls `await auth()` to read the session. It then renders a client child (e.g. `MainHeaderNav`) that owns the interactive behaviour (`useRouter` for Back, `usePathname` for disabled-state logic).

The architect picks the exact split — likely:
- `MainHeader.tsx` (server) — `auth()` + sticky wrapper markup.
- `MainHeaderNav.tsx` (client, `'use client'`) — receives `signedIn: boolean` and `userName?: string` as props, calls `usePathname()` and `useRouter()`, renders the back button and auth buttons with the disabled rules applied.

### Back button
- Component name (suggested): `HeaderBackButton`. Could be inlined in `MainHeaderNav` — spec-agent's call.
- Visibility rules:
  - `usePathname() === '/'` → hidden.
  - `usePathname().startsWith('/dashboard')` → hidden.
  - Otherwise → visible.
- Click handler: `useRouter().back()` — Next.js App Router. No fallback URL needed; if history is empty (e.g. user opens `/sign-in` directly), `router.back()` does nothing, which is acceptable for this brief.
- Visual: `Button` primitive with variant `secondary`, label `"Back"`.

### Auth buttons — disabled-state rules
- Sign In disabled when `pathname === '/sign-in'` (only matters in the signed-out branch).
- Sign Up disabled when `pathname === '/sign-up'` (same).
- Sign Out is never disabled.
- Disabled visual = existing `Button disabled` state.
- Implementation note: the disabled Sign In / Sign Up must NOT be `<Link>` elements (otherwise clicking still navigates). When disabled, render a `Button disabled` *visually identical* to the enabled link version. Spec-agent picks the exact implementation:
  - Option A: render a `<button type="button" disabled>` when disabled and a `<Link>` when enabled.
  - Option B: a single `<Link>` that becomes `aria-disabled` and a `preventDefault()` click handler — clunkier.
  - Option A is cleaner; recommend it.

### Sign Out in header
- Render `<form action={signOutAction}><Button type="submit" variant="primary">Sign Out</Button></form>` inside the right cluster. Same pattern as today's dashboard card. The form-action lives inside a client component (`MainHeaderNav`), which is allowed in React 19 / Next 15.

### Welcome-only Home card
- Signed-out home (`/`) is the only route hit by signed-out users since middleware redirects `/sign-in` and `/sign-up` for signed-in users. Card content:
  - `<h1 className="text-4xl font-semibold">Hello there</h1>`
  - `<p className="mt-4 text-base text-neutral-500">Please sign in to continue.</p>`
  - **No buttons / links** below.

### Welcome-only Dashboard card
- `<h1>Welcome, ${name}.</h1>`
- `<p>You're signed in.</p>`
- **No Sign Out form** — moved to header.

### Sign-in and Sign-up cards
- Unchanged. They still render the form inside the card. The header is also present (mounted in layout), with the relevant disabled rules.

### Font: Jost
- `src/app/layout.tsx`: import `Jost` from `next/font/google` with `subsets: ['latin']`, `variable: '--font-jost'`, `display: 'swap'`, `weight: '400'` (or `weight: ['400', '500']` if the spec-agent wants a heavier weight for headings — flag for the spec-agent).
- The previous Copse import is removed.
- `tailwind.config.ts`: `theme.extend.fontFamily.sans` becomes `['var(--font-jost)', 'ui-sans-serif', 'system-ui', 'sans-serif']`. Sans-serif fallback chain since Jost is sans.
- Tailwind's `font-sans` utility (used in `<body>`) automatically picks up the new value.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

- `src/components/features/MainHeader.tsx` — new (server component).
- `src/components/features/MainHeaderNav.tsx` — new (client component).
- `src/app/layout.tsx` — mount `<MainHeader />` + swap Copse for Jost.
- `src/app/page.tsx` — remove the two-link stack; card becomes welcome-only.
- `src/app/(private)/dashboard/page.tsx` — remove the Sign Out form; card becomes welcome-only.
- `tailwind.config.ts` — `fontFamily.sans` updated to Jost variable + sans fallback chain.
- `src/app/(auth)/sign-in/page.tsx`, `src/app/(auth)/sign-up/page.tsx` — unchanged (only the form lives in their card; the header is present via layout).

## Tests Required
Per the new CLAUDE.md Testing Rules ("Categories that require tests" → "Client form components with state machines"), `MainHeaderNav` has interactive logic worth a small RTL test suite. Mandatory test cases:

- Renders Sign In + Sign Up when signed out.
- Renders Sign Out when signed in.
- On `/sign-in`: Sign In is disabled, Sign Up is enabled.
- On `/sign-up`: Sign Up is disabled, Sign In is enabled.
- Back button is hidden on `/` and on `/dashboard`.
- Back button is visible on `/sign-in` and `/sign-up`.
- Clicking the visible Back button calls `useRouter().back()` once.

Test path: `__tests__/components/features/MainHeaderNav.test.tsx`. Mock `next/navigation` to control `usePathname` and `useRouter` per test.

The pure server component `MainHeader.tsx` itself doesn't need a dedicated test — its only job is to call `auth()` and pass the result through.

## Done Criteria
- A signed-out visitor on any route sees the sticky header with the visible Sign In + Sign Up buttons in the right cluster.
- A signed-in visitor on any route sees the sticky header with the Sign Out button in the right cluster.
- On `/sign-in`, the header's Sign In is disabled and Sign Up is enabled.
- On `/sign-up`, the header's Sign Up is disabled and Sign In is enabled.
- On `/sign-in` and `/sign-up`, the header's Back button is visible and clicking it navigates back in history.
- On `/` and `/dashboard`, the header's Back button is not present.
- Home card shows only the heading and paragraph — no buttons or links.
- Dashboard card shows only the heading and paragraph — no Sign Out form (it's in the header).
- Browser font-family computed on `<body>` resolves to `Jost` first.
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0.
- New `MainHeaderNav` RTL test passes alongside the existing 78 tests.
- Mobile (~375 px) layout doesn't overflow horizontally; the header reads cleanly.

## What This Task Does NOT Include
- Nav menu, profile dropdown, avatar, theme toggle, search bar.
- Icon library or chevrons.
- Animations (slide-in, fade on scroll, etc.).
- Mobile hamburger pattern.
- Dark mode.
- Palette changes.
- New routes.
- Logo / brand mark.

## Notes for the Spec-Agent

- **MainHeader is server, MainHeaderNav is client** — the auth state comes from `await auth()` in the server component, and the interactivity (back button, disabled-state-by-pathname) lives in the client child. This is the deepest-leaf rule from CLAUDE.md applied cleanly.
- **Disabled link pattern**: lean Option A (`<button disabled>` for the disabled case, `<Link>` for the enabled case). Two rendered shapes is acceptable; trying to disable a `<Link>` via `aria-disabled` + `preventDefault` is the more fragile path.
- **Back button "no fallback" decision**: `router.back()` does nothing if history is empty. Acceptable for direct deep-links (e.g. user pastes `/sign-in` into the URL bar and the back button silently no-ops). If the user wants a fallback to `/`, that's an Open Question.
- **Open Question to surface — Back button on `/`**: the brief says "from /sign-in to /" but doesn't explicitly state whether `/` itself should show a Back button. Default assumption: hide it. Confirm.
- **Open Question to surface — Jost weight set**: `'400'` is the minimum. `['400', '500']` gives semibold-style headings. Pick one and document.
- **Open Question to surface — sticky behaviour exact CSS**: `sticky top-0 z-10` is the bare minimum. The spec-agent should confirm there's no other layered content competing for stacking context (currently nothing modal-like exists).
- **Re-evaluate visual hierarchy on the home card**: with the buttons removed, the home page card has just two text lines and a lot of whitespace. The spec/architect may suggest tightening the card's max-width or padding — flag if it looks empty, but don't change anything beyond what the brief requires unless the user asks.
- **`MainHeaderNav` is a mandatory test target** under the new CLAUDE.md Testing Rules. Skipping the test makes the review FAIL.
