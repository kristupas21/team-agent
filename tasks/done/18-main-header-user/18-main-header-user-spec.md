# Spec: Main Header Polish — User Info Block, Mobile-Compact Buttons, Form Layout Tweaks

## Summary
Three header-level changes and one form-layout sweep. **(1) Back button** in `MainHeaderNav` becomes a `ghost`-variant button with a "Back" label on `md+` and icon-only on mobile, sharpening the visual treatment to match the rest of the header. **(2) Sign Out button** collapses to icon-only on mobile (label `hidden md:inline`), preserving accessible-name via `aria-label="Sign out"`. **(3) User-info block** lights up on the right side of the header — just before Sign Out — showing a two-line caption ("Signed in as:" / username) styled compactly so the header height doesn't grow more than a couple of pixels. Renders only when `signedIn === true` AND `userName` is truthy. **(4) Form pages** (sign-in, sign-up, task new, task edit) widen to `md:max-w-2xl` (42rem) and switch from vertical-centred to top-anchored with `pt-20` so they don't look adrift on tall screens.

## Assumptions

1. **Back button — ghost variant + responsive label**:
   ```tsx
   <Button
     type="button"
     variant="ghost"
     aria-label="Back"
     leftIcon={<MdArrowBack />}
     onClick={() => router.push(backTarget)}
   >
     <span className="hidden md:inline">Back</span>
   </Button>
   ```
   The `aria-label="Back"` is preserved (was already present). The `<span>` is `display: none` on mobile so the flex `gap-2` between `leftIcon` and the span collapses cleanly.

2. **Sign Out button — responsive label + a11y**:
   ```tsx
   <Button type="submit" variant="primary" aria-label="Sign out" leftIcon={<MdLogout />}>
     <span className="hidden md:inline">Sign Out</span>
   </Button>
   ```
   New: `aria-label="Sign out"` (sentence-case for screen-reader naturalness; the visible label stays title-cased). The hidden-on-mobile span follows the same pattern as the back button.

3. **`signOutAction` is unchanged** — the form-action contract still works because the submit Button retains `type="submit"` and the wrapping `<form action={signOutAction}>` stays.

4. **User-info block** sits inside the existing right-side `<div className="flex items-center gap-3">`, BEFORE the Sign Out form. Renders only when `signedIn === true && userName` (truthy check covers undefined / empty string).

