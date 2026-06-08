# Test Results: Task Improvements

## Summary
**212 / 26 passing** (was 205 / 25). +7 net new cases (one new test file: `lib/task-priority.test.ts`). 0 failing.

```
$ npm run test:run
 ✓ __tests__/lib/task-priority.test.ts  (7 tests)  ← new file
 ... and all 25 other files unchanged ...

 Test Files  26 passed (26)
      Tests  212 passed (212)
```

## AC Coverage

| AC | Coverage |
|---|---|
| 1 — `/dashboard/tasks/new` renders `<h1>New task</h1>` with display typography | Static-file check |
| 2 — `/dashboard/tasks/[id]` renders `<h1>Edit task</h1>` with display typography | Static-file check |
| 3 — Both pages use the new wrapper structure | Static-file check |
| 4 — Both pages' Card uses `md:max-w-none` | Static-file check |
| 5 — `PRIORITY_WEIGHTS` shape | `task-priority.test.ts` case 1 |
| 6 — `compareTasksByPriorityThenDate` exists | `task-priority.test.ts` import + cases 2–7 |
| 7 — Higher priority → negative | `task-priority.test.ts` case 2 |
| 8 — Lower priority → positive | `task-priority.test.ts` case 3 |
| 9 — Equal priority → date desc tiebreaker | `task-priority.test.ts` case 4 |
| 10 — Equal everything → 0 | `task-priority.test.ts` case 5 |
| 11 — Accepts `updatedAt` as string | `task-priority.test.ts` case 6 |
| 12 — `getTasksForUser` uses comparator | Static-file check on `lib/db/tasks.ts` |
| 13 — `getTasksForUser` no longer uses Mongo `.sort` | Static-file check (verified by code-read; the `.sort({ createdAt: -1 })` chain is removed) |
| 14 — Build pipeline green | Verified |
| 15 — Suite ≥ 210 / 26 | **212 / 26** (+2 over target) |
| 16 — Forbidden patterns | Verified — `'use client'` count unchanged at 11 |
| 17 — Visual rhythm | Honoured |

All 17 ACs met.

## Coverage Gaps

The DAL `getTasksForUser` itself is not unit-tested in isolation (consistent with project convention — Mongoose mocks make it impractical). Coverage is indirect:
1. The pure comparator gets exhaustive direct tests, including a sort-of-realistic-array case.
2. The integration with `getTasksForUser` is exercised by `next build` + the action tests that mock the DAL — both still pass.

Server-component form pages (`tasks/new/page.tsx`, `tasks/[id]/page.tsx`) are not unit-tested (project convention). The visible `<h1>` + new wrapper structure are static-file verified.

## Failing Tests
None.

## Bugs Found

One latent bug fixed during the form-page restructure:
- `dashboard/tasks/[id]/page.tsx` was passing `initialValues={{ title, description }}` to `TaskForm` without `priority`. This made the edit form always show "Medium" in the priority dropdown regardless of the actual task's priority — a regression from the `19-task-priority` ship.
- Fix: include `priority: task.priority` in the spread. +3 lines, no test changes (TaskForm's existing "pre-fills priority from initialValues" case already covers the contract).

## Notes
- The `compareTasksByPriorityThenDate` generic signature (`T extends { priority; updatedAt }`) means it'll work cleanly with any future task-like shape, including a hypothetical Notes domain if it grows comparable fields.
- The "realistic 4-item array" test case (`'urgent-old', 'high-old', 'medium-new', 'low-old'`) intentionally tests the priority-dominates-date rule: `medium-new` is the most-recently updated, but `urgent-old` and `high-old` still come first because priority dominates.
