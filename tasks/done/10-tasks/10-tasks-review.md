# Review: Tasks (CRUD) + Neon Palette Refresh

## STATUS: PASS

## Acceptance Criteria Check

### Palette
- [x] 1 — `tailwind.config.ts` declares the 5 tokens with the spec's hexes. `neutral` has 6 steps; others have 3. Confirmed by reading the file.
- [x] 2 — Compiled CSS contains `rgb(0 212 255)` for `.bg-primary-500` (= `#00d4ff`). **Verified via grep.**
- [x] 3 — Compiled CSS contains `rgb(255 59 110)` for `.bg-danger-500` (= `#ff3b6e`). **Verified.**
- [x] 4 — `-500` ↔ `-700` pairs are visibly different in the new palette (e.g. primary `#00d4ff` → `#0099bf`). Hover-darken effect continues to read.

### Task model + data access
- [x] 5 — `src/models/Task.ts` exports `TaskDoc` and `TaskModel`. Schema has `title` (required), `description` (optional), `userId` (required + indexed), `timestamps: true`. Hot-reload-safe via `mongoose.models.Task ?? ...`.
- [x] 6 — `src/lib/tasks.ts` exports `getTasksForUser`, `createTask`, `deleteTask` with the documented signatures. Each helper calls `connectDB()` first.
- [x] 7 — **Anti-IDOR**: `deleteTask`'s query is `TaskModel.deleteOne({ _id: id, userId: userName })`. Both "doesn't exist" and "exists but other user" collapse to `deletedCount === 0` → `{ deleted: false }`. Caller can't distinguish. **Security AC met.** Branch-tested via `deleteTask.test.ts` "deleted false" + `deletedTaskAction` returning `"Task not found."`

### Validation schema
- [x] 8 — `src/lib/validation/task.ts` exports `createTaskSchema` per Assumption 11 + `CreateTaskInput`.
- [x] 9 — Title `"ab"` → `"Title must be at least 3 characters."` Test in `task.test.ts`.
- [x] 10 — 65-char title → `"Title is too long."` Test.
- [x] 11 — 257-char description → `"Description is too long."` Test.
- [x] 12 — Empty-string description → `undefined` via transform. Test.
- [x] 13 — Missing description key → succeeds with `undefined`. Test.

### Server actions
- [x] 14 — `createTaskAction` ends with `redirect('/dashboard')` outside any try/catch. NEXT_REDIRECT propagates. Verified by code read + `createTask.test.ts` test 3.
- [x] 15 — Zod fail returns generic. Test 1 in `createTask.test.ts`.
- [x] 16 — No session returns generic. Test 2.
- [x] 17 — **NEXT_REDIRECT re-throws** — `await expect(...).rejects.toThrow(/NEXT_REDIRECT/)`. Test 4 in `createTask.test.ts`. The cookie-clear-bug lesson reapplied.
- [x] 18 — `deleteTaskAction` calls `deleteTask(id, session.user.name)` only when authenticated. Verified by code read.
- [x] 19 — No session → `{ success: false, error: 'Not authorised.' }`. `deleteTask.test.ts` test 1.
- [x] 20 — `deleted: false` → `{ success: false, error: 'Task not found.' }`. Test 2.
- [x] 21 — `deleted: true` → `{ success: true }`. Test 4. Plus CastError → "Task not found" (Test 3, exceeds spec).

### Dashboard
- [x] 22 — Dashboard server-fetches via `getTasksForUser` and renders heading `"Your tasks"` (`font-display`) + `<TasksList />`. Old welcome heading + paragraph gone. Verified by code read.
- [x] 23 — Layout wrapper is `<main className="min-h-screen p-4 md:p-8">` with `<div className="mx-auto max-w-3xl space-y-6">`. Previous vertical-centred wrapper is gone. Verified.

### TasksList
- [x] 24 — `TasksList.tsx` has `'use client'`, imports `motion` + `AnimatePresence` from `motion/react`, renders `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`. Each task is a `motion.div` with `initial / animate / exit / layout` props.
- [x] 25 — Empty state renders only the Create link. `TasksList.test.tsx` test 2.
- [x] 26 — Delete-success removes the task from DOM. Test 4.
- [x] 27 — Delete-failure keeps the task. Test 5.

### TaskCard
- [x] 28 — `TaskCard.tsx` accepts `{ task, onDelete, isDeleting }` and renders title, optional description, danger Delete `<Button>` with `MdDelete` left icon. Verified.
- [x] 29 — Description `<p>` absent when undefined. `TaskCard.test.tsx` test 3.
- [x] 30 — Delete click calls `onDelete(task._id)` exactly once. Test 4.

### Create-new-task card
- [x] 31 — `<Link href="/create-task">` with `MdAdd` + text "Create new task". `border-dashed` for visual distinction. `TasksList.test.tsx` test 3 asserts the href.

### `/create-task` page + form
- [x] 32 — `src/app/(main)/(private)/create-task/page.tsx` is a server component with defensive `auth()` + `redirect('/')` guard. Renders centred `<Card>` + `<CreateTaskForm />`. Metadata title "Create task".
- [x] 33 — Signed-out users redirected from `/create-task` to `/`. `middleware.test.ts` new case.
- [x] 34 — Signed-in users pass through. `middleware.test.ts` new case.
- [x] 35–39 — `CreateTaskForm` shape + 6 RTL test cases all covered.

