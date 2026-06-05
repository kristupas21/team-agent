# Build Plan: Tasks — Edit + Route Refactor + UI Polish

## Overview
Five new source files, two new test files. Six modifications. One file move + one source delete + one test delete. No new deps. No new domain models. Structural calls worth flagging:

1. **The `'use server'` inline directive** on the wrapper action inside `/tasks/[id]/page.tsx` is the load-bearing piece. The page closes over `task._id` and exposes a one-arg action via the wrapper; the inline `'use server'` directive makes that wrapper itself a server action. Next.js 15 supports this; verify during the intermediate `tsc` check.
2. **Schema rename `createTaskSchema → taskSchema`** ripples through exactly 5 files (the schema source + 4 import sites + 1 test). Done as a single sweep before the new action / form lands.
3. **`TaskForm` replaces `CreateTaskForm`**: net file count stays the same (`CreateTaskForm.tsx` deleted, `TaskForm.tsx` created). Test file mirrors that — `CreateTaskForm.test.tsx` deleted, `TaskForm.test.tsx` created.
4. **`Ghost` Button variant** is a one-line addition to `buttonClass.ts` plus a one-character expansion of the `ButtonVariant` union in `buttonClass.ts` (Button.tsx itself doesn't change since it just consumes `buttonClass(variant, className)`).
5. **TaskCard tests get reworked** rather than just extended — the `console.log` spy goes; a `useRouter` mock arrives. Net case count stays at 7 (3 of the existing 7 cases change their assertions; 4 keep their shape).
6. **Middleware test extension is asymmetric** — the 2 existing `/create-task` cases get *replaced* by 2 `/tasks/new` cases (same shape, different path), plus 2 new `/tasks/<id>` cases land. Net change: +2 cases.

## Reuse

- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts` — unchanged.
- `src/lib/validation/signIn.ts`, `signUp.ts` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`, `createTask.ts`, `deleteTask.ts` — unchanged (`createTask.ts` does have one import line update for the schema rename).
- `src/models/Task.ts`, `User.ts` — unchanged.
- `src/components/ui/Button.tsx`, `Input.tsx`, `Textarea.tsx`, `Card.tsx` — unchanged.
- `src/components/features/TasksList.tsx` — modified (drop `whileHover`, update Link href).
- `src/components/features/MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx` — unchanged.
- `src/app/layout.tsx`, `(main)/layout.tsx`, `error.tsx`, `not-found.tsx`, `(main)/page.tsx`, sign-in/sign-up pages, dashboard page — unchanged at the source level. The dashboard page's behaviour changes because TaskCard now navigates, but the dashboard's own source is untouched.
- `vitest.config.mts`, `package.json`, `tsconfig.json`, `tailwind.config.ts` — unchanged. No new dep; no palette change.
- Most existing tests — unchanged. Only `Button.test.tsx`, `TaskCard.test.tsx`, `TasksList.test.tsx`, `middleware.test.ts`, `task.test.ts` (imports), and the form-test rename are touched.

## Files to Create

### `src/lib/tasks.ts` (modify, add two functions)
Already exists. Add `getTaskById` and `updateTask` per the spec's outline. Both use the `{ _id: id, userId: userName }` compound filter for anti-IDOR. Both coerce `_id` to string at the boundary.

Already covered under "Files to Modify" below — listing here for completeness.

### `src/actions/updateTask.ts` (new)
- **Type**: server action
- **Outline**:
  ```ts
  'use server'

  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import { updateTask } from '@/lib/tasks'
  import { taskSchema } from '@/lib/validation/task'

  export type UpdateTaskResult = { success: true } | { success: false; error: string }

  const GENERIC_ERROR = 'Something went wrong. Please try again.'

  export async function updateTaskAction(
    id: string,
    input: { title: string; description?: string }
  ): Promise<UpdateTaskResult> {
    const parsed = taskSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR }
    }

    const session = await auth()

    if (!session?.user?.name) {
      return { success: false, error: GENERIC_ERROR }
    }

    const updated = await updateTask(id, session.user.name, parsed.data)

    if (!updated) {
      return { success: false, error: 'Task not found.' }
    }

    // redirect throws NEXT_REDIRECT — do NOT wrap in try/catch.
    redirect('/dashboard')
  }
  ```
- **Reference pattern**: `src/actions/createTask.ts`. Same shape, slightly different signature (two args).
- **Notes**:
  - The `{ success: true }` branch is unreachable in practice (redirect throws first). TypeScript still requires it for the union — like `createTaskAction`. Convention: omit the trailing `return { success: true }` after `redirect(...)` since `redirect` is typed as `never`; the function's union return is satisfied by the prior `{ success: false }` returns.

### `src/components/features/TaskForm.tsx` (new — replaces CreateTaskForm)
- **Type**: client component (`'use client'`)
- **Purpose**: shared create/edit form. Generic over the server action.
- **Outline**:
  ```tsx
  'use client'

  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { taskSchema, type TaskInput } from '@/lib/validation/task'
  import Button from '@/components/ui/Button'
  import Input from '@/components/ui/Input'
  import Textarea from '@/components/ui/Textarea'

  type TaskFormProps = Readonly<{
    submitLabel: string
    initialValues?: { title: string; description?: string }
    action: (input: { title: string; description?: string }) => Promise<
      { success: true } | { success: false; error: string }
    >
  }>

  export default function TaskForm({ submitLabel, initialValues, action }: TaskFormProps) {
    const { register, handleSubmit, formState, setError, clearErrors } = useForm<TaskInput>({
      resolver: zodResolver(taskSchema),
      defaultValues: initialValues,
    })

    const onValid = async (data: TaskInput): Promise<void> => {
      clearErrors('root')

      const result = await action(data)

      if (!result.success) {
        setError('root', { message: result.error })
      }
    }

    return (
      <form onSubmit={handleSubmit(onValid)} className="space-y-4">
        <label className="block">
          <span className="block text-base text-neutral-700">Title</span>
          <Input
            type="text"
            autoFocus
            {...register('title')}
            disabled={formState.isSubmitting}
            error={formState.errors.title?.message}
          />
        </label>

        <label className="block">
          <span className="block text-base text-neutral-700">Description (optional)</span>
          <Textarea
            {...register('description')}
            disabled={formState.isSubmitting}
            error={formState.errors.description?.message}
          />
        </label>

        <Button type="submit" variant="primary" loading={formState.isSubmitting}>
          {submitLabel}
        </Button>

        {formState.errors.root && (
          <p className="text-base text-danger-500">{formState.errors.root.message}</p>
        )}
      </form>
    )
  }
  ```
- **Reference pattern**: `src/components/features/SignInForm.tsx` / `SignUpForm.tsx` / the now-being-deleted `CreateTaskForm.tsx`.

### `src/app/(main)/(private)/tasks/new/page.tsx` (moved from `create-task/page.tsx`)
- Same content as the current `src/app/(main)/(private)/create-task/page.tsx`, with three small changes:
  1. Import `TaskForm` instead of `CreateTaskForm`.
  2. Render `<TaskForm submitLabel="Create Task" action={createTaskAction} />`.
  3. `<Card className="md:max-w-lg">` instead of bare `<Card>`.
- **Outline**:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import { createTaskAction } from '@/actions/createTask'
  import Card from '@/components/ui/Card'
  import TaskForm from '@/components/features/TaskForm'

  export const metadata: Metadata = {
    title: 'Create task',
  }

  export default async function NewTaskPage() {
    const session = await auth()

    if (!session?.user?.name) {
      redirect('/')
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="md:max-w-lg">
          <TaskForm submitLabel="Create Task" action={createTaskAction} />
        </Card>
      </main>
    )
  }
  ```
- **Notes**: the previous defensive guard was `if (!session?.user)`, but to satisfy the `session.user.name` consumer (the new edit page's `getTaskById` call) we already had to tighten it elsewhere; using `!session?.user?.name` here keeps the pattern consistent across both task pages.

### `src/app/(main)/(private)/tasks/[id]/page.tsx` (new)
- **Type**: server component
- **Purpose**: edit page. Server-fetches the task; renders TaskForm in edit mode.
- **Outline**:
  ```tsx
  import type { Metadata } from 'next'
  import { notFound, redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import { getTaskById } from '@/lib/tasks'
  import { updateTaskAction } from '@/actions/updateTask'
  import Card from '@/components/ui/Card'
  import TaskForm from '@/components/features/TaskForm'

  export const metadata: Metadata = {
    title: 'Edit task',
  }

  type EditTaskPageProps = Readonly<{
    params: Promise<{ id: string }>
  }>

  export default async function EditTaskPage({ params }: EditTaskPageProps) {
    const session = await auth()

    if (!session?.user?.name) {
      redirect('/')
    }

    const { id } = await params
    const task = await getTaskById(id, session.user.name)

    if (!task) {
      notFound()
    }

    async function action(input: { title: string; description?: string }) {
      'use server'

      return updateTaskAction(task._id, input)
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card className="md:max-w-lg">
          <TaskForm
            submitLabel="Save Task"
            initialValues={{ title: task.title, description: task.description }}
            action={action}
          />
        </Card>
      </main>
    )
  }
  ```
- **Notes on the `params` prop**:
  - Next.js 15 changed `params` to be a Promise. The page must `await params` before destructuring. Earlier Next.js versions allowed direct destructure; Next 15 deprecates that.
  - The `Promise<{ id: string }>` type encodes this. If the version in this repo doesn't enforce the Promise yet, the architect/builder can adjust.
- **Notes on the inline server action**:
  - The `'use server'` directive INSIDE the function body marks that single function as a server action. The closure over `task._id` is the binding mechanism.
  - This is the canonical Next.js 15 pattern for "per-page server actions that need request-scoped context."
  - Verify at the intermediate `tsc --noEmit` check.

### `__tests__/actions/updateTask.test.ts` (new)
- Mocks: `mongoose`, `@/lib/auth`, `@/lib/tasks`, `next/navigation`.
- 4 cases:
  1. **Schema fail** (e.g. 2-char title) → returns `{ success: false, error: GENERIC }`. `updateTask` NOT called. `redirect` NOT called.
  2. **Unauthenticated** (`auth()` returns null) → returns generic. `updateTask` NOT called.
  3. **Not found** (`updateTask` returns null) → returns `{ success: false, error: 'Task not found.' }`. `redirect` NOT called.
  4. **Success + redirect propagation** — `updateTask` returns the updated doc → action calls `redirect('/dashboard')` which throws `NEXT_REDIRECT`. Test asserts via `await expect(updateTaskAction(...)).rejects.toThrow(/NEXT_REDIRECT/)` and verifies `updateTask` was called with the right `(id, userName, input)` triple.
- Uses the `__tests__/test-utils/redirect-error.ts` `makeRedirectError` helper.
- Uses `vi.clearAllMocks()` in `beforeEach` (preserves the factory-set throw on `redirect`) — same pattern as `createTask.test.ts` from `10-tasks`.

### `__tests__/components/features/TaskForm.test.tsx` (new — replaces CreateTaskForm.test.tsx)
- Mocks: `next/navigation` (`useRouter`, `usePathname`, `useSearchParams`).
- 8 cases:
  1. **Renders title input, description textarea, submit button with the provided label** ("Create Task" or any other).
  2. **Title input has autoFocus on render** (`document.activeElement` is the title).
  3. **Empty submit blocks the action call and renders the title error** (`"Title must be at least 3 characters."` under the title input).
  4. **Valid submit calls the action exactly once with the typed values** (`{ title, description }`).
  5. **Action returns `{ success: false, error }` → root error rendered** below the submit button.
  6. **Pending state**: action is in flight → inputs disabled, button label `"Loading..."`.
  7. **`initialValues` pre-fills the form** (e.g. edit mode). Title value is `"Some title"`; description value is `"Some description"`.
  8. **`submitLabel` prop drives the button text**: render once with `"Create Task"` and assert; render once with `"Save Task"` and assert.

## Files to Modify

### `src/lib/validation/task.ts`
- **What changes**: rename `createTaskSchema` → `taskSchema` and `CreateTaskInput` → `TaskInput`. Rules unchanged.
- **Outline (after)**:
  ```ts
  import { z } from 'zod'

  export const taskSchema = z.object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be at least 3 characters.')
      .max(64, 'Title is too long.'),
    description: z
      .string()
      .max(256, 'Description is too long.')
      .optional()
      .transform((v) => (v === '' ? undefined : v)),
  })

  export type TaskInput = z.infer<typeof taskSchema>
  ```

### `src/actions/createTask.ts`
- **What changes**: update imports — `createTaskSchema` → `taskSchema`. Use `taskSchema.safeParse(input)` internally. Behaviour identical.

### `src/lib/tasks.ts`
- **What changes**: add `getTaskById` and `updateTask` after the existing `deleteTask`.
- **Outline of the two new helpers**:
  ```ts
  export async function getTaskById(id: string, userName: string): Promise<TaskDoc | null> {
    await connectDB()

    const doc = await TaskModel.findOne({ _id: id, userId: userName }).lean().exec()

    if (!doc) return null

    return { ...doc, _id: String(doc._id) } as TaskDoc
  }

  export async function updateTask(
    id: string,
    userName: string,
    input: { title: string; description?: string }
  ): Promise<TaskDoc | null> {
    await connectDB()

    const doc = await TaskModel.findOneAndUpdate(
      { _id: id, userId: userName },
      { title: input.title, description: input.description },
      { new: true, lean: true }
    ).exec()

    if (!doc) return null

    return { ...doc, _id: String(doc._id) } as TaskDoc
  }
  ```
- **Notes**:
  - Both helpers call `connectDB()` first.
  - Both use `{ _id: id, userId: userName }` for anti-IDOR.
  - `findOneAndUpdate` with `{ new: true, lean: true }` returns the updated doc as a plain object.
  - If `id` is malformed (not a valid ObjectId), Mongoose throws a CastError. The action's catch (see below) doesn't currently wrap `updateTask` — the architect calls the shot: lean toward letting CastError propagate to Next.js's error boundary (less common path) OR add a narrow catch that returns `{ success: false, error: 'Task not found.' }`. **Decision**: leave it uncaught for now. The page-level `getTaskById` would already have caught a bad `id` and returned null → `notFound()` upstream. Reaching `updateTask` with a bad `id` requires bypassing the page's earlier check, which only happens under tampering.

### `src/components/ui/buttonClass.ts`
- **What changes**: expand `ButtonVariant` and `VARIANT_CLASSES` to include `ghost`.
- **Outline (after)**:
  ```ts
  import { cn } from '@/lib/utils'

  export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

  const BASE_CLASSES =
    'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

  const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary: 'bg-primary-500 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-700 focus-visible:ring-secondary-500',
    danger: 'bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
    ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500',
  }

  export function buttonClass(variant: ButtonVariant = 'primary', extras?: string): string {
    return cn(BASE_CLASSES, VARIANT_CLASSES[variant], extras)
  }
  ```
- **`Button.tsx` itself doesn't change** — it consumes `buttonClass(variant, className)` and the new variant flows through automatically.

### `src/components/features/TaskCard.tsx`
- **What changes**: substantial rework per spec Assumption 7 and 25-line AC #25.
- **Outline (after)**:
  ```tsx
  'use client'

  import type { MouseEvent } from 'react'
  import { useRouter } from 'next/navigation'
  import { MdClose } from 'react-icons/md'
  import Button from '@/components/ui/Button'
  import Card from '@/components/ui/Card'
  import type { TaskDoc } from '@/models/Task'

  type TaskCardProps = Readonly<{
    task: TaskDoc
    onDelete: (id: string) => void
    isDeleting: boolean
  }>

  export default function TaskCard({ task, onDelete, isDeleting }: TaskCardProps) {
    const router = useRouter()

    const handleCardClick = () => {
      router.push(`/tasks/${task._id}`)
    }

    const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      onDelete(task._id)
    }

    return (
      <Card
        onClick={handleCardClick}
        className="group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50">
            {task.title}
          </h3>

          <Button
            type="button"
            variant="ghost"
            aria-label="Delete"
            leftIcon={<MdClose />}
            loading={isDeleting}
            onClick={handleDeleteClick}
            className="group-hover:text-neutral-50"
          />
        </div>

        {task.description && (
          <p className="mt-2 text-base text-neutral-500 transition-colors group-hover:text-neutral-200">
            {task.description}
          </p>
        )}
      </Card>
    )
  }
  ```
- **Key changes vs the current TaskCard (from `11-tasks-ui-improvements`)**:
  - Import `useRouter` from `next/navigation`. Replace the previous `console.log({ id, title })` with `router.push(\`/tasks/${task._id}\`)`.
  - Import `MdClose` (not `MdDelete`).
  - Title: `font-display text-2xl text-neutral-900` → `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`.
  - Card className: drop `transition-shadow hover:shadow-lg`; add `group`, `transition-colors`, `hover:bg-neutral-900`. Keep `h-full`, `cursor-pointer`, `md:max-w-none`.
  - Description: add `transition-colors group-hover:text-neutral-200`.
  - Delete button: `variant="danger"` → `variant="ghost"`. `leftIcon={<MdDelete />}` → `leftIcon={<MdClose />}`. Add `className="group-hover:text-neutral-50"`.
- **stopPropagation order** preserved: `event.stopPropagation()` BEFORE `onDelete(task._id)`.

### `src/components/features/TasksList.tsx`
- **What changes**:
  1. Remove `whileHover={{ scale: 1.02 }}` from the `motion.div`.
  2. Update the "Create new task" Link's href from `/create-task` to `/tasks/new`.
- Other lines unchanged.

### `src/middleware.ts`
- **What changes**: matcher array entry update.
- **Outline (after)**:
  ```ts
  export const config = {
    matcher: ['/dashboard/:path*', '/tasks/:path*', '/', '/sign-in', '/sign-up'],
  }
  ```

### `src/lib/redirect-rules.ts`
- **What changes**: `isPrivate` check update.
- **Outline (after)**:
  ```ts
  const isPrivate =
    path === '/dashboard' ||
    path.startsWith('/dashboard/') ||
    path === '/tasks' ||
    path.startsWith('/tasks/')
  ```

### `__tests__/lib/validation/task.test.ts`
- **What changes**: imports update — `createTaskSchema` → `taskSchema` (no other rename in the file; the existing 6 cases continue to call `taskSchema.safeParse(...)` with the renamed identifier).

### `__tests__/actions/createTask.test.ts`
- **What changes**: NONE. The action's signature and behaviour are unchanged. The schema rename is internal to `createTask.ts`; the test mocks `createTask` from `@/lib/tasks` and `auth` from `@/lib/auth` and never references the schema directly.

### `__tests__/components/ui/Button.test.tsx`
- **What changes**: add 1 new test case for the ghost variant.
- **New case**:
  ```ts
  it('applies the ghost variant classes when variant="ghost"', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')

    expect(button).toHaveClass('bg-transparent')
    expect(button).toHaveClass('text-neutral-700')
    expect(button).toHaveClass('hover:bg-neutral-200')
  })
  ```
- Existing 11 cases unchanged. New total: 12.

### `__tests__/components/features/TaskCard.test.tsx`
- **What changes**: rework. Remove the `console.log` spy. Add `useRouter` mock. Add `router.push` assertions. Replace the icon-only-`/delete/i` test with one targeting the `MdClose` icon presence (via `aria-label='Delete'` matcher, same as before — that doesn't change since `aria-label` is still `"Delete"`).
- **New mocks at top of file**:
  ```ts
  const mockPush = vi.fn()

  vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
    usePathname: () => '/dashboard',
    useSearchParams: () => new URLSearchParams(),
  }))
  ```
- **`beforeEach`** becomes `vi.clearAllMocks()` instead of the previous console.log spy setup. The `afterEach` cleanup is removed (no spy to restore).
- **Updated cases** (replacing the 3 console.log cases from `11-tasks-ui-improvements`):
  - `'navigates to /tasks/{id} when the card is clicked'`:
    ```ts
    await user.click(screen.getByText('Buy groceries'))
    expect(mockPush).toHaveBeenCalledTimes(1)
    expect(mockPush).toHaveBeenCalledWith('/tasks/task-1')
    ```
  - `'renders the Delete button as icon-only via aria-label (no visible text "Delete")'`: same as before — assert `getByRole('button', { name: 'Delete' })` exists and has no `toHaveTextContent('Delete')`.
  - `'does NOT navigate when the Delete button is clicked (stopPropagation)'`:
    ```ts
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(mockPush).not.toHaveBeenCalled()
    ```
- Existing 4 cases (renders title, renders description, omits description when absent, calls onDelete) keep their shape.
- **Total cases**: 7 (was 7; 3 replaced, 4 unchanged).

### `__tests__/components/features/TasksList.test.tsx`
- **What changes**: 1 assertion update.
- The existing case `'always renders the "Create new task" link pointing at /create-task'` becomes `'always renders the "Create new task" link pointing at /tasks/new'`. Update the href assertion from `/create-task` to `/tasks/new`.
- Other 4 cases unchanged.

### `__tests__/middleware.test.ts`
- **What changes**: replace 2 `/create-task` cases with 2 `/tasks/new` cases; add 2 new `/tasks/<id>` cases.
- **Existing cases to update**:
  - `'redirects /create-task to /'` → `'redirects /tasks/new to /'`.
  - `'passes through /create-task unchanged'` → `'passes through /tasks/new unchanged'`.
- **New cases to add**:
  - `'redirects /tasks/<id> to / when signed out'`.
  - `'passes through /tasks/<id> unchanged when signed in'`.
- **Total cases**: 14 (was 12; 2 net new — 2 updated/replaced, 2 added).

## Files to Delete

- `src/app/(main)/(private)/create-task/page.tsx` — moved to `tasks/new/page.tsx`.
- `src/app/(main)/(private)/create-task/` directory — empty after the move.
- `src/components/features/CreateTaskForm.tsx` — replaced by `TaskForm.tsx`.
- `__tests__/components/features/CreateTaskForm.test.tsx` — replaced by `TaskForm.test.tsx`.

## Build Order

1. **Schema rename** (`src/lib/validation/task.ts`): `createTaskSchema` → `taskSchema`; `CreateTaskInput` → `TaskInput`.
2. **Update schema consumers** so `tsc` stays green:
   - `src/actions/createTask.ts` — import + body update.
   - `__tests__/lib/validation/task.test.ts` — import update.
3. **Data layer additions** (`src/lib/tasks.ts`): append `getTaskById` and `updateTask`.
4. **Intermediate `tsc --noEmit`** — confirm the data + validation layer compiles cleanly.
5. **`Ghost` Button variant** (`src/components/ui/buttonClass.ts`): expand union + variant map.
6. **`Button.test.tsx`** — add 1 new ghost variant case.
7. **New server action** (`src/actions/updateTask.ts`).
8. **Shared `TaskForm` component** (`src/components/features/TaskForm.tsx`).
9. **Delete `CreateTaskForm.tsx`** — replaced by TaskForm.
10. **Delete `CreateTaskForm.test.tsx`** — replaced by TaskForm.test.tsx.
11. **Write `TaskForm.test.tsx`** — 8 cases.
12. **Write `updateTask.test.ts`** — 4 cases.
13. **TaskCard rework** (`src/components/features/TaskCard.tsx`): icon swap, variant swap, title classes, router.push, inverse-hover styles.
14. **Update `TaskCard.test.tsx`**: drop console.log spy; add useRouter mock + push assertions.
15. **TasksList updates** (`src/components/features/TasksList.tsx`): drop `whileHover`; Link href update.
16. **Update `TasksList.test.tsx`**: href assertion update.
17. **Move `create-task/page.tsx` → `tasks/new/page.tsx`**:
    - `mkdir -p src/app/(main)/(private)/tasks/new`
    - `mv src/app/(main)/(private)/create-task/page.tsx src/app/(main)/(private)/tasks/new/page.tsx`
    - `rmdir src/app/(main)/(private)/create-task`
18. **Edit `tasks/new/page.tsx`** to use `TaskForm` (instead of `CreateTaskForm`), `submitLabel="Create Task"`, `<Card className="md:max-w-lg">`.
19. **New page** (`src/app/(main)/(private)/tasks/[id]/page.tsx`).
20. **Middleware updates**:
    - `src/middleware.ts` matcher.
    - `src/lib/redirect-rules.ts` `isPrivate` check.
21. **Update `middleware.test.ts`**: replace `/create-task` cases; add `/tasks/<id>` cases.
22. **Final verify**:
    - `npx tsc --noEmit` → exit 0.
    - `npm run lint` → exit 0.
    - `npm run test:run` → exit 0 with **at least 148 tests across 21 files**. No regressions.
    - `rm -rf .next && npx next build` → exit 0. Route table contains `/tasks/new` and `/tasks/[id]`, not `/create-task`.
23. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Clean expected in `/src` and `/__tests__`.
24. **No runtime smoke required.** All ACs covered by unit/RTL tests + middleware test extension.

## Notes for the Builder

- **The `'use server'` inline directive** inside the `action` function in `/tasks/[id]/page.tsx` is the load-bearing piece. If `tsc` complains at step 19, fall back to extracting the wrapper to its own `src/actions/updateTaskById.ts` file:
  ```ts
  'use server'

  import { updateTaskAction } from '@/actions/updateTask'

  export function updateTaskByIdAction(id: string) {
    return async (input: { title: string; description?: string }) =>
      updateTaskAction(id, input)
  }
  ```
  Then the page uses `<TaskForm action={updateTaskByIdAction(task._id)} />`. Slightly more code but unambiguously well-typed.

- **`params: Promise<{ id: string }>` in Next.js 15**: the App Router changed `params` to a Promise. The page must `await params` before destructuring. If the running Next.js version still accepts synchronous `params`, the build will warn but pass. Use the Promise type to be forward-compatible.

- **`Card`'s `md:max-w-lg` override**: `tailwind-merge` resolves it correctly. Verified by the success of similar overrides in `11-tasks-ui-improvements`.

- **`useRouter` import** in TaskCard: from `next/navigation`, NOT `next/router` (Pages Router — forbidden per CLAUDE.md).

- **TaskCard's group-hover for the Delete button**: passing `className="group-hover:text-neutral-50"` to `<Button>` works because `Button` spreads `className` through `buttonClass(variant, className)`, which merges the consumer's class with the variant defaults via `tailwind-merge`. The `group-hover:text-neutral-50` overrides the variant's `text-neutral-700` only when the parent (Card with `group`) is hovered.

- **`updateTask` returning null on bad `id`**: Mongoose's `findOneAndUpdate` casts `id` to ObjectId. If the cast fails, Mongoose throws CastError. The action does NOT wrap this in a try/catch — see the Notes section. The page-level `getTaskById` already filters bad IDs (returns null → `notFound()`), so reaching `updateTask` with a malformed ID is a tampering case. Accept the unhandled error path for now.

- **Test file rename**: `git mv` semantics aren't strictly necessary — Vitest picks up the new file by glob and ignores the deleted one. The architect/builder can use plain `rm` + `Write` if `git mv` is awkward.

- **Visual rhythm**: follow CLAUDE.md's "Code Layout — Visual Rhythm" in every new file. Blank lines between distinct steps; tightly-coupled idioms kept together; non-trivial returns preceded by a blank line.
