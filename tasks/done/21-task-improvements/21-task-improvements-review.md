# Review: Task Improvements

## STATUS: PASS

## ACs

- [x] 1 — `/dashboard/tasks/new` renders `<h1>New task</h1>` with `font-display text-4xl text-neutral-900`. Confirmed.
- [x] 2 — `/dashboard/tasks/[id]` renders `<h1>Edit task</h1>` with the same classes. Confirmed.
- [x] 3 — Both pages use the new wrapper `<div className="w-full space-y-6 md:max-w-2xl">` inside the existing `<main>`. Confirmed.
- [x] 4 — Both pages' Card uses `md:max-w-none`. Confirmed.
- [x] 5 — `PRIORITY_WEIGHTS` shape correct. Asserted.
- [x] 6 — `compareTasksByPriorityThenDate` exported. Confirmed.
- [x] 7 — Higher-priority a returns negative. Asserted.
- [x] 8 — Lower-priority a returns positive. Asserted.
- [x] 9 — Equal priority → date desc tiebreaker. Asserted.
- [x] 10 — Equal everything → 0. Asserted.
- [x] 11 — Accepts string `updatedAt`. Asserted.
- [x] 12 — `getTasksForUser` uses comparator. Confirmed at `lib/db/tasks.ts:9`.
- [x] 13 — Mongo `.sort()` removed from `getTasksForUser`. Confirmed.
- [x] 14 — All four build commands green. Verified.
- [x] 15 — Suite ≥ 210 / 26. **212 / 26.** Exceeded.
- [x] 16 — Forbidden-pattern compliance. Verified.
- [x] 17 — Visual rhythm honoured.

All 17 ACs met.

## Plan Compliance

- All planned files exist or are modified at the planned paths.
- The 7-step build order ran cleanly. One transient diagnostic (unused `compareTasksByPriorityThenDate` after step 1) resolved naturally at step 3 when the DAL consumed it.
- Latent edit-page `priority` bug fix added on top — documented in build summary as a tiny stowaway.

## Code Quality

- **Generic comparator** typed via `<T extends { priority; updatedAt }>` keeps the function reusable beyond `TaskDoc`.
- **Defensive `Date | string` shape** matches the existing `TaskCard.formatTaskDate` pattern — consistent across the codebase.
- **DAL sort moved to post-fetch** — straightforward refactor; the previous Mongo `.sort({ createdAt: -1 })` was always wrong-shape for priority anyway.
- **Form page wrapper** uses `w-full` + `md:max-w-2xl` to share width between heading and Card without the previous "two `md:max-w-2xl` happen to match" coincidence.
- **`mcp__ide__getDiagnostics`** clean across source and test files.

## Blockers
None.

## Notes (non-blocking)

1. **Test for stable sort** — V8's `Array.prototype.sort` is stable, so equal-priority + equal-date pairs preserve insertion order. The "returns 0" test verifies the comparator's contract; the realistic-4-item test verifies the resulting order. If a future task adds a third tie-break (e.g. alphabetic title), the comparator extends cleanly.
2. **Mongo aggregation pipeline** — captured in the spec as the natural escalation when per-user task count grows past ~10k. Not addressed today.
3. **Latent priority bug fix** in `tasks/[id]/page.tsx` — addressed inline. No new test needed because TaskForm's own "pre-fills priority from initialValues" case already validates the contract; the page-level wire-up is verified by `next build` + the existing TaskForm test pattern.
4. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- **New (1)**: `__tests__/lib/task-priority.test.ts`.
- **Modified (4 source)**: `src/lib/task-priority.ts`, `src/lib/db/tasks.ts`, `src/app/(main)/(private)/dashboard/tasks/new/page.tsx`, `src/app/(main)/(private)/dashboard/tasks/[id]/page.tsx`.

STATUS: PASS.
