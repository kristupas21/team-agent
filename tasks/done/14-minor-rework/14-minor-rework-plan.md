# Build Plan: Minor Rework — Tasks Routes as Children of Dashboard + Route-Aware Back Button

## Overview
Three task pages move into a new `dashboard/tasks/` subtree; the old `tasks/` subtree is deleted entirely. Five call sites update their path strings (server-action redirects, widget href, TasksList Link, TaskCard `router.push`, middleware matcher). `MainHeaderNav.tsx`'s back button is rewired from a fixed `/dashboard` target to a derived parent-route (`pathname.replace(/\/[^/]+$/, '') || '/'`) and its visibility allow-list expands to include `/sign-in` and `/sign-up`. Net: 4 file moves, 7 file edits, 1 file deletion (the now-empty `tasks/` directory).

## Reuse

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `tasks.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts` — unchanged.
- `src/lib/validation/*.ts` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `deleteTask.ts` — unchanged. (Sign-in / sign-up `redirectTo` stays `/dashboard`.)
- `src/models/Task.ts`, `User.ts` — unchanged.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — unchanged.
- `src/components/features/TaskForm.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`, `MainHeader.tsx`, `DashboardWidgetCard.tsx` — unchanged.
- `src/app/layout.tsx`, `(main)/layout.tsx`, `error.tsx`, `not-found.tsx`, `(main)/page.tsx`, `/sign-in/page.tsx`, `/sign-up/page.tsx` — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts`, `globals.css` — unchanged. No new deps.
- Most existing tests — unchanged. Edits limited to the test files listed below.

## Files to Move (file-tree relocation only — contents unchanged at this step)

### `src/app/(main)/(private)/tasks/page.tsx` → `src/app/(main)/(private)/dashboard/tasks/page.tsx`
- **What**: directory rename via the bash `mv` flow used in `12-tasks-edit`.
- **Why**: the route nesting is the whole point of the task.
- **Notes**: file contents are byte-identical post-move.

### `src/app/(main)/(private)/tasks/new/page.tsx` → `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`
- **What**: same.
- **Notes**: contents unchanged. The page already imports `createTaskAction`; the action's redirect target update is a separate file edit (see below).

### `src/app/(main)/(private)/tasks/[id]/page.tsx` → `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`
- **What**: same.
- **Notes**: contents unchanged. The inline `'use server'` wrapper still binds `task._id` and forwards to `updateTaskAction`.

After the three moves, delete the now-empty `src/app/(main)/(private)/tasks/` directory.

## Files to Modify

### `src/app/(main)/(private)/dashboard/page.tsx`
- **What changes**: one prop edit on the widget card: `<DashboardWidgetCard href="/tasks" title="Tasks" />` → `<DashboardWidgetCard href="/dashboard/tasks" title="Tasks" />`.
- **Why**: AC 11.

### `src/actions/createTask.ts`
- **What changes**: one line: `redirect('/tasks')` → `redirect('/dashboard/tasks')`. The trailing `// redirect throws NEXT_REDIRECT — do NOT wrap in try/catch.` comment stays.
- **Why**: AC 8.

### `src/actions/updateTask.ts`
- **What changes**: one line: same redirect-target retarget.
- **Why**: AC 9.

### `src/components/features/TaskCard.tsx`
- **What changes**: one template literal inside `handleCardClick`: `router.push(\`/tasks/${task._id}\`)` → `router.push(\`/dashboard/tasks/${task._id}\`)`.
- **Why**: AC 14.

### `src/components/features/TasksList.tsx`
- **What changes**: one Link href: `<Link href="/tasks/new" ...>` → `<Link href="/dashboard/tasks/new" ...>`.
- **Why**: AC 13.

### `src/components/features/MainHeaderNav.tsx`
- **What changes**: two edits.
  1. Replace the `showBack` rule.
     - Was: `showBack = pathname === '/tasks' || pathname.startsWith('/tasks/')`.
     - New: `showBack = pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/dashboard/tasks' || pathname.startsWith('/dashboard/tasks/')`.
  2. Replace the back-button `onClick` body to use the derived parent.
     - Was: `() => router.push('/dashboard')`.
     - New: introduce a `backTarget` constant computed from `pathname.replace(/\/[^/]+$/, '') || '/'` immediately after the `showBack` constant. The onClick becomes `() => router.push(backTarget)`.
  - The `backTarget` constant is only meaningful when `showBack` is true; computing it unconditionally is cheap (one regex eval per render) and avoids a conditional declaration. The empty-string fallback handles `/sign-in` / `/sign-up` (where `replace` yields `''`).
