# Task: Tasks — Edit + Route Refactor + UI Polish

## Description
Three interlocking threads:

1. **Edit story** — click a task card to navigate to a new `/tasks/[id]` page that pre-fills the form with that task's data and offers a "Save Task" button. Saving updates the DB and redirects back to `/dashboard`. Plus refactor the existing `/create-task` route to live under `/tasks/new` for a coherent URL hierarchy.
2. **TaskCard polish** — delete button becomes a ghost-style icon-only "close" button (`MdClose` instead of `MdDelete`, no background by default); title drops the display font in favour of a regular weight; hover animation flips from scale-up-and-shadow to an *inverse-color* effect (dark surface + light text) — no more scale.
3. **Form card width** — `/tasks/new` and `/tasks/[id]` form cards are wider than the current `md:max-w-md` default.

Plus a new `ghost` Button variant. Plus a new data-access helper + server action for updating tasks. Plus all the test updates the mandatory-category rule requires.

## Scope

### In scope

**Routes refactor**
- Move `src/app/(main)/(private)/create-task/page.tsx` → `src/app/(main)/(private)/tasks/new/page.tsx`. URL changes from `/create-task` → `/tasks/new`.
- Add a new dynamic route `src/app/(main)/(private)/tasks/[id]/page.tsx` for editing. URL: `/tasks/<task-id>`. Next.js's route resolution prioritises the literal `new` segment, so `/tasks/new` always hits `new/page.tsx`, never the dynamic `[id]`.
- Update `src/middleware.ts` matcher: drop `/create-task`, add `/tasks/:path*`.
- Update `src/lib/redirect-rules.ts` `isPrivate` check: drop `/create-task`, add `/tasks` (path === `/tasks` OR `startsWith('/tasks/')`).
- Update the "Create new task" link in `TasksList`: href `/create-task` → `/tasks/new`.
- Delete the now-empty `src/app/(main)/(private)/create-task/` directory after move.

**New domain logic**
- `src/lib/tasks.ts` gains two helpers:
  - `getTaskById(id, userName): Promise<TaskDoc | null>` — anti-IDOR via `{ _id: id, userId: userName }` filter (same pattern as `deleteTask`). Returns null if not found OR not owned.
  - `updateTask(id, userName, input: { title: string; description?: string }): Promise<TaskDoc | null>` — anti-IDOR via the same compound filter. Uses `findOneAndUpdate({ _id, userId }, { title, description }, { new: true, lean: true })`. Returns the updated doc or null.
- Existing helpers (`getTasksForUser`, `createTask`, `deleteTask`) unchanged.

