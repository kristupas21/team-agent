# Task: Design Updates — Retro-Futuristic

## Description
A substantial visual refresh plus two new system pages. Eight threads bundled into one shipping unit because they share a single design pass:

1. Swap the global font to **Oleo Script Swash Caps** (a decorative Google font). Flag suitability — see Open Questions.
2. Replace the colour palette with a **retro-futuristic** set — bold accents on a light, neutral surface.
3. Optionally change the surface from pure white if a cream / off-white reads better with the new accents (keep it light and neutral).
4. Remove `<Card>` from the Home and Dashboard pages — go open and airy. Card may also be removed entirely if it no longer fits the design.
5. Introduce **Material icons** (the architect picks a Material-icon React library). First use: Back button becomes **icon-only** (no "Back" text).
6. Extend `Button` to support optional `leftIcon` and `rightIcon` props. First use: Sign In, Sign Up, Sign Out buttons each get a sensible left icon.
7. Add a subtle hover effect (darkening or underline) that fits the retro-futuristic vibe.
8. Add a custom `error.tsx` and `not-found.tsx` at root with the new design. Neither shows `MainHeader`. Each renders a brief explanation + a "Go home" button. Button text is stable regardless of auth state; the destination resolves via middleware (`/` always — middleware redirects signed-in users to `/dashboard`).

Plus: all existing UI primitives (`Button`, `Input`, `Card`) and feature components (`SignInForm`, `SignUpForm`, `MainHeader`, `MainHeaderNav`) get a styling pass to match. Behaviour and APIs stay the same except for `Button`'s new icon props.

## Scope

### In scope
- **Font swap**: `Copse` (current) wait — current is `Jost` after `08-main-header`. Swap `Jost` → `Oleo Script Swash Caps`. CSS variable: `--font-oleo` (or similar — spec-agent picks). See Open Questions about decorative-font readability.
- **Palette refresh**: replace the 5 tokens (`primary`, `secondary`, `neutral`, `danger`, `success`) with retro-futuristic values. Same token names, same step counts (3 for primary/secondary/danger/success; 5 for neutral). Specific hexes locked under the spec's Assumptions.
- **Surface**: `neutral-50` (or a new dedicated `surface` token if the spec-agent prefers — keep it simple, lean toward reusing `neutral-50`) becomes a warm off-white. Card's `bg-white` may also change — spec-agent picks. Must stay light and neutral.
- **Card removal**:
  - **Home page** (`/`): drop the `<Card>` wrapper. Replace with an open, airy layout — heading + paragraph centred with generous vertical rhythm. No box around the content.
  - **Dashboard** (`/dashboard`): same — drop the Card wrapper, render the welcome content directly inside the centred `<main>`.
  - **Sign-in / Sign-up pages**: keep `<Card>` for the forms unless the spec-agent decides removing it improves the design. Default: keep for forms.
- **Material icons library**: choose one and install. Architect's call. Recommended: `react-icons` (tree-shakable, per-icon imports from `react-icons/md`). Alternatives: `@mui/icons-material` (heavier), Google's icon font via `<Icon />` element (clunkier). Lean `react-icons` for size + DX.
- **Back button → icon-only**: the existing `<Button>Back</Button>` in `MainHeaderNav` becomes `<Button leftIcon={<MdArrowBack />} aria-label="Back" />` (or similar — spec-agent picks the exact icon component). No text. Must remain accessible (`aria-label`).
- **`Button` icon support**: extend `ButtonProps` with optional `leftIcon?: ReactNode` and `rightIcon?: ReactNode`. The component renders them inline next to children, with a small inline gap. If `children` is empty (icon-only case), the icon stands alone. Variant styles unchanged.
- **First icon use**:
  - Sign In button: a "log in / enter" style Material icon (`MdLogin` or similar).
  - Sign Up button: a "person add" style Material icon (`MdPersonAdd` or similar).
  - Sign Out button: a "log out / exit" Material icon (`MdLogout`).
  - Back button: a left-arrow Material icon (`MdArrowBack`).
  - Exact icon component picks live under the spec's Assumptions.
