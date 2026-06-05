# Minor Rework: Tasks Routes as Children of Dashboard + Smarter Back Button

## Description

Two interlocking changes. **(1) Route nesting**: the `/tasks*` private routes (created in the previous task) become children of `/dashboard`. So `/tasks` → `/dashboard/tasks`, `/tasks/new` → `/dashboard/tasks/new`, and `/tasks/[id]` → `/dashboard/tasks/[id]`. The Dashboard widget, the server-action redirect targets, the TasksList "Create new task" Link, the TaskCard `router.push`, and the middleware / redirect-rules path matchers all shift to the new prefix. **(2) Back button**: the header back button changes from a fixed-target `router.push('/dashboard')` to a route-aware "go to parent" navigation. On `/dashboard/tasks/[id]` (and `/dashboard/tasks/new`) the back button navigates to `/dashboard/tasks`; on `/dashboard/tasks` it navigates to `/dashboard`; on `/sign-in` and `/sign-up` it navigates to `/`. The button does not show on `/dashboard` or `/`. **Note**: the back button on `/sign-in` and `/sign-up` was unintentionally removed in the previous task (`13-tasks-route`) — this restores it.

## Scope

### In scope
- Move the three task pages from `src/app/(main)/(private)/tasks/...` to `src/app/(main)/(private)/dashboard/tasks/...`.
- Update server-action redirect targets in `createTask.ts` and `updateTask.ts`: `'/tasks'` → `'/dashboard/tasks'`.
- Update the Dashboard widget link in `dashboard/page.tsx`: `href="/tasks"` → `href="/dashboard/tasks"`.
- Update `TasksList.tsx`'s "Create new task" Link: `href="/tasks/new"` → `href="/dashboard/tasks/new"`.
- Update `TaskCard.tsx`'s click handler: `router.push(\`/tasks/${task._id}\`)` → `router.push(\`/dashboard/tasks/${task._id}\`)`.
- Update `src/middleware.ts` matcher: the `'/tasks/:path*'` entry can be dropped (covered by the existing `'/dashboard/:path*'`).
- Update `src/lib/redirect-rules.ts` `isPrivate`: drop the `/tasks` checks (already covered by `/dashboard` checks).
- Update `MainHeaderNav.tsx`'s back-button rule and click handler to the new route-aware behaviour.
- Restore the back button on `/sign-in` and `/sign-up`, navigating to `/` ("home") when clicked.
- Update every test that asserts the old `/tasks*` paths to assert the new `/dashboard/tasks*` paths.
- Add tests for the new parent-route navigation behaviour on the back button (including the restored sign-in / sign-up cases).

### Out of scope
- Changing what `/dashboard` renders (still the widget grid).
- Adding new widgets, breadcrumbs, or any other navigation affordance.
- Changing auth redirect destinations (sign-in / sign-up still land on `/dashboard`).
- Any TaskCard / TaskForm / Card / Button visual change.
- Any model, validation schema, or DAL change.

## Pages

### `/dashboard` (unchanged)
- Still the widget grid with a single "Tasks" widget.
- The widget's `href` updates: `"/tasks"` → `"/dashboard/tasks"`.

### `/dashboard/tasks` (moved from `/tasks`)
- Server component. Same shell, same `auth()` guard, same `<TasksList initialTasks={tasks} />` render.

### `/dashboard/tasks/new` (moved from `/tasks/new`)
- Server component. Unchanged behaviour at the page level.

### `/dashboard/tasks/[id]` (moved from `/tasks/[id]`)
- Server component. Unchanged behaviour at the page level (the inline `'use server'` wrapper for the update action still binds `task._id`).

## Server Actions

- `src/actions/createTask.ts` — `redirect('/tasks')` → `redirect('/dashboard/tasks')`.
- `src/actions/updateTask.ts` — same change.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `deleteTask.ts` — unchanged.

## Back Button (in `MainHeaderNav.tsx`)

