# Review: Main Header Polish

## STATUS: PASS

## Acceptance Criteria Check

### Back button
- [x] 1 — `variant="ghost"`. Confirmed at `MainHeaderNav.tsx:35`.
- [x] 2 — `aria-label="Back"`. Confirmed (`MainHeaderNav.tsx:36`).
- [x] 3 — `leftIcon={<MdArrowBack />}`. Confirmed.
- [x] 4 — `<span className="hidden md:inline">Back</span>` as child. Confirmed + asserted via new test case 2.
- [x] 5 — Click → `router.push(backTarget)` unchanged. Existing click-target tests still pass for `/sign-in`, `/sign-up`, `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/<id>`.

### Sign Out button
- [x] 6 — `aria-label="Sign out"` added. Confirmed.
- [x] 7 — Sign Out text wrapped in `<span className="hidden md:inline">`. Confirmed + asserted via new test case 3.
- [x] 8 — Button still inside `<form action={signOutAction}>` with `type="submit"`. Confirmed.

### User-info block
- [x] 9 — Renders only when `signedIn && userName`. Confirmed; tests 4 and 5 cover positive + negative paths.
- [x] 10 — Sits before the Sign Out form (sibling order). Confirmed at `MainHeaderNav.tsx:46-60`.
- [x] 11 — Top line literal "Signed in as:". Confirmed.
- [x] 12 — Bottom line = `{userName}` value. Confirmed.
- [x] 13 — Top line classes: `text-xs text-neutral-500`. Confirmed.
- [x] 14 — Bottom line classes: `text-sm font-medium text-neutral-900`. Confirmed.
- [x] 15 — Container `leading-tight`. Confirmed.

### Form pages — width
- [x] 16–19 — All four pages' `<Card>` carry `className="md:max-w-2xl"`. Confirmed by static-file reads.

### Form pages — vertical positioning
- [x] 20 — All four `<main>` carry the exact string `flex min-h-screen items-start justify-center px-4 pt-20`. Confirmed by static-file reads.
- [x] 21 — No `items-center` remains in any of the four. Confirmed.

### Build & quality
- [x] 22 — `tsc --noEmit` exit 0. Verified.
- [x] 23 — `next lint` no warnings. Verified.
- [x] 24 — `test:run` ≥ 170 / 23. **170 / 23** exact hit. Verified.
- [x] 25 — `next build` exit 0; route shape unchanged. Verified.

### Forbidden-pattern compliance
- [x] 26 — Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count unchanged at 10.

### Code layout
- [x] 27 — Visual rhythm honoured.

All 27 ACs met.

## Plan Compliance

- All planned files exist at the planned paths. The 9-step build order held verbatim.
- Intermediate `tsc --noEmit` after step 5 was clean.
- One small-but-correct restructuring inside the signed-in branch — single `<form>` became fragment with `{userName && <user-info>}` + `<form>` siblings. Documented in build summary.
- No primitives modified (Button, buttonClass, Card). Ghost variant from `12-tasks-edit` reused.

## Code Quality

- **Destructure update** — `userName` now actually flows from props to render. Previously typed but ignored; trivial fix.
- **Responsive label pattern** — `<span className="hidden md:inline">…</span>` inside Button children is the cleanest way to keep one component file handle both states. The flex `gap-2` collapses correctly when the span is `display: none`.
- **`aria-label` discipline** — both responsive buttons (Back + Sign Out) carry explicit `aria-label` so the accessible name is preserved on mobile when the visible text vanishes. Sentence-case `"Sign out"` for SR naturalness; visible label stays title-cased.
- **User-info typography** — `text-xs` over `text-sm font-medium` with `leading-tight` packs the two lines to ~30 px — same row height as a button. Header height stays stable.
- **`items-end` on the user-info container** — right-aligns the column adjacent to the right-edge buttons. Visually clean.
- **Form layout uniformity** — all four pages now share the exact same `<main>` className string. If a future task adjusts the offset or width, one search-and-replace catches all four.
- **`mcp__ide__getDiagnostics`** — no source / test diagnostics; only markdown noise on the spec.

## Blockers
None.

## Notes (non-blocking)

1. **The user-info block's mobile width** — on very narrow viewports, the two-line column may push the Sign Out button uncomfortably close to the right edge. Visual verification recommended via `npm run dev` at iPhone-SE width. If a tweak is needed, a future iteration could clip the username at small breakpoints with a `truncate max-w-[...]`.
2. **`pt-20` on the form pages** — 5rem (80 px) is a moderate offset. If the brief's "tall screens make form not look good" intent calls for more, the value can be raised. No regression test pins to the exact `pt-20` value beyond AC 20's exact-string assertion.
3. **Sign-in / sign-up Card max-width** previously inherited the Card primitive's default `md:max-w-md` (28rem). Bumping to `md:max-w-2xl` (42rem) is a +14rem (+~50%) jump on desktop — a noticeable visual change for new visitors. Same logic for task forms (32rem → 42rem).
4. **`MainHeaderNav` test count grew from 12 → 15 → 20** across the past few tasks (`14-minor-rework` added 3, `18-main-header-user` adds 5). The file is now the largest test file at 20 cases. Still under 200 lines; comfortable to scan.
5. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- **Modified (6)**: `src/components/features/MainHeaderNav.tsx`, `src/app/(main)/(auth)/sign-in/page.tsx`, `src/app/(main)/(auth)/sign-up/page.tsx`, `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`, `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`, `__tests__/components/features/MainHeaderNav.test.tsx`.

No files require changes. STATUS: PASS.
