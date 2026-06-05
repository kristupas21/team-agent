# Review: Minor Rework — Tasks Routes as Children of Dashboard + Route-Aware Back Button

## STATUS: PASS

## Acceptance Criteria Check

### Route nesting
- [x] 1 — `/dashboard/tasks` renders `<h1>Your tasks</h1>` + `<TasksList>`. Confirmed via byte-identical move from the old `/tasks/page.tsx`.
- [x] 2 — `/dashboard/tasks/new` renders the create form. Byte-identical move.
- [x] 3 — `/dashboard/tasks/[id]` renders the edit form. Byte-identical move; inline `'use server'` wrapper preserved.
- [x] 4 — `notFound()` on non-existent id. Logic unchanged from the moved file.
- [x] 5 — Unauthenticated `/dashboard*` redirects to `/`. `middleware.test.ts` covers `/dashboard`, `/dashboard/sub`, `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/abc123`.
- [x] 6 — Old `/tasks*` paths 404. Verified by `next build` route table absence.
- [x] 7 — Route table lists `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new` and no bare `/tasks*`. Verified.

### Server-action redirects
- [x] 8 — `createTaskAction` calls `redirect('/dashboard/tasks')`. Confirmed at `src/actions/createTask.ts:35` + asserted in `createTask.test.ts`.
- [x] 9 — `updateTaskAction` calls `redirect('/dashboard/tasks')`. Confirmed at `src/actions/updateTask.ts:35` + asserted in `updateTask.test.ts`.
- [x] 10 — NEXT_REDIRECT propagates from both. Existing `rejects.toThrow(/NEXT_REDIRECT/)` assertions still pass.

### Dashboard widget
- [x] 11 — Widget href = `/dashboard/tasks`. Confirmed at `dashboard/page.tsx`.
- [x] 12 — Click widget → `/dashboard/tasks`. `DashboardWidgetCard.test.tsx` test 2 (`href` attribute on the rendered `Link`).

### TasksList "Create new task" link
- [x] 13 — Link href = `/dashboard/tasks/new`. Asserted in `TasksList.test.tsx`.

### TaskCard card-click
- [x] 14 — `router.push('/dashboard/tasks/<id>')`. Asserted in `TaskCard.test.tsx`.
- [x] 15 — Delete `stopPropagation` blocks the parent click. Existing assertion still passes after the path shift.

### Back button — visibility
- [x] 16 — Visible on `/dashboard/tasks`. `MainHeaderNav.test.tsx`.
- [x] 17 — Visible on `/dashboard/tasks/new` and `/dashboard/tasks/<id>`. `MainHeaderNav.test.tsx` combined case.
- [x] 18 — Visible on `/sign-in`. `MainHeaderNav.test.tsx` (assertion flip + new click case).
- [x] 19 — Visible on `/sign-up`. `MainHeaderNav.test.tsx` (assertion flip + new click case).
- [x] 20 — Hidden on `/dashboard`. `MainHeaderNav.test.tsx` (existing).
- [x] 21 — Hidden on `/`. `MainHeaderNav.test.tsx` (existing).

### Back button — click target
- [x] 22 — `/dashboard/tasks` → `router.push('/dashboard')`. Reworked existing case.
- [x] 23 — `/dashboard/tasks/new` → `router.push('/dashboard/tasks')`. New case.
- [x] 24 — `/dashboard/tasks/<id>` → `router.push('/dashboard/tasks')`. New case.
- [x] 25 — `/sign-in` → `router.push('/')`. New case.
- [x] 26 — `/sign-up` → `router.push('/')`. New case.

### Middleware / redirect-rules
- [x] 27 — Matcher has no `/tasks/:path*`. Final list: `['/dashboard/:path*', '/', '/sign-in', '/sign-up']`. Confirmed at `src/middleware.ts:16`.
- [x] 28 — `isPrivate` has no `/tasks` references. Confirmed at `src/lib/redirect-rules.ts` (single-line predicate now).
- [x] 29 — Middleware test covers `/dashboard/tasks*` (signed-out + signed-in × 3 paths). Confirmed.

### Build & quality
- [x] 30 — `tsc --noEmit` exits 0. Verified (after `rm -rf .next` cleared stale generated types).
- [x] 31 — `next lint` no errors. Verified.
- [x] 32 — `test:run` ≥ 157 / 22. **158 / 22.** Exceeded by 1.
- [x] 33 — `next build` exits 0. Verified.

### Forbidden-pattern compliance
- [x] 34 — Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count unchanged at 10.

### Code layout
- [x] 35 — Visual rhythm honoured in all new and modified files.

All 35 ACs met.

## Plan Compliance

