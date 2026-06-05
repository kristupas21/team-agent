# Review: Tasks — Edit + Route Refactor + UI Polish

## STATUS: PASS

## Acceptance Criteria Check

### Edit story — data layer
- [x] `src/lib/validation/task.ts` exports `taskSchema` and `TaskInput`. The previous names are gone. Confirmed.
- [x] `src/lib/tasks.ts` `getTaskById(id, userName)` queries by `{ _id: id, userId: userName }`, returns `TaskDoc | null`, coerces `_id` to string at the boundary. Confirmed.
- [x] `src/lib/tasks.ts` `updateTask(id, userName, input)` uses `findOneAndUpdate({ _id, userId }, { title, description }, { new: true, lean: true })`. Atomic, race-free. Returns `TaskDoc | null`. Confirmed.
- [x] Anti-IDOR enforced at the DAL: a caller with a foreign `userName` cannot distinguish "task doesn't exist" from "task belongs to someone else" — both return null. Confirmed.

### Edit story — server action
- [x] `src/actions/updateTask.ts` carries `'use server'`. Confirmed.
- [x] Two-arg signature `updateTaskAction(id: string, input: { title; description? })`. Confirmed.
- [x] Validates via `taskSchema.safeParse(input)`. Generic error on failure. Confirmed by `updateTask.test.ts` test 1.
- [x] Calls `auth()`. Generic error when there is no session. Confirmed by test 2.
- [x] Delegates to `updateTask(id, session.user.name, parsed.data)`. Returns `{ success: false, error: 'Task not found.' }` when DAL returns null. Confirmed by test 3.
- [x] On success calls `redirect('/dashboard')` — NOT wrapped in try/catch. The NEXT_REDIRECT error propagates. Confirmed by test 4 (`rejects.toThrow(/NEXT_REDIRECT/)`).

### Edit story — routing
- [x] `src/app/(main)/(private)/tasks/[id]/page.tsx` exists. `auth()` guard → `redirect('/')` when no session. Confirmed.
- [x] `getTaskById(id, session.user.name)` → `notFound()` on null. Confirmed.
- [x] Inline `'use server'` wrapper closes over `task._id` and forwards to `updateTaskAction(task._id, input)`. Confirmed.
- [x] `<Card className="md:max-w-lg">` + `<TaskForm submitLabel="Save Task" initialValues={{ title, description }} action={action} />`. Confirmed.
- [x] `next build` route table lists `/tasks/[id]` (1.54 kB / 133 kB First Load). Confirmed.

### Edit story — shared form
- [x] `src/components/features/TaskForm.tsx` is `'use client'`. Confirmed.
- [x] Props: `submitLabel: string`, `initialValues?: { title; description? }`, `action: (input) => Promise<{ success: true } | { success: false; error: string }>`. Confirmed by static read + `TaskForm.test.tsx` test 1.
- [x] RHF + `zodResolver(taskSchema)`. Confirmed.
- [x] AutoFocus on Title. Confirmed by `TaskForm.test.tsx` test 2.
- [x] Empty submit blocks the action call + shows the title error. Confirmed by test 3.
- [x] Valid submit calls the action exactly once with the parsed values. Confirmed by test 4.
- [x] Action failure (`{ success: false, error }`) renders the root error message. Confirmed by test 5.
- [x] Pending state disables both inputs + flips button text to "Loading...". Confirmed by test 6.
- [x] `initialValues` pre-fills both fields. Confirmed by test 7.
- [x] `submitLabel="Save Task"` renders verbatim. Confirmed by test 8.

### Route refactor
- [x] `src/app/(main)/(private)/create-task/page.tsx` moved to `src/app/(main)/(private)/tasks/new/page.tsx`. The empty `create-task/` directory was removed. Confirmed via `ls` and route table.
- [x] `tasks/new/page.tsx` imports `TaskForm` (not `CreateTaskForm`) and renders `<TaskForm submitLabel="Create Task" action={createTaskAction} />`. Confirmed.
- [x] Both `/tasks/new` and `/tasks/[id]` Card wrappers use `className="md:max-w-lg"`. Confirmed.

