# Spec: Tasks (CRUD) + Neon Palette Refresh

## Summary
First domain feature with persistence: signed-in users can create, view, and delete their own tasks. Each task has a title (3–64 chars, required, trimmed) and an optional description (≤256 chars). The dashboard becomes a responsive grid of task cards (single column on mobile; `md:grid-cols-2`, `lg:grid-cols-3` on larger viewports) with a "Create new task" card-link at the end. `framer-motion` (via the new `motion` package) drives fade-in / fade-out / layout-reflow animations. A new `/create-task` route renders a private form; on success it redirects to `/dashboard`. Anti-IDOR enforcement at the data-access layer: a user can never delete another user's task even via direct API access. Palette flips from earthy retro-futuristic to a neon set — same 5 tokens, same step counts, vibrant new hexes. Light surface kept (no dark mode) — only accent colours change. Eight new files; six modifications. Test suite grows from 91 to ~110 tests.

## Assumptions

1. **Surface stays light.** Neon palette renders against the cream surface from `09-design-updates-retro`. Dark surface flagged as Open Question #1 but default is light to avoid restructuring every page. Body background remains `bg-neutral-50`; the new `neutral-50` hex is slightly cooler than the current cream (see Assumption 4).

2. **Neon palette** — locked hexes (override during spec-pause if any feels off):

   | Token | Step | Hex | Role |
   |---|---|---|---|
   | `primary` | 50  | `#cdf6ff` | Light cyan tint for hover backgrounds and rings. |
   | `primary` | 500 | `#00d4ff` | Electric cyan — primary action colour. |
   | `primary` | 700 | `#0099bf` | Deeper cyan for hover darken. |
   | `secondary` | 50  | `#ffd6f5` | Light magenta tint. |
   | `secondary` | 500 | `#ff2bd6` | Neon magenta — secondary action colour. |
   | `secondary` | 700 | `#c1009b` | Deeper magenta. |
   | `neutral` | 50  | `#f3f5f7` | Cool light surface — page background. |
   | `neutral` | 100 | `#fbfcfd` | Slightly lighter — Card surface lifted above page. |
   | `neutral` | 200 | `#dde3e9` | Borders. |
   | `neutral` | 500 | `#6b7785` | Muted body text. |
   | `neutral` | 700 | `#3c4452` | Body text. |
   | `neutral` | 900 | `#161b22` | Heading text (when not Oleo). |
   | `danger` | 50  | `#ffd6dc` | Light hot pink. |
   | `danger` | 500 | `#ff3b6e` | Neon hot pink — error / delete colour. |
   | `danger` | 700 | `#c2003c` | Deeper hot pink for hover darken. |
   | `success` | 50  | `#dcffcd` | Light lime tint. |
   | `success` | 500 | `#7dff3b` | Neon lime — success colour. |
   | `success` | 700 | `#54bf26` | Deeper lime. |

   All `-500` ↔ `-700` pairs are visibly distinguishable so the existing hover-darken on buttons continues to read.

3. **Heading text colour stays `neutral-900`.** The new `neutral-900` (`#161b22`) is near-black, which reads with high contrast against the light surface and against the neon accents inside buttons.

4. **`Card` background stays `bg-neutral-100`** (`#fbfcfd` — near-white, slightly cooler). Border stays `border-neutral-200`. Token names unchanged from `09-design-updates-retro`.

5. **No layout restructuring beyond the dashboard and the new `/create-task` route.** All other pages render unchanged in markup; their visual flow-through reflects the new palette automatically via Tailwind class names.

6. **`framer-motion` is installed via the `motion` package** (`npm install motion`). Imports use `import { motion, AnimatePresence } from 'motion/react'`. (The library reorganised its entry points; this is the current canonical path for React.)

7. **`MdAdd` and `MdDelete`** from `react-icons/md` are the icons. `MdAdd` for the "Create new task" card; `MdDelete` (or its alias) for the delete button on each task card.

