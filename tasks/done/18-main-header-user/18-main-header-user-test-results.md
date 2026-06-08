# Test Results: Main Header Polish

## Summary
**170 / 23 passing** (was 165 / 23). +5 new cases in `MainHeaderNav.test.tsx`. 0 failing.

```
$ npm run test:run
 ✓ __tests__/components/features/MainHeaderNav.test.tsx  (20 tests)  ← was 15, +5
 ... and all 22 other test files unchanged ...

 Test Files  23 passed (23)
      Tests  170 passed (170)
```

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — Back button `variant="ghost"` | `MainHeaderNav.test.tsx` new case 1 (`bg-transparent` + `text-neutral-700`) |
| 2 — Back button `aria-label="Back"` | Existing `getByRole('button', { name: /back/i })` queries continue to pass |
| 3 — Back button `leftIcon={<MdArrowBack />}` | Static-file check |
| 4 — Back button text in `<span className="hidden md:inline">` | `MainHeaderNav.test.tsx` new case 2 |
| 5 — Click `router.push(backTarget)` unchanged | Existing 3 click cases still pass |
| 6 — Sign Out `aria-label="Sign out"` | Existing `getByRole('button', { name: /sign out/i })` queries continue passing; rendered DOM verified via test 4 lookup |
| 7 — Sign Out text wrapped in `<span hidden md:inline>` | `MainHeaderNav.test.tsx` new case 3 |
| 8 — Sign Out button inside `<form action={signOutAction}>` | Static-file check |
| 9 — User-info gated on `signedIn && userName` | `MainHeaderNav.test.tsx` new cases 4 + 5 |
| 10 — User-info sits before Sign Out | Static-file check (sibling order in JSX) |
| 11 — Top line "Signed in as:" | `MainHeaderNav.test.tsx` new case 4 |
| 12 — Bottom line = `userName` | `MainHeaderNav.test.tsx` new case 4 |
| 13 — Top line `text-xs text-neutral-500` | Static-file check |
| 14 — Bottom line `text-sm font-medium text-neutral-900` | Static-file check |
| 15 — Container `leading-tight` | Static-file check |
| 16 — sign-in Card `md:max-w-2xl` | Static-file check |
| 17 — sign-up Card `md:max-w-2xl` | Static-file check |
| 18 — tasks/new Card `md:max-w-2xl` | Static-file check |
| 19 — tasks/[id] Card `md:max-w-2xl` | Static-file check |
| 20 — All four `<main>` use `flex min-h-screen items-start justify-center px-4 pt-20` | Static-file check |
| 21 — `items-center` removed from all four | Static-file check |
| 22 — `tsc --noEmit` exit 0 | Verified |
| 23 — `next lint` no warnings | Verified |
| 24 — `test:run` ≥ 170 / 23 | **170 / 23** (exact hit) |
| 25 — `next build` exit 0 | Verified |
| 26 — Forbidden-pattern compliance | Verified — `'use client'` count unchanged at 10; zero `: any`, bare `<a>`, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` |
| 27 — Visual rhythm | Honoured |

All 27 ACs met.

## Coverage of Mandatory Test Categories

| Category | Touched | Covered by |
|---|---|---|
| **Client form / state-machine component** (`MainHeaderNav` rule + click target + new user-info block + responsive labels) | Yes | `MainHeaderNav.test.tsx` (+5) |
| Server actions | No | n/a |
| Validation schemas | No | n/a |
| Middleware | No | n/a |
| Predicates | No | n/a |
| UI primitive new API | No | n/a |
| Structural constraints | No | n/a |

The mandatory category gate passes.

## Coverage Gaps

Per project convention, server-component pages (`/sign-in`, `/sign-up`, `/dashboard/tasks/new`, `/dashboard/tasks/[id]`) are not directly unit-tested. The form-layout changes are verified by:
1. Static-file check on each `<main>` className and `<Card>` width.
2. `next build` exit 0 confirms the JSX compiles and no className typo breaks the build.

Visual aspects that JSDOM can't verify:
- The mobile-vs-desktop visibility flip of the button text spans (CSS-driven; `hidden md:inline` class presence asserted instead).
- The user-info block's actual rendered height in the header (`leading-tight` class presence asserted instead).

Both are user-verifiable during `npm run dev`.

## Failing Tests
None.

## Bugs Found
None.

## Recommendation for Future Tests

- **Responsive class-presence pattern** — the `hidden md:inline` assertion strategy works well for testing responsive-only visual changes. When more responsive collapses land (e.g. nav menus, breadcrumbs), this pattern scales.
- **User-info content edge cases** — if username support widens (very long names, special characters, internationalized text), an RTL case asserting render-without-crash on a 200-char username would be cheap insurance.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 170 across 23 files.
