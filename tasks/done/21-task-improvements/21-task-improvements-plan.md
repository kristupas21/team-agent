# Build Plan: Task Improvements

## Overview
Three source edits (task-priority module, DAL, two form pages) plus one new test file. No new components, no model change.

## Files to Modify

### `src/lib/task-priority.ts`
Add `PRIORITY_WEIGHTS` constant and `compareTasksByPriorityThenDate` generic comparator function.

### `src/lib/db/tasks.ts`
Import the comparator. Rewrite `getTasksForUser` to drop the Mongo `.sort({ createdAt: -1 })` and apply JS sort post-`.lean()` via the new comparator.

### `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`
Wrap the existing Card in a `<div className="w-full md:max-w-2xl space-y-6">`. Add `<h1>New task</h1>` above the Card. Change Card className from `md:max-w-2xl` to `md:max-w-none`.

### `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`
Same restructure with heading `Edit task`.

## Files to Create

### `__tests__/lib/task-priority.test.ts`
5 cases:
1. `PRIORITY_WEIGHTS` shape (urgent 4, high 3, medium 2, low 1).
2. Higher priority comes first.
3. Equal priority → newer date first.
4. Equal priority + equal date → returns 0.
5. Accepts `updatedAt` as a string.
6. Sorts a realistic 4-item array correctly.

(6 cases total — Done Criteria says ≥5, going with all 6.)

## Build Order

1. Edit `src/lib/task-priority.ts` (add weights + comparator).
2. Create `__tests__/lib/task-priority.test.ts` and run scoped.
3. Edit `src/lib/db/tasks.ts` (use the comparator).
4. Edit `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`.
5. Edit `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`.
6. `tsc --noEmit`, `next lint`, `test:run`, `next build`.
7. Diagnostic sweep + artefact docs.