8. **Dashboard no longer renders the "Welcome, ${name}." heading and paragraph** — those are removed to make room for the tasks list. The dashboard is now a tasks-list page. The welcome content was a placeholder anyway; with real content arriving, it goes. Heading on `/dashboard` becomes `"Your tasks"` in `font-display`. (Open Question #2 — confirm copy.)

9. **`Task` Mongoose model**:
   ```ts
   export type TaskDoc = {
     _id: string
     title: string
     description?: string
     userId: string
     createdAt: Date
     updatedAt: Date
   }
   ```
   Schema: `title` String required, `description` String optional, `userId` String required indexed, `timestamps: true`. No `unique` constraint on title. `_id` is Mongoose's default ObjectId, serialised to a string via `.lean()` + `.toString()` at the data-access boundary so consumers receive a string.

10. **`src/lib/tasks.ts` data-access helpers**:
    - `getTasksForUser(userName: string): Promise<TaskDoc[]>` — returns the user's tasks, newest first (`{ createdAt: -1 }`).
    - `createTask(input: { title: string; description?: string; userId: string }): Promise<TaskDoc>` — returns the created doc.
    - `deleteTask(id: string, userName: string): Promise<{ deleted: boolean }>` — anti-IDOR: queries by `{ _id: id, userId: userName }`. If the task doesn't exist OR belongs to someone else, `deletedCount === 0` and the function returns `{ deleted: false }`.
    - Each helper calls `connectDB()` at the top.
    - All results are returned as plain objects (`.lean()` or `.toObject()`). `_id` is coerced to string when returned.

11. **`src/lib/validation/task.ts`**:
    ```ts
    export const createTaskSchema = z.object({
      title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(64, 'Title is too long.'),
      description: z.string().max(256, 'Description is too long.').optional(),
    })
    export type CreateTaskInput = z.infer<typeof createTaskSchema>
    ```
    Note: description is optional but capped when present. Empty string is treated as "absent" via additional `.transform()` step:
    ```ts
    description: z
      .string()
      .max(256, 'Description is too long.')
      .optional()
      .transform((v) => (v === '' ? undefined : v))
    ```
    The transform ensures empty form fields don't insert an empty-string description into the DB.

12. **`createTaskAction(input)` server action**:
    - `'use server'`. Validates with `createTaskSchema`. On Zod failure → `{ success: false, error: 'Something went wrong. Please try again.' }`.
    - `await auth()`. If no session → `{ success: false, error: 'Something went wrong. Please try again.' }` (defensive).
    - `await createTask({ title, description, userId: session.user.name })`.
    - `redirect('/dashboard')` — throws `NEXT_REDIRECT`; NOT wrapped in try/catch.
    - Return type is `Promise<CreateTaskResult>` where `CreateTaskResult = { success: true } | { success: false; error: string }`. Success branch unreachable in practice — kept for type symmetry.

13. **`deleteTaskAction(id: string)` server action**:
    - `'use server'`. `await auth()`. If no session → `{ success: false, error: 'Not authorised.' }`.
    - `await deleteTask(id, session.user.name)`. If `deleted === false` → `{ success: false, error: 'Task not found.' }`.
    - On success → `{ success: true }`. The action does NOT redirect — the client updates its local state.
    - **No `revalidatePath('/dashboard')`** call — the client is in charge of the post-delete UI. The next time a fresh GET to `/dashboard` happens, server-fetch returns the truth. (Open Question #5 default — skip revalidate.)

14. **Dashboard becomes a tasks-list page**:
    - `src/app/(main)/(private)/dashboard/page.tsx` server-fetches via `await getTasksForUser(session.user.name)`.
    - Renders heading `"Your tasks"` in `font-display`, then `<TasksList initialTasks={tasks} />`.
    - The previous welcome heading + paragraph are removed.
    - Layout wrapper changes: existing `<main className="flex min-h-screen items-center justify-center p-4">` becomes `<main className="min-h-screen p-4 md:p-8">` with the inner content centred via a `<div className="mx-auto max-w-3xl space-y-6">`. The grid lives inside that wrapper. This change is necessary to host a tall list without it being vertically centred on a tall screen — that would push content off-screen as it grows.

15. **`TasksList` client component**:
    - `'use client'`. Props: `{ initialTasks: TaskDoc[] }`.
    - Local state: `tasks: TaskDoc[]` seeded from `initialTasks`.
    - Renders a grid via `<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">` containing `<AnimatePresence>` wrapping each task as a `motion.div` with `initial / animate / exit / layout` props.
    - Each `motion.div` renders a `<TaskCard task={task} onDelete={handleDelete} />`.
    - The last child of the grid (outside `<AnimatePresence>` or inside — see below) is the "Create new task" card-link.
    - Animation specifics:
      - `initial={{ opacity: 0, y: 8 }}`
      - `animate={{ opacity: 1, y: 0 }}`
      - `exit={{ opacity: 0, scale: 0.95 }}`
      - `transition={{ duration: 0.2 }}`
      - `layout` prop on each motion element for FLIP-reflow on delete.

16. **"Create new task" card** is a `<Link href="/create-task">` styled like a Card but with `border-dashed` and a centred `<MdAdd />` icon stacked above the text `"Create new task"`. Lives at the end of the grid. It is NOT inside `<AnimatePresence>` — it's always present, doesn't need to animate. Implementation: render it as a sibling of the AnimatePresence-wrapped task list inside the grid.

17. **`TaskCard` component** lives in `src/components/features/TaskCard.tsx` (feature, not UI primitive — it knows about the `Task` shape).
    - Props: `{ task: TaskDoc; onDelete: (id: string) => void; isDeleting: boolean }`.
    - Renders a `<Card>` containing:
      - `<h3 className="font-semibold text-lg text-neutral-900">{task.title}</h3>`
      - When `task.description`: `<p className="mt-2 text-base text-neutral-500">{task.description}</p>`
      - A `<Button variant="danger" leftIcon={<MdDelete />} onClick={() => onDelete(task._id)} loading={isDeleting}>Delete</Button>` at the bottom-right.
    - The Card's content layout uses `flex flex-col` with the delete button anchored via `mt-auto` or simply positioned at the end.

18. **`/create-task` page**:
    - `src/app/(main)/(private)/create-task/page.tsx` — server component.
    - Defensive `await auth()` + `if (!session?.user) redirect('/')`.
    - Renders `<main className="flex min-h-screen items-center justify-center p-4">` + `<Card>` + `<CreateTaskForm />`.
    - Page metadata `title: 'Create task'`.

19. **`CreateTaskForm` client component**:
    - Mirrors `SignInForm` / `SignUpForm`: `react-hook-form` + `zodResolver(createTaskSchema)`, `setError('root', ...)` for server errors, `formState.isSubmitting` driving disabled + button label.
    - Two fields: title (`<Input type="text">`, autofocus), description (`<Input type="text">` — kept consistent with the other forms; spec rejects `<textarea>` for this iteration to maintain visual consistency).
    - Submit `<Button variant="primary" loading={formState.isSubmitting}>Create</Button>`.
    - The action call is `await createTaskAction({ title, description })`. On `{ success: true }` (unreachable in practice — the action redirects) the form does nothing else. On `{ success: false }` it sets the root error.

20. **Middleware updates**:
    - `src/lib/redirect-rules.ts` `decideRedirect`: `isPrivate` becomes `path === '/dashboard' || path.startsWith('/dashboard/') || path === '/create-task' || path.startsWith('/create-task/')`.
    - `src/middleware.ts` matcher: add `/create-task` to the array → `['/dashboard/:path*', '/create-task', '/', '/sign-in', '/sign-up']`.

21. **Tests added**:
    - `__tests__/lib/validation/task.test.ts` — 5 cases.
    - `__tests__/actions/createTask.test.ts` — 4 cases (Zod fail; unauthenticated; valid creates + redirects; NEXT_REDIRECT propagation).
    - `__tests__/actions/deleteTask.test.ts` — 3 cases (unauthenticated; task not found; success).
    - `__tests__/components/features/CreateTaskForm.test.tsx` — 6 cases (renders fields, autofocus, empty submit blocks action, valid submit calls action, action-returns-failure renders root error, pending state).
    - `__tests__/components/features/TasksList.test.tsx` — 4 cases (renders list; renders empty state with only the Create card; delete-success removes the task; delete-failure leaves it).
    - `__tests__/components/features/TaskCard.test.tsx` — 3 cases (renders title; description rendered when present; delete button click calls `onDelete` with the task id).
    - `__tests__/middleware.test.ts` extends with 2 new cases (signed-out `/create-task` → `/`; signed-in `/create-task` → pass-through).
    - Total new tests: 27. Suite grows from 91 → 118 across 18 files. (The architect may shift counts slightly; minimums must be met.)

22. **No CLAUDE.md or `agents/*` changes** — the existing rules cover everything in this task.

## Open Questions

1. **Surface — light vs dark for the neon palette.** Default: light (current cream). Alternative: dark (`#161b22` as body bg). Dark would require restructuring text colours across every page and the header. Default stands unless the user explicitly asks.

2. **Dashboard heading copy.** `"Your tasks"` assumed. Alternatives: `"Tasks"`, `"Welcome, ${name}."` (keeping the personalised welcome), `"What's on your list?"`. Preference-driven.

3. **`<textarea>` for the description field.** Default: `<Input>` for visual consistency with the other forms. Alternative: `<textarea>` for multi-line. The 256-char ceiling tips slightly toward `<textarea>` but the spec-agent keeps `<Input>` for now to avoid introducing a new primitive.

4. **`TaskCard` location.** Default: `src/components/features/TaskCard.tsx`. Alternative: `src/components/ui/TaskCard.tsx` (generic). Lean features because it knows the `TaskDoc` shape — that's feature-specific.

5. **`revalidatePath('/dashboard')` after delete.** Default: skip. Alternative: call it for belt-and-braces. Skipped because the client owns the post-delete UI and a fresh GET to `/dashboard` re-fetches naturally.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/dashboard` (modify) | `src/app/(main)/(private)/dashboard/page.tsx` | "Dashboard" (metadata unchanged) | Now a tasks-list page. Server-fetches via `getTasksForUser`. Renders heading + `<TasksList />`. |
| `/create-task` (new) | `src/app/(main)/(private)/create-task/page.tsx` | "Create task" | New private route. Renders centred `<Card>` + `<CreateTaskForm />`. |
| (every other route) | unchanged | unchanged | Palette flows through Tailwind class names. |

`/create-task` is added to the middleware matcher and to the `isPrivate` check in `decideRedirect`.

## Data

### Data Types

```ts
// src/models/Task.ts
export type TaskDoc = {
  _id: string
  title: string
  description?: string
  userId: string
  createdAt: Date
  updatedAt: Date
}
```

```ts
// src/lib/validation/task.ts
export const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.').max(64, 'Title is too long.'),
  description: z
    .string()
    .max(256, 'Description is too long.')
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
})
export type CreateTaskInput = z.infer<typeof createTaskSchema>
```

```ts
// src/actions/createTask.ts
export type CreateTaskResult = { success: true } | { success: false; error: string }
```

```ts
// src/actions/deleteTask.ts
export type DeleteTaskResult = { success: true } | { success: false; error: string }
```

```ts
// src/lib/tasks.ts
export function getTasksForUser(userName: string): Promise<TaskDoc[]>
export function createTask(input: { title: string; description?: string; userId: string }): Promise<TaskDoc>
export function deleteTask(id: string, userName: string): Promise<{ deleted: boolean }>
```

### API Endpoints
None added directly. All custom logic flows through the two new server actions.

### Dependencies (added)
- `motion` (the `framer-motion` redistribution). Installed via `npm install motion`. Imports: `import { motion, AnimatePresence } from 'motion/react'`.

### Environment Variables
None added.

## Components

| Name | Type | Purpose | Props |
|---|---|---|---|
| `TaskCard` (new) | client/server (no event handlers itself — it forwards `onDelete` to a child Button which is client. TaskCard itself can be server but is rendered inside the client `TasksList`, so practically it inherits the client tree.) | Render one task with title, description, delete button. | `{ task: TaskDoc; onDelete: (id: string) => void; isDeleting: boolean }` |
| `TasksList` (new) | client component | Owns the task array, handles delete via the server action, applies animations. | `{ initialTasks: TaskDoc[] }` |
| `CreateTaskForm` (new) | client component | RHF + zodResolver, submits to `createTaskAction`. | none |
| `DashboardPage` (modify) | server component | Server-fetches tasks, renders heading + `<TasksList />`. | none |
| `CreateTaskPage` (new) | server component | Renders centred Card + `<CreateTaskForm />`. | none |

No new UI primitives. Reuses `Button`, `Input`, `Card`, `buttonClass`, `cn`.

## User Interactions

### Happy path — create a task
1. Signed-in user on `/dashboard` sees their existing tasks (possibly none) in a grid. Last grid item is a Card-shaped link with a `+` icon and "Create new task".
2. User clicks the "Create new task" card → navigates to `/create-task`.
3. Form renders inside a Card. Title input is focused.
4. User types a valid title (≥3 chars), optionally a description. Clicks Create.
5. `createTaskAction({ title, description })` runs server-side: validates, calls `createTask`, redirects to `/dashboard`.
6. Browser performs a fresh GET `/dashboard`. The page server-fetches and now includes the new task. `TasksList` renders it with the fade-in animation.

### Happy path — delete a task
1. User on `/dashboard` clicks the Delete button on a task card.
2. The Delete button shows `loading={true}` (label `"Loading..."`, icons hidden — per `09-design-updates-retro` rules).
3. `deleteTaskAction(taskId)` runs: validates auth, calls `deleteTask(id, userName)`, returns `{ success: true }`.
4. `TasksList` removes the task from its local state.
5. `<AnimatePresence>` runs the exit animation (fade + scale-down). Adjacent task cards reflow via the `layout` prop's FLIP animation.

### Failure — delete returns failure
1. User clicks Delete; the action returns `{ success: false, error: 'Task not found.' }` (e.g. concurrent delete from another tab).
2. The task stays in the list. The Delete button's `loading` state ends. (No toast — out of scope; future task can add inline error display.)

### Failure — Zod-tampered task creation
1. Scripted POST to `createTaskAction` with `{ title: 'ab' }` (2 chars, below the min).
2. Server-side schema rejects; action returns `{ success: false, error: 'Something went wrong. Please try again.' }`.
3. `CreateTaskForm` (if the user was tampering on the live UI) renders the generic error below the submit button. Otherwise — for a true off-form attacker — they receive the same generic error in the action response.

### Failure — IDOR attempt on delete
1. User A's session calls `deleteTaskAction(taskOwnedByUserB)`.
2. `deleteTask(id, 'userA')` queries Mongo with `{ _id: taskId, userId: 'userA' }`. The task exists but with `userId: 'userB'`, so `deletedCount === 0`.
3. Action returns `{ success: false, error: 'Task not found.' }`. User B's task is untouched.

### Failure — signed-out user hits `/create-task` directly
1. Middleware sees `req.auth === null` and `path === '/create-task'`. `isPrivate === true`.
2. `decideRedirect` returns a URL to `/`. Middleware returns `Response.redirect(...)`.
3. Browser receives 302/307 → `/`. Public home renders.

### Failure — signed-in user hits `/sign-in` (already covered)
- Middleware bounces to `/dashboard` (unchanged from `06-private-routes-and-styling`).

## States

### `/dashboard`
- **No tasks**: heading "Your tasks" + grid containing only the "Create new task" card.
- **Has tasks**: heading + grid with task cards (newest first) + the Create card at the end.
- **Deleting a task**: that card's Delete button shows `loading`; on success the card animates out + the grid reflows. On failure the card stays, button returns to normal state.

### `/create-task`
- **Initial**: centred Card with the form. Title input focused. Inputs empty.
- **Field-level error**: per-field message under the failing input (RHF + Zod resolver).
- **Submitting**: title and description disabled; submit button `loading` (text `"Loading..."`, icon hidden); root error region cleared.
- **Server-rejected**: root error string `"Something went wrong. Please try again."` below the submit. Inputs re-enabled with prior values.
- **Success**: server action redirects; form unmounts as the browser navigates.

### Card surface
- Uses the new `bg-neutral-100` (`#fbfcfd`). Reads as slightly lifted above the `neutral-50` page background.

