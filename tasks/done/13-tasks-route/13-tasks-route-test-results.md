# Test Results: Tasks Route Refactor + Dashboard Widgets + TaskCard Polish

## Summary
**155 tests passing across 22 files** (was 143 / 21). 12 net new tests:
- +4 in `components/features/DashboardWidgetCard.test.tsx` (new file)
- +3 in `components/features/TaskCard.test.tsx` (date row, absolute positioning, dark-hover override)
- +3 in `components/features/MainHeaderNav.test.tsx` (back on `/tasks`, back on `/tasks/new` and `/tasks/<id>`, click calls `router.push('/dashboard')`)
- +2 in `middleware.test.ts` (bare `/tasks` signed-out + signed-in)
- The 2 server-action redirect-target assertions in `createTask.test.ts` and `updateTask.test.ts` were in-place updates (`/dashboard` → `/tasks`), not new tests.

0 failing.

```
$ npm run test:run
 ✓ __tests__/components/features/DashboardWidgetCard.test.tsx     (4 tests)  ← new
 ✓ __tests__/components/features/TaskCard.test.tsx               (10 tests)  ← was 7, +3
 ✓ __tests__/components/features/MainHeaderNav.test.tsx          (12 tests)  ← was 9, +3
 ✓ __tests__/middleware.test.ts                                  (16 tests)  ← was 14, +2
 ... and all 18 other test files unchanged ...

 Test Files  22 passed (22)
      Tests  155 passed (155)
```

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — `/dashboard` renders `<h1>Dashboard</h1>` + 2-col grid + Tasks widget | Static-file check + `next build` route-table + `DashboardWidgetCard.test.tsx` (renders the widget) |
| 2 — `/tasks` renders `<h1>Your tasks</h1>` + TasksList | Static-file check + `next build` route-table (44 kB / 157 kB First Load matches the prior `/dashboard` payload exactly) |
| 3 — Tasks widget click → `/tasks` | `DashboardWidgetCard.test.tsx` test 2 (Link `href` assertion) |
| 4 — Unauth `/dashboard` → `/` | `middleware.test.ts` (existing signed-out `/dashboard` cases — no change needed) |
| 5 — Unauth `/tasks` → `/` | `middleware.test.ts` (new "redirects bare /tasks to /" + existing `/tasks/new`, `/tasks/abc123` cases) |
| 6 — Sign-in → `/dashboard` | `actions/signIn.test.ts` (`redirectTo: '/dashboard'` assertion — unchanged) |
| 7 — Sign-up → `/dashboard` | `actions/signUp.test.ts` (`redirectTo: '/dashboard'` assertion — unchanged) |
| 8 — `createTask` → `redirect('/tasks')` | `actions/createTask.test.ts` (updated assertion) |
| 9 — `updateTask` → `redirect('/tasks')` | `actions/updateTask.test.ts` (updated assertion) |
| 10 — NEXT_REDIRECT propagates from both | Existing `rejects.toThrow(/NEXT_REDIRECT/)` assertions in both action tests |
| 11 — Back button visible on `/tasks` | `MainHeaderNav.test.tsx` (new) |
| 12 — Back button visible on `/tasks/new` and `/tasks/<id>` | `MainHeaderNav.test.tsx` (new combined case) |
| 13 — Back button hidden on `/dashboard` | `MainHeaderNav.test.tsx` (existing 2 cases for `/dashboard` and `/dashboard/sub`) |
| 14 — Back button hidden on `/`, `/sign-in`, `/sign-up` | `MainHeaderNav.test.tsx` (3 existing + 1 new "does NOT render Back on /sign-in" + 2 reworked sign-in/sign-up assertions) |
| 15 — Click Back → `router.push('/dashboard')` | `MainHeaderNav.test.tsx` (new — asserts both call count and argument) |
| 16 — Delete button absolutely positioned | `TaskCard.test.tsx` (new — asserts `absolute`, `top-2`, `right-2`) |
| 17 — "Updated <date>" line rendered | `TaskCard.test.tsx` (new — asserts text matches `/^Updated \w+ \d{1,2}, \d{4}$/`) |
| 18 — Date line classes `text-sm text-neutral-500 …` | `TaskCard.test.tsx` (new — `toHaveClass('text-sm', 'text-neutral-500')`) |
| 19 — Delete button has `group-hover:hover:bg-neutral-700` | `TaskCard.test.tsx` (new — `toHaveClass('group-hover:text-neutral-50', 'group-hover:hover:bg-neutral-700')`) |
| 20 — `stopPropagation` before `onDelete` | `TaskCard.test.tsx` (existing "does NOT navigate when Delete clicked") |
| 21 — Widget renders as Link with href | `DashboardWidgetCard.test.tsx` test 2 |
| 22 — Widget: no description, no date, no Delete | `DashboardWidgetCard.test.tsx` test 4 |
| 23 — Widget: `group-hover:text-neutral-50`, `group`, `hover:bg-neutral-900` | `DashboardWidgetCard.test.tsx` test 3 |
| 24 — `tsc --noEmit` exits 0 | Verified |
| 25 — `next lint` no errors | Verified |
| 26 — `test:run` ≥ 152 / 22 | **155 / 22** (exceeds target by 3) |
| 27 — `next build` exits 0; route table shows `/dashboard` + `/tasks` | Verified — both present, plus `/tasks/[id]` and `/tasks/new` |
| 28 — Forbidden-pattern compliance | Verified (`'use client'` count unchanged at 10; zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`) |
| 29 — Visual rhythm | Honoured in all touched files |

All 29 ACs met.

## Coverage of Mandatory Test Categories

| Category | Touched by this task | Covered by |
|---|---|---|
| **Server actions** (createTaskAction, updateTaskAction redirect deltas) | Yes | `createTask.test.ts`, `updateTask.test.ts` (in-place assertion updates) |
| **Validation schemas** | No | n/a |
| **Middleware** | Yes (new bare-`/tasks` path-shape coverage) | `middleware.test.ts` (+2 cases) |
| **Predicates wrapping framework errors** | No | n/a |
| **Client form / state-machine components** | Yes (MainHeaderNav, TaskCard) | `MainHeaderNav.test.tsx` (+3), `TaskCard.test.tsx` (+3) |
| **UI primitive / server component with new API surface** (`DashboardWidgetCard`) | Yes | `DashboardWidgetCard.test.tsx` (4 cases) |
| **Structural constraints** | No | n/a |

The mandatory category gate passes.

## Coverage Gaps

Per CLAUDE.md project convention, server-component pages (`/dashboard/page.tsx`, `/tasks/page.tsx`, `/tasks/new/page.tsx`, `/tasks/[id]/page.tsx`) are NOT directly unit-tested — they are async and call `auth()` server-side. Their behaviour is verified indirectly:

1. `/dashboard` page — the widget grid composition is verified by `DashboardWidgetCard.test.tsx` covering the widget itself + `next build`'s 164 B / 106 kB First Load (lighter than the old `/dashboard` because tasks-list code moved off).
2. `/tasks` page — verified by `next build` exit 0 + the route table showing `/tasks` at 44 kB First Load (matches what `/dashboard` used to be when it rendered tasks).
3. The `auth()` guard inside both pages is the same pattern used elsewhere; the redirect-target test in `signIn`/`signUp` action tests assures the contract is consistent.

These gaps are documented per project convention and do not represent missed test categories.

## Failing Tests
None.

## Bugs Found

None during this round. One implementation-level observation that the reviewer may want to inspect:

- **The Tailwind stacked variant `group-hover:hover:bg-neutral-700`** on the Delete button — Tailwind v3 supports nested variant chaining. The class is present in the source and is matched by RTL via `toHaveClass`. The actual hover effect, however, only fires when JSDOM-rendered tests can simulate two simultaneous hovers (parent group + child button), which JSDOM does not. Visual verification is left to `npm run dev`. The class presence proves the contract is wired.

## Recommendation for Future Tests

- **Widget grid breakpoint behaviour** — when a second widget arrives, an RTL test asserting the grid wraps to 2 columns at `md:` would be valuable. Today, with a single widget, there's nothing to assert about column count beyond static class presence on the grid container.
- **`/tasks` page integration** — when a "view task" mode appears (separate from edit), an RTL test exercising navigation from the list to the detail page would help close the page-level coverage gap.
- **Back-button keyboard interaction** — the existing test asserts `onClick` behaviour. A keyboard-focus + Enter-key case would round out a11y coverage on the back button.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 155 across 22 files.
