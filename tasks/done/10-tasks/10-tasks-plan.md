# Build Plan: Tasks (CRUD) + Neon Palette Refresh

## Overview
Eight new files in `/src`, seven modifications, six new test files (plus a middleware test extension), one new dependency (`motion`). The data layer mirrors the existing `User` model + `users.ts` + actions pattern from `02-auth-sign-in` / `05-auth-sign-up` — same shapes, same conventions. Structural calls worth flagging:

1. **`_id` serialisation boundary** lives inside `src/lib/tasks.ts`. Mongoose hands back `ObjectId`; the helpers convert to string via `String(doc._id)` so consumers always see `_id: string`. The `TaskDoc` type declares `_id: string`. This avoids ObjectId leaking into the client.
2. **`getTasksForUser`'s `.lean<TaskDoc[]>()` cast is a lie at the runtime layer** — `.lean()` returns plain objects with `ObjectId` for `_id`. To make the type contract truthful, the helper maps each result via `{ ...doc, _id: String(doc._id) }` before returning. Same in `createTask` (uses `doc.toObject<TaskDoc>()` then coerces `_id`).
3. **`(main)/(private)/create-task/page.tsx`** sits as a sibling of `dashboard/page.tsx` inside the `(private)` group. The `(main)/layout.tsx` already mounts `MainHeader` for everything in the group; the new route inherits that.
4. **Anti-IDOR query** in `deleteTask`: `TaskModel.deleteOne({ _id: id, userId: userName })`. Mongoose returns `{ deletedCount: 0 }` when no doc matches (either it doesn't exist OR it exists but belongs to someone else). Both paths collapse to `{ deleted: false }` — the caller can't distinguish. This is the desired security property: don't leak ownership info.
5. **`motion.div` props applied per-element**, not on `<AnimatePresence>`. AnimatePresence owns exit-orchestration; per-element motion props own animation specifics. The `layout` prop on each card drives FLIP-reflow when an adjacent card is removed.
6. **`TasksList` is the only new client component** with state. `TaskCard` accepts a `onDelete` callback prop but doesn't own state itself — its `loading` state on the Delete button comes from a per-task `isDeleting` flag passed in.
7. **Test mocking pattern for `motion/react`**: the library renders normal HTML with motion class names; in jsdom, the motion components render their children synchronously. Tests don't need to mock `motion/react` — RTL queries work against the rendered DOM.

## Reuse

Existing files used unchanged:
- `src/lib/auth.ts`, `auth.config.ts`, `errors.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts` — unchanged.
- `src/lib/validation/signIn.ts`, `signUp.ts` — unchanged.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts` — unchanged.
- `src/models/User.ts` — unchanged. Reference pattern for the new `Task` model.
- `src/components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`, `buttonClass.ts` — unchanged (palette flows through).
- `src/components/features/MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx` — unchanged. `SignInForm` / `SignUpForm` are reference patterns for `CreateTaskForm`.
- `src/app/(main)/layout.tsx`, `src/app/layout.tsx`, `src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/(main)/page.tsx`, sign-in/sign-up pages — unchanged.
- `__tests__/components/features/SignInForm.test.tsx`, `SignUpForm.test.tsx` — reference patterns for the new form tests.
- `__tests__/actions/signIn.test.ts`, `signUp.test.ts` — reference patterns for the new action tests.
- `__tests__/lib/validation/signIn.test.ts`, `signUp.test.ts` — reference for the schema test.
- `__tests__/lib/users.test.ts` — N/A (no existing user-tests file; tasks tests start fresh).

## Files to Create

### `src/models/Task.ts`
- **Type**: type + Mongoose model
- **Purpose**: typed `Task` model backed by the `tasks` collection.
- **Outline**:
  ```ts
  import mongoose, { Schema, type Model } from 'mongoose'

  export type TaskDoc = {
    _id: string
    title: string
    description?: string
    userId: string
    createdAt: Date
    updatedAt: Date
  }

  const taskSchema = new Schema<TaskDoc>(
    {
      title: { type: String, required: true },
      description: { type: String },
      userId: { type: String, required: true, index: true },
    },
    { timestamps: true }
  )

  export const TaskModel: Model<TaskDoc> =
    (mongoose.models.Task as Model<TaskDoc> | undefined) ??
    mongoose.model<TaskDoc>('Task', taskSchema)
  ```
- **Reference pattern**: `src/models/User.ts`.
- **Notes**:
  - `_id` is declared as `string` in the type so consumers see a string. Mongoose's runtime `_id` is `ObjectId`; the data-access layer coerces it. Mongoose's `Schema<TaskDoc>` allows the type mismatch at the schema layer because Mongoose's own generic param is structural.
  - No `unique` on `title`. Users can repeat titles.

### `src/lib/tasks.ts`
- **Type**: data-access helpers
- **Purpose**: typed accessors for tasks. Single source of `_id`-to-string coercion.
- **Outline**:
  ```ts
  import { connectDB } from '@/lib/db'
  import { TaskModel, type TaskDoc } from '@/models/Task'

  export async function getTasksForUser(userName: string): Promise<TaskDoc[]> {
    await connectDB()

    const docs = await TaskModel.find({ userId: userName })
      .sort({ createdAt: -1 })
      .lean()
      .exec()

    return docs.map((doc) => ({ ...doc, _id: String(doc._id) })) as TaskDoc[]
  }

  export async function createTask(input: {
    title: string
    description?: string
    userId: string
  }): Promise<TaskDoc> {
    await connectDB()

    const doc = await TaskModel.create(input)
    const obj = doc.toObject<TaskDoc>()

    return { ...obj, _id: String(obj._id) }
  }

  export async function deleteTask(
    id: string,
    userName: string
  ): Promise<{ deleted: boolean }> {
    await connectDB()

    const result = await TaskModel.deleteOne({ _id: id, userId: userName })

    return { deleted: result.deletedCount > 0 }
  }
  ```
- **Reference pattern**: `src/lib/users.ts`.
- **Notes**:
  - The `.lean()` + `as TaskDoc[]` is the conventional Mongoose pattern. The explicit `_id` coercion in `.map(...)` keeps the runtime in sync with the declared type.
  - `deleteOne({ _id: id, userId: userName })` is the anti-IDOR query. If `id` doesn't exist, `deletedCount === 0`. If `id` exists but with a different `userId`, also `deletedCount === 0`. Both outcomes collapse to `{ deleted: false }`. Caller can't distinguish — exactly the desired security property.
  - `id` is a string from the client; Mongoose's `deleteOne` accepts string IDs in the filter and casts them to `ObjectId` automatically. If the string isn't a valid ObjectId hex (24 chars), Mongoose throws a CastError. The action wraps this in a try/catch to return `{ deleted: false }` — see `deleteTaskAction` below.

### `src/lib/validation/task.ts`
- **Type**: type + Zod schema
- **Outline**:
  ```ts
  import { z } from 'zod'

  export const createTaskSchema = z.object({
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

  export type CreateTaskInput = z.infer<typeof createTaskSchema>
  ```
- **Reference pattern**: `src/lib/validation/signUp.ts`.

### `src/actions/createTask.ts`
- **Type**: server action
- **Outline**:
  ```ts
  'use server'

  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import { createTask } from '@/lib/tasks'
  import { createTaskSchema } from '@/lib/validation/task'

  export type CreateTaskResult = { success: true } | { success: false; error: string }

  const GENERIC_ERROR = 'Something went wrong. Please try again.'

  export async function createTaskAction(input: {
    title: string
    description?: string
  }): Promise<CreateTaskResult> {
    const parsed = createTaskSchema.safeParse(input)

    if (!parsed.success) {
      return { success: false, error: GENERIC_ERROR }
    }

    const session = await auth()

    if (!session?.user?.name) {
      return { success: false, error: GENERIC_ERROR }
    }

    await createTask({
      title: parsed.data.title,
      description: parsed.data.description,
      userId: session.user.name,
    })

    // redirect throws NEXT_REDIRECT — do NOT wrap in try/catch
    redirect('/dashboard')
  }
  ```
- **Reference pattern**: `src/actions/signUp.ts` (same narrow-catch shape, same redirect-must-propagate rule).
- **Notes**:
  - The `{ success: true }` branch is unreachable in practice because `redirect(...)` throws. TypeScript still requires the union member to satisfy the return type. The function's behaviour matches `signUpAction`'s success path.
  - **No try/catch around `redirect(...)`**. The `NEXT_REDIRECT` throw must propagate to Next.js.
  - The `Promise<CreateTaskResult>` annotation covers the unreachable path. The function ends with `redirect(...)` which never returns — TypeScript infers the bottom type. Adding an explicit `return { success: true }` after the redirect produces an "unreachable code" warning under strict mode; omitting it is cleaner.

### `src/actions/deleteTask.ts`
- **Type**: server action
- **Outline**:
  ```ts
  'use server'

  import { auth } from '@/lib/auth'
  import { deleteTask } from '@/lib/tasks'

  export type DeleteTaskResult = { success: true } | { success: false; error: string }

  export async function deleteTaskAction(id: string): Promise<DeleteTaskResult> {
    const session = await auth()

    if (!session?.user?.name) {
      return { success: false, error: 'Not authorised.' }
    }

    let result: { deleted: boolean }

    try {
      result = await deleteTask(id, session.user.name)
    } catch {
      // Mongoose throws CastError for malformed ObjectId strings.
      return { success: false, error: 'Task not found.' }
    }

    if (!result.deleted) {
      return { success: false, error: 'Task not found.' }
    }

    return { success: true }
  }
  ```
- **Reference pattern**: `src/actions/signUp.ts` (narrow try around the DB call only).
- **Notes**:
  - The try/catch wraps `deleteTask` ONLY — same narrow pattern as `signUpAction`. CastError from a malformed string ID collapses to the same generic "Task not found" — keeps the contract uniform.
  - **No redirect**. The client owns the post-delete UI.

### `src/components/features/TaskCard.tsx`
- **Type**: client component (because it consumes a callback that triggers state changes in the parent; the wrapping `TasksList` is client, so TaskCard renders inside a client tree regardless. Declaring TaskCard `'use client'` keeps imports clean and prevents accidental cross-boundary breakage if a future use mounts it from a server context.)
- **Props**:
  ```ts
  type TaskCardProps = Readonly<{
    task: TaskDoc
    onDelete: (id: string) => void
    isDeleting: boolean
  }>
  ```
- **Outline**:
  ```tsx
  'use client'

  import { MdDelete } from 'react-icons/md'
  import Button from '@/components/ui/Button'
  import Card from '@/components/ui/Card'
  import type { TaskDoc } from '@/models/Task'

  type TaskCardProps = Readonly<{
    task: TaskDoc
    onDelete: (id: string) => void
    isDeleting: boolean
  }>

  export default function TaskCard({ task, onDelete, isDeleting }: TaskCardProps) {
    return (
      <Card className="flex flex-col">
        <h3 className="text-lg font-semibold text-neutral-900">{task.title}</h3>

        {task.description && (
          <p className="mt-2 text-base text-neutral-500">{task.description}</p>
        )}

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="danger"
            leftIcon={<MdDelete />}
            onClick={() => onDelete(task._id)}
            loading={isDeleting}
          >
            Delete
          </Button>
        </div>
      </Card>
    )
  }
  ```
- **Reference pattern**: existing UI primitives plus the design-system conventions from `04-basic-styling`. `Card` is the surface; `Button` carries variant + icon + loading.
- **Notes**:
  - The `Card` accepts a consumer `className`, but adding `flex flex-col` removes the default text-block flow. The Delete button is right-aligned via `flex justify-end` in its own row.
  - When `task.description` is `undefined` OR empty (Zod transforms `''` to `undefined` at create time), the `<p>` isn't rendered.

### `src/components/features/TasksList.tsx`
- **Type**: client component
- **Props**:
  ```ts
  type TasksListProps = Readonly<{
    initialTasks: TaskDoc[]
  }>
  ```
- **Outline**:
  ```tsx
  'use client'

  import { useState } from 'react'
  import Link from 'next/link'
  import { AnimatePresence, motion } from 'motion/react'
  import { MdAdd } from 'react-icons/md'
  import TaskCard from './TaskCard'
  import { deleteTaskAction } from '@/actions/deleteTask'
  import type { TaskDoc } from '@/models/Task'

  type TasksListProps = Readonly<{
    initialTasks: TaskDoc[]
  }>

  export default function TasksList({ initialTasks }: TasksListProps) {
    const [tasks, setTasks] = useState<TaskDoc[]>(initialTasks)
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

    const handleDelete = async (id: string): Promise<void> => {
      setDeletingIds((prev) => new Set(prev).add(id))

      const result = await deleteTaskAction(id)

      if (result.success) {
        setTasks((prev) => prev.filter((t) => t._id !== id))
      }

      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task._id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <TaskCard
                task={task}
                onDelete={handleDelete}
                isDeleting={deletingIds.has(task._id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <Link
          href="/create-task"
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 p-6 text-center text-base text-neutral-500 transition-colors hover:border-primary-500 hover:text-primary-500"
        >
          <MdAdd className="text-2xl" />
          Create new task
        </Link>
      </div>
    )
  }
  ```
- **Notes**:
  - The "Create new task" Link sits as a SIBLING of `AnimatePresence` inside the grid. It's not part of the animated set — always present, no enter/exit animation needed.
  - `deletingIds: Set<string>` handles multiple concurrent deletes correctly (rare but possible).
  - When `deleteTaskAction` returns failure, the task stays in the list and `deletingIds` clears the entry, returning the Delete button to its non-pending state.
  - The grid columns: `grid-cols-1` mobile; `md:grid-cols-2`; `lg:grid-cols-3`.

### `src/app/(main)/(private)/create-task/page.tsx`
- **Type**: server component
- **Outline**:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import Card from '@/components/ui/Card'
  import CreateTaskForm from '@/components/features/CreateTaskForm'

  export const metadata: Metadata = {
    title: 'Create task',
  }

  export default async function CreateTaskPage() {
    const session = await auth()

    if (!session?.user) {
      redirect('/')
    }

    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Card>
          <CreateTaskForm />
        </Card>
      </main>
    )
  }
  ```
- **Reference pattern**: `src/app/(main)/(auth)/sign-up/page.tsx`. Defensive `auth()` even though middleware already protects it.

### `src/components/features/CreateTaskForm.tsx`
- **Type**: client component
- **Outline**:
  ```tsx
  'use client'

  import { useForm } from 'react-hook-form'
  import { zodResolver } from '@hookform/resolvers/zod'
  import { createTaskAction } from '@/actions/createTask'
  import { createTaskSchema, type CreateTaskInput } from '@/lib/validation/task'
  import Button from '@/components/ui/Button'
  import Input from '@/components/ui/Input'

  export default function CreateTaskForm() {
    const { register, handleSubmit, formState, setError, clearErrors } = useForm<CreateTaskInput>({
      resolver: zodResolver(createTaskSchema),
    })

    const onValid = async (data: CreateTaskInput): Promise<void> => {
      clearErrors('root')

      const result = await createTaskAction(data)

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
          <Input
            type="text"
            {...register('description')}
            disabled={formState.isSubmitting}
            error={formState.errors.description?.message}
          />
        </label>

        <Button type="submit" variant="primary" loading={formState.isSubmitting}>
          Create
        </Button>

        {formState.errors.root && (
          <p className="text-base text-danger-500">{formState.errors.root.message}</p>
        )}
      </form>
    )
  }
  ```
- **Reference pattern**: `src/components/features/SignInForm.tsx`, `SignUpForm.tsx`. Byte-similar shape.

## Files to Modify

### `tailwind.config.ts`
- Replace `theme.extend.colors` with the neon hexes from spec Assumption 2. Other keys (`fontFamily`, `fontSize`, `spacing`) unchanged.
- Outline of the new `colors`:
  ```ts
  colors: {
    primary: { 50: '#cdf6ff', 500: '#00d4ff', 700: '#0099bf' },
    secondary: { 50: '#ffd6f5', 500: '#ff2bd6', 700: '#c1009b' },
    neutral: {
      50: '#f3f5f7',
      100: '#fbfcfd',
      200: '#dde3e9',
      500: '#6b7785',
      700: '#3c4452',
      900: '#161b22',
    },
    danger: { 50: '#ffd6dc', 500: '#ff3b6e', 700: '#c2003c' },
    success: { 50: '#dcffcd', 500: '#7dff3b', 700: '#54bf26' },
  },
  ```

### `src/app/(main)/(private)/dashboard/page.tsx`
- Drop the welcome heading + paragraph.
- Server-fetch tasks via `await getTasksForUser(session.user.name)`.
- Render heading `"Your tasks"` in `font-display` + `<TasksList initialTasks={tasks} />`.
- Layout wrapper changes: existing `<main className="flex min-h-screen items-center justify-center p-4">` becomes `<main className="min-h-screen p-4 md:p-8">` with `<div className="mx-auto max-w-3xl space-y-6">` inside.
- Outline:
  ```tsx
  import type { Metadata } from 'next'
  import { redirect } from 'next/navigation'
  import { auth } from '@/lib/auth'
  import { getTasksForUser } from '@/lib/tasks'
  import TasksList from '@/components/features/TasksList'

  export const metadata: Metadata = {
    title: 'Dashboard',
  }

  export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user) {
      redirect('/')
    }

    const tasks = await getTasksForUser(session.user.name)

    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="font-display text-4xl text-neutral-900">Your tasks</h1>

          <TasksList initialTasks={tasks} />
        </div>
      </main>
    )
  }
  ```

### `src/lib/redirect-rules.ts`
- Update the `isPrivate` check to include `/create-task` and any future private route at the top level:
  ```ts
  const isPrivate =
    path === '/dashboard' ||
    path.startsWith('/dashboard/') ||
    path === '/create-task' ||
    path.startsWith('/create-task/')
  ```
- `isPublicOnly` unchanged.

### `src/middleware.ts`
- Extend the matcher:
  ```ts
  export const config = {
    matcher: ['/dashboard/:path*', '/create-task', '/', '/sign-in', '/sign-up'],
  }
  ```

### `__tests__/middleware.test.ts`
- Add two new test cases under "signed-out" and "signed-in":
  - **Signed-out on `/create-task`** → redirects to `/`.
  - **Signed-in on `/create-task`** → passes through (returns `undefined`).
- Existing 10 cases unchanged.

### `package.json`
- Add `motion` to `dependencies`. Version `^11.x` or latest.

## Files to Create — Tests

### `__tests__/lib/validation/task.test.ts`
- Mirrors `__tests__/lib/validation/signUp.test.ts` structure.
- 6 cases (one above the spec minimum to confidently cover the transform):
  1. Title `"ab"` (2 chars) → fails with `"Title must be at least 3 characters."`.
  2. Title `"a".repeat(65)` → fails with `"Title is too long."`.
  3. Description `"d".repeat(257)` → fails with `"Description is too long."`.
  4. Description `""` (empty) → succeeds; parsed `description` is `undefined`.
  5. No description key → succeeds.
  6. Valid title + valid description → succeeds with both.

### `__tests__/actions/createTask.test.ts`
- Mocks: `mongoose`, `@/lib/auth` (for `auth`), `@/lib/tasks` (for `createTask`), `next/navigation` (for `redirect`).
- Use the shared `__tests__/test-utils/redirect-error.ts` `makeRedirectError` helper from `07-unit-tests`.
- Cases (4 minimum, may grow to 5):
  1. Schema fail (title `"ab"`) → returns `{ success: false, error: GENERIC }`. `createTask` not called. `redirect` not called.
  2. Unauthenticated (auth returns null) → returns generic. `createTask` not called.
  3. Valid input + auth + `createTask` resolves + `redirect` throws `NEXT_REDIRECT` → the action **re-throws**. `createTask` called once with `{ title, description, userId }`.
  4. (Optional) Valid input without description → `createTask` called with `description: undefined`.

### `__tests__/actions/deleteTask.test.ts`
- Mocks: `mongoose`, `@/lib/auth`, `@/lib/tasks` (for `deleteTask`).
- Cases (4 — one above the minimum):
  1. Unauthenticated → returns `{ success: false, error: 'Not authorised.' }`. `deleteTask` not called.
  2. Authenticated + `deleteTask` resolves to `{ deleted: false }` → returns `{ success: false, error: 'Task not found.' }`.
  3. Authenticated + `deleteTask` throws (CastError simulation) → returns `{ success: false, error: 'Task not found.' }`.
  4. Authenticated + `deleteTask` resolves to `{ deleted: true }` → returns `{ success: true }`.

### `__tests__/components/features/TaskCard.test.tsx`
- Mocks: none needed (TaskCard is pure rendering with a callback prop).
- Cases (3):
  1. Renders the title text.
  2. Renders the description when `task.description` is a non-empty string.
  3. Does NOT render a description `<p>` when `task.description` is undefined.
  4. (Bonus) Clicking the Delete button calls `onDelete(task._id)` exactly once.
- Actually 4 cases — exceeds the spec minimum of 3.

### `__tests__/components/features/TasksList.test.tsx`
- Mocks: `@/actions/deleteTask` (for `deleteTaskAction`).
- Cases (5 — one above the minimum):
  1. Renders all initial tasks (3 sample tasks → 3 TaskCard elements found by their titles).
  2. Renders only the "Create new task" card when `initialTasks` is empty.
  3. Always renders the "Create new task" link with `href="/create-task"`.
  4. Successful delete: clicks Delete on a task, mocked action resolves `{ success: true }`, the task is removed from the DOM.
  5. Failed delete: mocked action resolves `{ success: false }`, the task stays in the DOM.

### `__tests__/components/features/CreateTaskForm.test.tsx`
- Mocks: `@/actions/createTask`, `next/navigation`.
- Cases (6 — matches the spec):
  1. Renders both inputs and the Create button.
  2. Title input has autofocus (`document.activeElement === ...`).
  3. Empty submit → action not called; per-field error rendered.
  4. Valid submit → action called once with `{ title, description }`.
  5. Action returns `{ success: false }` → root error rendered.
  6. Submit-in-flight → inputs disabled + button label `"Loading..."`.

## File Tree

```
/
├── package.json                                       (modified — +motion)
├── tailwind.config.ts                                 (modified — neon palette)
└── src/
    ├── models/
    │   └── Task.ts                                    (new)
    ├── lib/
    │   ├── tasks.ts                                   (new)
    │   ├── redirect-rules.ts                          (modified — isPrivate +/create-task)
    │   └── validation/task.ts                         (new)
    ├── middleware.ts                                  (modified — matcher +/create-task)
    ├── actions/
    │   ├── createTask.ts                              (new)
    │   └── deleteTask.ts                              (new)
    ├── app/
    │   └── (main)/(private)/
    │       ├── dashboard/page.tsx                     (modified — tasks list)
    │       └── create-task/page.tsx                   (new)
    └── components/
        └── features/
            ├── TaskCard.tsx                           (new — client)
            ├── TasksList.tsx                          (new — client)
            └── CreateTaskForm.tsx                     (new — client)

__tests__/
├── actions/
│   ├── createTask.test.ts                             (new)
│   └── deleteTask.test.ts                             (new)
├── components/features/
│   ├── CreateTaskForm.test.tsx                        (new)
│   ├── TasksList.test.tsx                             (new)
│   └── TaskCard.test.tsx                              (new)
├── lib/validation/task.test.ts                        (new)
└── middleware.test.ts                                 (modified — +2 cases for /create-task)
```

## Build Order

1. **Install `motion`** — `npm install motion`. Verify `package.json` updated.
2. **`tailwind.config.ts`** — palette swap. (Doesn't depend on anything else.)
3. **`src/models/Task.ts`** — new model.
4. **`src/lib/tasks.ts`** — data-access helpers.
5. **`src/lib/validation/task.ts`** — schema.
6. **Intermediate `tsc --noEmit`** — verify the data/validation layer compiles.
7. **`src/actions/createTask.ts`** — server action with redirect.
8. **`src/actions/deleteTask.ts`** — server action with narrow try/catch.
9. **`src/lib/redirect-rules.ts`** — extend `isPrivate`.
10. **`src/middleware.ts`** — extend matcher.
11. **`src/components/features/TaskCard.tsx`** — UI primitive for one task.
12. **`src/components/features/TasksList.tsx`** — client list with animations + delete handling.
13. **`src/components/features/CreateTaskForm.tsx`** — RHF + Zod resolver.
14. **`src/app/(main)/(private)/create-task/page.tsx`** — new private page.
15. **`src/app/(main)/(private)/dashboard/page.tsx`** — modify to fetch + render tasks.
16. **Intermediate `tsc --noEmit`** — verify the UI layer compiles.
17. **Test files** in this order:
    - `__tests__/lib/validation/task.test.ts`
    - `__tests__/actions/createTask.test.ts`
    - `__tests__/actions/deleteTask.test.ts`
    - `__tests__/components/features/TaskCard.test.tsx`
    - `__tests__/components/features/TasksList.test.tsx`
    - `__tests__/components/features/CreateTaskForm.test.tsx`
    - `__tests__/middleware.test.ts` — append 2 cases.
18. **Final verify**:
    - `npx tsc --noEmit` exit 0.
    - `npm run lint` exit 0.
    - `npm run test:run` exit 0 with **at least 118 tests across at least 18 files** (91 previous + 27 new). All previous tests still pass.
    - `rm -rf .next && npx next build` exit 0. Route table contains `/`, `/sign-in`, `/sign-up`, `/dashboard`, `/create-task`, `/api/auth/[...nextauth]`, `/_not-found`, `Middleware`.
19. **Diagnostic sweep**: `mcp__ide__getDiagnostics`. Should be empty in `/src` and `/__tests__`.
20. **CSS palette verification (optional)**: `find .next -name "*.css" -exec grep -l "rgb(0 212 255)" {} \;` — confirms `#00d4ff` (primary-500) emits.
21. **No runtime smoke required.** All ACs covered by static checks + unit/RTL tests + the existing middleware test infrastructure.

## Notes for the Builder

- **`motion/react` import paths**: `import { motion, AnimatePresence } from 'motion/react'`. The library reorganised; the `framer-motion` package is now an alias for `motion`. Stick with `motion` for forward compatibility.
- **Mongoose `_id` serialisation**: every helper that returns a `TaskDoc` must coerce `_id` to string. The data-access layer is the single conversion boundary; consumers never see `ObjectId`.
- **Mocking `mongoose` at the top of action tests**: same pattern as `07-unit-tests` established for sign-up tests. `vi.mock('mongoose', () => ({ default: { models: {}, model: vi.fn(), Schema: vi.fn() } }))`.
- **Mocking `next/navigation`'s `redirect`**: use the same synthetic-`NEXT_REDIRECT` pattern from `__tests__/test-utils/redirect-error.ts`. The mock should throw `makeRedirectError('/dashboard')` so the test asserts the rethrow.
- **RTL motion testing**: `motion/react` renders standard HTML in jsdom. Tests query by `getByText` / `getByRole` against the rendered DOM as usual. No special motion mocks needed.
- **`TaskCard` test focus**: assert rendered text content and the callback invocation. Don't probe className strings beyond the bare minimum.
- **`TasksList` empty-state test**: assert no `<h3>` (task titles use `<h3>`) is in the DOM but the "Create new task" Link IS.
- **Reviewer enforcement**: the security AC (#7 — anti-IDOR) requires the `deleteTask` helper's query to include `userId` as a filter, not an after-the-fact check. If the builder writes `findById` + a separate ownership check, that's a Blocker.
- **Visual rhythm**: follow CLAUDE.md's "Code Layout — Visual Rhythm" rules in every new file. Blank lines between distinct steps; tightly-coupled idioms kept together; non-trivial returns preceded by a blank line.