### Header (`MainHeader`)
- Uses `bg-neutral-100` (matches Card surface). Border `border-neutral-200`. Same visual relationship as in `09-design-updates-retro`.

### Buttons (palette flow-through)
- Primary now shows neon cyan (`#00d4ff` at `-500`) with deeper cyan on hover (`#0099bf` at `-700`).
- Secondary now shows neon magenta. Danger now shows neon hot pink.

## Acceptance Criteria

### Palette
1. Given `tailwind.config.ts`, when read, then `theme.extend.colors` declares the five tokens with the hexes from Assumption 2. `neutral` retains 6 steps; primary/secondary/danger/success retain 3.
2. Given the compiled CSS after `npx next build`, when grep'd for `.bg-primary-500`, then it contains `rgb(0 212 255)` (= `#00d4ff`).
3. Given the compiled CSS, when grep'd for `.bg-danger-500`, then it contains `rgb(255 59 110)` (= `#ff3b6e`).
4. Given the running app, when a primary button is hovered, then the background visibly darkens from `#00d4ff` to `#0099bf`.

### `Task` model + data access
5. Given `src/models/Task.ts`, when read, then it exports `TaskDoc` and `TaskModel`. The schema has the four documented fields plus `timestamps: true`. The `userId` field is indexed.
6. Given `src/lib/tasks.ts`, when read, then it exports `getTasksForUser`, `createTask`, and `deleteTask` with the documented signatures. Each helper calls `connectDB()` at the top.
7. Given `deleteTask('someId', 'userA')` is called and the task with `_id === 'someId'` exists with `userId: 'userB'`, then `deleteTask` returns `{ deleted: false }` (anti-IDOR enforced via the compound query). Covered by `__tests__/actions/deleteTask.test.ts`.

