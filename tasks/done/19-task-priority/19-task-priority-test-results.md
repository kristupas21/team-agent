# Test Results: Task Priority + Lib Restructure + Notes Route

## Summary
**198 / 25 passing** (was 170 / 23; target was ≥ 195 / 25 — exceeded by 3). 0 failing.

```
$ npm run test:run
 ✓ __tests__/components/ui/Pill.test.tsx                (7 tests)  ← new
 ✓ __tests__/components/ui/Dropdown.test.tsx           (10 tests)  ← new
 ✓ __tests__/lib/validation/task.test.ts                (9 tests)  ← was 6, +3
 ✓ __tests__/lib/widget-images.test.ts                  (3 tests)  ← was 2, +1
 ✓ __tests__/components/features/MainHeaderNav.test.tsx (22 tests) ← was 20, +2
 ✓ __tests__/components/features/TaskCard.test.tsx     (12 tests)  ← was 10, +2
 ✓ __tests__/components/features/TaskForm.test.tsx     (11 tests)  ← was 8, +3
 ✓ __tests__/components/features/TasksList.test.tsx     (5 tests)  ← fixture only
 ✓ __tests__/actions/createTask.test.ts                 (4 tests)  ← assertion only
 ✓ __tests__/actions/updateTask.test.ts                 (4 tests)  ← fixture + assertion
 ... and all 15 other test files unchanged ...

 Test Files  25 passed (25)
      Tests  198 passed (198)
```

## Coverage of Acceptance Criteria

### Thread A — Lib Restructure
| AC | Coverage |
|---|---|
| 1 — `src/lib/auth/` contains the three auth files | Static-file check (`ls`) |
| 2 — `src/lib/db/` contains the three db files | Static-file check |
| 3 — Cross-cutting files at root | Static-file check |
| 4 — `src/lib/validation/` unchanged | Static-file check |
| 5 — All import paths updated | `grep` verified zero remaining old-path references |

### Thread B — Notes
| AC | Coverage |
|---|---|
| 6 — `/dashboard/notes` renders `<h1>Notes</h1>` | Static-file read + `next build` route-table |
| 7 — Unauthenticated `/dashboard/notes` redirected to `/` | Middleware test (existing `/dashboard/sub` paths still cover this — and the page itself has the auth guard) |
| 8 — `WIDGET_IMAGES.notes` shape | `widget-images.test.ts` new case |
| 9 — `public/img/butterfly.png` exists, ≤ 300 KB | Static-file check (258 KB confirmed) |
| 10 — Dashboard shows two widget cards | Static-file read + `next build` |
| 11 — Back button on `/dashboard/notes` | `MainHeaderNav.test.tsx` new case |
| 12 — Back click on `/dashboard/notes` → `/dashboard` | `MainHeaderNav.test.tsx` new case |

### Thread C — Task Priority
| AC | Coverage |
|---|---|
| 13 — Mongoose enum + default | Static-file check on `models/Task.ts` |
| 14 — Zod enum + default | `validation/task.test.ts` (defaults to medium + rejects unknown + accepts all 4) |
| 15 — TS types include `priority` | Implicit in `tsc --noEmit` success |
| 16 — Migration script exists, idempotent | Static-file check; idempotency is structural (`$exists: false` filter) |
| 17 — 4 new palette tokens | Static-file check on `tailwind.config.ts` |
| 18 — Pill primitive with 4 color variants | `Pill.test.tsx` (7 cases) |
| 19 — Dropdown primitive | `Dropdown.test.tsx` (10 cases) |
| 20 — task-priority.ts exports | Static-file check (referenced by 4 consumer modules: model, validation, TaskForm, TaskCard) |
| 21 — TaskForm priority dropdown, Medium default | `TaskForm.test.tsx` new "Priority dropdown with 4 options" case |
| 22 — Edit-mode priority pre-selection | `TaskForm.test.tsx` new "pre-fills priority from initialValues" case |
| 23 — TaskCard pill under description | `TaskCard.test.tsx` new "renders the priority pill" case + parameterized matrix |
| 24 — Actions validate + persist priority | `createTask.test.ts` + `updateTask.test.ts` updated assertions confirm priority reaches the DAL |

### Build & quality
| AC | Coverage |
|---|---|
| 25 — All four commands green | Verified |
| 26 — Suite ≥ 195 / 25 | **198 / 25** (+3 over target) |

### Forbidden patterns + code layout
| AC | Coverage |
|---|---|
| 27 — Zero forbidden patterns | `'use client'` count grew by 1 (Dropdown) to 11; zero `: any`, bare `<a>`, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` |
| 28 — Visual rhythm honoured | Honoured in all touched files |

All 28 ACs met.

## Coverage of Mandatory Test Categories

| Category | Touched | Covered by |
|---|---|---|
| Server actions (priority pass-through) | Yes | `createTask.test.ts`, `updateTask.test.ts` (assertion updates) |
| Validation schemas (priority enum + default) | Yes | `validation/task.test.ts` (+3 cases) |
| Middleware | No | n/a |
| Predicates | No | n/a |
| Client form / state-machine components | Yes | `TaskForm.test.tsx` (+3), `MainHeaderNav.test.tsx` (+2) |
| Client component changed behaviour | Yes | `TaskCard.test.tsx` (+2, one parameterized) |
| UI primitives with new public API | Yes | `Pill.test.tsx` (7), `Dropdown.test.tsx` (10) |
| Structural constraints | No | n/a |

The mandatory category gate passes.

## Coverage Gaps

Per project convention, server-component pages (`/dashboard/notes/page.tsx`, `/dashboard/page.tsx`) are not directly unit-tested. Indirect coverage:
1. `next build` exit 0 confirms the route compiles.
2. `next build` route-table inspection confirms `/dashboard/notes` is registered at the expected path.
3. The page's `auth()` + `redirect` pattern matches the established convention in `/dashboard/tasks/page.tsx` — middleware tests cover the redirect-to-`/` contract for any `/dashboard*` route.
4. The `DashboardWidgetCard` consumed by the dashboard page is itself tested at the component level.

The **migration script** is not unit-tested — it's a one-shot operational script run by the user (not part of the application runtime). Idempotency is structural (filters on `{ priority: { $exists: false } }`); the script can be safely re-run.

## Failing Tests
None.

## Bugs Found
None.

## Recommendation for Future Tests

- **Tasks-list integration with priority** — when sorting/filtering by priority arrives, an RTL test asserting the visible order would be valuable.
- **Migration script smoke** — a separate "integration" test using `mongodb-memory-server` could exercise the migration end-to-end. Out of scope today.
- **Palette regression** — class-presence tests catch the `bg-bordeaux-50` etc. tokens compiling. If the palette ever shrinks, those tests fail loudly.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 198 across 25 files.