### Visibility rule
- Shown on: `/dashboard/tasks` and any nested path under it (e.g. `/dashboard/tasks/new`, `/dashboard/tasks/<id>`); also `/sign-in` and `/sign-up` (restored — see Description).
- Hidden on: `/dashboard` (root of the private tree) and `/`.

### Click action — route-aware "go to parent"
The mappings:
- On `/dashboard/tasks/[id]` → navigate to `/dashboard/tasks`.
- On `/dashboard/tasks/new` → navigate to `/dashboard/tasks`.
- On `/dashboard/tasks` → navigate to `/dashboard`.
- On `/sign-in` → navigate to `/`.
- On `/sign-up` → navigate to `/`.

The first three are explicit in the draft (with `/dashboard/tasks/new` inferred from sharing a parent with `[id]`). The sign-in / sign-up mappings restore behaviour that existed before the previous task.

The spec-agent picks the implementation mechanism (see Open Questions): hardcoded mapping vs. derived-from-pathname.

## Components

| Name | What changes |
|---|---|
| `MainHeaderNav.tsx` | Back-button visibility rule + route-aware click handler. |
| `TaskCard.tsx` | One template literal: `\`/tasks/${task._id}\`` → `\`/dashboard/tasks/${task._id}\``. |
| `TasksList.tsx` | One Link href: `/tasks/new` → `/dashboard/tasks/new`. |
| `DashboardWidgetCard.tsx` | No code change. The href change happens at the call site (`dashboard/page.tsx`). |
| `src/app/(main)/(private)/dashboard/page.tsx` | One prop: `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />`. |

## Middleware / Redirect Rules

- `src/middleware.ts` matcher — drop `'/tasks/:path*'`. The existing `'/dashboard/:path*'` already covers the new nested paths. Other matcher entries (`/dashboard/:path*`, `/`, `/sign-in`, `/sign-up`) unchanged.
- `src/lib/redirect-rules.ts` `isPrivate` — drop the two `/tasks` checks. The `/dashboard` checks already cover the new paths.

## Folder / File Touch Points

Rough sketch — architect picks the final layout.

```
/src
  /actions
    createTask.ts                                  ← edit: redirect target
    updateTask.ts                                  ← edit: redirect target
  /app/(main)/(private)
    dashboard/page.tsx                             ← edit: widget href
    dashboard/tasks/page.tsx                       ← NEW (moved from /tasks/page.tsx)
    dashboard/tasks/new/page.tsx                   ← NEW (moved from /tasks/new/page.tsx)
    dashboard/tasks/[id]/page.tsx                  ← NEW (moved from /tasks/[id]/page.tsx)
    tasks/                                         ← DELETED (entire subtree)
  /components/features
    TaskCard.tsx                                   ← edit: router.push template literal
    TasksList.tsx                                  ← edit: Link href
    MainHeaderNav.tsx                              ← edit: showBack rule + click handler
  /lib
    redirect-rules.ts                              ← edit: drop /tasks checks
  middleware.ts                                    ← edit: drop /tasks matcher

__tests__
  /actions
    createTask.test.ts                             ← edit: redirect assertion
    updateTask.test.ts                             ← edit: redirect assertion
  /components/features
    TaskCard.test.tsx                              ← edit: mockPush argument assertion
    TasksList.test.tsx                             ← edit: Link href assertion
    MainHeaderNav.test.tsx                         ← edit: path-shape changes + new back-target assertions
    DashboardWidgetCard.test.tsx                   ← edit: any href-specific assertion in tests (the href value flows from the call site, but if any test was written against `/tasks` directly, it updates here)
  middleware.test.ts                               ← edit: replace /tasks* cases with /dashboard/tasks* cases
```

## Open Questions

The spec-agent picks defaults and flags assumptions. The user's draft is specific; only a few minor points need a lean:

