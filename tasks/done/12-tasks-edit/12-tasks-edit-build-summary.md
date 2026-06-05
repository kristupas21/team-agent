# Build Summary: Tasks — Edit + Route Refactor + UI Polish

## Files Created

### Production source (3)
- `src/actions/updateTask.ts` — `'use server'`. `updateTaskAction(id, input)`. Validates via `taskSchema`. Calls `auth()`. Delegates to `updateTask(id, session.user.name, parsed.data)`. Returns `{ success: false, error: 'Task not found.' }` when the data-access helper returns null. On success calls `redirect('/dashboard')` (NEXT_REDIRECT propagates — no try/catch).
- `src/components/features/TaskForm.tsx` — `'use client'`. Generic shared form: props are `submitLabel`, optional `initialValues`, and `action`. RHF + `zodResolver(taskSchema)`. AutoFocus on Title. `setError('root', …)` on action failure; clears on next valid submit. Disables both fields + button while pending.
- `src/app/(main)/(private)/tasks/[id]/page.tsx` — server component. `auth()` guard → `/`. `getTaskById(id, session.user.name)` → `notFound()` on null. Inline `'use server'` wrapper closes over `task._id` and forwards to `updateTaskAction`. Renders `<Card className="md:max-w-lg">` + `<TaskForm submitLabel="Save Task" initialValues={...} action={action} />`.

### Tests (2)
- `__tests__/actions/updateTask.test.ts` — 4 cases mirroring `createTask.test.ts`: schema fail (generic error, no DB / redirect call), unauthenticated (generic error), not-found (`updateTask` returns null → `'Task not found.'`), success + NEXT_REDIRECT propagation (asserts `redirect` called with `/dashboard` and `updateTask` called with `(id, userName, input)` triple). Uses `makeRedirectError` from `__tests__/test-utils/redirect-error.ts`. `vi.clearAllMocks()` in `beforeEach` (preserves factory throw on `redirect`).
- `__tests__/components/features/TaskForm.test.tsx` — 8 cases: renders inputs+button with provided label, autofocus, empty-submit blocks action, valid submit calls action once with parsed values, action-failure renders root error, pending state disables fields + flips button text, initialValues pre-fills (edit mode), `"Save Task"` submitLabel renders verbatim. Mocks `next/navigation`.

## Files Modified

- `src/lib/validation/task.ts` — schema rename `createTaskSchema → taskSchema`; type rename `CreateTaskInput → TaskInput`. Rules unchanged.
- `src/actions/createTask.ts` — import update for the schema rename. No behavioural change.
- `src/lib/tasks.ts` — added two helpers:
  - `getTaskById(id, userName)` — `findOne({ _id: id, userId: userName }).lean()`. Returns `TaskDoc | null`. `_id` coerced to string at the boundary.
  - `updateTask(id, userName, input)` — `findOneAndUpdate({ _id: id, userId: userName }, { title, description }, { new: true, lean: true })`. Atomic, race-free. Returns `TaskDoc | null`.
- `src/components/ui/buttonClass.ts` — added `'ghost'` to `ButtonVariant` union; added the variant's class string `'bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500'`.
- `src/components/features/TaskCard.tsx` — full rework per the spec's inverse-hover design:
  - `useRouter()` from `next/navigation`. `handleCardClick = () => router.push(\`/tasks/${task._id}\`)`.
  - Delete button: `variant="ghost"`, `aria-label="Delete"`, `leftIcon={<MdClose />}`, `className="group-hover:text-neutral-50"`. `MdDelete` import dropped.
  - Title classes: `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`. `font-display text-2xl` is gone.
  - Description: gains `transition-colors group-hover:text-neutral-200`.
  - Card className: `group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none`. `transition-shadow hover:shadow-lg` is gone.
  - Delete handler keeps `event.stopPropagation()` BEFORE `onDelete(task._id)`.
- `src/components/features/TasksList.tsx` — dropped `whileHover={{ scale: 1.02 }}` from `motion.div`; the "Create new task" Link href changed `/create-task` → `/tasks/new`. The motion props `layout`, `initial`, `animate`, `exit`, `transition` remain.
- `src/middleware.ts` — matcher entry `'/create-task'` replaced with `'/tasks/:path*'`. Other matcher entries unchanged.
- `src/lib/redirect-rules.ts` — `isPrivate` predicate: dropped `/create-task` checks, added `path === '/tasks' || path.startsWith('/tasks/')`.
- `src/app/(main)/(private)/tasks/new/page.tsx` — was `src/app/(main)/(private)/create-task/page.tsx`. Move + edit: imports `TaskForm` (not `CreateTaskForm`); renders `<TaskForm submitLabel="Create Task" action={createTaskAction} />`. Card wrapper gains `className="md:max-w-lg"`.
- `__tests__/lib/validation/task.test.ts` — import update for the schema rename. Same 6 cases.
- `__tests__/components/ui/Button.test.tsx` — extended with 1 new case asserting the `ghost` variant class set (`bg-transparent text-neutral-700 hover:bg-neutral-200`). Total cases: 12 (was 11).
- `__tests__/components/features/TaskCard.test.tsx` — reworked. Dropped the `console.log` spy and its 2 dependent cases' assertions. Added a hoisted `mockPush = vi.fn()` + `vi.mock('next/navigation', …)`. Replaced "logs `{ id, title }` on card click" with "navigates to `/tasks/{id}` on card click". Replaced "does NOT log on delete click" with "does NOT navigate on delete click". Final case count: 7 (same as before, different assertions).
- `__tests__/components/features/TasksList.test.tsx` — added a `next/navigation` mock (needed because TaskCard now uses `useRouter`). Updated the "Create new task" Link href assertion `/create-task` → `/tasks/new`. Same 5 cases.
- `__tests__/middleware.test.ts` — dropped the 2 `/create-task` cases; added 2 `/tasks/new` cases + 2 `/tasks/<id>` cases. Total cases: 14 (was 12).