- **Hover effect**: subtle darkening (already present via `hover:bg-primary-700` on the primary variant) OR an underline on text-link-styled actions. Architect picks one approach and applies it consistently across `Button` variants. Should fit the retro vibe — neither too aggressive nor too subdued.
- **`error.tsx` at root**: `src/app/error.tsx`. Client component (Next.js requirement for error boundaries). Renders new-design layout: centred, large heading like `"Something went wrong"`, short paragraph, **"Go home"** button linking to `/`. Does NOT show `MainHeader`. See Architecture-level concern below.
- **`not-found.tsx` at root**: `src/app/not-found.tsx`. Server component (default). Centred, large heading like `"Not found"`, short paragraph, "Go home" button linking to `/`. Does NOT show `MainHeader`.
- **MainHeader-suppression architecture**: the cleanest Next.js pattern is a route group with its own layout. Restructure so `MainHeader` only mounts inside a `(main)` route group (or similar — architect names it), and `error.tsx` / `not-found.tsx` live at the root layout level which doesn't include `MainHeader`. The architect produces the final file structure.
- **Update existing UI primitives** (`Button`, `Input`, `Card`) and feature components (`SignInForm`, `SignUpForm`, `MainHeader`, `MainHeaderNav`) to match the new palette + font. No API changes beyond `Button`'s new icon props.
- **Tests**: update the existing `Button.test.tsx` to cover the new icon props (mandatory category — UI primitive with new API). Other tests should keep passing without modification (class-name assertions don't change). The new `error.tsx` and `not-found.tsx` are simple markup; no dedicated tests required (per the test-agent rules — they're not state machines, no business logic).
- **No new dependencies beyond the Material icon library.**
- **No new routes**, no database changes, no auth surface changes.

### Out of scope
- Dark mode / theming.
- Animations beyond the hover effect (no scroll-triggered, no carousel, etc.).
- New feature components (no NavBar with nav links, no profile menu, no avatar).
- A custom 401/403 page — only the global error and not-found.
- Coverage thresholds in Vitest.
- Storybook / visual regression tools.
- Documentation site / changelog updates.

## Specific Threads

### 1. Font: Oleo Script Swash Caps
- `next/font/google` import. CSS variable `--font-oleo` (or whatever the spec-agent picks).
- Tailwind `fontFamily.sans` updated to read the new variable first. **Caveat**: Oleo Script Swash Caps is a script display font — it's beautiful for headings but very hard to read at body sizes, and the lowercase glyphs are highly stylised. Surface in Open Questions: use it globally as the user requested, OR pair it with a sans-serif body font (Jost or system) and use Oleo only for headings.
- Default assumption: globally as requested. If the rendered result is unreadable, the user can override during the spec-pause.

### 2. Retro-futuristic palette
- 5 tokens, same names as today. Architect / spec-agent picks specific hexes. Suggested *direction* (not locked):
  - `primary`: a warm teal or muted neon-cyan (think "70s lounge").
  - `secondary`: dusty orange / muted coral.
  - `neutral`: warm off-white surface + warm browns for body text.
  - `danger`: muted vermilion / brick.
  - `success`: olive / sage with warm undertones.
- Step counts unchanged. The architect locks specific hexes under Assumptions; the user can override any during the spec-pause.

### 3. Surface
- Today: `bg-neutral-50` (`#f7f5f2` from `06-private-routes-and-styling`). Likely keep, but the new neutral-50 hex may be warmer (cream / off-white). Architect picks. Must stay light and neutral.

### 4. Card removal from Home + Dashboard
- Home: heading + paragraph centred with generous vertical spacing (e.g. `space-y-6` or `space-y-8`). Wrap in a centred `<main>` with comfortable padding. No `<Card>`, no border, no rounded corners.
- Dashboard: same.
- Sign-in / Sign-up: keep `<Card>` wrapping the form. The card provides visual containment for input fields and the danger-coloured error messages — removing it makes form layouts feel ungrounded. Architect can override if the new design demands it.