1. **Back-button mechanism — hardcoded mapping vs. derived-from-pathname?**
   - Option A: switch / hardcoded mapping inside `MainHeaderNav`'s `onClick`. Explicit, readable for the five cases now in scope.
   - Option B: derive parent route from `pathname.replace(/\/[^/]+$/, '') || '/'`. Generic, handles future routes automatically. Works correctly for `/dashboard/tasks/[id]` → `/dashboard/tasks`, `/dashboard/tasks` → `/dashboard`, `/sign-in` → `/`, `/sign-up` → `/`.
   - Lean: Option B. The pattern is now consistent across all five mappings — strip the last path segment, fall back to `/`. The derived approach is shorter and treats sign-in / sign-up as cases of the same rule rather than special exceptions.

2. **Back-button behaviour on `/dashboard/tasks/new`.**
   - Lean: same as `/dashboard/tasks/[id]` — go to `/dashboard/tasks`. The draft doesn't explicitly cover this path but its parent is `/dashboard/tasks` by the file-tree structure.

3. **Should the back button on `/dashboard/tasks` go via `router.push` or `<Link href>`?**
   - Lean: keep `router.push` (matches the existing button affordance + `aria-label="Back"`). No reason to switch to a Link rendered as a button.

4. **Public-route back-button on `/sign-in` / `/sign-up`** — resolved per the user's amendment: the button MUST be present on these routes and MUST navigate to `/` when clicked. This restores behaviour that existed before `13-tasks-route` removed it unintentionally.

5. **Whether to bake the "/dashboard" prefix into a constant** (e.g. `const PRIVATE_PREFIX = '/dashboard'`) for the back-button mapping and the redirect targets.
   - Lean: no. Three hard-coded strings in this codebase isn't enough surface area for a constant. Premature abstraction.

6. **Middleware matcher cleanup.** The `'/tasks/:path*'` entry is redundant after the move (covered by `/dashboard/:path*`). Drop it vs. leave it as a harmless extra?
   - Lean: drop it. The matcher list should mirror what routes actually exist.

7. **Test mocking patterns.** No new mocks expected — all existing mocks (`next/navigation`, `@/lib/auth`, `@/lib/tasks`, `@/actions/...`) are reused for the new path-shape assertions. The MainHeaderNav test's hoisted `mockPush` is already in place from the previous task.

## Done Criteria

- All three task pages live under `src/app/(main)/(private)/dashboard/tasks/` (page.tsx, new/page.tsx, [id]/page.tsx). The old `src/app/(main)/(private)/tasks/` subtree is gone.
- Visiting `/dashboard/tasks` shows the user's task list.
- Visiting `/dashboard/tasks/new` shows the create-task form.
- Visiting `/dashboard/tasks/<id>` shows the edit-task form.
- The "Tasks" widget on `/dashboard` links to `/dashboard/tasks` (not `/tasks`).
- Creating a task lands on `/dashboard/tasks` (not `/tasks` or `/dashboard`).
- Updating a task lands on `/dashboard/tasks`.
- Header back button is shown on every `/dashboard/tasks*` route and on `/sign-in` and `/sign-up`; hidden on `/dashboard` and `/`.
- Clicking the back button on `/dashboard/tasks/[id]` navigates to `/dashboard/tasks`.
- Clicking the back button on `/dashboard/tasks/new` navigates to `/dashboard/tasks`.
- Clicking the back button on `/dashboard/tasks` navigates to `/dashboard`.
- Clicking the back button on `/sign-in` or `/sign-up` navigates to `/`.
- Middleware redirects unauthenticated users away from any `/dashboard*` path (covering all the new nested routes).
- `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all green. Route table lists `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new` (and no bare `/tasks*`).

## What This Task Does NOT Include

- New widgets on `/dashboard`.
- Any visual change to TaskCard, TaskForm, Card, Button, or other UI primitives.
- New auth surfaces, new fields on `Task`, new validation rules.
- A breadcrumb component or any other navigation affordance beyond the back button.
- A "view-only" mode for `/dashboard/tasks/[id]` separate from the edit form.
- Any change to public routes' navigation behaviour beyond restoring the sign-in / sign-up back-button-to-`/` mapping.