## Files Deleted

- `src/app/(main)/(private)/create-task/page.tsx` — moved to `tasks/new/page.tsx`. Empty `create-task/` directory removed.
- `src/components/features/CreateTaskForm.tsx` — replaced by the shared `TaskForm`.
- `__tests__/components/features/CreateTaskForm.test.tsx` — replaced by `TaskForm.test.tsx`.

## Files NOT Modified

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts` — unchanged.
- `src/lib/validation/signIn.ts`, `signUp.ts` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `deleteTask.ts` — unchanged.
- `src/models/Task.ts`, `User.ts` — unchanged.
- `src/components/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `Textarea.tsx` — unchanged. (Only `buttonClass.ts` touched for the ghost variant.)
- `src/app/layout.tsx`, `(main)/layout.tsx`, `error.tsx`, `not-found.tsx`, `(main)/page.tsx`, sign-in/sign-up pages, dashboard page — unchanged.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts` — unchanged. No new deps. No palette change.

## Deviations

None. The plan's structure held verbatim. The `'use server'` inline-directive wrapper inside `/tasks/[id]/page.tsx` compiled and ran without needing the documented fallback (separate `updateTaskById.ts` with bind-curried wrapper).

## Ambiguities

None required `// NOTE:` markers. Three judgement calls handled inline:

- **TaskForm `action` prop typing** — kept the spec's exact two-arm union (`{ success: true } | { success: false; error: string }`) on the prop. The fact that `createTaskAction` never actually returns the success arm (it throws via redirect) is structurally compatible; TS accepts the assignment.
- **Inline action wrapper uses `task!._id`** inside the `'use server'` body. The non-null assertion is safe — the page already calls `notFound()` (which throws) above; TypeScript can't track that across the closure boundary.
- **TasksList test gained a `next/navigation` mock** because TaskCard now uses `useRouter`. Without the mock, RTL would error on render. The mock is the same shape used in `TaskCard.test.tsx`; just inlined here (no shared mock helper added — single use).

## Known Issues

- **`'use client'` count is unchanged at 10**: `TaskForm` replaces `CreateTaskForm` 1:1 in the client count. `TaskCard` was already client.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.
- **No runtime smoke this task.** All behavioural ACs covered by unit / RTL tests. The visual inverse-hover effect (dark surface + light text) is user-verifiable during `npm run dev`.
- **Dashboard route's First Load JS dropped slightly** to 43.9 kB (was 43.9 kB before — within rounding). The new `/tasks/[id]` and `/tasks/new` routes each ship 1.54 kB (133 kB First Load).

## Verification Run

- `npx tsc --noEmit` → exit 0. (Stale `.next/types/app/(main)/(private)/create-task/` cache from the move was cleared once with `rm -rf .next`; re-typecheck clean.)
- `npx next lint` → "No ESLint warnings or errors".
- `npm run test:run` → **143 tests passing across 21 files** (was 134 / 20). 9 net new tests; 0 failing.
- `npx next build` → exit 0. Route table now shows `/tasks/[id]` and `/tasks/new` (no `/create-task`).

### Suite breakdown

- `errors.test.ts`: 11
- `validation/signIn.test.ts`: 6
- `validation/signUp.test.ts`: 5
- `validation/task.test.ts`: 6
- `auth-config.test.ts`: 4
- `middleware.test.ts`: 14 (was 12, +2)
- `actions/signIn.test.ts`: 6
- `actions/signUp.test.ts`: 5
- `actions/createTask.test.ts`: 4
- `actions/deleteTask.test.ts`: 4
- `actions/updateTask.test.ts`: 4 (**new**)
- `components/features/SignInForm.test.tsx`: 6
- `components/features/SignUpForm.test.tsx`: 6
- `components/features/MainHeaderNav.test.tsx`: 9
- `components/features/TaskCard.test.tsx`: 7 (same count, reworked)
- `components/features/TasksList.test.tsx`: 5
- `components/features/TaskForm.test.tsx`: 8 (**new**, replaces `CreateTaskForm.test.tsx`'s 6)
- `components/ui/Button.test.tsx`: 12 (was 11, +1)
- `components/ui/Card.test.tsx`: 3
- `components/ui/Input.test.tsx`: 9
- `components/ui/Textarea.test.tsx`: 9
- **Total: 143 across 21 files.**

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)

- **Server action** (`updateTaskAction`): covered by 4 cases in `updateTask.test.ts`. ✓
- **Validation schema rename** (`taskSchema`): existing 6 cases in `validation/task.test.ts` continue to cover. ✓
- **Middleware** (matcher + `isPrivate` change): covered by 4 path-shape changes in `middleware.test.ts`. ✓
- **Client form** (`TaskForm` — new shared form with state-machine behaviour): covered by 8 cases in `TaskForm.test.tsx`. ✓
- **Client component changed behaviour** (`TaskCard` — gained navigation + ghost-styled icon Delete): covered by 7 reworked cases in `TaskCard.test.tsx`. ✓
- **UI primitive with new API surface** (`Button`'s `ghost` variant): covered by 1 new case in `Button.test.tsx`. ✓

The mandatory category gate passes.