- **Why**: ACs 16–26.

### `src/middleware.ts`
- **What changes**: drop the `'/tasks/:path*'` entry from the matcher array. Final matcher: `['/dashboard/:path*', '/', '/sign-in', '/sign-up']`.
- **Why**: AC 27.

### `src/lib/redirect-rules.ts`
- **What changes**: drop the two `/tasks` clauses from the `isPrivate` boolean composition. Final `isPrivate`: `path === '/dashboard' || path.startsWith('/dashboard/')`. `isPublicOnly` is unchanged.
- **Why**: AC 28.

### Tests — files to modify

#### `__tests__/actions/createTask.test.ts`
- **What changes**: one assertion: `expect(redirect).toHaveBeenCalledWith('/tasks')` → `expect(redirect).toHaveBeenCalledWith('/dashboard/tasks')`.

#### `__tests__/actions/updateTask.test.ts`
- **What changes**: same.

#### `__tests__/components/features/TaskCard.test.tsx`
- **What changes**: in the existing "navigates to /tasks/{id} when the card is clicked" case, flip the `mockPush.toHaveBeenCalledWith('/tasks/task-1')` assertion to `'/dashboard/tasks/task-1'`. Rename the case title accordingly.

#### `__tests__/components/features/TasksList.test.tsx`
- **What changes**: in the existing "always renders the Create new task link pointing at /tasks/new" case, flip the href assertion to `/dashboard/tasks/new`. Rename the case title accordingly.

#### `__tests__/components/features/DashboardWidgetCard.test.tsx`
- **What changes**: cosmetic — flip the test's `href="/tasks"` arg to `href="/dashboard/tasks"` in the 3 cases that pass it. The assertion that the Link's `href` attribute matches the prop continues to work; this just keeps the test data aligned with the production call site.

#### `__tests__/middleware.test.ts`
- **What changes**: the 4 `/tasks*` cases (bare-`/tasks`, `/tasks/new`, `/tasks/abc123` × signed-out and signed-in) become `/dashboard/tasks*` equivalents. Net case count: 16 (unchanged).
  - Signed-out section: replace 3 cases (`/tasks`, `/tasks/new`, `/tasks/abc123` → `/`) with 3 `/dashboard/tasks*` cases.
  - Signed-in section: replace 3 cases (pass-through) with 3 `/dashboard/tasks*` equivalents.

#### `__tests__/components/features/MainHeaderNav.test.tsx`
- **What changes**: significant rework. Spec lists every delta in Assumption #16. Concrete edit list:
  - The 3 existing signed-in `/tasks*` cases — paths flip to `/dashboard/tasks*`; the click-target assertion in the click case becomes `'/dashboard/tasks'` (was `/dashboard`).
  - The 2 existing signed-out cases asserting `Back ... toBeNull()` on `/sign-in` and `/sign-up` — flip those assertions to `toBeInTheDocument()`.
  - Delete the standalone "does NOT render the Back button on /sign-in" case.
  - Add 4 new signed-out cases:
    1. "renders the Back button on /sign-up" (presence-only).
    2. "calls router.push('/') exactly once when the Back button is clicked on /sign-in".
    3. "calls router.push('/') exactly once when the Back button is clicked on /sign-up".
  - That's 3 new cases (not 4 — the `/sign-in` presence is already covered by the "renders Sign In as a disabled button..." case after the assertion flip). Confirmed: 3 net adds.
  - Add 1 new signed-in case: "calls router.push('/dashboard/tasks') exactly once when the Back button is clicked on /dashboard/tasks/<id>" (covers the deeper-parent rule).
  - Net case count: 12 (current) − 1 (deleted) + 4 (added) = 15.

## Data Flow

- `/dashboard` → server component → renders `<DashboardWidgetCard href="/dashboard/tasks" />`. Click → `Link` → browser nav to `/dashboard/tasks`.
- `/dashboard/tasks` → server component → `auth()` + `getTasksForUser()` → `<TasksList>`. Same as before; only the file path changed.
- `/dashboard/tasks/new` → server component → `<TaskForm action={createTaskAction}>`. Submit → action runs → `redirect('/dashboard/tasks')`.
- `/dashboard/tasks/[id]` → server component → `auth()` + `getTaskById()` → `<TaskForm action={inlineWrapper}>`. Submit → inline wrapper calls `updateTaskAction(id, input)` → `redirect('/dashboard/tasks')`.
- Header back button → `usePathname()` → derives `parent` → `onClick` calls `router.push(parent)`.

## State Management

