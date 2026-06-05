# Spec: Minor Rework — Tasks Routes as Children of Dashboard + Route-Aware Back Button

## Summary
Two interlocking changes ship together. **(1) Route nesting**: the three `/tasks*` private routes (`/tasks`, `/tasks/new`, `/tasks/[id]`) become children of `/dashboard`. New paths: `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/[id]`. Every call site that references the old paths updates: server-action redirects (`createTask`, `updateTask`), the Dashboard widget href, `TasksList`'s "Create new task" Link, `TaskCard`'s `router.push`, the middleware matcher (drops the now-redundant `/tasks/:path*` entry), and `redirect-rules.ts`'s `isPrivate` predicate (drops the redundant `/tasks` checks — `/dashboard*` already covers the new nested tree). **(2) Back button**: `MainHeaderNav`'s back button changes from the fixed-target `router.push('/dashboard')` to a route-aware "go to parent" navigation. Mappings: `/dashboard/tasks/[id]` → `/dashboard/tasks`, `/dashboard/tasks/new` → `/dashboard/tasks`, `/dashboard/tasks` → `/dashboard`, `/sign-in` → `/`, `/sign-up` → `/`. The button is hidden on `/dashboard` and `/` (where there's no parent to go to). The sign-in / sign-up button restores behaviour that `13-tasks-route` unintentionally removed.

## Assumptions

1. **Back-button mechanism** (Open Question #1 default): derived-from-pathname. Implementation: `const parent = pathname.replace(/\/[^/]+$/, '') || '/'`. This evaluates correctly for all five mappings:
   - `/dashboard/tasks/[id]` → `/dashboard/tasks` ✓
   - `/dashboard/tasks/new` → `/dashboard/tasks` ✓
   - `/dashboard/tasks` → `/dashboard` ✓
   - `/sign-in` → `''` → `/` (via the `|| '/'` fallback) ✓
   - `/sign-up` → `''` → `/` (via the `|| '/'` fallback) ✓
   Five consistent cases of the same rule. The brief flipped this from a hardcoded mapping to derived because the pattern is now uniform.

2. **Back-button visibility rule**: shown when the pathname appears in a fixed allow-list (rendered as `Set` / array literal at module scope). The list: `['/dashboard/tasks', '/dashboard/tasks/new', '/sign-in', '/sign-up']` PLUS the dynamic-segment pattern `pathname.startsWith('/dashboard/tasks/')` (which covers `/dashboard/tasks/<id>` for any non-`new` id). Simpler equivalent: `showBack = pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/dashboard/tasks' || pathname.startsWith('/dashboard/tasks/')`. The builder picks the readable form; both compile to the same behaviour.

3. **Back-button click handler**: `onClick={() => router.push(parent)}` where `parent` is the derived constant from Assumption #1. The handler computes `parent` once at render (it depends only on `pathname`).

4. **Route nesting via file-tree move** (NOT route group, NOT layout-level): the three task pages move from `src/app/(main)/(private)/tasks/...` to `src/app/(main)/(private)/dashboard/tasks/...`. The existing `dashboard/page.tsx` stays at `dashboard/page.tsx` — it becomes a sibling of the new `tasks/` subtree.

5. **No new `dashboard/layout.tsx`**: the existing `(main)/layout.tsx` and `(main)/(private)/...` route-group composition already supplies the layout. Introducing a `dashboard/layout.tsx` would be premature (only used for the route nesting, with no shared UI to put in it).

6. **Server-action redirect targets**: `createTaskAction` and `updateTaskAction` change `redirect('/tasks')` → `redirect('/dashboard/tasks')`. NEXT_REDIRECT-propagation contract (no try/catch) is unchanged.

7. **Sign-in / sign-up action redirects stay `/dashboard`**: `signIn` (`redirectTo: '/dashboard'`) and `signUp` (`redirectTo: '/dashboard'`) are unchanged. The back button's `/sign-in` → `/` and `/sign-up` → `/` mappings are independent of where successful auth lands.

8. **Middleware matcher**: drop `'/tasks/:path*'` from `src/middleware.ts`. The existing `'/dashboard/:path*'` covers all the new paths. Final matcher list: `['/dashboard/:path*', '/', '/sign-in', '/sign-up']` (4 entries, was 5).

9. **`redirect-rules.ts` `isPrivate`**: drop the `path === '/tasks' || path.startsWith('/tasks/')` clause. Remaining clauses: `path === '/dashboard' || path.startsWith('/dashboard/')`. This change is purely cleanup — the dropped clause never matched anything reachable after the file move.

10. **Public-only routes unchanged**: `redirect-rules.ts`'s `isPublicOnly` predicate (`/`, `/sign-in`, `/sign-up`) is untouched.

11. **Signed-in redirect target from `/`, `/sign-in`, `/sign-up`** stays `/dashboard` (not `/dashboard/tasks`). Auth lands on the widget grid. This is unchanged from the previous task.

12. **No `Card`, `Button`, `buttonClass`, `Input`, `Textarea`, or other UI-primitive change**.

13. **No `TaskForm` change**.

14. **No model, validation schema, or DAL change**.

15. **No new dependencies**.

16. **Test updates** mirror the path shifts:
    - `__tests__/actions/createTask.test.ts` — redirect-target assertion `'/tasks'` → `'/dashboard/tasks'`.
    - `__tests__/actions/updateTask.test.ts` — same.
    - `__tests__/components/features/TaskCard.test.tsx` — the existing "navigates to /tasks/{id}" case becomes "navigates to /dashboard/tasks/{id}". Mock-push argument flips.
    - `__tests__/components/features/TasksList.test.tsx` — the Link-href assertion `/tasks/new` → `/dashboard/tasks/new`.
    - `__tests__/components/features/DashboardWidgetCard.test.tsx` — no change needed; the widget's href is supplied by the call site and the tests instantiate the component directly with `href="/tasks"`. Update the test's href arg from `"/tasks"` to `"/dashboard/tasks"` to match the new convention used at the production call site (cosmetic — the component renders whatever it's given).
    - `__tests__/middleware.test.ts` — replace the `/tasks*` cases (signed-out + signed-in × 3 paths = 6 cases) with `/dashboard/tasks*` equivalents. Net case count: unchanged (the bare-`/tasks`, `/tasks/new`, `/tasks/abc123` triple maps to `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/abc123`).
    - `__tests__/components/features/MainHeaderNav.test.tsx` — significant rework:
      - The 3 existing `/tasks*` signed-in cases (back present on `/tasks`, back present on `/tasks/new` and `/tasks/<id>`, back-click on `/tasks` → `router.push('/dashboard')`) all shift to `/dashboard/tasks*` paths and the click-target becomes `/dashboard/tasks` (not `/dashboard`).
      - Add a new signed-in case: back-click on `/dashboard/tasks/<id>` calls `router.push('/dashboard/tasks')`.
      - The "does NOT render Back on /sign-in" case is replaced by 2 new cases: "renders Back on /sign-in"  and "clicking Back on /sign-in calls router.push('/')". Same pair for `/sign-up` (2 more new cases — total 4 new sign-in/sign-up cases).
      - Trailing `expect(...Back...).toBeNull()` lines in the 2 sign-in/sign-up disabled-button cases flip back to `toBeInTheDocument()`.
      - The "does NOT render Back on /sign-in" case (lone) is deleted; replaced by the "renders Back on /sign-in" presence-only case above.

17. **Test net change**:
    - `MainHeaderNav.test.tsx`: was 12 cases → becomes 14 cases (+2 net: 2 deletes, 4 adds — 4 sign-in/sign-up presence + click, minus the 1 "does NOT render Back on /sign-in" case minus 1 reworked existing).
    - All other test files: net 0 change (assertion-only edits).
    - Expected total: 155 → 157 across 22 files.

18. **`'use client'` directive count unchanged**.

19. **No directory-level cleanup beyond the file move**: the entire `src/app/(main)/(private)/tasks/` subtree is removed after its contents move. The `.next` cache may need a one-time clear (`rm -rf .next`) to avoid stale type artefacts pointing at the old `tasks/page.tsx` etc. — same workaround as `12-tasks-edit`.

20. **No build-summary / test-results / review automatic creation by spec** — those are downstream agent outputs.

## Open Questions

1. Back-button mechanism — hardcoded mapping vs. derived from pathname? — Assumed: derived (`pathname.replace(/\/[^/]+$/, '') || '/'`). Alternatives: hardcoded switch. Affects: `MainHeaderNav.tsx` code shape.
2. Hardcoded `/dashboard` prefix constant? — Assumed: no. Alternatives: `const PRIVATE_PREFIX = '/dashboard'`. Affects: nothing structural; small cosmetic.
3. New `dashboard/layout.tsx` for the nested route group? — Assumed: no. Alternatives: yes, for future shared UI. Affects: file count.
4. Drop the redundant middleware matcher entry vs. leave it? — Assumed: drop. Alternatives: leave as harmless extra. Affects: `middleware.ts` matcher length.

## Routes / Pages

| Path | Type | Title (metadata) | `<h1>` | Auth | Purpose |
|---|---|---|---|---|---|
| `/dashboard` | server component | `Dashboard` | `Dashboard` | private | Widget grid. Unchanged content; one widget href updates. |
| `/dashboard/tasks` | server component | `Tasks` | `Your tasks` | private | Moved from `/tasks`. Same shell + `<TasksList>`. |
| `/dashboard/tasks/new` | server component | `Create task` | (no `<h1>`) | private | Moved from `/tasks/new`. Same `<TaskForm>` render. |
| `/dashboard/tasks/[id]` | server component | `Edit task` | (no `<h1>`) | private | Moved from `/tasks/[id]`. Same `auth()` → `getTaskById()` → `notFound()` → `<TaskForm>` flow with the inline `'use server'` wrapper. |
| `/` | server component | (unchanged) | (unchanged) | public-only | Unchanged. |
| `/sign-in`, `/sign-up` | server components | (unchanged) | (unchanged) | public-only | Page-level behaviour unchanged. The header back button now appears here. |

The old routes `/tasks`, `/tasks/new`, `/tasks/[id]` cease to exist. They have no redirect / fallback — direct navigation to those URLs would 404. (Acceptable; the move is a one-time URL change and no external link relies on the old paths.)

## Data

### API Endpoints
None new. `createTask` / `deleteTask` / `updateTask` / `getTaskById` / `getTasksForUser` are unchanged in shape; only the redirect targets inside the two task-mutation actions change.

### Data Types
No type changes.

## Components

| Name | Purpose | Props |
|---|---|---|
| `MainHeaderNav` (modified) | Header nav. New back-button visibility allow-list + route-aware parent-derived click target. | unchanged |
| `TaskCard` (modified) | Existing tasks-list card. One template-literal change: `\`/tasks/${task._id}\`` → `\`/dashboard/tasks/${task._id}\``. | unchanged |
| `TasksList` (modified) | Existing tasks list. One Link href change: `/tasks/new` → `/dashboard/tasks/new`. | unchanged |
| `DashboardWidgetCard` (unchanged) | Widget shell. No code change; call-site updates the href prop. | unchanged |

## User Interactions

### Happy path — sign-in → dashboard → tasks → edit → back trail
1. User signs in.
2. Browser lands on `/dashboard` (sign-in redirect target unchanged). Page shows the widget grid; back button is hidden in the header (there's no parent above `/dashboard`).
3. User clicks the Tasks widget. Browser navigates to `/dashboard/tasks`. Header now shows the back button.
4. User clicks a task. Browser navigates to `/dashboard/tasks/<id>`. Back button still present.
5. User clicks back. Browser navigates to `/dashboard/tasks`.
6. User clicks back again. Browser navigates to `/dashboard`. Back button disappears.

### Happy path — create task
1. From `/dashboard/tasks`, user clicks the "Create new task" link (href `/dashboard/tasks/new`).
2. Browser navigates to `/dashboard/tasks/new`. Back button is present.
3. User submits the form. `createTask` action runs and `redirect('/dashboard/tasks')` fires. Browser lands on `/dashboard/tasks`.

### Happy path — edit task
1. From `/dashboard/tasks`, user clicks a task. Browser navigates to `/dashboard/tasks/<id>`.
2. User edits + submits. `updateTask` action runs and `redirect('/dashboard/tasks')` fires. Browser lands on `/dashboard/tasks`.

### Happy path — sign-in / sign-up back navigation
1. From `/`, user clicks "Sign In". Browser navigates to `/sign-in`. Back button is present in the header.
2. User clicks back. Browser navigates to `/`. Same flow on `/sign-up` (back → `/`).

### Failure path — direct nav to old `/tasks*` path
1. User pastes a stale `/tasks` URL into the address bar.
2. Next.js 404 renders. (Behaviour acceptable per Assumption #19's note; no redirect fallback added.)

### Failure path — unauthenticated under `/dashboard*`
1. Unauthenticated user attempts `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/new`, or `/dashboard/tasks/<id>`.
2. Middleware redirects to `/` (existing `isPrivate` behaviour, now widened in coverage by the nested tree).

## States

### `/dashboard/tasks` page
- Same loading / empty / populated states as the old `/tasks` page. Unchanged.

### `/dashboard` page
- Same as before. Unchanged.

### `MainHeaderNav` back button
- **On `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/<id>`, `/sign-in`, `/sign-up`**: visible. Clicking calls `router.push(parent)` with `parent` derived from `pathname.replace(/\/[^/]+$/, '') || '/'`.
- **On `/dashboard`, `/`**: hidden.

## Acceptance Criteria

### Route nesting
1. Given the user is authenticated, when they navigate to `/dashboard/tasks`, then the page renders `<h1>Your tasks</h1>` and `<TasksList initialTasks={tasks} />` populated with their tasks.
2. Given the user is authenticated, when they navigate to `/dashboard/tasks/new`, then the page renders the `<TaskForm submitLabel="Create Task" action={createTaskAction} />` inside `<Card className="md:max-w-lg">`.
3. Given the user is authenticated and an existing task id, when they navigate to `/dashboard/tasks/<id>`, then the page renders the `<TaskForm submitLabel="Save Task" initialValues={...}>` form.
4. Given the user is authenticated and a non-existent task id, when they navigate to `/dashboard/tasks/<id>`, then `notFound()` is called.
5. Given the user is unauthenticated, when they navigate to any `/dashboard*` path, then middleware redirects them to `/`.
6. Given the user navigates to the old bare `/tasks` (or `/tasks/new`, or `/tasks/<id>`), then a 404 renders (no automatic redirect added).
7. Given the `next build` route table is inspected, then it lists exactly `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new` for the private subtree (no `/tasks`, no `/tasks/[id]`, no `/tasks/new`).

### Server-action redirects
8. Given the user submits the create-task form, when `createTaskAction` returns successfully, then `redirect('/dashboard/tasks')` is called.
9. Given the user submits the edit-task form, when `updateTaskAction` returns successfully, then `redirect('/dashboard/tasks')` is called.
10. Given either redirect fires, when NEXT_REDIRECT throws, then it propagates out of the action (no try/catch).

### Dashboard widget
11. Given the user is on `/dashboard`, when the page renders, then the Tasks widget has `href="/dashboard/tasks"`.
12. Given the user clicks the Tasks widget, when the click fires, then the browser navigates to `/dashboard/tasks`.

### TasksList "Create new task" link
13. Given the user is on `/dashboard/tasks`, when the TasksList renders, then the "Create new task" Link has `href="/dashboard/tasks/new"`.

### TaskCard card-click navigation
14. Given a TaskCard renders, when the card body is clicked, then `router.push('/dashboard/tasks/<id>')` is called once with the task's id.
15. Given the Delete button is clicked, when the click fires, then `event.stopPropagation()` prevents the parent click and `router.push` is NOT called (existing behaviour, asserted post-rewire).

### Header back button — visibility
16. Given the user is on `/dashboard/tasks`, when the header renders, then a back button is visible.
17. Given the user is on `/dashboard/tasks/new` or `/dashboard/tasks/<id>`, when the header renders, then a back button is visible.
18. Given the user is on `/sign-in`, when the header renders, then a back button is visible.
19. Given the user is on `/sign-up`, when the header renders, then a back button is visible.
20. Given the user is on `/dashboard`, when the header renders, then a back button is NOT visible.
21. Given the user is on `/`, when the header renders, then a back button is NOT visible.

### Header back button — click target
22. Given the user is on `/dashboard/tasks`, when they click the back button, then `router.push('/dashboard')` is called exactly once.
23. Given the user is on `/dashboard/tasks/new`, when they click the back button, then `router.push('/dashboard/tasks')` is called exactly once.
24. Given the user is on `/dashboard/tasks/<id>`, when they click the back button, then `router.push('/dashboard/tasks')` is called exactly once.
25. Given the user is on `/sign-in`, when they click the back button, then `router.push('/')` is called exactly once.
26. Given the user is on `/sign-up`, when they click the back button, then `router.push('/')` is called exactly once.

### Middleware / redirect-rules cleanup
27. Given the middleware matcher is inspected, when its entries are enumerated, then `'/tasks/:path*'` does NOT appear (only `'/dashboard/:path*'`, `'/'`, `'/sign-in'`, `'/sign-up'`).
28. Given `redirect-rules.ts` `isPrivate` is inspected, when its body is read, then no `/tasks` references remain (only `/dashboard*` checks).
29. Given the middleware test suite runs, when path-shape coverage is enumerated, then `/dashboard/tasks`, `/dashboard/tasks/new`, `/dashboard/tasks/<id>` each have signed-out (redirects to `/`) and signed-in (passes through) cases. No bare `/tasks` cases remain.

### Build & quality
30. Given the code is built, when `npx tsc --noEmit` runs, then exit code is 0.
31. Given the code is built, when `npx next lint` runs, then no errors or warnings are reported.
32. Given the code is built, when `npm run test:run` runs, then all tests pass and the suite total is ≥ 157 across ≥ 22 files.
33. Given the code is built, when `npx next build` runs, then exit code is 0.

### Forbidden-pattern compliance
34. Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, or `Readonly<{}>` empty-prop types.

### Code layout
35. Visual rhythm honoured in all touched files.