### Middleware
- [x] `src/middleware.ts` matcher: `'/create-task'` replaced by `'/tasks/:path*'`. Confirmed.
- [x] `src/lib/redirect-rules.ts` `isPrivate`: drops `/create-task` checks, adds `path === '/tasks' || path.startsWith('/tasks/')`. Confirmed.
- [x] Unauthenticated `/tasks/new` → redirected to `/`. Covered by `middleware.test.ts`.
- [x] Unauthenticated `/tasks/abc123` → redirected to `/`. Covered.
- [x] Authenticated `/tasks/new` → passes through. Covered.
- [x] Authenticated `/tasks/abc123` → passes through. Covered.

### Button ghost variant
- [x] `src/components/ui/buttonClass.ts` `ButtonVariant` union now includes `'ghost'`. Confirmed.
- [x] `ghost` variant classes: `'bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500'`. Confirmed by static read + `Button.test.tsx` (+1 case).

### TaskCard inverse-hover + click-to-edit
- [x] `useRouter()` imported from `next/navigation`. `handleCardClick` calls `router.push(\`/tasks/${task._id}\`)`. Confirmed by `TaskCard.test.tsx` test 5.
- [x] Delete button: `variant="ghost"`, `aria-label="Delete"`, `leftIcon={<MdClose />}`, `className="group-hover:text-neutral-50"`. `MdDelete` import is gone. Confirmed by static read + tests 4, 6, 7.
- [x] Delete handler calls `event.stopPropagation()` BEFORE `onDelete(task._id)`. Verified by `TaskCard.test.tsx` test 7 (`mockPush` never called when Delete is clicked).
- [x] Title classes: `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`. `font-display text-2xl` is gone. Confirmed by static read.
- [x] Description classes gain `transition-colors group-hover:text-neutral-200`. Confirmed.
- [x] Card className: `group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none`. `transition-shadow hover:shadow-lg` is gone. Confirmed.

### TasksList
- [x] `motion.div`'s `whileHover` prop is removed. The motion props `layout`, `initial`, `animate`, `exit`, `transition` stay. Confirmed.
- [x] "Create new task" Link href changed from `/create-task` to `/tasks/new`. Confirmed by static read + `TasksList.test.tsx` (updated assertion).
- [x] `TasksList` stays `'use client'` per the spec's Investigations entry (assumption 10).

### Tests
- [x] `__tests__/actions/updateTask.test.ts` has 4 cases. Verified.
- [x] `__tests__/components/features/TaskForm.test.tsx` has 8 cases. Verified.
- [x] `__tests__/components/features/CreateTaskForm.test.tsx` is deleted. Verified.
- [x] `__tests__/components/features/TaskCard.test.tsx` has 7 cases (3 reworked, 4 same shape). Verified.
- [x] `__tests__/components/features/TasksList.test.tsx` has 5 cases; gained a `next/navigation` mock. Verified.
- [x] `__tests__/components/ui/Button.test.tsx` has 12 cases (+1 ghost). Verified.
- [x] `__tests__/middleware.test.ts` has 14 cases (+2 net). Verified.
- [x] `__tests__/lib/validation/task.test.ts` continues to pass against renamed exports. Verified.
- [x] Suite total: **143 / 21**. Verified.

