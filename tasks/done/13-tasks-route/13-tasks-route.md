# Tasks Route Refactor + TaskCard Polish + Dashboard Widgets

## Description

Three threads ship together. **(1) Route reshuffle**: the current `/dashboard` route (the tasks list page) becomes `/tasks`. A new lightweight `/dashboard` page emerges as a widget container — its first and only widget for now is a "Tasks" link card that navigates to `/tasks`. Action redirects branch: auth (sign-in / sign-up) keeps redirecting to `/dashboard`; task mutations (create + update) now redirect to `/tasks` instead. **(2) Header back button**: pages under `/tasks` get a back button that returns to `/dashboard`; `/dashboard` itself has no back button. **(3) TaskCard polish**: the Delete button moves to a top-right "actions" slot on the Card (instead of sitting in the body flow), the dark-hover Delete-icon contrast bug is fixed, and the card now shows a small "updated" date under the title.

## Scope

### In scope
- Move the existing `/dashboard` tasks-list page to `/tasks` (index route).
- Create a new `/dashboard` page containing a two-column grid (1 column on mobile) with a single "Tasks" widget card that links to `/tasks`.
- Update server-action redirect targets: `createTask` and `updateTask` redirect to `/tasks` instead of `/dashboard`. Sign-in / sign-up redirects stay at `/dashboard`.
- Update middleware matcher + `redirect-rules.ts` `isPrivate` to cover both `/dashboard` and `/tasks` as private routes (`/tasks/:path*` is already covered after `12-tasks-edit`; only `/dashboard` semantics change).
- Update the header back-button rule so the button shows on every `/tasks*` route and navigates to `/dashboard`. Dashboard itself remains back-button-less.
- TaskCard delete button: re-position to the top-right corner of the Card surface (not in the flex row of the title). The spec-agent decides between (a) a new generic Card "actions" slot prop or (b) absolute-positioned in-card placement — see Open Questions.
- TaskCard delete button hover: fix the light-on-light contrast bug. When the card is hovered (dark surface, light icon), the button's own `:hover` background must not blend with the icon colour.
- TaskCard shows the task date below the title — small text, neutral colour. Use `updatedAt` (which equals `createdAt` for never-edited tasks under Mongoose timestamps).

### Out of scope
- Adding any second widget to `/dashboard`. The two-column grid is structurally present but only renders the "Tasks" widget.
- Pagination, sort, filter, or search on `/tasks`.
- Permission / sharing / multi-user views.
- Toast / inline success feedback after create / update — the redirect itself is the feedback.
- A dedicated `/tasks/[id]` "view" mode separate from the existing edit form.

## Pages

### `/tasks` (index — was `/dashboard`)
- Server component. `auth()` guard → redirect to `/` when no session.
- Reads the user's tasks via `getTasksForUser(session.user.name)`.
- Renders the existing `TasksList` component with the same `max-w-content` layout that the old dashboard had.
- Page title `<h1>` stays "Your tasks" (or equivalent — same wording the old dashboard used).
- Metadata title: "Tasks" (was "Dashboard" on the old page).

### `/dashboard` (new — widget container)
- Server component. `auth()` guard → redirect to `/` when no session.
- Renders a two-column grid (`grid-cols-1 md:grid-cols-2`) of widget cards inside the same `max-w-content` wrapper.
- The first (and currently only) widget is a "Tasks" card: same visual shell as `TaskCard` (Card primitive, same hover behaviour, same title typography) but **rendered as a `Link` to `/tasks`** with no delete button, no description, no date — just the title. The card title is "Tasks".
- Page title `<h1>`: "Dashboard".
- Metadata title: "Dashboard".

### `/tasks/[id]` and `/tasks/new`
- Unchanged at the page level (they already live under `/tasks`).
- Their `createTaskAction` / `updateTaskAction` server actions will now redirect to `/tasks` instead of `/dashboard` (covered under Server Actions below).

