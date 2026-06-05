# Build Summary: Minor Rework — Tasks Routes as Children of Dashboard + Route-Aware Back Button

## Files Moved (file-tree relocation, content byte-identical)

- `src/app/(main)/(private)/tasks/page.tsx` → `src/app/(main)/(private)/dashboard/tasks/page.tsx`
- `src/app/(main)/(private)/tasks/new/page.tsx` → `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`
- `src/app/(main)/(private)/tasks/[id]/page.tsx` → `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`
- The now-empty `src/app/(main)/(private)/tasks/` directory was removed.

## Files Modified

- `src/app/(main)/(private)/dashboard/page.tsx` — one prop edit: `<DashboardWidgetCard href="/tasks" title="Tasks" />` → `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />`.
- `src/actions/createTask.ts` — one line: `redirect('/tasks')` → `redirect('/dashboard/tasks')`. NEXT_REDIRECT-propagation contract unchanged.
- `src/actions/updateTask.ts` — same one-line retarget.
- `src/components/features/TaskCard.tsx` — one template literal: `router.push(\`/tasks/${task._id}\`)` → `router.push(\`/dashboard/tasks/${task._id}\`)`.
- `src/components/features/TasksList.tsx` — one Link href: `/tasks/new` → `/dashboard/tasks/new`.
- `src/components/features/MainHeaderNav.tsx` — two edits:
  - `showBack` rule rewritten to: `pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/dashboard/tasks' || pathname.startsWith('/dashboard/tasks/')`.
  - Introduced a derived `backTarget = pathname.replace(/\/[^/]+$/, '') || '/'` constant; back button `onClick` is now `() => router.push(backTarget)`.
- `src/middleware.ts` — dropped `'/tasks/:path*'` from the matcher. Final list: `['/dashboard/:path*', '/', '/sign-in', '/sign-up']`.
- `src/lib/redirect-rules.ts` — collapsed `isPrivate` to `path === '/dashboard' || path.startsWith('/dashboard/')`. The two `/tasks` clauses removed.
- `__tests__/actions/createTask.test.ts` — `redirect` argument assertion `/tasks` → `/dashboard/tasks`.
- `__tests__/actions/updateTask.test.ts` — same.
- `__tests__/components/features/TaskCard.test.tsx` — `mockPush` argument assertion `/tasks/task-1` → `/dashboard/tasks/task-1`; case title updated.
- `__tests__/components/features/TasksList.test.tsx` — Link `href` assertion `/tasks/new` → `/dashboard/tasks/new`; case title updated.
- `__tests__/components/features/DashboardWidgetCard.test.tsx` — every test's `href="/tasks"` flipped to `href="/dashboard/tasks"`; matching assertion updated to `'/dashboard/tasks'`.
- `__tests__/middleware.test.ts` — replaced 6 `/tasks*` path cases (3 signed-out + 3 signed-in) with `/dashboard/tasks*` equivalents. Net case count: 16 (unchanged).
- `__tests__/components/features/MainHeaderNav.test.tsx` — full rework:
  - Hoisted `mockBack` replaced by `mockPush` (was already done in `13-tasks-route`; preserved).
  - 2 sign-in/sign-up cases that previously asserted Back was hidden now assert it's `toBeInTheDocument()`.
  - Standalone "does NOT render the Back button on /sign-in" case deleted.
  - 2 new signed-out click cases added: Back on `/sign-in` calls `router.push('/')`, Back on `/sign-up` calls `router.push('/')`.
  - 3 existing signed-in `/tasks*` cases shifted to `/dashboard/tasks*` paths; click target on `/dashboard/tasks` now asserts `router.push('/dashboard')`.
  - 2 new signed-in click cases added: Back on `/dashboard/tasks/new` calls `router.push('/dashboard/tasks')`, Back on `/dashboard/tasks/<id>` calls `router.push('/dashboard/tasks')`.
  - Renamed "does NOT render the Back button on nested /dashboard/sub paths" to "...on nested /dashboard/sub paths (non-tasks)" for clarity (the rule no longer excludes ALL nested `/dashboard/*` — only non-`tasks` subpaths).
  - Final case count: 15 (was 12; +3 net).

## Files NOT Modified

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `tasks.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts`, `validation/*.ts` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `deleteTask.ts` — unchanged. (Sign-in / sign-up `redirectTo` stays `/dashboard`.)
- `src/models/Task.ts`, `User.ts` — unchanged.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — unchanged.
- `src/components/features/TaskForm.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `MainHeader.tsx`, `DashboardWidgetCard.tsx` — unchanged.
- Layouts, error.tsx, not-found.tsx, root page, sign-in/sign-up pages — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts` — unchanged. No new deps.
- All other tests unchanged.