### Validation schema
8. Given `src/lib/validation/task.ts`, when read, then `createTaskSchema` declares the title and description rules per Assumption 11. `CreateTaskInput` is exported.
9. Given a parse of `{ title: 'ab', description: undefined }`, when run through `createTaskSchema.safeParse(...)`, then it fails with the title-min error message `"Title must be at least 3 characters."`.
10. Given a parse of `{ title: 'a'.repeat(65), description: undefined }`, then it fails with `"Title is too long."`.
11. Given a parse of `{ title: 'valid title', description: 'd'.repeat(257) }`, then it fails with `"Description is too long."`.
12. Given a parse of `{ title: 'valid title', description: '' }`, then it succeeds and the parsed data has `description === undefined` (transform converts empty string to undefined).
13. Given a parse of `{ title: 'valid title' }` (no description key), then it succeeds.

### Server actions
14. Given `src/actions/createTask.ts`, when read, then it imports `redirect` from `next/navigation` and calls `redirect('/dashboard')` after `createTask(...)` succeeds. The redirect call is NOT wrapped in try/catch (so `NEXT_REDIRECT` propagates).
15. Given `createTaskAction(invalidInput)` where `invalidInput` fails the Zod schema, then it returns `{ success: false, error: 'Something went wrong. Please try again.' }` and does NOT call `createTask`.
16. Given `createTaskAction(validInput)` with a mocked `auth()` returning `null`, then it returns the generic error without calling `createTask`.
17. Given `createTaskAction(validInput)` with a mocked auth and a mocked `redirect` that throws a NEXT_REDIRECT-shaped error, then the action **re-throws** (does not catch it).
18. Given `src/actions/deleteTask.ts`, when read, then it imports `auth` from `@/lib/auth` and calls `deleteTask(id, session.user.name)` only when the session exists.
19. Given `deleteTaskAction('some-id')` with no session, then it returns `{ success: false, error: 'Not authorised.' }`.
20. Given `deleteTaskAction('some-id')` with a session and `deleteTask` returning `{ deleted: false }`, then the action returns `{ success: false, error: 'Task not found.' }`.
21. Given `deleteTaskAction('some-id')` with a session and `deleteTask` returning `{ deleted: true }`, then the action returns `{ success: true }`.