## Server Actions

- `src/actions/createTask.ts` — change `redirect('/dashboard')` → `redirect('/tasks')`. Same NEXT_REDIRECT-propagation contract (no try/catch).
- `src/actions/updateTask.ts` — same change.
- `src/actions/signIn.ts` — keeps `redirectTo: '/dashboard'`. No change.
- `src/actions/signUp.ts` — keeps `redirectTo: '/dashboard'`. No change.

## Components

### `TaskCard.tsx` (modified)
Three changes:

1. **Delete button position** — moves out of the title row's flex into a top-right "actions" position on the Card. Decision pending between two implementations (see Open Questions):
   - **Option A**: extend `src/components/ui/Card.tsx` with an optional `actions?: ReactNode` prop that renders the node in an absolute-positioned top-right slot. The TaskCard passes its Delete button as `actions`.
   - **Option B**: keep `Card.tsx` unchanged; inside `TaskCard`, place the Delete button inside the Card body with `absolute top-2 right-2` (or similar tokens). Card itself needs `relative`.
2. **Delete button hover contrast** — when the card is hovered, the icon turns light (`group-hover:text-neutral-50`); the button's own `:hover` background must therefore become dark, not light. Currently the `ghost` variant uses `hover:bg-neutral-200` which blends with the light icon. Fix path TBD by the spec-agent:
   - Adjust the `ghost` variant globally to a dark-friendly hover (risk: affects any other ghost-button consumer — there are none today, but it's the broader change).
   - Override per-instance via the consumer `className` on the TaskCard's Delete button (e.g. `group-hover:hover:bg-neutral-700` or `hover:bg-neutral-200 group-hover:hover:bg-neutral-700`). Tighter scope; preferred default.
3. **Date under title** — render `task.updatedAt` formatted as a small line beneath the title. Visual spec:
   - Format: locale-aware short date (e.g. `Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })` or a similar fixed format). The spec-agent picks the exact format.
   - Typography: `text-sm text-neutral-500` base; with `group-hover:text-neutral-300` (or equivalent light token) on dark card hover.
   - Positioned directly under the `<h3>` title, before the description paragraph.
   - Always present (every task has `updatedAt`, even for never-edited tasks where it equals `createdAt`).

### `DashboardWidgetCard.tsx` (new — name TBD by spec-agent)
- `'use client'` is NOT required if the card is a plain `Link`-rendered Card with no event handlers — server component preferred.
- Wraps the existing `Card` primitive with a single child line: the title.
- Renders as `<Link href={href}>` (or via `asChild`-style composition — spec-agent picks).
- Same visual treatment as `TaskCard`: Card surface, group-hover dark surface, light title on hover. NO description, NO date, NO delete button.
- Props: `href: string`, `title: string`. That's the minimum; the spec-agent decides if `icon` or `description` should be optional knobs for future widgets.

### `MainHeaderNav.tsx` (modified — back button semantics)
Two changes:

1. **Back button visibility rule** — current rule is `pathname !== '/' && !pathname.startsWith('/dashboard')`. New rule should:
   - NOT show the back button on `/dashboard`, `/`, `/sign-in`, `/sign-up`.
   - Show the back button on every `/tasks*` route (so `/tasks`, `/tasks/new`, `/tasks/[id]`).
2. **Back button action** — currently `router.back()` (browser-history pop). For the new fixed-target behaviour, the back button on `/tasks*` routes navigates to `/dashboard`. Decision pending (see Open Questions): keep `router.back()` versus switch to `router.push('/dashboard')` versus render as a `<Link href="/dashboard">`. The draft says "back button that redirects to dashboard" — that reads as "go to /dashboard regardless of history". Lean: `router.push('/dashboard')` so it's still keyboard-focusable as a button (matches the existing `aria-label="Back"` button affordance).

Note for the spec-agent: the existing sign-in / sign-up pages also rely on the back button. Today it uses `router.back()` and works for them because they're not `/dashboard`. With the new fixed-target back rule, `/sign-in` and `/sign-up` would either lose the back button entirely or need a separate rule. The simplest interpretation of the draft: the back button is now a "go to dashboard" navigation aid for private task pages, not a generic history-back affordance. On sign-in / sign-up the button should not show at all (those routes have their own context). The spec-agent confirms.

## Data

No model / DAL / schema changes. `TaskDoc.updatedAt` is already populated by Mongoose timestamps (`{ timestamps: true }` in `src/models/Task.ts`). `getTasksForUser` already returns it via `.lean()`.

## Auth & Middleware

- `src/middleware.ts` matcher: must continue to cover both `/dashboard/:path*` and `/tasks/:path*`. Both are private. No change expected to the matcher list itself.
- `src/lib/redirect-rules.ts`:
  - `isPrivate`: still matches both `/dashboard*` and `/tasks*`. No change.
  - Signed-in redirect target from `/`, `/sign-in`, `/sign-up`: currently `/dashboard`. Stays `/dashboard` (auth lands on the dashboard, not the tasks list — matches the auth-action redirects above).
- No new auth surface. `auth()` calls in pages and actions are unchanged in shape; only the redirect destinations move (in the task-mutation actions only).

## Folder / File Touch Points

Rough sketch — the architect picks final paths.

```
/src
  /actions
    createTask.ts                       ← edit: redirect target /dashboard → /tasks
    updateTask.ts                       ← edit: redirect target /dashboard → /tasks
  /app/(main)/(private)
    dashboard/page.tsx                  ← REWRITE: widget grid containing a Tasks widget
    tasks/page.tsx                      ← NEW: tasks list page (content moved from old dashboard)
  /components/features
    TaskCard.tsx                        ← edit: delete-button position, hover fix, date row
    DashboardWidgetCard.tsx             ← NEW (name TBD): widget-shell Link-Card primitive
    MainHeaderNav.tsx                   ← edit: back-button visibility rule + action target
  /components/ui
    Card.tsx                            ← maybe edit: add `actions` slot prop (Option A)
                                        OR no edit (Option B — absolute positioning in TaskCard)
  /lib
    (no changes expected to redirect-rules.ts; both /dashboard and /tasks already covered)
__tests__
  /actions
    createTask.test.ts                  ← edit: assert redirect target = '/tasks'
    updateTask.test.ts                  ← edit: assert redirect target = '/tasks'
  /components/features
    TaskCard.test.tsx                   ← edit: delete-button position assertions, date-line assertions
    DashboardWidgetCard.test.tsx        ← NEW: widget card behaviour
    MainHeaderNav.test.tsx              ← edit: back-button rule cases (/tasks* shows, /dashboard hides)
  /components/ui
    Card.test.tsx                       ← maybe edit: `actions` slot rendering (Option A only)
```

## Open Questions

The spec-agent picks defaults and flags assumptions:

1. **Card `actions` slot vs. absolute positioning in TaskCard.** Option A (Card gains an `actions?: ReactNode` prop, slot rendered absolute top-right) keeps positioning concerns in the primitive and makes the pattern reusable for future cards. Option B (TaskCard alone handles `absolute top-2 right-2` plus `relative` on the Card) is a smaller diff and avoids touching the primitive. Lean: Option B (smaller diff, no API surface area added until a second consumer needs it).

2. **Delete-button hover-contrast fix scope.** Adjust the `ghost` variant in `buttonClass.ts` (global) vs. override per-instance via TaskCard's `className` prop (local). Lean: local override — the contrast issue is specific to TaskCard's dark-on-hover surface; the ghost variant is fine on light backgrounds.

3. **Date format on TaskCard.** `Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })` (e.g. "Jun 5, 2026") vs. a fixed format like `YYYY-MM-DD` vs. relative ("3 days ago"). Lean: `dateStyle: 'medium'` — readable, locale-aware, no extra dep. Note: rendered on the server (the page is a server component); SSR / client output must agree to avoid hydration mismatch. The spec-agent confirms hydration safety.

4. **Date label**. Just the date alone, or prefixed ("Updated …")? Lean: prefixed with "Updated " for clarity since `updatedAt === createdAt` for never-edited tasks anyway.

5. **Widget card name**. `DashboardWidgetCard.tsx`? `WidgetCard.tsx`? `DashboardTile.tsx`? Lean: `DashboardWidgetCard.tsx` (descriptive; survives the eventual move into a `/components/features/dashboard/` subfolder if a second widget arrives). The spec-agent confirms.

6. **Widget card composition vs. fork.** Should the widget card import the existing `TaskCard` styling pattern (extract a shared "card surface" component), or re-implement the styling independently? Lean: re-implement (the visual rules are 4–5 utility tokens; a shared component for two consumers is premature abstraction). The spec-agent confirms.

7. **Back-button mechanism on `/tasks*`**. `router.back()` (history-pop) vs. `router.push('/dashboard')` (fixed target) vs. `<Link href="/dashboard">`. The draft says "redirects to dashboard" — fixed target. Lean: `router.push('/dashboard')` to preserve the button affordance + `aria-label="Back"`. Note: this is a semantic change from "history back" to "go to dashboard" — verified intentional per draft.

8. **Back-button on `/sign-in` and `/sign-up`**. The current rule shows it on those pages too (via `router.back()`). With the new fixed-target semantics, the dashboard isn't the right target for unauthenticated users. Lean: drop the back button on `/sign-in` and `/sign-up` — those pages have their own affordances. The spec-agent confirms.

9. **`/dashboard` page widget-grid empty state.** Today there's only one widget. Should the layout reserve space for future ones (placeholder card, "Add widget" affordance)? Lean: no — render only the Tasks widget; the grid wrapper provides the layout, and the second widget can drop in without page-level changes.

## Done Criteria

- `/dashboard` renders a two-column grid (1 col on mobile) with a single "Tasks" card. Clicking the card navigates to `/tasks`.
- `/tasks` renders the user's tasks list (same as the old `/dashboard` page did).
- Creating a task at `/tasks/new` redirects to `/tasks` (not `/dashboard`).
- Updating a task at `/tasks/[id]` redirects to `/tasks` (not `/dashboard`).
- Signing in / signing up still lands on `/dashboard`.
- The header back button appears on every `/tasks*` route and navigates to `/dashboard`. It does NOT appear on `/dashboard`, `/`, `/sign-in`, `/sign-up`.
- The TaskCard delete button sits at the top-right of the Card surface, not in the title flex row.
- Hovering over the Delete button on a hovered TaskCard does NOT cause the icon to blend with the button background (light-on-light bug fixed).
- The TaskCard shows the task's updated date below the title in small neutral-toned text.
- All existing tests pass; new tests cover the widget card, the redirect-target changes, the date row on TaskCard, and the back-button visibility rule on `/tasks*`.
- `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all green.

## What This Task Does NOT Include

- A second `/dashboard` widget.
- Any kind of widget-reorder or user-preference UI.
- Pagination, sort, filter, search on `/tasks`.
- Toast / inline success feedback after task mutations.
- A separate view-only `/tasks/[id]` mode (the existing edit form keeps doubling as the detail page).
- New auth surface, new fields on `Task`, new validation rules.
- Touching the existing `Textarea` / `Input` / `Button` primitives beyond — at most — the `ghost` variant adjustment if the spec-agent picks the global-fix path for Open Question #2.
- A move of `/sign-in` / `/sign-up` into a sub-route or any back-button-related routing refactor beyond the visibility-rule change.

Note for spec-agent: keep the spec lean. None of the items above are blocked by Open Questions; the leans should hold in nearly every case. Flag any of the leans you reject and the reasoning, but treat them as the working defaults.
