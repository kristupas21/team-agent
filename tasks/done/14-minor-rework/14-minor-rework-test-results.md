# Test Results: Minor Rework — Tasks Routes as Children of Dashboard + Route-Aware Back Button

## Summary
**158 tests passing across 22 files** (was 155 / 22). Net +3 tests:
- +3 in `MainHeaderNav.test.tsx` (12 → 15): 2 new signed-out click cases (`/sign-in` → `/`, `/sign-up` → `/`) plus 2 new signed-in click cases (`/dashboard/tasks/new` → `/dashboard/tasks`, `/dashboard/tasks/<id>` → `/dashboard/tasks`), minus 1 deleted "Back hidden on /sign-in" case.
- Middleware test count stays at 16: 3 `/tasks*` signed-out cases relabeled to `/dashboard/tasks*`, 3 `/tasks*` signed-in cases relabeled to `/dashboard/tasks*`.
- Other touched tests are in-place assertion edits (no count change).

0 failing.

```
$ npm run test:run
 ✓ __tests__/middleware.test.ts                              (16 tests)  ← path-shape relabel
 ✓ __tests__/actions/createTask.test.ts                       (4 tests)  ← assertion flip
 ✓ __tests__/actions/updateTask.test.ts                       (4 tests)  ← assertion flip
 ✓ __tests__/components/features/TaskCard.test.tsx           (10 tests)  ← mockPush flip
 ✓ __tests__/components/features/TasksList.test.tsx           (5 tests)  ← href flip
 ✓ __tests__/components/features/DashboardWidgetCard.test.tsx (4 tests)  ← href data flip
 ✓ __tests__/components/features/MainHeaderNav.test.tsx      (15 tests)  ← was 12, +3
 ... and all 15 other test files unchanged ...

 Test Files  22 passed (22)
      Tests  158 passed (158)
```

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — `/dashboard/tasks` renders `<h1>Your tasks</h1>` + `<TasksList>` | Static-file check on the moved page; `next build` route-table shows `/dashboard/tasks` at 44 kB / 157 kB (same payload as the old `/tasks`) |
| 2 — `/dashboard/tasks/new` renders `<TaskForm submitLabel="Create Task" action={createTaskAction} />` inside `<Card className="md:max-w-lg">` | Static-file check on the moved file (content byte-identical) |
| 3 — `/dashboard/tasks/<id>` renders the edit form | Static-file check on the moved file (content byte-identical, inline `'use server'` wrapper preserved) |
| 4 — `notFound()` on non-existent id | Behavior of moved file unchanged; still calls `notFound()` |
| 5 — Unauthenticated `/dashboard*` redirected to `/` | `middleware.test.ts` (4 signed-out cases for `/dashboard`, `/dashboard/sub`, plus the 3 `/dashboard/tasks*` cases) |
| 6 — Old `/tasks*` paths now 404 | `next build` route-table confirms no `/tasks` entry; the file move is the mechanism |
| 7 — Route table lists exactly the nested tree | `next build` output verified |
| 8 — `createTaskAction` calls `redirect('/dashboard/tasks')` | `createTask.test.ts` (updated assertion) |
| 9 — `updateTaskAction` calls `redirect('/dashboard/tasks')` | `updateTask.test.ts` (updated assertion) |
| 10 — NEXT_REDIRECT propagates from both | Existing `rejects.toThrow(/NEXT_REDIRECT/)` assertions still pass |
| 11 — Dashboard widget href = `/dashboard/tasks` | Static-file check; `DashboardWidgetCard.test.tsx` `href` value confirms the component renders whatever it's given |
| 12 — Click widget → navigates to `/dashboard/tasks` | `DashboardWidgetCard.test.tsx` test 2 (`href` attribute on the rendered `Link`) |
| 13 — "Create new task" Link href = `/dashboard/tasks/new` | `TasksList.test.tsx` (updated assertion) |
| 14 — TaskCard click → `router.push('/dashboard/tasks/<id>')` | `TaskCard.test.tsx` (updated mockPush argument) |
| 15 — Delete-button click NOT followed by router.push | `TaskCard.test.tsx` existing stopPropagation case |
| 16 — Back visible on `/dashboard/tasks` | `MainHeaderNav.test.tsx` (signed-in) |
| 17 — Back visible on `/dashboard/tasks/new` and `/dashboard/tasks/<id>` | `MainHeaderNav.test.tsx` (combined case) |
| 18 — Back visible on `/sign-in` | `MainHeaderNav.test.tsx` ("renders Sign In as a disabled button..." assertion + the new click case) |
| 19 — Back visible on `/sign-up` | `MainHeaderNav.test.tsx` ("renders Sign Up as a disabled button..." assertion + the new click case) |
| 20 — Back hidden on `/dashboard` | `MainHeaderNav.test.tsx` existing case |
| 21 — Back hidden on `/` | `MainHeaderNav.test.tsx` existing case |
| 22 — Click on `/dashboard/tasks` → `router.push('/dashboard')` | `MainHeaderNav.test.tsx` (reworked existing case) |
| 23 — Click on `/dashboard/tasks/new` → `router.push('/dashboard/tasks')` | `MainHeaderNav.test.tsx` (new case) |
| 24 — Click on `/dashboard/tasks/<id>` → `router.push('/dashboard/tasks')` | `MainHeaderNav.test.tsx` (new case) |
| 25 — Click on `/sign-in` → `router.push('/')` | `MainHeaderNav.test.tsx` (new case) |
| 26 — Click on `/sign-up` → `router.push('/')` | `MainHeaderNav.test.tsx` (new case) |
| 27 — Middleware matcher has no `/tasks/:path*` | Static-file check on `src/middleware.ts` |
| 28 — `isPrivate` has no `/tasks` references | Static-file check on `src/lib/redirect-rules.ts` |
| 29 — Middleware test covers `/dashboard/tasks*` (signed-out + signed-in) | `middleware.test.ts` 6 cases (3 + 3) |
| 30 — `tsc --noEmit` exits 0 | Verified |
| 31 — `next lint` no errors | Verified |
| 32 — `test:run` ≥ 157 / 22 | **158 / 22** (exceeds by 1) |
| 33 — `next build` exits 0 | Verified |
| 34 — Forbidden-pattern compliance | `'use client'` count unchanged at 10; zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` |
| 35 — Visual rhythm | Honoured in all touched files |

All 35 ACs met.

## Coverage of Mandatory Test Categories

| Category | Touched by this task | Covered by |
|---|---|---|
| **Server actions** (`createTaskAction`, `updateTaskAction` redirect deltas) | Yes | `createTask.test.ts`, `updateTask.test.ts` (in-place assertion updates) |
| **Validation schemas** | No | n/a |
| **Middleware** (matcher + `isPrivate` cleanup) | Yes | `middleware.test.ts` (6 cases relabeled to `/dashboard/tasks*`) |
| **Predicates wrapping framework errors** | No | n/a |
| **Client form / state-machine components** (`MainHeaderNav` rule + click target) | Yes | `MainHeaderNav.test.tsx` (5 reworked + 3 net new) |
| **UI primitive / new API surface** | No (no API changes) | n/a |
| **Structural constraints** | No | n/a |

The mandatory category gate passes.

## Coverage Gaps

Per CLAUDE.md project convention, server-component pages (`/dashboard/page.tsx`, `/dashboard/tasks/page.tsx`, `/dashboard/tasks/new/page.tsx`, `/dashboard/tasks/[id]/page.tsx`) are NOT directly unit-tested. Their behaviour after the file move is verified by:

1. Static-file check (the moved files are byte-identical to their pre-move counterparts).
2. `next build` route-table inspection confirming the new paths resolve.
3. Indirect coverage via the action tests (which assert the redirect target the pages depend on) and the widget / TasksList / TaskCard tests (which assert the link / navigation hrefs that compose into the page flows).

The `MainHeaderNav` `backTarget` derivation (`pathname.replace(/\/[^/]+$/, '') || '/'`) is exercised at 5 distinct pathname values (3 in `/dashboard/tasks*`, 2 in `/sign-in` / `/sign-up`). All 5 mappings have a click-target test.

## Failing Tests
None.

## Bugs Found
None during this round.

## Recommendation for Future Tests

- **Direct-nav-to-old-URL behaviour** — the spec acknowledges old `/tasks*` URLs 404 with no fallback. A future iteration could add a redirect (via `next.config.js` `redirects` or a catch-all) and an integration smoke. Out of scope today.
- **Back-button keyboard interaction** — current tests assert `onClick` behaviour. A keyboard-focus + Enter-key case across the 5 mappings would round out a11y coverage.
- **Multi-level nesting** — if a future task introduces `/dashboard/settings/<sub>` or similar, the same derived `backTarget` rule should still hold; a sanity test once that lands would confirm.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 158 across 22 files.
