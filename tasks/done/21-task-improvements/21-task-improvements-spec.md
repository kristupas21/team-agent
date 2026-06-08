# Spec: Task Improvements — Form Page Titles + Priority Sort

## Summary
Two enhancements. **(A)** Each task form page (`/dashboard/tasks/new` and `/dashboard/tasks/[id]`) gains a visible `<h1>` heading ("New task" / "Edit task") with the standard display-font heading style, sitting above the form Card inside a shared-width wrapper. **(B)** The tasks list at `/dashboard/tasks` sorts by priority descending (urgent → high → medium → low) with ties broken by `updatedAt` descending. The sort lives in the DAL (`getTasksForUser`) via a pure JS comparator backed by a numeric `PRIORITY_WEIGHTS` map; the previous Mongo-level `.sort({ createdAt: -1 })` is removed.

## Assumptions

### Thread A — Form page titles

1. **Heading copy** (Open Question #1 default): "New task" for `/dashboard/tasks/new`; "Edit task" for `/dashboard/tasks/[id]`. Matches the draft's literal wording.

2. **Layout restructure** for both form pages:
   ```tsx
   <main className="flex min-h-screen items-start justify-center px-4 pt-20">
     <div className="w-full md:max-w-2xl space-y-6">
       <h1 className="font-display text-4xl text-neutral-900">New task</h1>
       <Card className="md:max-w-none">
         <TaskForm ... />
       </Card>
     </div>
   </main>
   ```
   - Outer `<main>` className unchanged.
   - New wrapper `<div className="w-full md:max-w-2xl space-y-6">`: pins width, stacks heading + Card with 24px gap.
   - `<h1>` matches the typography on `/dashboard` and `/dashboard/tasks` (`font-display text-4xl text-neutral-900`).
   - Card className: `md:max-w-2xl` → `md:max-w-none` to inherit wrapper width without conflicting max-width pinning (Open Question #3 default).

3. **Page metadata stays as-is**: `tasks/new` keeps `title: 'Create task'`; `tasks/[id]` keeps `title: 'Edit task'`. The browser-tab title and visible heading can differ.

### Thread B — Task list sort

4. **Backend (DAL) sort** chosen over frontend client-side sort:
   - Mongoose's native `.sort({ priority: -1 })` would alphabetize the enum strings (`high`, `low`, `medium`, `urgent` — wrong order).
   - Aggregation pipeline with `$switch` weight-mapping is heavier than needed for current scale.
   - JS sort in the DAL after `.lean().exec()` is correct, simple, and unit-testable via a pure comparator.

5. **New exports in `src/lib/task-priority.ts`**:
   ```ts
   export const PRIORITY_WEIGHTS: Readonly<Record<TaskPriority, number>> = {
     urgent: 4,
     high: 3,
     medium: 2,
     low: 1,
   }

   export function compareTasksByPriorityThenDate<
     T extends { priority: TaskPriority; updatedAt: Date | string }
   >(a: T, b: T): number {
     const pw = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
     if (pw !== 0) return pw

     const aTime = (a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt)).getTime()
     const bTime = (b.updatedAt instanceof Date ? b.updatedAt : new Date(b.updatedAt)).getTime()

     return bTime - aTime
   }
   ```
   The comparator is generic, defensive about `updatedAt` being either `Date` or string (mirrors `TaskCard.formatTaskDate`).

6. **`getTasksForUser` rewrite** in `src/lib/db/tasks.ts`:
   ```ts
   export async function getTasksForUser(userName: string): Promise<TaskDoc[]> {
     await connectDB()

     const docs = await TaskModel.find({ userId: userName }).lean().exec()
     const tasks = docs.map((doc) => ({ ...doc, _id: String(doc._id) })) as TaskDoc[]

     return tasks.sort(compareTasksByPriorityThenDate)
   }
   ```
   The previous Mongo-level `.sort({ createdAt: -1 })` is removed.

7. **No model / schema / route / middleware / action change.**

8. **Test plan** (per Done Criteria):
   - New `__tests__/lib/task-priority.test.ts` covering `PRIORITY_WEIGHTS` shape + 5 comparator behaviour cases.
   - No new DAL or form-page tests (server components per project convention; integration tests deferred).
   - Suite target: ≥ 210 / 26.

## Acceptance Criteria

### Thread A — Form headings
1. `/dashboard/tasks/new/page.tsx` renders `<h1 class="font-display text-4xl text-neutral-900">New task</h1>` above the Card.
2. `/dashboard/tasks/[id]/page.tsx` renders `<h1 class="font-display text-4xl text-neutral-900">Edit task</h1>` above the Card.
3. Both pages use the wrapper structure `<main className="flex min-h-screen items-start justify-center px-4 pt-20"><div className="w-full md:max-w-2xl space-y-6">...</div></main>`.
4. Both pages' `<Card>` uses `md:max-w-none` (not `md:max-w-2xl`).

### Thread B — Sort
5. `lib/task-priority.ts` exports `PRIORITY_WEIGHTS` with `urgent: 4, high: 3, medium: 2, low: 1`.
6. `lib/task-priority.ts` exports `compareTasksByPriorityThenDate(a, b)` returning a negative/zero/positive number per the spec rules.
7. The comparator returns a negative value when `a.priority` has a higher weight than `b.priority`.
8. The comparator returns a positive value when `a.priority` has a lower weight than `b.priority`.
9. When priorities are equal, the comparator orders by `updatedAt` descending (newer first).
10. When both priorities and dates are equal, the comparator returns `0`.
11. The comparator accepts `updatedAt` as either `Date` or `string`.
12. `getTasksForUser` in `lib/db/tasks.ts` uses the comparator after `lean().exec()`.
13. `getTasksForUser` no longer calls Mongoose `.sort(...)`.

### Build & quality
14. `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all exit 0.
15. Suite total ≥ 210 / 26 (added one new test file).

### Forbidden-pattern compliance
16. Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` empty-prop types.

### Code layout
17. Visual rhythm honoured.