### Dashboard
22. Given `src/app/(main)/(private)/dashboard/page.tsx`, when read, then it server-fetches via `await getTasksForUser(session.user.name)` and renders heading `"Your tasks"` in `font-display` + `<TasksList initialTasks={tasks} />`. The previous `"Welcome, ${name}."` + `"You're signed in."` lines are GONE.
23. Given the dashboard layout, when inspected, then the wrapper is `<main className="min-h-screen p-4 md:p-8">` containing `<div className="mx-auto max-w-3xl space-y-6">`. The previous `flex items-center justify-center` centring is gone.

### `TasksList`
24. Given `src/components/features/TasksList.tsx`, when read, then it starts with `'use client'`, accepts `{ initialTasks }`, imports `motion` and `AnimatePresence` from `motion/react`, and renders a grid via `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`. Tasks are wrapped in `<AnimatePresence>` with the documented motion props.
25. Given an empty initial task list, when `<TasksList initialTasks={[]} />` renders, then only the "Create new task" card is visible. (Test: query for the Create card; assert no `task-card` elements.)
26. Given a list of three tasks, when the user clicks Delete on one and the mocked `deleteTaskAction` resolves to `{ success: true }`, then the deleted task is removed from the DOM. Adjacent cards remain.
27. Given a list of three tasks, when the user clicks Delete on one and the mocked `deleteTaskAction` resolves to `{ success: false }`, then no task is removed; the Delete button returns to its non-pending state.

