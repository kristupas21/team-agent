# Build Plan: Tasks Route Refactor + Dashboard Widgets + TaskCard Polish

## Overview
Two new files (a server-component widget card + a `/tasks` page) and one fresh `/dashboard` page replace the existing tasks-list-at-dashboard layout. The bulk of the work is small surgical edits: two server actions retarget their redirect, `MainHeaderNav` flips back-button semantics from `router.back()` to `router.push('/dashboard')` with a `/tasks*` visibility rule, and `TaskCard` absolutely-positions its Delete button + gains an "Updated <date>" row. No new dependencies, no model changes, no middleware changes.

## Reuse

- `src/lib/auth.ts` — `auth()` helper for the new `/dashboard` and `/tasks` pages. Unchanged.
- `src/lib/tasks.ts` — `getTasksForUser(name)`. Unchanged. Returns `TaskDoc[]` including `updatedAt`.
- `src/middleware.ts` — already matches `/dashboard/:path*` and `/tasks/:path*`. **Unchanged.**
- `src/lib/redirect-rules.ts` — already treats both as private; signed-in target is `/dashboard`. **Unchanged.**
- `src/components/features/TasksList.tsx` — the existing `'use client'` component. Used by the new `/tasks/page.tsx` exactly as it was used by the old dashboard page.
- `src/components/ui/Card.tsx` — used as-is by `DashboardWidgetCard` and `TaskCard`. **Unchanged.**
- `src/components/ui/Button.tsx` and `src/components/ui/buttonClass.ts` — used as-is. **Unchanged** (the per-instance dark hover lives on TaskCard's consumer-className, not in the variant).
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `deleteTask.ts` — unchanged.
- `src/models/Task.ts` — unchanged.
- `react-icons/md` — already imported elsewhere; no new deps. `MdArrowBack` and `MdClose` are already in use.

## Files to Create

### `src/components/features/DashboardWidgetCard.tsx`
- **Path**: `src/components/features/DashboardWidgetCard.tsx`
- **Type**: component (server component — no `'use client'`)
- **Purpose**: Card-styled internal link with a single title line. Used as the visual shell for any dashboard widget. Currently used only for the "Tasks" widget.
- **Key signature**:
  ```ts
  type DashboardWidgetCardProps = Readonly<{ href: string; title: string }>
  export default function DashboardWidgetCard(props: DashboardWidgetCardProps): JSX.Element
  ```
- **Render shape** (structural only — the builder writes the JSX):
  - A `Link` from `next/link` with `href={href}`, wrapping a `Card` with the consumer className `'group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'`. The Card's children: a single `<h3>` with classes `'text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50'` containing `{title}`.
- **Reference pattern**: `src/components/features/TaskCard.tsx` — same dark-hover token set on the Card root and the `<h3>`. The difference is no Delete button, no description, no date, and the outer is a `Link` (not a click handler).

### `src/app/(main)/(private)/tasks/page.tsx`
- **Path**: `src/app/(main)/(private)/tasks/page.tsx`
- **Type**: page (server component)
- **Purpose**: Tasks list page (replaces the old `/dashboard` page content).
- **Key signature**: `export default async function TasksPage(): Promise<JSX.Element>` plus `export const metadata: Metadata = { title: 'Tasks' }`.
- **Render shape** (structural):
  - `auth()` guard → `redirect('/')` when no `session?.user?.name`.
  - `const tasks = await getTasksForUser(session.user.name)`.
  - Wraps `<main className="min-h-screen p-4 md:p-8">` containing `<div className="mx-auto max-w-content space-y-6">` containing `<h1 className="font-display text-4xl text-neutral-900">Your tasks</h1>` and `<TasksList initialTasks={tasks} />`.
- **Reference pattern**: the existing `src/app/(main)/(private)/dashboard/page.tsx` BEFORE this task. The new file is structurally identical to the pre-task dashboard, with only the metadata title flipping from `'Dashboard'` to `'Tasks'`.

## Files to Modify

### `src/app/(main)/(private)/dashboard/page.tsx` (rewrite)
- **What changes**: rewrite the page to a widget grid.
- **Why**: the old "tasks list at /dashboard" content moves to `/tasks/page.tsx`. The new dashboard renders only a widget grid containing the Tasks widget.
- **Render shape** (structural):
  - `metadata: { title: 'Dashboard' }` (unchanged).
  - `async function DashboardPage()`.
  - `auth()` guard → `redirect('/')` when no `session?.user`.
  - Renders `<main className="min-h-screen p-4 md:p-8">` → `<div className="mx-auto max-w-content space-y-6">` → `<h1 className="font-display text-4xl text-neutral-900">Dashboard</h1>` → `<div className="grid grid-cols-1 gap-4 md:grid-cols-2">` containing a single `<DashboardWidgetCard href="/tasks" title="Tasks" />`.
  - Removes the existing import of `getTasksForUser` and `TasksList`.

### `src/components/features/TaskCard.tsx`
- **What changes**: three edits.
  1. Outer `Card` gains `relative` in its consumer className so the absolutely-positioned Delete can anchor to it. Drop `md:max-w-none` — keep, plus add `relative`. New className string: `'group relative h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'`.
  2. The title row collapses: drop the `flex items-start justify-between gap-2` wrapper `<div>` around the `<h3>`. The `<h3>` becomes a direct child of the Card.
  3. The Delete `<Button>` moves out of the (now removed) title row to be a sibling of the `<h3>` inside the Card body. Its className becomes `'absolute top-2 right-2 group-hover:text-neutral-50 group-hover:hover:bg-neutral-700'`. All other props (`variant="ghost"`, `aria-label="Delete"`, `leftIcon={<MdClose />}`, `loading={isDeleting}`, `onClick={handleDeleteClick}`) stay.
  4. Insert a date line immediately after the `<h3>`: a `<p>` with classes `'mt-1 text-sm text-neutral-500 transition-colors group-hover:text-neutral-300'` and content `Updated {formatTaskDate(task.updatedAt)}` where `formatTaskDate` is defined locally inside the same module (a small module-level const fn — see Types below).
  5. The optional description `<p>` keeps its existing classes and structure but moves to sit below the date line (its `mt-2` is unchanged).
- **Why**: realises ACs 16–20 from the spec.

### `src/components/features/MainHeaderNav.tsx`
- **What changes**: two edits.
  1. Replace the `showBack` rule. Was: `pathname !== '/' && !pathname.startsWith('/dashboard')`. New: `pathname === '/tasks' || pathname.startsWith('/tasks/')`.
  2. Replace the back button's `onClick` body. Was: `() => router.back()`. New: `() => router.push('/dashboard')`.
- **Why**: realises ACs 11–15.

### `src/actions/createTask.ts`
- **What changes**: one line. `redirect('/dashboard')` → `redirect('/tasks')`.
- **Why**: AC 8.

### `src/actions/updateTask.ts`
- **What changes**: one line. `redirect('/dashboard')` → `redirect('/tasks')`.
- **Why**: AC 9.

### Tests — files to modify

#### `__tests__/components/features/TaskCard.test.tsx`
- **What changes**: keep the existing 7 cases (no removal). Add 2 new cases:
  1. "renders the Updated date line below the title with locale-formatted date" — asserts the date `<p>` is in the DOM with text matching `/^Updated /` and contains a non-empty date string derived from `task.updatedAt`. Assert the classes include `text-sm` and `text-neutral-500`.
  2. "positions the Delete button absolutely at the top-right of the Card" — asserts the Delete button's classList contains `absolute`, `top-2`, `right-2`. (RTL: query the button by `aria-label`, then assert `toHaveClass(...)`.)
- **Why**: covers ACs 16–18.

#### `__tests__/components/features/MainHeaderNav.test.tsx`
- **What changes**:
  - Mock module update: replace `useRouter: () => ({ back: mockBack, push: vi.fn(), replace: vi.fn() })` with a hoisted `mockPush = vi.fn()` and `useRouter: () => ({ back: vi.fn(), push: mockPush, replace: vi.fn() })`. Remove `mockBack` references.
  - Existing case "calls router.back() exactly once when the Back button is clicked on /sign-in" → REWORK: the new behaviour drops the Back button on `/sign-in`. Replace this case with "does NOT render the Back button on /sign-in".
  - Existing case "renders Sign In as a disabled button and Sign Up as a link on /sign-in" → adjust its trailing `expect(...Back...).toBeInTheDocument()` to `toBeNull()`.
  - Existing case "renders Sign Up as a disabled button and Sign In as a link on /sign-up" → adjust same trailing Back assertion to `toBeNull()`.
  - Existing case "does NOT render the Back button on /" — unchanged.
  - Existing case "does NOT render the Back button on /dashboard" — unchanged.
  - Existing case "does NOT render the Back button on nested /dashboard/sub paths" — unchanged.
  - Existing case "renders the Sign Out form-button and NOT Sign In / Sign Up on /dashboard" — unchanged.
  - Existing case "renders the Sign Out form without crashing when userName is omitted" — unchanged.
  - Existing "renders both Sign In and Sign Up as enabled links on /" — unchanged.
  - Add 3 new signed-in cases under the existing `describe('MainHeaderNav — signed-in')` block:
    1. "renders the Back button on /tasks" (signedIn, setPath('/tasks'), expect button in document).
    2. "renders the Back button on /tasks/<id> and /tasks/new" (parameterized via two cases or one combined — combined is fine: setPath('/tasks/abc123'); then re-render after setPath('/tasks/new'); both checks).
    3. "calls router.push('/dashboard') exactly once when the Back button is clicked on /tasks" (setPath('/tasks'), click the Back button, expect `mockPush.toHaveBeenCalledWith('/dashboard')` and `mockPush.toHaveBeenCalledTimes(1)`).
- **Net change**: 9 existing cases stay (with 3 minor assertion tweaks), 1 existing case rewords, 3 new cases land. Total cases: 13 (was 9 — wait, let me recount the original file: 5 signed-out + 4 signed-in = 9). New total: 12 cases (9 + 3 new, with 1 of the 9 reworked but still present as a different assertion).
- **Why**: covers ACs 11–15.

#### `__tests__/actions/createTask.test.ts`
- **What changes**: one line in the success-path test. The assertion `expect(redirect).toHaveBeenCalledWith('/dashboard')` becomes `expect(redirect).toHaveBeenCalledWith('/tasks')`.
- **Why**: AC 8.

#### `__tests__/actions/updateTask.test.ts`
- **What changes**: one line in the success-path test. The assertion `expect(redirect).toHaveBeenCalledWith('/dashboard')` becomes `expect(redirect).toHaveBeenCalledWith('/tasks')`.
- **Why**: AC 9.

### Tests — files to create

#### `__tests__/components/features/DashboardWidgetCard.test.tsx`
- **What it covers**: 4 RTL cases:
  1. "renders the title as a heading" — assert `getByRole('heading', { name: 'Tasks' })` is in the document when rendered with `title="Tasks"`.
  2. "renders as a Link pointing at href" — assert `getByRole('link', { name: /tasks/i })` has `href="/tasks"` when rendered with `href="/tasks"`.
  3. "applies the dark-hover styling tokens" — assert the heading's classList contains `group-hover:text-neutral-50` and the rendered Card's classList contains `group` and `hover:bg-neutral-900`.
  4. "does NOT render a description, date, or Delete button" — assert `queryByText(/updated/i)` is null, `queryByRole('button', { name: /delete/i })` is null, and the only paragraph (if any) doesn't carry the date / description signature.

## Data Flow

- **`/dashboard`** — server component. `auth()` runs server-side. No data fetched beyond the session. Renders a static widget grid with one `DashboardWidgetCard` referencing `/tasks`.
- **`/tasks`** — server component. `auth()` + `getTasksForUser(session.user.name)` server-side. Tasks passed to `<TasksList initialTasks={tasks} />`.
- **TaskCard date** — formatted at render time inside `TaskCard.tsx`. No client-side mutation, no `useState`. Locale is fixed to `en-US` to avoid SSR/CSR hydration mismatch (see Open Question #3 default in the spec).
- **Delete and create mutations** — unchanged at the action layer; only their redirect targets shift.

## State Management

- **Server state**: tasks list still fetched in the new `/tasks/page.tsx` via direct `getTasksForUser` call (server component). No new library.
- **Client/UI state**: `DashboardWidgetCard` has no state (pure render). `TaskCard` keeps its existing prop-driven render. `MainHeaderNav` keeps its existing `usePathname()` + `useRouter()` hooks.
- **Global state**: none. Not justified.

## Types

Inside `src/components/features/DashboardWidgetCard.tsx`:
```ts
type DashboardWidgetCardProps = Readonly<{ href: string; title: string }>
```

Inside `src/components/features/TaskCard.tsx` (module-private helper):
```ts
const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

function formatTaskDate(input: Date | string): string {
  return dateFormatter.format(input instanceof Date ? input : new Date(input))
}
```
The `Date | string` accommodation handles the fact that `getTasksForUser` returns `lean()` docs which Mongoose may serialise as either `Date` or ISO string depending on JSON round-trip. The DAL coerces nothing for date fields, so accepting both is robust.

No other new types. The `Readonly<{ href; title }>` shape and the module-level formatter are the entire type surface.

## File Tree

```
src/
  app/(main)/(private)/
    dashboard/
      page.tsx                                 ← REWRITE (widget grid)
    tasks/
      page.tsx                                 ← NEW (tasks list)
      new/page.tsx                             ← unchanged
      [id]/page.tsx                            ← unchanged
  components/features/
    DashboardWidgetCard.tsx                    ← NEW
    TaskCard.tsx                               ← MODIFY (Delete position, date line)
    MainHeaderNav.tsx                          ← MODIFY (back-button rule + action)
  actions/
    createTask.ts                              ← MODIFY (redirect target)
    updateTask.ts                              ← MODIFY (redirect target)

__tests__/
  components/features/
    DashboardWidgetCard.test.tsx               ← NEW (4 cases)
    TaskCard.test.tsx                          ← MODIFY (+2 cases)
    MainHeaderNav.test.tsx                     ← MODIFY (rule + push assertions)
  actions/
    createTask.test.ts                         ← MODIFY (redirect-target assertion)
    updateTask.test.ts                         ← MODIFY (redirect-target assertion)
```

## Build Order

The order minimises intermediate breakage. Run `tsc --noEmit` after step 6 (sanity), step 9 (after page move), and the final step.

1. **Rewrite `src/app/(main)/(private)/dashboard/page.tsx`** to its new widget-grid shape, but stub the `DashboardWidgetCard` import with a temporary `() => null` placeholder *inline* (so the import path doesn't break compilation before step 2 lands). Actually skip this; do step 2 first.
2. **Create `src/components/features/DashboardWidgetCard.tsx`** with its full implementation. Compile-only — no tests yet.
3. **Create `src/app/(main)/(private)/tasks/page.tsx`** with its full implementation. This duplicates the current `/dashboard/page.tsx`'s logic; the original `/dashboard/page.tsx` still exists at this step. Intermediate `tsc` check is safe — there's no route conflict (different paths).
4. **Rewrite `src/app/(main)/(private)/dashboard/page.tsx`** to the widget grid. After this step, `/dashboard` and `/tasks` both work; `/dashboard` shows the widget, `/tasks` shows the list.
5. **Edit `src/actions/createTask.ts`** — flip `redirect` target.
6. **Edit `src/actions/updateTask.ts`** — flip `redirect` target. (Intermediate `tsc --noEmit` after step 6.)
7. **Edit `src/components/features/TaskCard.tsx`** — the 3 visual changes (absolute Delete, date line, classes). Add the module-private `formatTaskDate` helper.
8. **Edit `src/components/features/MainHeaderNav.tsx`** — the `showBack` rule and the back-button `onClick`.
9. **Edit `__tests__/actions/createTask.test.ts`** — flip the `'/dashboard'` assertion to `'/tasks'`. Run `npm run test:run -- __tests__/actions/createTask.test.ts`.
10. **Edit `__tests__/actions/updateTask.test.ts`** — flip the `'/dashboard'` assertion to `'/tasks'`. Run the same scoped test.
11. **Edit `__tests__/components/features/TaskCard.test.tsx`** — add the 2 new cases. Run scoped test.
12. **Create `__tests__/components/features/DashboardWidgetCard.test.tsx`** — write the 4 cases. Run scoped test.
13. **Edit `__tests__/components/features/MainHeaderNav.test.tsx`** — replace `mockBack` with `mockPush`, adjust the 3 existing assertions, replace the `/sign-in` back-click test with a "does NOT render Back on /sign-in" case, and add the 3 new `/tasks*` cases.
14. **Verify**: `npx tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build`. All four must exit 0. Inspect the build's route table to confirm both `/dashboard` and `/tasks` appear.
15. **Diagnostic sweep**: `mcp__ide__getDiagnostics` clean.
16. **Build artefacts**: write `tasks/tasks-route-build-summary.md`, `tasks-route-test-results.md`, `tasks-route-review.md` to align with the established pipeline outputs.