### 5. Material icons
- Install `react-icons` (or the architect's chosen library).
- Use `MdArrowBack`, `MdLogin`, `MdPersonAdd`, `MdLogout` (Material Design Icons subset). Architect can swap specific icons but stays within the Material set.
- Icons rendered as React components. Inline SVG, no separate CSS.

### 6. `Button` icon support
- New props on `ButtonProps`:
  ```ts
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  ```
- Render layout:
  - If `leftIcon`: render it before `children` with a small horizontal gap (`gap-2` or `ml-2` style).
  - If `rightIcon`: render it after `children` with the same gap.
  - If `children` is empty (icon-only case): the icon stands alone.
- `aria-label` becomes mandatory when there's no `children` (icon-only). The component does not enforce this at the type level (too strict); the spec/architect documents it and the test suite asserts it for Back button.
- When `loading` is true: the existing `"Loading..."` swap continues — children are replaced with the text. Icons hide during loading. Architect decides exact behaviour; default: icons hidden, label = `"Loading..."`.

### 7. Hover effect
- Architect picks one approach. Two options:
  - **Darken** the background by one step (`hover:bg-primary-700` already exists). Keep as-is, no change.
  - **Slight underline** under the children text. Subtle. Doesn't fight the retro vibe.
- Lean toward the darken approach since it's already in place — just make sure the new hex picks differ enough between `-500` and `-700` to be visible.
- Disabled and loading states do not show hover effects (already handled by `disabled:` variants).

### 8. Error + Not-Found pages

**Architecture call (critical)**: To suppress `MainHeader` on error/not-found pages, restructure the app into a route group:

```
src/app/
  layout.tsx              ← root layout, NO MainHeader
  error.tsx               ← error boundary, NO MainHeader
  not-found.tsx           ← 404 page, NO MainHeader
  (main)/
    layout.tsx            ← group layout, MOUNTS MainHeader
    page.tsx              ← home (moved from src/app/page.tsx)
    (auth)/
      sign-in/page.tsx    ← unchanged content
      sign-up/page.tsx
    (private)/
      dashboard/page.tsx
```

The `(main)` group is what wraps all normal pages. Root layout becomes minimal (just html/body shell). `error.tsx` and `not-found.tsx` at root sit alongside the body shell — they get the font + body classes but NOT the header.

This is the canonical Next.js pattern for "render some pages with a layout and others without". Architect confirms.

**Pages**:
- `error.tsx`: `'use client'`. Receives `{ error, reset }` props from Next.js. Renders heading "Something went wrong", short paragraph (architect picks the exact copy), and a "Go home" `<Link href="/">` styled like a primary `Button`. Optionally also a "Try again" button that calls `reset()` — spec-agent's call.
- `not-found.tsx`: server component (default). No props. Renders heading "Not found" (or similar), short paragraph, "Go home" Link styled like a primary Button.
- "Go home" button text is identical in both pages, always points to `/`. Middleware bounces signed-in users to `/dashboard` automatically — the button text doesn't need to vary by auth state.

### 9. Component update list

All updates use the new palette + font. No API changes except `Button`.

- `Button`: new `leftIcon` / `rightIcon` props. Variant classes adjusted if the new palette needs different focus-ring / hover colours.
- `Input`: variant classes adjusted for the new palette (focus-ring, border, danger error border).
- `Card`: surface and border colour adjusted to the new palette (`bg-white` may become a new colour; border becomes the new `neutral-200`).
- `MainHeader` / `MainHeaderNav`: sticky-header background and border adjusted; auth buttons render with their new left icons.
- `SignInForm`, `SignUpForm`: form sits inside the existing `<Card>` (kept), labels / inputs / submit button styled per the new palette.

## Tests Required

Per CLAUDE.md → Testing Rules → Categories that require tests:

- **`Button` is a UI primitive with a new public API** (`leftIcon` / `rightIcon` props). The existing `Button.test.tsx` MUST be extended with cases that exercise these props.
- All other existing tests should continue to pass without modification.
- New `error.tsx` and `not-found.tsx` are simple markup; the test-agent should not add tests for them (no state machine, no business logic).

Minimum new Button test cases:
- Renders `leftIcon` before `children`.
- Renders `rightIcon` after `children`.
- Renders an icon-only button (no children, just `leftIcon`).
- When `loading` is true, icons are hidden and the label becomes `"Loading..."`.

Test path: extend `__tests__/components/ui/Button.test.tsx` with these new cases. Existing cases keep passing.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

- `src/app/layout.tsx` — minimal root layout (no header).
- `src/app/error.tsx` (new) — error page.
- `src/app/not-found.tsx` (new) — 404 page.
- `src/app/(main)/layout.tsx` (new) — group layout mounting `MainHeader`.
- Move `src/app/page.tsx` → `src/app/(main)/page.tsx`.
- Move `src/app/(auth)/...` → `src/app/(main)/(auth)/...`.
- Move `src/app/(private)/...` → `src/app/(main)/(private)/...`.
- `src/app/(main)/page.tsx` — drop the `<Card>` wrapper; open layout.
- `src/app/(main)/(private)/dashboard/page.tsx` — drop the `<Card>` wrapper; open layout.
- `src/components/ui/Button.tsx` — new `leftIcon` / `rightIcon` props + render logic.
- `src/components/ui/buttonClass.ts` — variant classes adjusted for the new palette (hover and focus-ring colours match the new hexes).
- `src/components/ui/Input.tsx` — focus-ring / border classes adjusted.
- `src/components/ui/Card.tsx` — surface and border classes adjusted to the new palette.
- `src/components/features/MainHeader.tsx` — surface/border classes adjusted.
- `src/components/features/MainHeaderNav.tsx` — Back becomes icon-only; Sign In/Up/Out get left icons.
- `tailwind.config.ts` — new palette + new font-family entry.
- `package.json` — `react-icons` dependency added.
- `__tests__/components/ui/Button.test.tsx` — new test cases for icon props.
- `src/app/(main)/(auth)/sign-in/page.tsx`, `src/app/(main)/(auth)/sign-up/page.tsx` — unchanged content; only path moves.

Important: `src/middleware.ts` matcher patterns work against URL paths, NOT folder structure. Route groups (parentheses) are erased from URLs, so the matcher stays the same (`['/dashboard/:path*', '/', '/sign-in', '/sign-up']`). Verify no middleware changes are needed.

## Done Criteria
- Loading any page shows Oleo Script Swash Caps (or the chosen pairing — see Open Questions) as the active font family.
- All 5 palette tokens emit retro-futuristic hexes — no Tailwind defaults, no holdover values from `06-private-routes-and-styling`'s pastel set.
- Home and Dashboard pages render without a `<Card>` wrapper — heading + paragraph centred with generous vertical rhythm.
- Sign-in / Sign-up pages still render their forms inside `<Card>` (unless the architect decides otherwise).
- The Back button in `MainHeader` is icon-only with an accessible `aria-label`.
- Sign In, Sign Up, Sign Out buttons each render a Material icon to the left of their label.
- Hover state on buttons is subtle and visible (darken-on-hover or underline — architect picks).
- `/some/missing/route` renders the new not-found page WITHOUT `MainHeader`.
- A thrown error from a server component or client component renders `error.tsx` WITHOUT `MainHeader`.
- Both error and not-found pages have a "Go home" button linking to `/`. Signed-in users clicking it land on `/dashboard` via middleware redirect; signed-out users land on `/`. Button text is identical in both cases.
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0.
- `__tests__/components/ui/Button.test.tsx` includes the new icon-prop cases. Existing 87 tests still pass; suite size grows by the count of new Button cases (~4 new = 91 total).
- `mcp__ide__getDiagnostics` clean.

## What This Task Does NOT Include
- Dark mode / theming.
- Animations beyond the button hover effect.
- New components beyond `error.tsx` and `not-found.tsx`.
- Custom 401/403/500 pages — only `error.tsx` (catches everything) and `not-found.tsx`.
- Authorization changes.
- Database changes.
- Test infrastructure changes.
- Icon library beyond Material icons.

## Notes for the Spec-Agent

- **The font choice is the single biggest UX risk.** Oleo Script Swash Caps applied globally to body text and input fields will be hard to read. The spec-agent should:
  1. Flag this in Assumptions with the default ("use it globally").
  2. Surface as an Open Question: "Pair Oleo with a sans-serif body font (e.g. Jost for body, Oleo for headings only) — does the user want this?" If the user accepts the pairing, the spec swaps `font-sans` to keep the readable body font and adds a `font-display` (or similar) utility class that maps to Oleo, used on `<h1>` / `<h2>` elements only.
- **The route-group restructure is load-bearing for error/not-found suppression.** The current structure has `(auth)` and `(private)` at the top level of `src/app/`. To wrap "normal" pages in a layout that has the header while keeping `error.tsx`/`not-found.tsx` headerless, both `(auth)` and `(private)` must move inside a new `(main)` group. The architect produces the precise tree.
- **Middleware matcher patterns are URL-based.** Route group folder names (parentheses) don't appear in URLs. The matcher `['/dashboard/:path*', '/', '/sign-in', '/sign-up']` continues to work after moving the route files. **Verify this assumption holds** with a runtime smoke for at least one route or by reading the build output's route table.
- **`react-icons` is the recommended Material-icon library** for size and DX. Each icon is its own export — tree-shakable. Per-icon imports look like `import { MdArrowBack } from 'react-icons/md'`.
- **Hover effect**: the existing `hover:bg-primary-700` already works for the darken approach. With the new palette, ensure the difference between `-500` and `-700` is visible. If the spec-agent picks "underline" instead, applies to text-link-styled actions only — not square buttons.
- **The "Go home" middleware redirect chain**: button → `<Link href="/">` → GET `/` → middleware sees `req.auth` → if signed-in, redirects to `/dashboard`. This works because the middleware matcher covers `/`. The button text doesn't need to vary by auth state.
- **`error.tsx` is a client component** (Next.js requirement — it's an error boundary). Importing `auth()` from `'use client'` won't work, but the middleware-redirect approach above sidesteps the need to call `auth()`.
- **Tests for error.tsx and not-found.tsx are not required** by CLAUDE.md's Testing Rules — they're simple markup, no state machine, no business logic. The test-agent should not invent tests for them.
- **Button's `loading` state with icons**: when `loading={true}`, the existing logic replaces `children` with `"Loading..."`. The new behaviour should also hide `leftIcon` and `rightIcon` during loading so the button doesn't look cluttered. Spec-agent confirms.
- **Existing 87 tests are the regression guardrail.** No test file modification is required other than extending `Button.test.tsx` with the new icon-prop cases. The class-name assertions in the existing tests reference token names (`bg-primary-500`, etc.) which stay the same after the palette swap — only the resolved hexes change.
- **CLAUDE.md and reviewer-agent.md are NOT updated** by this task. The testing-policy and feature-component rules already in place are sufficient.
- **Mobile responsive behaviour**: the open layout on Home and Dashboard should still read well at ~375 px. Generous spacing on desktop should compress sensibly on mobile (`space-y-6 md:space-y-8` style).
