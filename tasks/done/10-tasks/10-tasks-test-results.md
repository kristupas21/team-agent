# Test Results: Tasks (CRUD) + Neon Palette Refresh

## Summary
**122 tests passing across 19 files** (was 91 / 13). 31 new tests landed across 6 new files plus middleware extension. 0 failing.

```
$ npm run test:run
 ✓ __tests__/lib/errors.test.ts                           (11 tests)
 ✓ __tests__/lib/validation/signIn.test.ts                (6 tests)
 ✓ __tests__/lib/validation/signUp.test.ts                (5 tests)
 ✓ __tests__/lib/validation/task.test.ts                  (6 tests)  ← new
 ✓ __tests__/lib/auth-config.test.ts                      (4 tests)
 ✓ __tests__/middleware.test.ts                           (12 tests) ← +2
 ✓ __tests__/actions/signIn.test.ts                       (6 tests)
 ✓ __tests__/actions/signUp.test.ts                       (5 tests)
 ✓ __tests__/actions/createTask.test.ts                   (4 tests)  ← new
 ✓ __tests__/actions/deleteTask.test.ts                   (4 tests)  ← new
 ✓ __tests__/components/features/SignInForm.test.tsx      (6 tests)
 ✓ __tests__/components/features/SignUpForm.test.tsx      (6 tests)
 ✓ __tests__/components/features/MainHeaderNav.test.tsx   (9 tests)
 ✓ __tests__/components/features/TaskCard.test.tsx        (4 tests)  ← new
 ✓ __tests__/components/features/TasksList.test.tsx       (5 tests)  ← new
 ✓ __tests__/components/features/CreateTaskForm.test.tsx  (6 tests)  ← new
 ✓ __tests__/components/ui/Button.test.tsx                (11 tests)
 ✓ __tests__/components/ui/Card.test.tsx                  (3 tests)
 ✓ __tests__/components/ui/Input.test.tsx                 (9 tests)

 Test Files  19 passed (19)
      Tests  122 passed (122)
```

## Coverage of Mandatory Test Categories

| Category | Touched by this task | Covered by |
|---|---|---|
| **Server actions** (`createTaskAction`, `deleteTaskAction`) | Yes | `createTask.test.ts` (4 branches incl. NEXT_REDIRECT propagation) and `deleteTask.test.ts` (4 branches incl. CastError-collapses-to-not-found and IDOR-deleted-false path) |
| **Validation schema** (`createTaskSchema`) | Yes | `task.test.ts` — 6 cases including the empty-string-to-undefined transform |
| **Middleware** | Yes (added `/create-task`) | `middleware.test.ts` — 2 new cases (signed-out redirects, signed-in passes) |
| Predicates wrapping framework errors | No | N/A |
| **Client form components with state machines** (`CreateTaskForm`) | Yes | `CreateTaskForm.test.tsx` — 6 cases mirroring the established pattern from sign-in/sign-up forms |
| **Other state-machine client components** (`TasksList`) | Yes | `TasksList.test.tsx` — 5 cases covering renders, empty state, delete-success-removes, delete-failure-keeps |
| Structural constraints | No | N/A |

The mandatory category gate passes.

## Coverage of Acceptance Criteria

Verified per category. Key checks:

| AC | Coverage |
|---|---|
| 1–4 — neon palette in Tailwind + compiled CSS + hover-darken | Static-file check + compiled-CSS grep (`bg-primary-500: rgb(0 212 255)`, `bg-danger-500: rgb(255 59 110)`) |
| 5 — Task model | Static-file check |
| 6 — `tasks.ts` helpers exist | Static-file check |
| 7 — **anti-IDOR**: `deleteTask` ownership constraint | Verified by code reading `src/lib/tasks.ts` line `TaskModel.deleteOne({ _id: id, userId: userName })`. Branch-tested via `deleteTask.test.ts` "deleted false" case. |
| 8–13 — `createTaskSchema` rules + transform | `task.test.ts` (6 cases) |
| 14 — `createTaskAction` redirects | `createTask.test.ts` "calls createTask + redirects" case asserts `redirect` was called with `/dashboard` |
| 15 — Zod fail returns generic | `createTask.test.ts` |
| 16 — unauthenticated returns generic | `createTask.test.ts` |
| 17 — **NEXT_REDIRECT propagation** | `createTask.test.ts` "lets NEXT_REDIRECT propagate" case uses `rejects.toThrow(/NEXT_REDIRECT/)` |
| 18–21 — `deleteTaskAction` branches | `deleteTask.test.ts` (4 cases) |
| 22 — dashboard fetches + renders TasksList | Code inspection |
| 23 — dashboard layout switch (centred → top-anchored) | Code inspection |
| 24 — TasksList shape (motion + grid + Create link) | Code inspection + `TasksList.test.tsx` |
| 25 — empty state renders only Create card | `TasksList.test.tsx` |
| 26 — delete-success removes task | `TasksList.test.tsx` |
| 27 — delete-failure leaves task | `TasksList.test.tsx` |
| 28–30 — TaskCard renders + delete click | `TaskCard.test.tsx` |
| 31 — Create card href = `/create-task` | `TasksList.test.tsx` |
| 32 — `/create-task` page shape | Code inspection |
| 33 — signed-out `/create-task` → `/` | `middleware.test.ts` new case |
| 34 — signed-in `/create-task` passes | `middleware.test.ts` new case |
| 35–39 — `CreateTaskForm` behaviour | `CreateTaskForm.test.tsx` (6 cases) |
| 40–43 — middleware updates | Code inspection + `middleware.test.ts` |
| 44–50 — test files exist with required case counts | Verified — all 6 new files exist with at least the spec minimum cases |
| 51 — tsc/lint/test/build all green | Verified |
| 52 — IDE diagnostics clean | Verified |
| 53 — forbidden-pattern compliance | Verified (use client count 6 → 9, +3 expected) |
| 54 — visual rhythm | Spot-checked |

All 54 ACs met.

## Failing Tests
None.

## Bugs Found

Two issues caught during the verification phase, all fixed before docs:

1. **`session.user.name` type narrowing** — the defensive `if (!session?.user) redirect('/')` in the dashboard narrows `session.user` to defined but doesn't narrow `.name` (which is `string | null | undefined`). The subsequent `getTasksForUser(session.user.name)` then fails the `string` argument requirement. Resolution: tightened the guard to `if (!session?.user?.name)`. One-character change.

2. **Vitest test mocks — Auth.js v5 `auth` overload resolution** — Vitest's `vi.mocked(auth).mockResolvedValueOnce(...)` picked the wrong `auth` overload (the middleware-wrapper one expecting `(req, ctx) => Response`, not the session-helper one). The intended Session-shaped return value didn't match. Resolution: cast `as never` at the mock call sites. Three call sites updated across two test files.

3. **`vi.resetAllMocks()` wiped factory-set `redirect` throw** in `createTask.test.ts`'s `beforeEach`. The factory in `vi.mock('next/navigation', ...)` set `redirect` to throw a synthetic NEXT_REDIRECT error; `resetAllMocks` removed that implementation between tests, breaking the `rejects.toThrow(/NEXT_REDIRECT/)` assertion in the last test. Resolution: switch to `vi.clearAllMocks()` which preserves implementations while clearing call counts.

All three were build-quality issues, not production-code bugs.

## Recommendation for Future Tests

When more features land:
1. **Pagination / filter / sort UI** on the tasks list — add RTL tests for the new state machine.
2. **Optimistic UI on create** (if added later) — test the optimistic add + rollback paths.
3. **Task editing** (if added) — schema test + action test + form RTL.
4. The `motion/react` library renders standard HTML in jsdom; if richer animation behaviour ever needs assertion (e.g. "exit animation runs"), `framer-motion`'s test utilities exist but are out of scope here.

## `vitest.config.mts` Note
`passWithNoTests` remains absent (default `false`). Suite size is now 122 across 19 files. The regression guardrail continues to work.
