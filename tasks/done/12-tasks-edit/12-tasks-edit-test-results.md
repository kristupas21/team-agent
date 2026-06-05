# Test Results: Tasks — Edit + Route Refactor + UI Polish

## Summary
**143 tests passing across 21 files** (was 134 / 20). 9 net new tests:
- +4 in `actions/updateTask.test.ts` (new file)
- +8 in `components/features/TaskForm.test.tsx` (new file)
- −6 in `components/features/CreateTaskForm.test.tsx` (deleted file)
- +1 in `components/ui/Button.test.tsx` (ghost variant)
- +2 in `middleware.test.ts` (2 `/tasks/<id>` cases land; the 2 `/create-task` cases were replaced by 2 `/tasks/new` cases — net +2)

0 failing.

```
$ npm run test:run
 ✓ __tests__/actions/updateTask.test.ts                  (4 tests)  ← new
 ✓ __tests__/components/features/TaskForm.test.tsx       (8 tests)  ← new
 ✓ __tests__/components/features/TaskCard.test.tsx       (7 tests)  ← reworked
 ✓ __tests__/components/features/TasksList.test.tsx      (5 tests)  ← +mock for next/navigation
 ✓ __tests__/components/ui/Button.test.tsx              (12 tests)  ← +1 ghost
 ✓ __tests__/middleware.test.ts                         (14 tests)  ← +2
 ... and all 15 other test files unchanged ...

 Test Files  21 passed (21)
      Tests  143 passed (143)
```

## Coverage of Mandatory Test Categories

| Category | Touched by this task | Covered by |
|---|---|---|
| **Server actions** (`updateTaskAction`) | Yes | `actions/updateTask.test.ts` (4 cases) |
| **Validation schemas** (`taskSchema` rename) | Yes | `validation/task.test.ts` (existing 6 cases, just-imports updated) |
| **Middleware** (matcher + `isPrivate`) | Yes | `middleware.test.ts` (4 path-shape changes covering both signed-in and signed-out × `/tasks/new` and `/tasks/<id>`) |
| **Predicates wrapping framework errors** | No | n/a |
| **Client form / state-machine components** (`TaskForm`) | Yes | `TaskForm.test.tsx` (8 cases) |
| **Client component with new behaviour** (`TaskCard`) | Yes | `TaskCard.test.tsx` (7 reworked cases) |
| **UI primitive with new API surface** (`Button` ghost variant) | Yes | `Button.test.tsx` (+1 case) |
| **Structural constraints** | No | n/a |

