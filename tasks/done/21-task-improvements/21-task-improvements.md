# Task Improvements — Form Page Titles + Priority Sort

## Description

Two small enhancements. **(1) Form page titles**: `/dashboard/tasks/new` gets a visible "New task" heading; `/dashboard/tasks/[id]` gets a visible "Edit task" heading. Both match the existing `font-display text-4xl text-neutral-900` styling used on "Dashboard" and "Your tasks". **(2) Task list sort**: tasks on `/dashboard/tasks` now sort by priority descending (Urgent → High → Medium → Low) with ties broken by `updatedAt` descending. The sort happens in the backend DAL (`getTasksForUser`) so future client-side dropdown switching can re-trigger a server-component re-render via URL params without restructuring.

## Scope

### In scope
- Add a visible `<h1>` heading to both task form pages.
- Re-organize each form page's layout so the heading sits above the Card with consistent width.
- Add priority-then-date sort to `getTasksForUser` in the DAL.
- Add a numeric priority-weight map to `lib/task-priority.ts` to back the comparator.
- Add a pure comparator function exported from `lib/task-priority.ts` so it can be unit-tested without a DB.

### Out of scope
- The sort-selector dropdown (the user explicitly says it's a future concern).
- Persisting sort state (URL params, localStorage, etc.).
- Pagination, filtering, or search.
- Changes to TaskForm, TaskCard, Pill, Dropdown, or any other primitive.
- Any model schema change (priority stays a string enum in MongoDB).

## A — Form Page Titles

### Layout structure
Today both form pages use:
```tsx
<main className="flex min-h-screen items-start justify-center px-4 pt-20">
  <Card className="md:max-w-2xl">
    <TaskForm ... />
  </Card>
</main>
```

New structure introduces a wrapper that contains both the heading and the Card, vertically stacked:
```tsx
<main className="flex min-h-screen items-start justify-center px-4 pt-20">
  <div className="w-full md:max-w-2xl space-y-6">
    <h1 className="font-display text-4xl text-neutral-900">New task</h1>  {/* or "Edit task" */}
    <Card className="md:max-w-none">
      <TaskForm ... />
    </Card>
  </div>
</main>
```

Key points:
- The outer `<main>` keeps its existing classes — top-anchored, horizontally centered, `pt-20`.
- The new wrapper `<div>` claims `w-full md:max-w-2xl` so the heading + Card share a column at the same width.
- The Card's `md:max-w-2xl` becomes `md:max-w-none` to inherit the wrapper's width (avoids double max-width pinning).
- The `space-y-6` gives the same heading→content gap as `/dashboard` and `/dashboard/tasks`.

### Headings
- `/dashboard/tasks/new`: `<h1>New task</h1>`.
- `/dashboard/tasks/[id]`: `<h1>Edit task</h1>`.

### Page metadata
- `tasks/new/page.tsx` metadata title stays `'Create task'` (browser-tab) — distinct from the visible heading but acceptable. Spec-agent confirms if alignment to `'New task'` is preferred.
- `tasks/[id]/page.tsx` metadata title stays `'Edit task'`.

## B — Task List Sort

### Decision: backend (DAL) sort, in JS, ordered post-fetch

**Backend (DAL JS sort)** chosen over **frontend (TasksList client-side sort)** for these reasons:
1. Future sort-selector dropdown will most likely persist its choice via URL params or a query string. URL changes re-render the server component, which re-calls the DAL. Keeping sort in the DAL means the dropdown's switch is a one-line parameter to the helper, not a re-architecture.
2. Pagination — when it lands — needs ordering at the query layer to be meaningful. Frontend sort would break the moment pagination is added.
3. Tests are cleaner — a pure comparator function gets exhaustive coverage without a live DB or RTL.

**Why not Mongoose `.sort({ priority: -1 })` directly?**
- `priority` is stored as a string enum (`'urgent' | 'high' | 'medium' | 'low'`). Mongo's string sort is alphabetical, which would give `high → low → medium → urgent` for descending — wrong.
- Options to fix: aggregation pipeline with `$switch` to map strings to weights, or change the storage format to numbers. Both are heavier than needed.
- JS sort in the DAL after `.lean().exec()` is correct, simple, and tested.

**When to revisit (out of scope for now):**
- If the per-user task count grows past ~10k, push the sort into a MongoDB aggregation pipeline.
- If multiple sort dimensions arrive, externalize the comparator factory.

### Implementation

**Add to `src/lib/task-priority.ts`**:
```ts
export const PRIORITY_WEIGHTS: Readonly<Record<TaskPriority, number>> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function compareTasksByPriorityThenDate<T extends { priority: TaskPriority; updatedAt: Date | string }>(
  a: T,
  b: T,
): number {
  const pw = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
  if (pw !== 0) return pw

  const aTime = (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)).getTime()
  const bTime = (b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)).getTime()

  return bTime - aTime
}
```

The comparator is generic so it can be reused in any context where the input has at least `priority` and `updatedAt` fields. The `Date | string` accommodation mirrors `TaskCard`'s existing `formatTaskDate` defensive shape.

**Edit `src/lib/db/tasks.ts` `getTasksForUser`**:
```ts
export async function getTasksForUser(userName: string): Promise<TaskDoc[]> {
  await connectDB()

  const docs = await TaskModel.find({ userId: userName }).lean().exec()
  const tasks = docs.map((doc) => ({ ...doc, _id: String(doc._id) })) as TaskDoc[]

  return tasks.sort(compareTasksByPriorityThenDate)
}
```

The previous `.sort({ createdAt: -1 })` Mongo-level sort is removed since JS sort takes over.

## Open Questions

1. **Heading text wording** — "New task" / "Edit task" (lean — matches the draft); or "Create task" / "Edit task" (matches the existing metadata title on `tasks/new`); or any other phrasing? Lean: literal draft wording. Affects: copy.

2. **Wrapper `space-y-6` vs. `space-y-4`** — `/dashboard` uses `space-y-6` for the heading-to-content gap. Lean: `space-y-6` for consistency. Affects: layout breathing.

3. **Card's `md:max-w-none` override** — drop the override and keep Card at `md:max-w-2xl` (works because the wrapper also sets `md:max-w-2xl`), or explicitly drop to none? Lean: `md:max-w-none` to avoid the implicit "both happen to match" coincidence. Affects: code clarity.

4. **Comparator name** — `compareTasksByPriorityThenDate` (lean — verbose, descriptive), `priorityThenDateComparator`, or just `compareTaskPriority`? Lean: the descriptive name. Affects: import-site readability.

5. **`PRIORITY_WEIGHTS` shape** — `Record<TaskPriority, number>` (lean), or a tuple-derived sequence? Lean: explicit record. Affects: clarity at the cost of being slightly redundant with `TASK_PRIORITIES`.

6. **Stable sort guarantee** — JS `Array.prototype.sort` is stable in modern engines (V8 ≥ 7.0 / Node ≥ 12). The comparator only returns 0 when both priority AND updatedAt are equal, which is unlikely in practice but covered. No additional tie-breaker needed.

## Done Criteria

- `/dashboard/tasks/new` renders `<h1>New task</h1>` above the form Card.
- `/dashboard/tasks/[id]` renders `<h1>Edit task</h1>` above the form Card.
- Both headings use `font-display text-4xl text-neutral-900`.
- Tasks on `/dashboard/tasks` are ordered: urgent first, then high, medium, low; ties broken by `updatedAt` descending.
- `lib/task-priority.ts` exports `PRIORITY_WEIGHTS` and `compareTasksByPriorityThenDate`.
- `lib/db/tasks.ts` `getTasksForUser` uses the comparator post-fetch.
- `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all green.
- Suite total ≥ 210 / 25 (was 205 / 25; estimated +4 comparator cases + a class-presence test for the form pages → approx +5).

## Tests

### `__tests__/lib/task-priority.test.ts` (new)
- `PRIORITY_WEIGHTS` map shape (urgent 4, high 3, medium 2, low 1).
- `compareTasksByPriorityThenDate`:
  - Higher priority comes first regardless of date.
  - Equal priority → newer updatedAt comes first.
  - Equal priority + equal updatedAt → returns 0.
  - Handles `updatedAt` as a string (defensive shape).
  - Sorts a realistic 4-item array correctly.

Estimated: 5 cases.

### Form-page coverage
- The form pages are server components, so direct unit tests are skipped per project convention. The visible `<h1>` is verified by static-file check + `next build` exit 0. (Optional: add an `<h1>` presence assertion to existing TaskForm test by mounting via a thin wrapper, but TaskForm doesn't own the heading.)

### `__tests__/lib/db/tasks.test.ts` (NOT added)
The DAL helper `getTasksForUser` is mocked in action tests; a real integration test would need `mongodb-memory-server`. Out of scope. The pure comparator gets exhaustive coverage instead.

## What This Task Does NOT Include

- A sort-selector dropdown / URL persistence / localStorage.
- A second sort dimension (e.g. by title alphabetically).
- Pagination.
- Changes to TaskForm, TaskCard, Pill, Dropdown internals.
- Mongo aggregation pipeline for sort (deferred to scale).
- Any model schema change.