### `TaskCard`
28. Given `src/components/features/TaskCard.tsx`, when read, then it accepts `{ task, onDelete, isDeleting }` and renders the title, the description when present, and a `<Button variant="danger" leftIcon={<MdDelete />} onClick={...} loading={isDeleting}>Delete</Button>`.
29. Given a task with `description: undefined`, when `TaskCard` renders, then no `<p>` for the description is in the DOM.
30. Given the user clicks the Delete button, then `onDelete(task._id)` is called exactly once with the task's id.

### "Create new task" card
31. Given the "Create new task" card, when inspected in any rendered `TasksList`, then it is a `<Link href="/create-task">` rendering the `MdAdd` icon and the text `"Create new task"`. Visually distinct from regular tasks (has `border-dashed` instead of solid border).

### `/create-task` page
32. Given `src/app/(main)/(private)/create-task/page.tsx`, when read, then it is a server component, calls `await auth()` with a defensive redirect, and renders a centred `<main>` + `<Card>` + `<CreateTaskForm />`. Page metadata `title: 'Create task'`.
33. Given a signed-out user, when they request `/create-task`, then middleware redirects to `/` (HTTP 302/307).
34. Given a signed-in user, when they request `/create-task`, then the page renders (HTTP 200).

### `CreateTaskForm`
35. Given `src/components/features/CreateTaskForm.tsx`, when read, then it uses `useForm<CreateTaskInput>({ resolver: zodResolver(createTaskSchema) })`. Title input has `autoFocus`. Submit button label is `"Create"`.
36. Given an empty submit, then the action is NOT called and per-field errors render.
37. Given a valid submit, then `createTaskAction` is called with the form data exactly once.
38. Given the action returns `{ success: false, error: 'Something went wrong. Please try again.' }`, then the form renders that exact text below the submit button.
39. Given the action is in flight, then title and description inputs are disabled and the submit button label is `"Loading..."`.