The mandatory category gate passes.

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| Schema rename: `createTaskSchema → taskSchema`; type `CreateTaskInput → TaskInput` | Static-file check + `validation/task.test.ts` continues to pass against the renamed export |
| Anti-IDOR at the DAL: `getTaskById` and `updateTask` filter by `{ _id, userId }` | Static-file check on `src/lib/tasks.ts` |
| `updateTask` uses `findOneAndUpdate({_id, userId}, …, { new: true, lean: true })` | Static-file check |
| `updateTaskAction(id, input)` validates → auth → DAL → redirect; returns `'Task not found.'` on null | `updateTask.test.ts` test 3 |
| `redirect()` is NOT wrapped in try/catch (NEXT_REDIRECT propagates) | `updateTask.test.ts` test 4 (`rejects.toThrow(/NEXT_REDIRECT/)`) |
| Unauthenticated and schema-fail both return the generic `'Something went wrong…'` | `updateTask.test.ts` tests 1 and 2 |
| Shared `TaskForm` accepts `submitLabel`, optional `initialValues`, `action` prop | `TaskForm.test.tsx` tests 1, 7, 8 |
| `TaskForm` autofocuses Title | `TaskForm.test.tsx` test 2 |
| `TaskForm` blocks the action call on empty submit + shows the title error | `TaskForm.test.tsx` test 3 |
| `TaskForm` calls the action exactly once with the parsed values | `TaskForm.test.tsx` test 4 |
| `TaskForm` renders the root error from `{ success: false, error }` | `TaskForm.test.tsx` test 5 |
| `TaskForm` disables both fields + flips button text while pending | `TaskForm.test.tsx` test 6 |
| `TaskForm` pre-fills both fields from `initialValues` (edit mode) | `TaskForm.test.tsx` test 7 |
| `Button` `ghost` variant has `bg-transparent text-neutral-700 hover:bg-neutral-200` | `Button.test.tsx` (+1 case) |
| TaskCard navigates to `/tasks/{id}` on card click via `useRouter().push` | `TaskCard.test.tsx` test 5 |
| TaskCard's Delete still stops propagation (does NOT navigate) | `TaskCard.test.tsx` test 7 |
| TaskCard Delete is icon-only (`MdClose`), `aria-label="Delete"`, `variant="ghost"`, `className="group-hover:text-neutral-50"` | Static-file check + `TaskCard.test.tsx` test 6 |
| TaskCard title classes: `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50` | Static-file check |
| TaskCard description: `transition-colors group-hover:text-neutral-200` | Static-file check |
| TaskCard Card className includes `group … cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none`; drops `transition-shadow hover:shadow-lg` | Static-file check |
| TasksList's `motion.div` no longer carries `whileHover` | Static-file check |
| TasksList's "Create new task" Link href = `/tasks/new` | `TasksList.test.tsx` (updated assertion) |
| `/tasks/new/page.tsx` exists and renders `<TaskForm submitLabel="Create Task" action={createTaskAction} />` with `<Card className="md:max-w-lg">` | Static-file check + `next build` route-table |
| `/tasks/[id]/page.tsx` exists with `auth()` guard, `getTaskById`, `notFound()` on null, inline `'use server'` wrapper, `<Card className="md:max-w-lg">`, `<TaskForm submitLabel="Save Task" initialValues={…} action={action} />` | Static-file check + `next build` route-table |
| `create-task/` directory removed | `ls` confirmation + `next build` route-table (no `/create-task` entry) |
| Middleware matcher: `'/create-task'` replaced by `'/tasks/:path*'` | Static-file check |
| `redirect-rules.ts` `isPrivate`: drops `/create-task`, adds `/tasks` checks | Static-file check + 4 cases in `middleware.test.ts` |
| Middleware redirects unauthenticated `/tasks/new` and `/tasks/<id>` to `/` | `middleware.test.ts` (2 signed-out cases) |
| Middleware lets authenticated `/tasks/new` and `/tasks/<id>` through | `middleware.test.ts` (2 signed-in cases) |
| Suite count: 143 across 21 files | **143 / 21 exactly** |
| tsc / lint / test / build green | Verified |
| Forbidden-pattern compliance | `'use client'` count = 10 (unchanged); zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` |

All ACs met.

## Failing Tests
None.

## Bugs Found

One stale-cache nuisance during the build, resolved:

- **`.next/types/app/(main)/(private)/create-task/page.ts`** persisted after the file move and caused `tsc --noEmit` to emit 3 `TS2307 Cannot find module` errors on the first pass. Resolution: `rm -rf .next` once. Subsequent `tsc` runs are clean.

No production-code bugs.

## Recommendation for Future Tests

The current suite covers the high-value surfaces. When more features land:
1. **Server-side `getTaskById` happy/sad paths** — currently only exercised via `updateTask.test.ts`'s null-return case. Direct unit coverage would help when the DAL grows.
2. **Edit-page integration** — the page-level inline `'use server'` wrapper isn't directly exercised. An RTL test that mocks the wrapper at the page boundary would close that gap.
3. **Sort / filter / search UI** — when added, each new control needs RTL coverage.
4. **Permission edge cases** — when sharing arrives, `getTaskById` will need negative-path tests against the `userId` filter.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 143 across 21 files.