## Deviations

None. The plan's 20-step order held verbatim. Intermediate `tsc --noEmit` after step 6 required one `rm -rf .next` (same stale-cache nuisance documented in `12-tasks-edit`); re-run was clean.

## Ambiguities

None required `// NOTE:` markers. Two implementation-level judgement calls handled inline:

- **Renamed "does NOT render the Back button on nested /dashboard/sub paths"** to add the "(non-tasks)" qualifier. Without the rename the case title would mislead a reader: the rule no longer excludes ALL nested `/dashboard/*` — `/dashboard/tasks*` now intentionally shows the button. The rename clarifies that the assertion is specifically about a hypothetical non-tasks nested route.
- **The `backTarget` constant is computed unconditionally**, not gated on `showBack`. The regex is cheap (one match per render) and computing it inside an `if` branch would force readers to follow the conditional. Same render cost; cleaner code.

## Known Issues

- **`/dashboard` route's First Load JS** stayed at 106 kB (unchanged).
- **`/dashboard/tasks` route is 44 kB / 157 kB First Load** — identical to the old `/tasks` route (same components, same data fetch).
- **The old `/tasks*` URLs now 404** — no redirect fallback added per spec Assumption #19. This is an explicit choice; no external link in the codebase relies on the old paths.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
- **No runtime smoke this task.** All behavioural ACs covered by unit / RTL tests. The visual back-button navigation can be verified during `npm run dev` if desired.

## Verification Run

- `npx tsc --noEmit` → exit 0 (after `rm -rf .next` to clear stale generated types pointing at the old `tasks/page.tsx`).
- `npx next lint` → "No ESLint warnings or errors".
- `npm run test:run` → **158 tests passing across 22 files** (was 155 / 22, target ≥ 157 / 22). 3 net new tests; 0 failing.
- `npx next build` → exit 0. Route table:
  - `/dashboard` — 164 B / 106 kB
  - `/dashboard/tasks` — 44 kB / 157 kB (was `/tasks` in the previous task)
  - `/dashboard/tasks/[id]` — 1.54 kB / 133 kB
  - `/dashboard/tasks/new` — 1.54 kB / 133 kB
  - No `/tasks`, `/tasks/[id]`, or `/tasks/new` in the table.
- `mcp__ide__getDiagnostics` → only a markdown-table-format info notice on the user's incoming brief (`tasks/incoming/minor-rework.md`), unrelated to code. No diagnostics on any source or test file.

### Suite breakdown
- `errors.test.ts`: 11
- `validation/signIn.test.ts`: 6
- `validation/signUp.test.ts`: 5
- `validation/task.test.ts`: 6
- `auth-config.test.ts`: 4
- `middleware.test.ts`: 16 (unchanged count; path-shape relabel)
- `actions/signIn.test.ts`: 6
- `actions/signUp.test.ts`: 5
- `actions/createTask.test.ts`: 4
- `actions/updateTask.test.ts`: 4
- `actions/deleteTask.test.ts`: 4
- `components/features/SignInForm.test.tsx`: 6
- `components/features/SignUpForm.test.tsx`: 6
- `components/features/MainHeaderNav.test.tsx`: 15 (was 12, +3)
- `components/features/TaskCard.test.tsx`: 10
- `components/features/TasksList.test.tsx`: 5
- `components/features/TaskForm.test.tsx`: 8
- `components/features/DashboardWidgetCard.test.tsx`: 4
- `components/ui/Button.test.tsx`: 12
- `components/ui/Card.test.tsx`: 3
- `components/ui/Input.test.tsx`: 9
- `components/ui/Textarea.test.tsx`: 9
- **Total: 158 across 22 files.**

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)

- **Server actions** (`createTaskAction`, `updateTaskAction` redirect deltas): covered by in-place assertion updates in `createTask.test.ts` and `updateTask.test.ts`. ✓
- **Middleware** (matcher + `isPrivate` cleanup): covered by 6 path-shape case shifts in `middleware.test.ts`. ✓
- **Client form / state-machine components** (`MainHeaderNav` rule + click target rewire): covered by 3 net new cases + 5 reworked existing assertions in `MainHeaderNav.test.tsx`. ✓
- **Validation schemas / predicates / structural constraints**: no change this task. ✓

The mandatory category gate passes.