### Middleware
40. Given `src/middleware.ts`, when read, then the matcher includes `/create-task`.
41. Given `src/lib/redirect-rules.ts`, when read, then `decideRedirect`'s `isPrivate` check returns true for both `/dashboard` (and nested) AND `/create-task` (and nested).
42. Given the existing 10 middleware test cases, when re-run, then all 10 still pass (no regression on the `/dashboard` rules).
43. Given the new middleware test cases for `/create-task` — signed-out → `/`, signed-in → pass-through — when run, then both pass.

### Tests
44. Given `__tests__/lib/validation/task.test.ts`, when read, then it covers at least 5 schema cases (title-min, title-max, description-max, empty-description-becomes-undefined, valid-input).
45. Given `__tests__/actions/createTask.test.ts`, when read, then it covers at least 4 branches: Zod fail, unauthenticated, valid + redirect propagation, valid + creates task.
46. Given `__tests__/actions/deleteTask.test.ts`, when read, then it covers at least 3 branches: unauthenticated, deleted false, deleted true.
47. Given `__tests__/components/features/CreateTaskForm.test.tsx`, when read, then it covers at least 6 cases (renders, autofocus, empty submit blocks action, valid submit calls action, action-returns-failure renders root error, pending state).
48. Given `__tests__/components/features/TasksList.test.tsx`, when read, then it covers at least 4 cases (renders list, renders empty state, delete-success removes from DOM, delete-failure leaves in DOM).
49. Given `__tests__/components/features/TaskCard.test.tsx`, when read, then it covers at least 3 cases (renders title, description rendered when present, delete click calls `onDelete`).
50. Given `npm run test:run`, when run, then it exits 0 with **at least 118 tests** across at least 18 files (91 previous + 27 new). All previous 91 tests still pass.