- Server state: `getTasksForUser` server-side. Unchanged.
- Client UI state: `MainHeaderNav` keeps its existing `usePathname()` + `useRouter()` hooks; both are reused for the new derived target.
- Global state: none.

## Types

No new types. The `MainHeaderNav` module gains a local `const parent: string` inside the function body — no exported type surface.

## File Tree

```
src/
  app/(main)/(private)/
    dashboard/
      page.tsx                                ← MODIFY (one prop edit on the widget)
      tasks/
        page.tsx                              ← MOVED from (private)/tasks/page.tsx
        new/page.tsx                          ← MOVED from (private)/tasks/new/page.tsx
        [id]/page.tsx                         ← MOVED from (private)/tasks/[id]/page.tsx
    tasks/                                    ← DELETED (empty after moves)
  actions/
    createTask.ts                             ← MODIFY (redirect target)
    updateTask.ts                             ← MODIFY (redirect target)
  components/features/
    TaskCard.tsx                              ← MODIFY (template literal)
    TasksList.tsx                             ← MODIFY (Link href)
    MainHeaderNav.tsx                         ← MODIFY (showBack rule + derived back target)
  lib/
    redirect-rules.ts                         ← MODIFY (drop /tasks clauses)
  middleware.ts                               ← MODIFY (drop /tasks matcher entry)

__tests__/
  actions/
    createTask.test.ts                        ← MODIFY (assertion)
    updateTask.test.ts                        ← MODIFY (assertion)
  components/features/
    TaskCard.test.tsx                         ← MODIFY (mockPush assertion + title)
    TasksList.test.tsx                        ← MODIFY (href assertion + title)
    DashboardWidgetCard.test.tsx              ← MODIFY (test-data href cosmetic)
    MainHeaderNav.test.tsx                    ← MODIFY (path shifts + 4 new cases)
  middleware.test.ts                          ← MODIFY (replace /tasks* cases with /dashboard/tasks*)
```

## Build Order

The order minimises intermediate breakage. Intermediate `tsc --noEmit` after step 6.

1. **Move the three page files** via `mv`: `src/app/(main)/(private)/tasks/page.tsx` → `dashboard/tasks/page.tsx`, then `/new/page.tsx`, then `[id]/page.tsx`. After this step, `/dashboard/tasks*` routes exist alongside the now-empty `(private)/tasks/` directory.
2. **Delete the empty `src/app/(main)/(private)/tasks/` directory.** (Use `rmdir` or `rm -d`.)
3. **Edit `src/app/(main)/(private)/dashboard/page.tsx`** — flip the widget href.
4. **Edit `src/actions/createTask.ts`** — flip the redirect target.
5. **Edit `src/actions/updateTask.ts`** — same.
6. **Edit `src/components/features/TaskCard.tsx`** — flip the `router.push` template literal. (Intermediate `tsc --noEmit` after this step; expect the `.next` cache to need a `rm -rf .next` to discard stale generated types pointing at the old `tasks/page.tsx`.)
7. **Edit `src/components/features/TasksList.tsx`** — flip the Link href.
8. **Edit `src/components/features/MainHeaderNav.tsx`** — replace the `showBack` rule + introduce the derived `backTarget` constant + update the back button's `onClick`.
9. **Edit `src/middleware.ts`** — drop the `/tasks/:path*` matcher entry.
10. **Edit `src/lib/redirect-rules.ts`** — drop the `/tasks` clauses from `isPrivate`.
11. **Edit `__tests__/actions/createTask.test.ts`** — flip the assertion.
12. **Edit `__tests__/actions/updateTask.test.ts`** — same.
13. **Edit `__tests__/components/features/TaskCard.test.tsx`** — flip the mockPush argument.
14. **Edit `__tests__/components/features/TasksList.test.tsx`** — flip the href assertion.
15. **Edit `__tests__/components/features/DashboardWidgetCard.test.tsx`** — cosmetic href arg flips.
16. **Edit `__tests__/middleware.test.ts`** — replace `/tasks*` cases with `/dashboard/tasks*` equivalents.
17. **Edit `__tests__/components/features/MainHeaderNav.test.tsx`** — path shifts + new sign-in/sign-up cases + new deeper-parent click case.
18. **Verify**: `npx tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build`. All exit 0. Confirm `next build`'s route table lists `/dashboard`, `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new` and NOT `/tasks` / `/tasks/new` / `/tasks/[id]`.
19. **Diagnostic sweep**: `mcp__ide__getDiagnostics` clean.
20. **Build artefacts**: write `tasks/minor-rework-build-summary.md`, `tasks/minor-rework-test-results.md`, `tasks/minor-rework-review.md`.
