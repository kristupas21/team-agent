# Spec: Tasks Route Refactor + Dashboard Widgets + TaskCard Polish

## Summary
Three threads ship together. **(1) Route reshuffle**: the current `/dashboard` tasks-list page becomes `/tasks` (index). A new lightweight `/dashboard` becomes a widget container — a two-column grid (1 col on mobile) whose only widget is a "Tasks" link card that navigates to `/tasks`. Task-mutation server actions (`createTask`, `updateTask`) redirect to `/tasks` instead of `/dashboard`; sign-in / sign-up keep redirecting to `/dashboard`. **(2) Header back button** is rewired from history-pop to fixed-target: it appears on every `/tasks*` route and navigates to `/dashboard`; it's hidden on `/dashboard`, `/`, `/sign-in`, `/sign-up`. **(3) TaskCard polish**: the Delete button moves to a top-right "actions" position (absolute, inside the Card), the dark-card-hover Delete-icon contrast bug is fixed by a per-instance dark-hover override, and the card now shows an "Updated …" date line under the title using `dateStyle: 'medium'` localised formatting.

## Assumptions

1. **Delete-button positioning** (Open Question #1 default): Option B — absolute-positioned inside `TaskCard`. `Card.tsx` gains no new prop. The TaskCard's outer Card receives `relative` (combined with the existing `group` etc.) and the Delete button gets `absolute top-2 right-2`. The title row no longer contains the Delete button at all; the row collapses to a single `<h3>`.

2. **Delete-button hover-contrast fix** (Open Question #2 default): per-instance via TaskCard's `className` prop on the Delete `<Button>`. The `ghost` variant in `buttonClass.ts` is unchanged. The Delete button's `className` becomes `group-hover:text-neutral-50 group-hover:hover:bg-neutral-700`. On the dark hovered card, the button's own hover background becomes `neutral-700` (dark mid-grey) so the light icon reads clearly. Off-card-hover (light surface), the variant's default `hover:bg-neutral-200` still applies.

3. **Date format** (Open Question #3 default): `new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(updatedAt))` — e.g. `"Jun 5, 2026"`. Locale is fixed to `en-US` to guarantee SSR / client output equality (the page is a server component; running with a non-fixed locale risks hydration mismatch when the dev's machine differs from the user's browser). The format runs at render time, server-side, since the page is async.

4. **Date prefix** (Open Question #4 default): the line reads `"Updated <date>"` e.g. `"Updated Jun 5, 2026"`. Prefix is part of the rendered string; not a separate icon or label component.

5. **Date typography**: `text-sm text-neutral-500 transition-colors group-hover:text-neutral-300`. Positioned directly under the `<h3>` title, above the optional description.

6. **Widget card name** (Open Question #5 default): `DashboardWidgetCard.tsx` under `/components/features/`. Path-wise it sits alongside `TaskCard.tsx` for now. (The architect picks the final path.)

7. **Widget card composition** (Open Question #6 default): re-implemented independently — no shared "card surface" abstraction extracted. The widget card imports `Card` (the UI primitive) directly and applies its own group-hover token set. The styling is small enough (4–5 utility tokens) that a shared abstraction would be premature.

8. **Widget card props**: `Readonly<{ href: string; title: string }>`. No icon, no description, no children. Title is a `<h3>` styled identically to TaskCard's `<h3>` (`text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`). Rendered as `<Link href={href}>`.

9. **Widget card is a server component**. It only wraps a `Link` and applies utility classes — no event handlers, no hooks. The `Link` itself handles client-side navigation.

10. **Back-button mechanism** (Open Question #7 default): `router.push('/dashboard')`. The existing `<Button type="button" aria-label="Back" leftIcon={<MdArrowBack />} onClick={...}>` shape is preserved; only the `onClick` body changes from `() => router.back()` to `() => router.push('/dashboard')`.

11. **Back-button visibility rule**: shown when `pathname === '/tasks' || pathname.startsWith('/tasks/')`. Hidden everywhere else, including `/dashboard`, `/`, `/sign-in`, `/sign-up`. Replaces the current rule `pathname !== '/' && !pathname.startsWith('/dashboard')`.

12. **Back button drops off `/sign-in` and `/sign-up`** (Open Question #8 default). Those pages don't show the button. Their existing affordances (Sign In ↔ Sign Up Links in the nav) are sufficient. This is a behavioural change versus today (today the back button appears on sign-in / sign-up via `router.back()`).

13. **`/dashboard` page widget-grid empty state** (Open Question #9 default): no placeholder / empty card / "Add widget" affordance. Only the Tasks widget is rendered. The two-column grid wrapper is structurally present and will accept future widgets without page-level changes.

14. **`/tasks` page title and `<h1>`**: `<h1>` reads `"Your tasks"` (unchanged from the old dashboard's wording). Metadata `title: 'Tasks'`. Page layout uses the existing `max-w-content` wrapper.

15. **`/dashboard` page title and `<h1>`**: `<h1>` reads `"Dashboard"`. Metadata `title: 'Dashboard'`. Page layout uses the same `max-w-content` wrapper and `space-y-6` rhythm as the tasks page for visual consistency.

16. **Widget-grid layout**: `<div className="grid grid-cols-1 gap-4 md:grid-cols-2">` directly inside the `max-w-content` wrapper. No `AnimatePresence`, no `motion.div` — widgets don't animate (they don't add / remove dynamically yet).

17. **Server-action redirect-target deltas**: `createTaskAction` and `updateTaskAction` change `redirect('/dashboard')` → `redirect('/tasks')`. NEXT_REDIRECT-propagation contract (no try/catch) is unchanged.

18. **Sign-in / sign-up redirect targets stay `/dashboard`**: `signIn` (`redirectTo: '/dashboard'`) and `signUp` (`redirectTo: '/dashboard'`) calls are unchanged.

19. **Middleware matcher and `redirect-rules.ts`**:
    - `src/middleware.ts` matcher: already covers `'/dashboard/:path*'` and `'/tasks/:path*'`. No matcher change needed.
    - `src/lib/redirect-rules.ts` `isPrivate`: already returns true for both. No change.
    - Signed-in redirect target from `/`, `/sign-in`, `/sign-up`: stays `/dashboard`. No change.

20. **Auth flow lands on `/dashboard`**: after sign-in or sign-up the user sees the widget grid, not the tasks list. From there, the user clicks the "Tasks" widget to reach `/tasks`. This is intentional per the brief.

21. **`auth()` guard pattern is duplicated, not abstracted**. Both `/dashboard/page.tsx` and `/tasks/page.tsx` start with the same `const session = await auth(); if (!session?.user) redirect('/')` block. The existing pages already do this; this task does not introduce a shared guard.

22. **`/tasks` page renders the existing `TasksList`** (`'use client'`) unchanged. It receives `initialTasks` from `getTasksForUser(session.user.name)`. The TasksList's "Create new task" Link continues to point at `/tasks/new` (already changed in the previous task).

23. **No data-model change**: `Task` schema unchanged. `TaskDoc.updatedAt` is already populated by Mongoose timestamps. `getTasksForUser` already returns it.

24. **TaskCard description-bottom-spacing**: with the Delete button gone from the title row, the title row simplifies to just `<h3>`. The date line sits directly below the title (`mt-1`). The description (when present) sits below the date (`mt-2`). All three blocks stack inside the Card's existing padding.

25. **TaskCard click target**: the entire Card remains the click target (navigates to `/tasks/[id]`). The absolutely-positioned Delete button sits on top of the Card surface; its existing `event.stopPropagation()` is preserved so that clicking Delete does NOT also navigate.

26. **TaskCard tests adapt for the layout change**: the existing 7 cases stay, with the "Delete button is icon-only via aria-label" assertion now also implicitly asserting the button still exists despite the layout shift. Two new cases land: one for the rendered date line ("Updated <date>"), one for the absolute-positioned class set on the Delete button (`absolute`, `top-2`, `right-2`).

27. **Test category breakdown** (mandatory per CLAUDE.md):
    - Server actions (`createTask`, `updateTask`) — update the assertion `redirect` was called with `'/tasks'` (was `'/dashboard'`). 2 existing tests change one expectation each.
    - Client component changed behaviour (`TaskCard` — gained date row + repositioned Delete): 2 new cases.
    - Client component changed behaviour (`MainHeaderNav` — back-button rule + action target): existing 4 back-button-related cases adapt; 2 new cases land for `/tasks` and `/tasks/<id>` (each asserts the back button is present and that clicking it calls `router.push('/dashboard')`).
    - New UI / server component (`DashboardWidgetCard`): 4 RTL cases — renders the title, renders as a `Link` with the provided `href`, applies the group-hover dark surface, no Delete / description / date rendered.
    - New page (`/dashboard` widget grid): not directly unit-tested at the page level (server components with `auth()` are hard to unit test in isolation per project convention); the route is exercised indirectly via `next build` and the existing middleware suite.

28. **Suite size growth**: roughly +9 tests (4 widget card + 2 TaskCard + 2 MainHeaderNav + adapted action assertions are in-place updates, not new tests; +1 if any case is added for back-button hidden on sign-in / sign-up). Suite total target: ~152 across 22 files (was 143 / 21).

29. **`'use client'` directive count**: unchanged. The new `DashboardWidgetCard` is a server component (no hooks, no event handlers). `TaskCard`, `TasksList`, `TaskForm`, `MainHeaderNav` already carry the directive.

30. **No new dependencies**. `Intl.DateTimeFormat` is built-in. `react-icons` already provides `MdArrowBack`. No new motion / date / icon libraries.

## Open Questions

1. Card actions-slot prop (Option A) vs. absolute positioning inside TaskCard (Option B)? — Assumed: Option B. Alternatives: Option A. Affects: whether `Card.tsx` and `Card.test.tsx` are modified.
2. Hover-contrast fix global vs. local? — Assumed: local override via TaskCard's `className` (`group-hover:hover:bg-neutral-700`). Alternatives: change the `ghost` variant globally. Affects: `buttonClass.ts` and `Button.test.tsx` (or only `TaskCard.tsx`).
3. Date format — `dateStyle: 'medium'` vs. fixed `YYYY-MM-DD` vs. relative? — Assumed: `dateStyle: 'medium'` with fixed `en-US` locale. Alternatives: ISO date / relative time. Affects: TaskCard rendering + the test case that asserts the date string.
4. Date label "Updated …" vs. plain date? — Assumed: prefixed "Updated ". Alternatives: bare date, icon + date, "Last edited …". Affects: copy.
5. Widget card filename and final path? — Assumed: `DashboardWidgetCard.tsx` under `/components/features/`. Alternatives: `WidgetCard.tsx`, `DashboardTile.tsx`, nested under `/components/features/dashboard/`. Affects: import path.
6. Widget card re-implements styling vs. shares with TaskCard? — Assumed: re-implement. Alternatives: extract a shared CardSurface wrapper. Affects: file count and structure.
7. Back-button mechanism — `router.back()` vs. `router.push('/dashboard')` vs. `<Link href="/dashboard">`? — Assumed: `router.push('/dashboard')`. Alternatives: history-pop, semantic Link. Affects: MainHeaderNav code shape and test assertions.
8. Back button on sign-in / sign-up? — Assumed: dropped. Alternatives: keep history-back, render as a Link to `/`. Affects: MainHeaderNav visibility rule and its 2 sign-in/sign-up test cases.
9. Dashboard empty / placeholder widget for "future widgets coming soon"? — Assumed: no placeholder. Alternatives: ghost card / "Add widget" affordance. Affects: dashboard page rendering.

## Routes / Pages

| Path | Type | Title (metadata) | `<h1>` | Auth | Purpose |
|---|---|---|---|---|---|
| `/dashboard` | server component | `Dashboard` | `Dashboard` | private (redirect to `/`) | Widget container. Renders a 2-col (1-col mobile) grid of widget cards. Currently shows only the Tasks widget. |
| `/tasks` | server component | `Tasks` | `Your tasks` | private (redirect to `/`) | Tasks list. Fetches the user's tasks and renders `<TasksList>`. Equivalent to the old `/dashboard` page. |
| `/tasks/new` | server component | (unchanged) | (unchanged) | private | Existing route; behaviour unchanged. The `createTask` action it triggers now redirects to `/tasks`. |
| `/tasks/[id]` | server component | (unchanged) | (unchanged) | private | Existing route; behaviour unchanged. The `updateTask` action it triggers now redirects to `/tasks`. |
| `/` | server component | (unchanged) | (unchanged) | public-only (redirect signed-in users to `/dashboard`) | Unchanged. |
| `/sign-in`, `/sign-up` | server components | (unchanged) | (unchanged) | public-only (redirect signed-in users to `/dashboard`) | Unchanged behaviour at the page level; the header back button no longer renders here. |

## Data

### API Endpoints
None new. `createTask` / `deleteTask` / `updateTask` / `getTaskById` / `getTasksForUser` server actions and DAL helpers are unchanged in shape. Only the redirect targets inside `createTaskAction` and `updateTaskAction` change.

### Data Types
No type changes. The brief surface for reference:

```ts
type TaskDoc = {
  _id: string
  title: string
  description?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

type DashboardWidgetCardProps = Readonly<{
  href: string
  title: string
}>
```

## Components

| Name | Purpose | Props |
|---|---|---|
| `DashboardWidgetCard` (new) | Widget shell — a Card-styled Link with a single title line. No description, no date, no actions. | `Readonly<{ href: string; title: string }>` |
| `TaskCard` (modified) | Existing tasks-list card. New: absolute-positioned Delete (top-right inside Card), "Updated <date>" line under the title, dark-hover-friendly Delete background override. | (no prop change) |
| `MainHeaderNav` (modified) | Existing header nav. New: back-button visibility rule + back-button click action. | (no prop change) |
| `TasksList` (used by `/tasks`) | Existing tasks list. Unchanged. | (no prop change) |

## User Interactions

### Happy path — auth → dashboard → tasks → edit → back
1. User signs in.
2. Browser lands on `/dashboard`. The page shows `<h1>Dashboard</h1>` plus a 2-col grid (1 col mobile) with one widget: a "Tasks" Card.
3. User clicks the Tasks widget.
4. Browser navigates to `/tasks`. Header shows the back button (top-left of the header).
5. User clicks a task in the list. Browser navigates to `/tasks/[id]`. Back button is still present in the header.
6. User edits the task and clicks "Save Task". The `updateTask` action runs and `redirect('/tasks')` fires. Browser lands back on `/tasks`. Header back button still present.
7. User clicks the back button. Browser navigates to `/dashboard`. Back button disappears.

### Happy path — create task
1. From `/tasks`, user clicks the "Create new task" link.
2. Browser navigates to `/tasks/new`. Back button is present in the header.
3. User fills the form and submits. `createTask` action runs and `redirect('/tasks')` fires. Browser lands on `/tasks`.

### Failure path — task not found at edit
1. User navigates to `/tasks/<non-existent-id>`.
2. The `getTaskById` DAL returns null. The page calls `notFound()`. Custom 404 page renders. (Existing behaviour.)

### Failure path — unauthenticated
1. Unauthenticated user attempts to load `/dashboard`, `/tasks`, `/tasks/new`, or `/tasks/<id>`.
2. Middleware redirects to `/`. (Existing behaviour.)

### Failure path — task list empty
1. User reaches `/tasks` with no tasks of their own.
2. `TasksList` renders only the "Create new task" Link card (existing behaviour). The header back button is still present.

### Failure path — task delete from `/tasks`
1. User hovers a TaskCard. The card surface goes dark; title and description text turn light; the Delete icon (top-right) turns light.
2. User hovers the Delete button itself. The button's background turns dark-mid-grey (`neutral-700`), preserving contrast with the light icon. No light-on-light blend.
3. User clicks Delete. `event.stopPropagation()` prevents navigation; `deleteTaskAction` fires; on success the card is removed from the DOM (existing behaviour).

## States

### `/dashboard` page
- **Authenticated**: renders `<h1>Dashboard</h1>` and a 2-col grid with one widget: the Tasks card.
- **Unauthenticated**: middleware redirects to `/` before page renders.
- **No error state**: no data fetched on this page (no server-side queries beyond `auth()`).

### `/tasks` page
- **Authenticated, has tasks**: renders `<h1>Your tasks</h1>` and the `TasksList` with all the user's tasks plus the "Create new task" card.
- **Authenticated, no tasks**: renders `<h1>Your tasks</h1>` and the `TasksList` with only the "Create new task" card.
- **Unauthenticated**: middleware redirects to `/`.

### `DashboardWidgetCard`
- **Idle**: light card surface, dark title.
- **Hover**: dark card surface (`hover:bg-neutral-900`), light title (`group-hover:text-neutral-50`). Smooth `transition-colors`.
- **Focus** (keyboard): the Link receives focus ring inherited from the Card's interactive state. (No custom focus ring beyond Tailwind defaults.)

### `TaskCard`
- **Idle**: light card surface; dark title; small `Updated <date>` line in `neutral-500`; description (if present) in `neutral-500`; Delete icon top-right in `neutral-700` on a transparent button.
- **Card hover**: dark card surface; title → `neutral-50`; date → `neutral-300`; description → `neutral-200`; Delete icon → `neutral-50`.
- **Delete-button hover (on a hovered card)**: button background → `neutral-700`; icon remains `neutral-50`. Contrast preserved.
- **Deleting**: Button's `loading` prop shows the spinner; existing behaviour.

### `MainHeaderNav` back button
- **On `/tasks*`**: visible. Clicking calls `router.push('/dashboard')`.
- **On `/dashboard`, `/`, `/sign-in`, `/sign-up`**: hidden.

## Acceptance Criteria

### Route reshuffle
1. Given the user is authenticated, when they navigate to `/dashboard`, then the page renders `<h1>Dashboard</h1>` and a `grid-cols-1 md:grid-cols-2` container with exactly one widget card whose title is "Tasks".
2. Given the user is authenticated, when they navigate to `/tasks`, then the page renders `<h1>Your tasks</h1>` and the existing `TasksList` populated with their tasks.
3. Given the user is on `/dashboard`, when they click the Tasks widget, then the browser navigates to `/tasks`.
4. Given the user is unauthenticated, when they navigate to `/dashboard`, then middleware redirects them to `/`.
5. Given the user is unauthenticated, when they navigate to `/tasks`, then middleware redirects them to `/`.
6. Given the user signs in successfully, when the sign-in action completes, then the browser lands on `/dashboard` (NOT `/tasks`).
7. Given the user signs up successfully, when the sign-up action completes, then the browser lands on `/dashboard`.

### Task-action redirects
8. Given the user submits the create-task form, when `createTaskAction` returns successfully, then `redirect('/tasks')` is called (NOT `/dashboard`).
9. Given the user submits the edit-task form, when `updateTaskAction` returns successfully, then `redirect('/tasks')` is called.
10. Given the `createTask` / `updateTask` redirect calls fire, when the NEXT_REDIRECT error is thrown, then it propagates out of the action (no try/catch swallows it).

### Header back button
11. Given the user is on `/tasks`, when the header renders, then a back button is visible (icon-only with `aria-label="Back"`).
12. Given the user is on `/tasks/new` or `/tasks/<id>`, when the header renders, then a back button is visible.
13. Given the user is on `/dashboard`, when the header renders, then a back button is NOT visible.
14. Given the user is on `/`, `/sign-in`, or `/sign-up`, when the header renders, then a back button is NOT visible.
15. Given the back button is visible, when the user clicks it, then `router.push('/dashboard')` is called.

### TaskCard polish
16. Given a TaskCard renders, when it appears in the DOM, then the Delete button is absolutely positioned at the top-right of the Card surface (classes include `absolute`, `top-2`, `right-2`).
17. Given a TaskCard renders, when it appears in the DOM, then a date line `Updated <Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(updatedAt)>` is visible below the title.
18. Given the date line renders, when it appears in the DOM, then its classes include `text-sm text-neutral-500 transition-colors group-hover:text-neutral-300`.
19. Given a TaskCard is hovered (dark surface state via `group-hover:bg-neutral-900`), when the user further hovers the Delete button, then the button's background becomes `neutral-700` (verified via class assertion `group-hover:hover:bg-neutral-700`).
20. Given the user clicks the Delete button, when the click fires, then `event.stopPropagation()` runs BEFORE `onDelete(task._id)` and the parent card click handler does NOT trigger.

### Widget card
21. Given `DashboardWidgetCard` renders with `href="/tasks"` and `title="Tasks"`, when it appears in the DOM, then it renders as a `Link` with `href="/tasks"` and visible text "Tasks".
22. Given `DashboardWidgetCard` renders, when it appears in the DOM, then it does NOT render a description, a date line, or a Delete button.
23. Given `DashboardWidgetCard` renders, when the DOM is inspected, then the title element's classes include `group-hover:text-neutral-50` and the Card root's classes include `group hover:bg-neutral-900`.

### Build & quality
24. Given the code is built, when `npx tsc --noEmit` runs, then exit code is 0.
25. Given the code is built, when `npx next lint` runs, then no errors or warnings are reported.
26. Given the code is built, when `npm run test:run` runs, then all tests pass and the suite total is ≥ 152 across ≥ 22 files.
27. Given the code is built, when `npx next build` runs, then exit code is 0 and the route table lists both `/dashboard` and `/tasks` (along with `/tasks/[id]` and `/tasks/new`).

### Forbidden-pattern compliance
28. The codebase contains zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router` imports, `window.location` for redirects, `React.*` namespace references, or `Readonly<{}>` empty-prop types.

### Code layout
29. Visual rhythm is honoured in all new and modified files.