5. **User-info block typography** (Open Question #1, #2 defaults):
   - Container: `<div className="flex flex-col items-end leading-tight">`.
   - Top line: `<span className="text-xs text-neutral-500">Signed in as:</span>` — matches the TaskCard date-row idiom (`text-sm` would also fit; `text-xs` keeps the header height steady).
   - Bottom line: `<span className="text-sm font-medium text-neutral-900">{userName}</span>` — same size as nav button text for visual symmetry.
   - `leading-tight` (line-height: 1.25) on the container compacts the two lines so combined height is ~30–34 px (matches an existing button row).
   - `items-end` right-aligns the column contents — looks clean adjacent to the right-edge Sign Out button.

6. **`MainHeaderNav` destructures `userName`** — currently the prop type declares it but the destructure doesn't pull it. Update destructure to `({ signedIn, userName }: MainHeaderNavProps)`. No prop-shape change.

7. **`MainHeader.tsx`** is unchanged. It already reads `session?.user?.name ?? undefined` and passes it through.

8. **Form Card width** (Open Question #3 default): `md:max-w-2xl` (42rem / 672 px). Replaces `md:max-w-lg` on the two task form pages; adds the override on sign-in / sign-up.

9. **Form vertical positioning** (Open Question #4 + #5 defaults):
   - `<main className="flex min-h-screen items-start justify-center px-4 pt-20">`.
   - `items-center` → `items-start` (top-anchored).
   - `p-4` → `px-4 pt-20` (explicit horizontal padding + 5rem top offset; vertical bottom-padding handled by `min-h-screen` and natural Card spacing).
   - Same exact `<main>` className across all four form pages (uniform layout rhythm).

10. **No truncation on long usernames** (Open Question #6 default). The column wraps or expands. Acceptable for first iteration.

11. **No changes to `Button.tsx`, `buttonClass.ts`, `Card.tsx`**. The ghost variant already exists from task `12-tasks-edit`. The Button's children + leftIcon + aria-label composition is already supported.

12. **No model / route / middleware / action / DAL change.**

13. **No new dependencies.**

14. **Test coverage delta** (in `__tests__/components/features/MainHeaderNav.test.tsx`):
    - Existing 15 cases stay. The 2 sign-in/sign-up cases that assert `screen.getByRole('button', { name: /back/i })` continue to pass — `aria-label="Back"` still provides the accessible name.
    - The 4 click-target cases (Back on `/sign-in`, `/sign-up`, `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/<id>`) continue to pass.
    - The Sign Out cases that assert `getByRole('button', { name: /sign out/i })` continue to pass because the rendered button retains the accessible name via the new `aria-label="Sign out"`.
    - 5 NEW cases:
      a. "Back button has the ghost variant class set" — assert the button has `bg-transparent` and `text-neutral-700` (the ghost variant tokens).
      b. "Back button's 'Back' text is wrapped in a span with `hidden md:inline`" — assert the span carries those classes.
      c. "Sign Out button's 'Sign Out' text is wrapped in a span with `hidden md:inline`" — same assertion shape.
      d. "renders user-info block ('Signed in as:' + username) when signedIn && userName" — assert both texts in the DOM.
      e. "does NOT render user-info when signedIn is false (even if userName is passed)" — assert no "Signed in as" text.
      Total: 15 → 20 cases.

15. **No test for the form-layout changes at the page level** — server-component pages are not unit-tested per project convention. The pure-CSS change is verified by `next build` exit 0 and visual check during `npm run dev`.

16. **Suite total expected**: ≥ 170 / 23 (was 165 / 23; +5 cases in MainHeaderNav).

17. **`'use client'` directive count unchanged at 10.** `MainHeaderNav` already has it; the new user-info block adds no hooks or handlers.

## Open Questions

(All resolved with leans documented in the assumptions. Architect and builder MUST NOT read this section; defaults above are binding.)

1. User-info top-line font size — `text-xs` vs `text-sm`? — Assumed: `text-xs`. Affects: header-height growth.
2. User-info bottom-line font size — `text-sm font-medium` vs `text-base`? — Assumed: `text-sm font-medium`. Affects: header-row visual symmetry.
3. Form Card width — `md:max-w-xl` / `md:max-w-2xl` / `md:max-w-3xl`? — Assumed: `md:max-w-2xl`. Affects: form breathing room on desktop.
4. Form top offset — `pt-16` / `pt-20` / `pt-24`? — Assumed: `pt-20`. Affects: vertical visual rhythm.
5. `p-4` interaction — drop entirely + use `px-4 pt-20`, or layer `p-4 pt-20`? — Assumed: `px-4 pt-20`. Affects: padding clarity.
6. Long-username overflow — wrap, truncate, ellipsis? — Assumed: wrap (no truncation). Affects: header visual on edge cases.
7. Sign-out `aria-label` casing — `"Sign out"` vs `"Sign Out"`? — Assumed: `"Sign out"` (sentence-case for screen readers). Affects: a11y phrasing only.
8. Back button mobile size — extra padding tweak? — Assumed: no, existing Button padding works. Affects: nothing if no change.

## Routes / Pages

| Path | Change |
|---|---|
| `(main)/layout.tsx` | Unchanged. Already wires `<MainHeader>` with session-derived `userName`. |
| `/sign-in`, `/sign-up` | `<main>` className updated; `<Card>` gains `md:max-w-2xl`. |
| `/dashboard/tasks/new`, `/dashboard/tasks/[id]` | `<main>` className updated; `<Card>` className changes from `md:max-w-lg` to `md:max-w-2xl`. |
| `/`, `/dashboard`, `/dashboard/tasks` | Unchanged (no form on these). |

## Data

No data layer change. No new API endpoints, schemas, server actions, or types.

## Components

| Name | Change |
|---|---|
| `MainHeaderNav.tsx` | Destructure `userName`. Back button → ghost + responsive label. Sign Out → responsive label + aria-label. New conditional user-info block before Sign Out. |
| `MainHeader.tsx` | Unchanged. |
| Form pages (4) | `<main>` className update; Card width override update. |

## User Interactions

### Happy path — signed-in user reads their name
1. User signs in. Browser lands on `/dashboard`.
2. Header renders: left has no back button (`/dashboard` is the root of the back-button tree); right shows the user-info block ("Signed in as:" / "alice") then the Sign Out button (with label on md+, icon-only on mobile).
3. User clicks Sign Out → existing flow.

### Happy path — small viewport
1. Header at narrow width: back button shows icon only (label hidden); Sign Out shows icon only; user-info block stays visible (both lines, compact).
2. The header remains a single row; total height is the height of the user-info block (~30–34 px) plus header padding (~8–16 px) — essentially the same as the previous header.

### Form page on desktop
1. User opens `/sign-in` on a tall desktop screen.
2. Form Card is wider (`md:max-w-2xl`, ~42rem), top-anchored with a 5rem (pt-20) offset.
3. Form does not feel adrift in the centre of tall screens.

### Failure path — unauthenticated header on private route
- Middleware redirects before render — no header-level user-info concern.

### Failure path — `userName` missing despite session
- The user-info block is gated on a truthy `userName`. If absent (e.g. session bug), no block renders; Sign Out still shows.

## States

### `MainHeaderNav` — signed-in
- Back button (if path matches the allow-list): visible, ghost variant, label on md+.
- User-info block (if userName truthy): visible, two lines.
- Sign Out button: visible, label on md+, icon on mobile.

### `MainHeaderNav` — signed-out
- Back button: shown on `/sign-in` and `/sign-up`, ghost variant, responsive label.
- No user-info block.
- Sign-in / Sign-up Links / disabled buttons — unchanged.

### Form pages
- Same `<main className="flex min-h-screen items-start justify-center px-4 pt-20">` across all four.
- `<Card className="md:max-w-2xl">` consistent.

## Acceptance Criteria

### Back button
1. Back button uses `variant="ghost"`.
2. Back button has `aria-label="Back"`.
3. Back button has `leftIcon={<MdArrowBack />}`.
4. Back button's "Back" text is wrapped in a `<span className="hidden md:inline">` (so mobile sees icon only).
5. Click behaviour is unchanged — `router.push(backTarget)` where `backTarget = pathname.replace(/\/[^/]+$/, '') || '/'`.

### Sign Out button
6. Sign Out button has `aria-label="Sign out"`.
7. Sign Out button's "Sign Out" text is wrapped in `<span className="hidden md:inline">`.
8. The button is still inside `<form action={signOutAction}>` with `type="submit"`.

### User-info block
9. Block renders ONLY when `signedIn === true && userName` (truthy).
10. Block sits in the right region, BEFORE the Sign Out form (sibling immediately preceding).
11. Top line is the literal text `"Signed in as:"`.
12. Bottom line is the `userName` value.
13. Top line classes include `text-xs` and `text-neutral-500`.
14. Bottom line classes include `text-sm`, `font-medium`, `text-neutral-900`.
15. Container has `leading-tight` so the two lines pack tight; combined height stays close to one button-row.

### Form pages — width
16. `/sign-in/page.tsx`'s Card has `md:max-w-2xl`.
17. `/sign-up/page.tsx`'s Card has `md:max-w-2xl`.
18. `/dashboard/tasks/new/page.tsx`'s Card has `md:max-w-2xl` (replacing `md:max-w-lg`).
19. `/dashboard/tasks/[id]/page.tsx`'s Card has `md:max-w-2xl` (replacing `md:max-w-lg`).

### Form pages — vertical positioning
20. All four form pages use `<main className="flex min-h-screen items-start justify-center px-4 pt-20">` (exact string).
21. None of the four form pages contains `items-center` on their `<main>` after the change.

### Build & quality
22. `npx tsc --noEmit` exits 0.
23. `npx next lint` reports no errors / warnings.
24. `npm run test:run` exits 0 with suite total ≥ 170 / 23.
25. `npx next build` exits 0; route table unchanged in shape from `17-features-restructure`.

### Forbidden-pattern compliance
26. Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` empty-prop types.

### Code layout
27. Visual rhythm honoured.