**New server action**
- `src/actions/updateTask.ts` — `'use server'`. Validates input via the shared `createTaskSchema` (rename to `taskSchema` — see Open Question #1). Reads session via `auth()`. Calls `updateTask(id, userName, parsed.data)`. On null result → `{ success: false, error: 'Task not found.' }`. On success → `redirect('/dashboard')` (NEXT_REDIRECT propagates; not wrapped in try/catch).

**`/tasks/[id]` edit page**
- Server component. `await auth()` defensive guard. Reads `params.id`. Calls `getTaskById(params.id, session.user.name)`. If null → `notFound()` (Next.js's 404 helper from `next/navigation`).
- Renders `<main>` + (wider) `<Card>` + `<TaskForm mode="edit" task={task} />` (or the equivalent — see Open Question #1).

**Shared `TaskForm` (recommended) OR `EditTaskForm` (alternative)**
- See Open Question #1 — default is **shared `TaskForm` component** at `src/components/features/TaskForm.tsx`. Props: `{ initialValues?: { title: string; description?: string }; submitLabel: string; action: (input: { title: string; description?: string }) => Promise<{ success: true } | { success: false; error: string }>; redirectOnSuccess?: never }` — or whatever shape the spec-agent locks. The action is passed in, so the form component is generic.
- Replaces the existing `CreateTaskForm.tsx`. The Create page uses `<TaskForm submitLabel="Create Task" action={createTaskAction} />`. The Edit page uses `<TaskForm submitLabel="Save Task" initialValues={{ title, description }} action={updateTaskActionForId} />` (where `updateTaskActionForId` is a small inline wrapper that binds the task's id).

**`ghost` Button variant**
- New variant on `Button`: `variant="ghost"`. Visual: no background by default, no border (or very subtle), foreground colour stays readable, hover state slightly lifts (e.g. `hover:bg-neutral-200`), focus ring uses a neutral accent. Same disabled / loading semantics as the other variants.
- Used by `TaskCard`'s Delete button.

**TaskCard updates**
- Delete button icon: `MdDelete` → `MdClose` (from `react-icons/md`).
- Delete button variant: `danger` → `ghost`.
- Title classes: `font-display text-2xl text-neutral-900` → `text-lg font-medium text-neutral-900` (or similar regular weight; see Open Question #2).
- Card click handler: replace `console.log({ id, title })` with `router.push(\`/tasks/${task._id}\`)` using `useRouter` from `next/navigation`. The existing `stopPropagation` on the Delete button continues to prevent the card-click navigation.
- Card hover behaviour: replace the current `hover:shadow-lg transition-shadow` + `motion.div`'s `whileHover={{ scale: 1.02 }}` with an *inverse-colour* hover effect:
  - Card root gets `group hover:bg-neutral-900 transition-colors`. The `group` enables descendant `group-hover:` styles.
  - Title gets `group-hover:text-neutral-50`.
  - Description gets `group-hover:text-neutral-200` (was `text-neutral-500`, needs to lighten on the dark hover bg to stay readable).
  - The ghost Delete button inherits or explicitly switches its icon colour on `group-hover` so it remains visible on the dark bg.
  - **No scale animation**. The `whileHover` prop on the motion.div is removed.

**Form card width**
- Both `/tasks/new` and `/tasks/[id]` use a `<Card>` with `className="md:max-w-lg"` (or similar — see Open Question #3) to override Card's default `md:max-w-md`. Default lean: `md:max-w-lg` (32 rem). The form's vertical content stays the same; it's just visually wider on desktop.

**Validation schema reuse**
- The current `createTaskSchema` in `src/lib/validation/task.ts` covers both create and update inputs (same rules: title 3–64, description optional ≤256). The schema is *renamed* to `taskSchema` (or kept as `createTaskSchema` and re-exported as `updateTaskSchema` for clarity). See Open Question #4.

**Tests** (mandatory per CLAUDE.md → Testing Rules)
- `Button.test.tsx` — extend with 1–2 cases for the `ghost` variant (renders, applies the ghost class set).
- `TaskCard.test.tsx` — substantial rework: remove the "console.log on card click" assertions; add "calls `router.push(\`/tasks/${id}\`)` on card click" with `next/navigation` mocked; assert the icon is the new `MdClose` (queryable via test-id or aria-label); assert the Delete still calls `onDelete` and stopsPropagation. Most existing cases keep their shape with minor tweaks.
- `TaskForm.test.tsx` — replaces `CreateTaskForm.test.tsx`. Covers both `create` mode and `edit` mode (initial values pre-filled). 8–10 cases.
- `updateTask.test.ts` — new server action test. ~4 cases: schema fail, unauthenticated, not-found (updateTask returns null), success + redirect propagation.
- `task.test.ts` — no new schema cases unless the schema renames force the test imports to change.
- `middleware.test.ts` — extend with cases for `/tasks/new`, `/tasks/some-id`, both signed-out (redirect to `/`) and signed-in (pass-through).

Test suite expected size: **134 → ~150 tests** (4 update-action + 4 middleware + ~6 TaskForm + 1–2 Button + ~4 TaskCard reshape — gains may net higher or lower depending on existing-test count adjustments).

### Out of scope
- Optimistic UI on update (let the server-side redirect handle the post-save re-render).
- Toast / inline error display beyond the existing `setError('root', ...)` pattern.
- Edit-conflict detection (no "task was modified by someone else").
- Soft delete / undo on delete.
- Bulk operations.
- Drag-and-drop reorder.
- Dark mode beyond the per-card inverse-hover.
- Animations on the create/edit form transitions.

## Specific Threads

### 1. Routes refactor
- Move (filesystem `mv`): `src/app/(main)/(private)/create-task/page.tsx` → `src/app/(main)/(private)/tasks/new/page.tsx`. Empty parent dir `create-task/` deleted.
- New: `src/app/(main)/(private)/tasks/[id]/page.tsx`.
- `next build` route table should show `/tasks/new` (literal) and `/tasks/[id]` (dynamic).
- Middleware matcher: `'/dashboard/:path*', '/tasks/:path*', '/', '/sign-in', '/sign-up'`.
- `redirect-rules.ts` `isPrivate` update: replace `/create-task` checks with `/tasks` checks.
- `TasksList`'s "Create new task" Link href: `/tasks/new`.

### 2. Data layer additions
```ts
// src/lib/tasks.ts — additions
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

Anti-IDOR: both helpers query by `{ _id, userId }`. Mongoose returns null if the doc doesn't exist OR belongs to someone else. Same security property as `deleteTask`.

### 3. `updateTaskAction`
```ts
'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { updateTask } from '@/lib/tasks'
import { taskSchema } from '@/lib/validation/task'   // (or createTaskSchema reused)

export type UpdateTaskResult = { success: true } | { success: false; error: string }

export async function updateTaskAction(
  id: string,
  input: { title: string; description?: string }
): Promise<UpdateTaskResult> {
  const parsed = taskSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Something went wrong. Please try again.' }

  const session = await auth()
  if (!session?.user?.name) return { success: false, error: 'Something went wrong. Please try again.' }

  const updated = await updateTask(id, session.user.name, parsed.data)
  if (!updated) return { success: false, error: 'Task not found.' }

  redirect('/dashboard')  // NEXT_REDIRECT — do NOT wrap in try/catch
}
```

`redirect('/dashboard')` throws `NEXT_REDIRECT` after a successful update. Cookie-clear bug lessons applied: no try/catch around it.

### 4. `/tasks/[id]/page.tsx`
```tsx
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getTaskById } from '@/lib/tasks'
import Card from '@/components/ui/Card'
import TaskForm from '@/components/features/TaskForm'
import { updateTaskAction } from '@/actions/updateTask'

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.name) redirect('/')

  const task = await getTaskById(params.id, session.user.name)
  if (!task) notFound()

  // Bind the id to the action so TaskForm doesn't need to know it
  const action = async (input: { title: string; description?: string }) =>
    updateTaskAction(task._id, input)

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

**Note**: the `action` wrapper is defined inline but it's an async function declared in a server component. Passing it to a client component as a prop works in Next.js 15 if it's a server action (`'use server'`). The architect picks the exact wiring — either inline `'use server'` directive in the page OR `bind`-based currying OR a tiny server-action helper file. Architect's call.

### 5. Shared `TaskForm` component
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

  const onValid = async (data: TaskInput) => {
    clearErrors('root')
    const result = await action(data)
    if (!result.success) setError('root', { message: result.error })
  }

  return ( /* same JSX as the current CreateTaskForm — title Input, description Textarea, Button with submitLabel, root error */ )
}
```

Replaces `CreateTaskForm.tsx`. The action is now a prop; the submit label is a prop; initial values are optional (default `undefined`).

### 6. New `ghost` Button variant
Variant classes (architect picks final, suggested direction):
```ts
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-700 focus-visible:ring-secondary-500',
  danger: 'bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500',
}
```

The `ButtonVariant` union expands: `'primary' | 'secondary' | 'danger' | 'ghost'`. The `buttonClass` helper accepts it. TaskCard uses `variant="ghost"`.

Within a card-hover scenario (Card has `group hover:bg-neutral-900` → dark bg), the ghost button's `text-neutral-700` would be invisible. Solution: TaskCard adds `group-hover:text-neutral-50` to the Button via `className` so its icon stays light on the inverse-hover bg. Or — cleaner — the ghost variant ITSELF includes a `group-hover` fallback. Architect picks.

### 7. TaskCard inverse-hover details

Card root:
```tsx
<Card
  onClick={...}
  className="group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none"
>
```

Title:
```tsx
<h3 className="text-lg font-medium text-neutral-900 group-hover:text-neutral-50 transition-colors">
  {task.title}
</h3>
```

Description:
```tsx
<p className="mt-2 text-base text-neutral-500 group-hover:text-neutral-200 transition-colors">
  {task.description}
</p>
```

Delete button (the ghost variant; close icon):
```tsx
<Button
  type="button"
  variant="ghost"
  aria-label="Delete"
  leftIcon={<MdClose />}
  loading={isDeleting}
  onClick={handleDeleteClick}
  className="group-hover:text-neutral-50"
/>
```

The `motion.div` in `TasksList` no longer carries `whileHover={{ scale: 1.02 }}` — that line is removed.

### 8. Form card width
Both pages use `<Card className="md:max-w-lg">` — overrides Card's default `md:max-w-md`. tailwind-merge resolves the consumer override correctly.

## Tests Required

Per CLAUDE.md → Testing Rules → Categories that require tests:

- **`updateTaskAction`** — new server action. New test file `__tests__/actions/updateTask.test.ts`. ~4 cases: schema fail, unauthenticated, not-found, success + NEXT_REDIRECT propagation.
- **`taskSchema`** — if renamed from `createTaskSchema`, the test file imports update. The existing 6 schema cases continue to apply (rules are unchanged).
- **`getTaskById` + `updateTask`** — data-access helpers. Not strictly required by the testing-categories list, but worth adding if the architect feels coverage is light. Lean: skip dedicated helper tests; the action tests cover the integration. Confirm.
- **Middleware** — new test cases for `/tasks/new` (signed-out → `/`; signed-in → pass) and `/tasks/some-id` (same). 2 new cases.
- **`Button`** — new `ghost` variant. Extend `Button.test.tsx` with ~1 case asserting the ghost variant applies the expected class set.
- **`TaskForm`** — replaces `CreateTaskForm`. New test file `__tests__/components/features/TaskForm.test.tsx`. ~8 cases covering both create-like and edit-like usage (the form is mode-agnostic; tests just exercise the props).
- **`TaskCard`** — significant rework. Remove the "logs to console" cases; add "calls `router.push(\`/tasks/${id}\`)` on card click" with `useRouter` mocked. Assert the icon-only Delete uses `MdClose` (queryable via test-id or by verifying the Delete button no longer contains `MdDelete`'s SVG identifier — alternative: assert the button has `aria-label="Delete"` and an `<svg>` child, without enforcing which specific icon). Architect picks the assertion granularity.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

**New**:
- `src/app/(main)/(private)/tasks/[id]/page.tsx`
- `src/app/(main)/(private)/tasks/new/page.tsx` (moved from `create-task/`)
- `src/components/features/TaskForm.tsx` (replaces `CreateTaskForm.tsx`)
- `src/actions/updateTask.ts`
- `__tests__/actions/updateTask.test.ts`
- `__tests__/components/features/TaskForm.test.tsx` (replaces `CreateTaskForm.test.tsx`)

**Modified**:
- `src/lib/tasks.ts` — add `getTaskById`, `updateTask`.
- `src/lib/validation/task.ts` — possibly rename `createTaskSchema` → `taskSchema` (or add a `taskSchema` alias). See Open Question #4.
- `src/components/ui/Button.tsx` — extend `ButtonVariant` with `'ghost'`.
- `src/components/ui/buttonClass.ts` — add `ghost` to the variant map.
- `src/components/features/TaskCard.tsx` — icon swap, variant swap, title classes, click handler swap, hover restyle.
- `src/components/features/TasksList.tsx` — drop `whileHover`; update Create link href.
- `src/middleware.ts` — matcher update.
- `src/lib/redirect-rules.ts` — `isPrivate` update.
- `__tests__/components/ui/Button.test.tsx` — add ghost variant case.
- `__tests__/components/features/TaskCard.test.tsx` — rework router-push assertion; remove console.log assertions.
- `__tests__/middleware.test.ts` — extend for `/tasks/*` paths.

**Deleted**:
- `src/app/(main)/(private)/create-task/page.tsx` (moved).
- `src/components/features/CreateTaskForm.tsx` (replaced by TaskForm).
- `__tests__/components/features/CreateTaskForm.test.tsx` (replaced by TaskForm.test.tsx).
- Empty parent directory `src/app/(main)/(private)/create-task/`.

## Done Criteria

- Clicking a task card on `/dashboard` navigates to `/tasks/<task-id>`.
- The edit page is pre-filled with the task's title and description.
- Submitting the edit form with valid input updates the DB and redirects back to `/dashboard`, where the changes are visible.
- The Create page works exactly as before, just at `/tasks/new` instead of `/create-task`.
- Direct navigation to `/tasks/<some-non-existent-id>` renders the 404 page (via `notFound()`).
- Direct navigation to `/tasks/<id-belonging-to-another-user>` ALSO renders 404 (the data-access layer can't tell them apart).
- A signed-out visitor hitting `/tasks/new` or `/tasks/<id>` is redirected to `/` by middleware.
- The TaskCard delete button is an icon-only close (`MdClose`) with the new ghost variant.
- The TaskCard title is regular weight (no `font-display`).
- Hovering a task card flips its bg to dark and text to light — no scale.
- `/tasks/new` and `/tasks/<id>` form cards are visibly wider on desktop.
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0.
- Test suite has every mandatory-category test for the new code paths.
- `mcp__ide__getDiagnostics` clean.

## What This Task Does NOT Include

- Optimistic UI on update.
- Edit-conflict detection.
- Toast notifications.
- Bulk edit / delete.
- Drag-and-drop.
- Dark mode beyond per-card hover.
- Soft delete / undo.
- New palette tokens (the existing palette covers everything via `neutral-50` / `neutral-200` / `neutral-900` for the inverse hover).

## Open Questions for the Spec-Agent

1. **Shared `TaskForm` vs separate `CreateTaskForm` + `EditTaskForm`** — Default: shared `TaskForm` with `action` + `submitLabel` + optional `initialValues` props. Alternative: keep `CreateTaskForm`, add `EditTaskForm` as a near-duplicate. The shared form is cleaner reuse but harder to type with two distinct action shapes (`createTaskAction` takes one arg; `updateTaskAction` takes two — id + input — and needs binding). The bind-via-wrapper pattern in the page is documented above; if it feels brittle, prefer two separate forms.

2. **TaskCard title font + size after dropping `font-display`** — Default: `text-lg font-medium text-neutral-900`. Alternatives: `text-base font-semibold`, `text-xl font-medium`. The user said "regular" (not heading-style), so weight stays modest.

3. **Form card width** — Default: `md:max-w-lg` (32 rem). Alternatives: `md:max-w-xl` (36 rem), `md:max-w-2xl` (42 rem). Lean lg.

4. **Schema name** — Default: rename `createTaskSchema` → `taskSchema` (single source for both create + update). Alternative: keep `createTaskSchema` AND export `updateTaskSchema = createTaskSchema` as an alias for clarity at call sites. Lean rename.

5. **`ghost` variant class set** — Default: `bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500`. Alternative: include explicit `group-hover:text-neutral-50` in the variant itself so consumers don't have to add it. Lean: keep the variant simple; TaskCard adds `group-hover` overrides at the consumer level.

6. **Inverse-hover description colour** — Default: `group-hover:text-neutral-200` (`#e6dcc6` warm cream). Readable enough on `neutral-900` (`#2f2a23` dark brown). Alternative: `neutral-100` (`#fbf7eb` even lighter).

7. **`useRouter` vs wrapping the Card in `<Link>`** — Default: `useRouter().push(...)` inside TaskCard's `onClick` (keeps the existing `stopPropagation` pattern intact). Alternative: wrap the card in `<Link>` (better semantics, native middle-click + cmd-click behaviour) but requires careful positioning so the Delete button's click doesn't trigger navigation. Lean `useRouter`.

## Investigations

- **Can `TasksList` drop `'use client'`?** Evaluate during the spec stage. TasksList today carries `'use client'` because it (a) owns `useState` for the task array + deletingIds, (b) renders `motion.div` / `AnimatePresence` from `motion/react` which are themselves client components, and (c) coordinates the delete server action with optimistic-after-confirmation local state. If the only path to dropping the directive is a nonsensical refactor — pushing each TaskCard into its own self-managing stateful island (which would break the shared `AnimatePresence` exit choreography), switching to a different animation strategy that doesn't use motion/react, or otherwise restructuring to eliminate the local task array — then **do NOT refactor**. Document the finding under Assumptions ("`TasksList` stays `'use client'` because X, Y, Z") and move on. If, on the other hand, the refactor turns out to be one or two clean moves (e.g. a slightly different prop shape that still preserves all four required behaviours: list rendering, delete server-action, optimistic removal, fade+layout animations), proceed and note the change.

## Notes for the Spec-Agent

- **Anti-IDOR enforcement** stays at the data-access layer for `getTaskById` and `updateTask` — same `{ _id, userId }` compound query as `deleteTask`. Reviewer will check this is at the query level, not a post-read filter.
- **`notFound()` from `next/navigation`** is the canonical way to render the not-found page from a server component. Throws an unrecoverable error that Next.js intercepts and serves `not-found.tsx`. The defensive `if (!task) notFound()` keeps the route safe.
- **`redirect('/dashboard')` propagation** in `updateTaskAction`: same NEXT_REDIRECT pattern as `createTaskAction`. No try/catch around it. The cookie-clear-bug lesson applies.
- **Mongoose `findOneAndUpdate({ ... }, { ... }, { new: true, lean: true })`** returns the updated doc (with the new values) as a plain object. The `_id` coercion in the helper (same as the rest of `tasks.ts`) ensures the type contract holds.
- **Middleware matcher pattern**: `/tasks/:path*` matches `/tasks`, `/tasks/new`, `/tasks/abc`, `/tasks/abc/sub`. All routed to middleware. `isPrivate` in `redirect-rules.ts` then routes signed-out users back to `/`.
- **Reviewer enforcement**: every mandatory-category test must exist or the review FAILs. The new categories touched: server action (`updateTaskAction`), middleware (the `/tasks` matcher expansion), client form (`TaskForm`), UI primitive with new variant (`Button` `ghost`).
- **No runtime smoke required**. All behavioural ACs covered by unit/RTL tests; visual ACs (inverse-hover, ghost button, regular-weight title) are flow-through via class names.