### Build & quality
- [x] `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all exit 0. Route table now shows `/tasks/[id]` and `/tasks/new`, no `/create-task`. Verified.
- [x] No `mcp__ide__getDiagnostics` warnings on any source / test file (markdown false positives only in the brief).

### Forbidden-pattern compliance
- [x] Zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count = 10 (unchanged — `TaskForm` replaces `CreateTaskForm`).

### Code layout
- [x] Visual rhythm honoured in all new and modified files.

All ACs met.

## Plan Compliance

- All planned files exist at the planned paths.
- The 24-step build order was followed verbatim. Intermediate `tsc --noEmit` after the schema rename passed; the only `tsc` blip was a stale `.next/types/.../create-task/` cache after the file move, cleared with `rm -rf .next`.
- The `'use server'` inline-directive wrapper inside `/tasks/[id]/page.tsx` compiled and ran without needing the documented fallback (`src/actions/updateTaskById.ts` curried wrapper).
- The `TasksList` test gained a `next/navigation` mock — not in the plan's outline but a strict consequence of TaskCard's new `useRouter` dependency. Same shape as the `TaskCard.test.tsx` mock.

## Code Quality

- TypeScript strict; no `any`.
- `updateTaskAction` mirrors `createTaskAction`'s structural shape (validate → auth → DAL → redirect) and follows the same NEXT_REDIRECT propagation contract.
- The DAL's `findOneAndUpdate({ _id, userId }, …, { new: true, lean: true })` is atomic and race-free — a concurrent delete by the owner can't cause a half-update; an attempt to update a foreign task returns null cleanly.
- `TaskForm` carries `'use client'` correctly (RHF needs the directive). The inline `'use server'` wrapper inside `/tasks/[id]/page.tsx` correctly transitions the page-level closure into a server action.
- `TaskCard`'s inverse-hover effect uses Tailwind's `group` / `group-hover:` primitive — no JS state, no listeners. Pure CSS transition. The `tailwind-merge` resolver correctly picks `md:max-w-none` over Card's default `md:max-w-md`.
- `'use client'` placement still honours the deepest-leaf rule. The page (`tasks/[id]/page.tsx`) stays server.
- Visual rhythm honoured.

## Blockers
None.

## Notes (non-blocking)

1. **The inline `'use server'` wrapper is the right call for this single-use binding.** A separate `src/actions/updateTaskById.ts` file with a curried wrapper would have surfaced more, for no win. If a second consumer ever needs it, lift it then.
2. **`task!._id` non-null assertion** inside the inline wrapper is unavoidable — TypeScript can't track that `notFound()` (a thrown function) narrows the closure. Reading code, the safety is obvious: `notFound()` runs above.
3. **`TaskForm`'s `action` prop type accepts `createTaskAction` even though the success arm of the union is structurally unreachable.** TS accepts the assignment because `Promise<never>` is assignable to `Promise<{ success: true } | { success: false; error }>`. Working as intended.
4. **JSDOM doesn't fire hover events natively.** The hover-state classes are present in the compiled CSS (`next build` confirmed); the inverse-hover effect is user-verifiable during `npm run dev`. Not a regression.
5. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- New: `src/actions/updateTask.ts`, `src/components/features/TaskForm.tsx`, `src/app/(main)/(private)/tasks/[id]/page.tsx`, `__tests__/actions/updateTask.test.ts`, `__tests__/components/features/TaskForm.test.tsx`.
- Modified: `src/lib/validation/task.ts`, `src/actions/createTask.ts`, `src/lib/tasks.ts`, `src/components/ui/buttonClass.ts`, `src/components/features/TaskCard.tsx`, `src/components/features/TasksList.tsx`, `src/middleware.ts`, `src/lib/redirect-rules.ts`, `__tests__/lib/validation/task.test.ts`, `__tests__/components/ui/Button.test.tsx`, `__tests__/components/features/TaskCard.test.tsx`, `__tests__/components/features/TasksList.test.tsx`, `__tests__/middleware.test.ts`.
- Moved: `src/app/(main)/(private)/create-task/page.tsx` → `src/app/(main)/(private)/tasks/new/page.tsx` (with edits).
- Deleted: `src/app/(main)/(private)/create-task/` (empty dir), `src/components/features/CreateTaskForm.tsx`, `__tests__/components/features/CreateTaskForm.test.tsx`.

No files require changes. STATUS: PASS.