- All planned file moves and edits exist at the planned paths. The 3 file moves, 7 source edits, and 7 test edits all align.
- The 20-step build order was followed verbatim. The intermediate `tsc --noEmit` after step 6 surfaced stale-cache errors from `.next/types/.../tasks/page.ts`, cleared by `rm -rf .next` (same workaround documented in `12-tasks-edit`'s deviations).
- Derived `backTarget = pathname.replace(/\/[^/]+$/, '') || '/'` (Open Question #1 default) honoured.
- No `dashboard/layout.tsx` (Open Question #3 default) honoured.
- No `PRIVATE_PREFIX` constant (Open Question #2 default) honoured.
- Middleware matcher cleanup (Open Question #4 default) honoured.

## Code Quality

- **TypeScript strict.** No `any`. All edits surgical; no incidental type changes.
- **`backTarget` constant placement** — declared right after `showBack`. Both depend only on `pathname`; grouping them is the readable choice. Computing `backTarget` unconditionally (instead of inside a conditional) costs one extra regex match when `showBack` is false, which is negligible.
- **`showBack` rule** uses an explicit four-way OR rather than a regex or set lookup. Readable for the five-route allow-list; if more routes are added in future the cost of inlining grows, but at five it's clearer than abstraction.
- **`redirect-rules.ts` `isPrivate`** collapsed to a single line. Previously a 4-line OR; now a 1-line OR. Easier to verify against the spec.
- **Middleware matcher** trimmed by one entry. Mirrors actual routes.
- **`'use client'` placement** still honours deepest-leaf — only `MainHeaderNav.tsx`, `TaskCard.tsx`, `TasksList.tsx`, `TaskForm.tsx`, sign forms, and primitives have the directive.
- **`mcp__ide__getDiagnostics`** returns one info-level table-format notice on the user's incoming brief (markdown), no diagnostics on any source or test file. Confirmed.

## Blockers
None.

## Notes (non-blocking)

1. **Old URL bookmarks 404** — by design (Assumption #19). The brief and spec both treat this as acceptable. If a stakeholder later asks for a redirect, adding `redirects` to `next.config.ts` would close the gap in 6 lines.
2. **`backTarget` derivation handles all five mappings consistently** — `/dashboard/tasks/[id]` → `/dashboard/tasks`, `/dashboard/tasks/new` → `/dashboard/tasks`, `/dashboard/tasks` → `/dashboard`, `/sign-in` → `/`, `/sign-up` → `/`. The fallback `|| '/'` is what makes the sign-in/sign-up cases work (the regex strips the only segment leaving an empty string).
3. **Sign-in/sign-up back button** restores behaviour that was unintentionally removed in `13-tasks-route`. The spec explicitly cites that as the motivation; the test coverage now ensures it can't silently regress again.
4. **The `MainHeaderNav` test case "does NOT render the Back button on nested /dashboard/sub paths"** was renamed with the `(non-tasks)` qualifier. Without the qualifier the case title would mislead — the rule no longer excludes ALL `/dashboard/*` nested paths.
5. **The `dashboard/tasks/[id]/page.tsx` inline `'use server'` wrapper** still binds `task._id` via closure. The file move doesn't disturb that pattern.
6. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
7. **Server-component pages stay untested directly** (project convention). The byte-identical-move strategy means their behaviour is identical to the pre-move tested baseline (the previous task's `13-tasks-route` review approved them).

## Approved Files

- **Moved (3)**: `src/app/(main)/(private)/tasks/page.tsx` → `dashboard/tasks/page.tsx`, `tasks/new/page.tsx` → `dashboard/tasks/new/page.tsx`, `tasks/[id]/page.tsx` → `dashboard/tasks/[id]/page.tsx`.
- **Modified (8 source files)**: `src/app/(main)/(private)/dashboard/page.tsx`, `src/actions/createTask.ts`, `src/actions/updateTask.ts`, `src/components/features/TaskCard.tsx`, `src/components/features/TasksList.tsx`, `src/components/features/MainHeaderNav.tsx`, `src/middleware.ts`, `src/lib/redirect-rules.ts`.
- **Modified (7 test files)**: `__tests__/actions/createTask.test.ts`, `__tests__/actions/updateTask.test.ts`, `__tests__/components/features/TaskCard.test.tsx`, `__tests__/components/features/TasksList.test.tsx`, `__tests__/components/features/DashboardWidgetCard.test.tsx`, `__tests__/components/features/MainHeaderNav.test.tsx`, `__tests__/middleware.test.ts`.
- **Deleted**: empty `src/app/(main)/(private)/tasks/` directory.

No files require changes. STATUS: PASS.