### Build & quality
51. Given `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build`, when each is run, then each exits 0. The route table includes `/dashboard`, `/create-task`, plus all the existing routes.
52. Given `mcp__ide__getDiagnostics`, when called, then no diagnostics in any source or test file.

### Forbidden-pattern compliance
53. Given the codebase, when grep'd, then no `: any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace, no `Readonly<{}>` empty type. `'use client'` count increases by 3 (the new `TasksList`, `TaskCard` if it ends up client, and `CreateTaskForm`).

### Code layout
54. Given all new and modified files, when read, then they honour CLAUDE.md → "Code Layout — Visual Rhythm Inside Function Bodies".

## Notes for Downstream Agents

- **Architect**: the `motion` package distributes `motion/react` as the canonical React entry point. Imports use `import { motion, AnimatePresence } from 'motion/react'`. The older `framer-motion` package is now deprecated in favour of this one — use `motion` from the start.

- **Architect**: anti-IDOR enforcement lives at the data-access layer (`deleteTask`'s compound query). The server action does NOT need a separate "is this task mine?" check. This keeps the contract tight and prevents the API from leaking task ownership information.

- **Builder**: the `motion.div` props (`initial`, `animate`, `exit`, `layout`) must be applied per-element, not on the AnimatePresence wrapper. AnimatePresence only runs exit animations.

- **Builder**: when serialising `TaskDoc._id` from Mongoose, use `.lean()` or `.toObject()` and then explicit `String(doc._id)` to ensure a string lands on the client. The `TaskDoc` type declares `_id: string`; tests rely on this.

- **Builder**: the `Input` component (from `04-basic-styling`) does not currently support `type="textarea"`. The spec rejects `<textarea>` for this iteration. If the user overrides this Open Question, the architect adds a new primitive or relaxes the existing `Input`.

- **Reviewer**: AC #7 (anti-IDOR) is the security-relevant assertion. Verify by reading `src/lib/tasks.ts`'s `deleteTask` implementation — the query MUST include `userId` as a constraint, not be filtered after the read.

- **Reviewer**: AC #17 (NEXT_REDIRECT propagation) for `createTaskAction` is the cookie-clear-bug lesson reapplied. The action's body must NOT wrap `redirect(...)` in try/catch.

- **Reviewer**: AC #50 — suite size grows by exactly 27 tests across 6 new files plus middleware additions. If the builder skipped any of the mandatory categories (validation schema, server actions, client form/state-machine components), that's a Blocker per CLAUDE.md → Testing Rules.

- **No runtime smoke is required.** The middleware redirect tests cover the new `/create-task` rule; the action tests cover branch logic; the form tests cover the state machine; the list tests cover the optimistic-after-confirmation delete pattern.