### Middleware
- [x] 40 — `src/middleware.ts` matcher includes `/create-task`. Verified.
- [x] 41 — `src/lib/redirect-rules.ts` `isPrivate` includes `/create-task` (and nested). Verified.
- [x] 42 — Existing 10 middleware test cases still pass. Verified — no regression.
- [x] 43 — 2 new middleware test cases for `/create-task` pass.

### Tests
- [x] 44 — `task.test.ts` has 6 cases (≥ 5 required).
- [x] 45 — `createTask.test.ts` has 4 cases (≥ 4 required).
- [x] 46 — `deleteTask.test.ts` has 4 cases (≥ 3 required).
- [x] 47 — `CreateTaskForm.test.tsx` has 6 cases (= 6 required).
- [x] 48 — `TasksList.test.tsx` has 5 cases (≥ 4 required).
- [x] 49 — `TaskCard.test.tsx` has 4 cases (≥ 3 required).
- [x] 50 — `npm run test:run` exits 0 with **122 tests across 19 files** (≥ 118 / 18 required).

### Build & quality
- [x] 51 — `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0. Route table includes `/dashboard` and the new `/create-task` alongside the existing routes + Middleware.
- [x] 52 — `mcp__ide__getDiagnostics` clean (markdown false positives only in the plan file).

### Forbidden-pattern compliance
- [x] 53 — Zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count = 9 (was 6, +3 for TaskCard / TasksList / CreateTaskForm). Confirmed.

### Code layout
- [x] 54 — Visual rhythm honoured in all new and modified files.

All 54 ACs met.

## Plan Compliance

- All 8 planned new source files exist at the planned paths.
- All 6 planned new test files exist with the documented coverage.
- All planned modifications landed: tailwind, middleware, redirect-rules, dashboard page, package.json, middleware test extension.
- Build order respected.
- Two minor documented deviations (the test-mock `as never` cast and the `vi.clearAllMocks` switch) are well-reasoned and matched to upstream type-system / mock-system quirks. Both documented in the build summary.
- One implementation-level deviation (`if (!session?.user?.name)` instead of `if (!session?.user)` in the dashboard) is a one-character TypeScript narrowing fix. Behaviour identical.

## Code Quality

- TypeScript strict, no `any`.
- `_id` serialisation boundary lives in `src/lib/tasks.ts` exactly as the plan called for — single source of conversion.
- Anti-IDOR query is at the data-access layer (correct level — see Note 1).
- `createTaskAction` follows the cookie-clear-bug lesson: no try/catch around `redirect(...)`.
- `deleteTaskAction` uses a narrow try/catch around `deleteTask` only — same pattern as `signUpAction` from `05-auth-sign-up`.
- `motion/react` imports are correct (the current canonical path post-rebrand from `framer-motion`).
- `TasksList`'s `deletingIds: Set<string>` handles concurrent deletes correctly without race conditions.
- Visual rhythm honoured.
- All new client components have `'use client'` at the file top.
- `MainHeader.tsx`'s `bg-neutral-100` survives — the neon palette's `neutral-100` (`#fbfcfd`) is a near-white that reads well against the cool `neutral-50` page background.

## Blockers
None.

## Notes (non-blocking)

1. **Security AC (anti-IDOR) confirmed**: the `deleteTask` query enforces ownership at the database layer. A user cannot delete another user's task even via direct action invocation. The implementation matches the spec's intent — query-level filter, not a post-read check.
2. **Dashboard JS bundle grew to 43.7 kB First Load JS** (was 130 B). Motion library + the tasks list + the create-task action chunk. Acceptable for a feature-rich page; if size matters, code-split dynamically in a follow-up.
3. **`motion/react` jsdom behaviour**: the library renders standard HTML in jsdom. RTL queries work against the rendered DOM without motion-specific mocks. Exit animations don't fire in jsdom (no real time elapses), but the DOM removal is synchronous — the `TasksList` delete-success test uses `waitFor` to wait for the React state update + AnimatePresence's "exit complete" callback.
4. **`description` field is currently `<Input>`, not `<textarea>`** — the spec's Open Question #3 default. If the user wants multi-line input, that's a follow-up that extends `Input` (or adds a new `TextArea` primitive).
5. **No animation behavioural tests** — the `motion/react` API is library-tested upstream. Our tests assert that the DOM updates as expected after a delete, which is the user-visible outcome. Animation-specific testing (e.g. asserting a transition fired) would require a heavier test infrastructure.
6. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- New (production): `src/models/Task.ts`, `src/lib/tasks.ts`, `src/lib/validation/task.ts`, `src/actions/createTask.ts`, `src/actions/deleteTask.ts`, `src/components/features/TaskCard.tsx`, `src/components/features/TasksList.tsx`, `src/components/features/CreateTaskForm.tsx`, `src/app/(main)/(private)/create-task/page.tsx`.
- New (tests): the 6 new test files.
- Modified: `tailwind.config.ts`, `src/middleware.ts`, `src/lib/redirect-rules.ts`, `src/app/(main)/(private)/dashboard/page.tsx`, `package.json`, `__tests__/middleware.test.ts`.

No files require changes. STATUS: PASS.
