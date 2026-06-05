# Task: Tasks (CRUD) + Neon Palette Refresh

## Description
Three threads bundled because they ship together:

1. **Palette refresh** — the earthy retro-futuristic palette from `09-design-updates-retro` is being replaced with a more futuristic / neon set. Same 5 tokens, same step counts, new hexes.
2. **Tasks feature** — the first real domain feature. New Mongoose `Task` model, new data-access helpers, two new server actions (`createTaskAction`, `deleteTaskAction`), and the dashboard becomes a tasks list scoped to the signed-in user. Each task is a card with delete. Last list item is a Card-shaped "Create new task" link. Animations on add/remove/reflow.
3. **`/create-task` page** — new private route with a form (title + optional description). Validation client + server. Successful submit redirects back to `/dashboard` where the new task is visible.

## Scope

### In scope

**Palette refresh**
- Replace every hex in `tailwind.config.ts` `theme.extend.colors` with a neon-futuristic set. Token names and step counts stay (primary/secondary/danger/success at `50, 500, 700`; neutral at `50, 100, 200, 500, 700, 900`).
- Surface decision: keep the neutral surface light (so the rest of the layout doesn't need restructuring) but pick vibrant accent colours that read as neon against it. See Open Questions if the user wants a dark surface instead.

**Tasks data layer**
- New Mongoose model `src/models/Task.ts`. Fields: `title: string`, `description?: string`, `userId: string` (the owner's `name`, indexed), `createdAt: Date`, `updatedAt: Date`. `unique` is NOT applied to `title` — users can repeat titles.
- New data-access helpers in `src/lib/tasks.ts`:
  - `getTasksForUser(userName: string): Promise<TaskDoc[]>` — returns the user's tasks, newest first by `createdAt`.
  - `createTask(input: { title: string; description?: string; userId: string }): Promise<TaskDoc>`.
  - `deleteTask(id: string, userName: string): Promise<{ deleted: boolean }>` — deletes only if the task belongs to the user (anti-IDOR check at the data-access layer).
- New Zod schema `src/lib/validation/task.ts` with `createTaskSchema` (title 3–64 trimmed, description optional ≤256) and an inferred `CreateTaskInput`.

**Tasks server actions**
- `src/actions/createTask.ts` — `'use server'`. Validates input via the shared schema. On valid: reads session via `auth()` to get `userId`, calls `createTask`, redirects to `/dashboard` via `redirect('/dashboard')` (throws `NEXT_REDIRECT`; not wrapped in try/catch). On Zod failure: returns `{ success: false, error: 'Something went wrong. Please try again.' }` (generic — client should never bypass its own validation). On unauthenticated: returns generic error (defensive — middleware should have intercepted).
- `src/actions/deleteTask.ts` — `'use server'`. Reads session, calls `deleteTask(id, userName)`. Returns `{ success: true }` on deletion, `{ success: false, error: 'Task not found.' }` on no match. The action does NOT redirect — the client handles the post-delete UI update.

**Dashboard rendering**
- `src/app/(main)/(private)/dashboard/page.tsx` becomes a tasks-list page. Server component:
  - `await auth()` for the user (defensive — middleware guarantees signed-in).
  - `await getTasksForUser(session.user.name)`.
  - Renders the heading (existing "Welcome, ${name}." in `font-display`), a brief paragraph (existing "You're signed in."), and a new `<TasksList initialTasks={tasks} />` client component.
- New client component `src/components/features/TasksList.tsx` — receives the initial task array, manages local state for optimistic-removal-after-DB-confirmation, handles delete via the server action, renders animated transitions.

**Task card**
- New UI component `src/components/ui/TaskCard.tsx` (or feature-level — see Open Questions). Receives a task + an `onDelete` callback. Renders title (bold), description (when present), and a delete `<Button variant="danger" leftIcon={<MdDelete />}>Delete</Button>`. Uses the existing `Card` primitive as the surface.

**Create-task link card**
- The last item in the rendered grid is a Card-shaped `<Link href="/create-task">` with a centred `<MdAdd />` icon and the text "Create new task". Visually distinct from the regular task cards (e.g. dashed border instead of solid).

**Grid layout**
- Centred container with `max-w-3xl` (architect can adjust). On mobile (`<md`): single column (`grid-cols-1`). On `md+`: `grid-cols-2`. On `lg+` (optional): `grid-cols-3`. Gap: `gap-4` or `gap-6` — architect picks.

**Animations**
- `framer-motion` (now distributed as the `motion` package). Use `<AnimatePresence>` around the list of cards. Each card uses `motion.div` with `initial`, `animate`, `exit` props for fade-in/fade-out. Layout reflow uses the `layout` prop on each motion element. The "Create new task" card is part of the same animated list (or sits outside `<AnimatePresence>` — architect picks).

**`/create-task` page**
- New route at `src/app/(main)/(private)/create-task/page.tsx` (server component, sits inside the `(private)` group so middleware protects it).
- Page calls `await auth()` defensively, redirects to `/` if no session.
- Renders a centred `<Card>` (Card reused on this page, since forms work better with the surface) containing `<CreateTaskForm />`.

**`CreateTaskForm`**
- New client component `src/components/features/CreateTaskForm.tsx`. Mirrors the `SignInForm` / `SignUpForm` patterns: `react-hook-form` + `zodResolver(createTaskSchema)`, `setError('root', ...)` for server-returned errors, `formState.isSubmitting` for pending state.
- Inputs: `<Input type="text">` for title, `<Input type="text">` for description (architect can choose `<textarea>` if longer text reads better — flag in Open Questions). Submit `<Button variant="primary">Create</Button>`.
- Autofocus on the title input (matches the sign-in/sign-up convention).
- On success: server action redirects to `/dashboard`; client handles only the failure branch.

**Middleware**
- `src/middleware.ts` matcher gains `/create-task`. The `decideRedirect` helper's `isPrivate` check expands to include any path that should require authentication: `/dashboard*` and `/create-task`.

**Tests (mandatory per CLAUDE.md Testing Rules)**
- `__tests__/lib/validation/task.test.ts` — schema rule coverage.
- `__tests__/actions/createTask.test.ts` — every branch of the server action.
- `__tests__/actions/deleteTask.test.ts` — same.
- `__tests__/components/features/CreateTaskForm.test.tsx` — RTL coverage of the new form (state machine).
- `__tests__/components/features/TasksList.test.tsx` — RTL coverage of the list (state machine: delete updates local state; animations don't need behavioural assertions, but the delete-removes-from-DOM path does).
- `__tests__/middleware.test.ts` — extend with new redirect cases for `/create-task` (signed-out → `/`; signed-in → no redirect; not in matcher would also be possible).
- Suite size grows from 91 to roughly 105+ tests.

### Out of scope
- Task status, priorities, due dates, labels, tags — anything beyond title + description.
- Task editing — only create + display + delete.
- Multi-user task sharing — tasks are strictly owned by their creator.
- Task search / filter / sort UI.
- Pagination — for now, all tasks are loaded at once.
- Drag-and-drop reordering.
- Optimistic UI on create — successful create redirects to dashboard which re-fetches.
- Dark mode / full theme swap — only the palette hexes change; the layout stays light-surfaced unless the user explicitly asks for dark.
- Custom animations beyond fade in/out + layout reflow.
- Empty-state design beyond "no tasks yet" copy on the dashboard (architect picks).

## Specific Threads

### 1. Palette refresh (neon-futuristic)
- Spec-agent locks 17 hexes (5 tokens × 3-5 steps).
- Suggested *direction*:
  - `primary`: cyan-to-electric-blue (`#00d4ff` or similar at -500).
  - `secondary`: magenta/pink (`#ff2bd6` family).
  - `neutral`: cool greys (departure from the warm stones of the previous palette) — `50` stays light, `900` darker.
  - `danger`: hot pink or neon red.
  - `success`: neon lime / electric green.
- All hexes must be sufficiently distinguishable between `-500` and `-700` so the existing hover-darken effect remains visible.
- The `font-display` (Oleo Script Swash Caps) on `<h1>` continues to work — neon palette doesn't change typography.

### 2. Task data model
- `src/models/Task.ts` shape:
  ```ts
  export type TaskDoc = {
    _id: string
    title: string
    description?: string
    userId: string  // the signed-in user's name
    createdAt: Date
    updatedAt: Date
  }
  ```
  Mongoose schema with `timestamps: true`. Indexes: `userId` (for filtering by owner).
- Hot-reload-safe model registration matches the existing `User` model pattern.

### 3. Data access helpers (`src/lib/tasks.ts`)
- `getTasksForUser(userName: string): Promise<TaskDoc[]>` — connects, queries `{ userId: userName }`, sorts by `createdAt: -1`, returns `.lean<TaskDoc[]>().exec()`.
- `createTask(input): Promise<TaskDoc>` — connects, `TaskModel.create({...})`, returns the doc as a plain object via `toObject<TaskDoc>()`.
- `deleteTask(id: string, userName: string): Promise<{ deleted: boolean }>` — connects, `TaskModel.deleteOne({ _id: id, userId: userName })`. Returns `{ deleted: result.deletedCount > 0 }`. Importantly, the `userId` constraint in the query prevents user A from deleting user B's tasks.

### 4. Server actions
- `createTaskAction(input: { title: string; description?: string }): Promise<CreateTaskResult>`:
  - Validate via `createTaskSchema`. On Zod failure → `{ success: false, error: GENERIC_ERROR }`.
  - `await auth()`. If no session → `{ success: false, error: GENERIC_ERROR }` (defensive; middleware should prevent this).
  - `await createTask({ title, description, userId: session.user.name })`.
  - `redirect('/dashboard')` — throws `NEXT_REDIRECT`, do NOT wrap in try/catch.
  - Return type includes `{ success: true }` for type-symmetry (unreachable in practice).
- `deleteTaskAction(id: string): Promise<DeleteTaskResult>`:
  - `await auth()`. If no session → `{ success: false, error: 'Not authorised.' }`.
  - `await deleteTask(id, session.user.name)`. If `deleted === false` → `{ success: false, error: 'Task not found.' }`.
  - On success → `{ success: true }`. Architect decides whether to call `revalidatePath('/dashboard')` — since the client updates its local state, revalidate may be redundant; flag as a design call.

### 5. Dashboard rendering
- Server-fetches tasks at request time. No caching (`await getTasksForUser` is request-scoped via `auth()` already making the route dynamic).
- Renders `<TasksList initialTasks={tasks} />` below the welcome heading + paragraph. The heading and paragraph are unchanged from `09-design-updates-retro`.
- Empty state: when `initialTasks.length === 0`, `TasksList` shows only the "Create new task" card. No empty-state placeholder copy beyond that (the call-to-action IS the empty state).

### 6. `TasksList` (client component)
- `'use client'`. Props: `{ initialTasks: TaskDoc[] }`.
- Local state: `tasks: TaskDoc[]`, seeded from `initialTasks`.
- `handleDelete(id: string)` — sets a per-task `isDeleting` state, calls `deleteTaskAction(id)`, on success removes the task from local state. On failure, optionally surfaces a toast / inline error — spec-agent picks (lean: silently swallow + log to console; toast infra not yet in the project).
- Renders the grid + `<AnimatePresence>` wrapping the list of `motion.div` cards.

### 7. Animations
- `framer-motion` v11+ (now distributed as the `motion` package on npm — `npm install motion`).
- `<AnimatePresence>` wraps the list to handle exit animations.
- Each task is a `motion.div` with:
  - `initial={{ opacity: 0, y: 8 }}`
  - `animate={{ opacity: 1, y: 0 }}`
  - `exit={{ opacity: 0, scale: 0.95 }}`
  - `layout` (enables FLIP layout animations for reflow).
- Transition timing: `transition={{ duration: 0.2 }}` or similar.

### 8. `/create-task` page + form
- Route file: `src/app/(main)/(private)/create-task/page.tsx`.
- Page: server component, calls `await auth()` defensively, renders `<main>` wrapper + `<Card>` + `<CreateTaskForm />`.
- Form mirrors the existing sign-in/sign-up patterns. Two fields:
  - Title — required, 3–64 chars after trim, autofocus on render.
  - Description — optional, ≤256 chars. Architect picks `<Input>` or a `<textarea>` (flag as Open Question).
- Submit button: `<Button variant="primary" loading={formState.isSubmitting}>Create</Button>`.

### 9. Middleware
- Add `/create-task` to the matcher and to `decideRedirect`'s `isPrivate` check.
- Update tests in `__tests__/middleware.test.ts` to add `/create-task` redirect cases.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

**New**
- `src/models/Task.ts` — Mongoose model.
- `src/lib/tasks.ts` — data-access helpers.
- `src/lib/validation/task.ts` — Zod schema.
- `src/actions/createTask.ts` — server action.
- `src/actions/deleteTask.ts` — server action.
- `src/app/(main)/(private)/create-task/page.tsx` — new private route.
- `src/components/features/CreateTaskForm.tsx` — client form.
- `src/components/features/TasksList.tsx` — client list with animations.
- (Optionally) `src/components/features/TaskCard.tsx` — render a single task. Could also live inline in `TasksList`.
- 5 new test files (one per major source file).

**Modified**
- `tailwind.config.ts` — new neon palette.
- `src/app/(main)/(private)/dashboard/page.tsx` — fetch tasks + render `<TasksList />`.
- `src/middleware.ts` and/or `src/lib/redirect-rules.ts` — add `/create-task`.
- `__tests__/middleware.test.ts` — add `/create-task` cases.
- `package.json` — add `motion`.

**Unchanged**
- `src/lib/auth.ts`, `auth.config.ts`, `redirect-rules.ts` (decideRedirect change is in spec — actually that's in scope; correcting myself), `errors.ts`, `users.ts`, `password.ts`, `db.ts`, `env.ts`, `utils.ts`.
- `src/lib/validation/signIn.ts`, `signUp.ts`.
- `src/actions/signIn.ts`, `signUp.ts`, `signOut.ts`.
- `src/components/ui/*` — Button, Input, Card, buttonClass.
- `src/components/features/MainHeader.tsx`, `MainHeaderNav.tsx`, `SignInForm.tsx`, `SignUpForm.tsx`.
- `src/app/layout.tsx`, `(main)/layout.tsx`, root pages (page.tsx, error.tsx, not-found.tsx).

## Tests Required

Per CLAUDE.md → Testing Rules → Categories that require tests:

1. **`src/lib/validation/task.ts` schema**: title min/max, description max, optional description, happy path. 5 cases minimum.
2. **`src/actions/createTask.ts` action**: Zod fail, unauthenticated, valid → `createTask` called + redirects, redirect-propagation assertion. ~4 cases.
3. **`src/actions/deleteTask.ts` action**: unauthenticated, task-not-found (deletedCount === 0), success. ~3 cases.
4. **`src/components/features/CreateTaskForm.tsx` (RTL)**: renders, autofocus, empty submit blocks action, valid submit calls action, action-returns-failure renders root error, pending state. ~6 cases.
5. **`src/components/features/TasksList.tsx` (RTL)**: renders list, renders empty state ("Create new task" card only), delete click removes task from DOM, delete returning failure leaves task in DOM. ~4 cases.
6. **`src/middleware.test.ts` extension**: signed-out `/create-task` → `/`; signed-in `/create-task` → pass-through. 2 new cases.

Expected suite size after this task: roughly 105+ tests across ~18 files.

## Done Criteria
- Compiled CSS contains the new neon palette hexes. Visible neon colours appear in the running app.
- Dashboard renders the signed-in user's tasks in a responsive grid (single column mobile; multi-column desktop) with a "Create new task" card at the end.
- Clicking Delete on a task removes it from the DB and animates it out of the list. No full page refresh.
- Adding a task (via the create-task page) animates the new task into the list on return to the dashboard.
- A user cannot delete another user's task even via direct URL/API call (data-access layer enforces ownership).
- `/create-task` is protected — signed-out users hitting it land on `/`.
- Form validation: title 3–64 chars (client + server); description ≤256 chars (client + server).
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0.
- All new test files exist with the documented case counts. Suite grows to ~105+ tests.
- `mcp__ide__getDiagnostics` clean.

## What This Task Does NOT Include
- Task status, priorities, due dates, labels.
- Task editing (only create + delete).
- Sharing tasks between users.
- Search / filter / sort UI.
- Pagination.
- Drag-and-drop reorder.
- Custom animations beyond fade in/out + layout reflow.
- Optimistic UI on create.
- Dark mode / full theme swap (only palette hexes change).
- Tests beyond the 5 new files + middleware extension.
- README updates beyond a one-line mention of the seed flow if it changes (it doesn't here).

## Notes for the Spec-Agent

### Open Questions to surface
1. **Surface for the neon palette.** Light surface + neon accents is the default (avoids restructuring layouts). Alternative: dark surface (`neutral-900` as the body background) with neon accents — more idiomatic for cyberpunk but a bigger visual shift. Default: keep light, swap accents only.
2. **Exact palette hexes.** Locks 17 values; user can override any individually.
3. **`<Input>` vs `<textarea>`** for the description field on the create-task form. Description allows up to 256 chars. `<Input>` is simpler but constrains visible space; `<textarea>` reads more naturally for multi-line. Default: `<Input>` for consistency with the other forms, but flag.
4. **`TaskCard` component location** — `src/components/ui/` (generic primitive) or `src/components/features/` (task-specific). It's specific to the task feature; lean `features/`. Default: features.
5. **`revalidatePath('/dashboard')` after delete?** The client updates local state. Revalidating would force a server refetch which is redundant. Default: skip revalidate.

### Architectural calls
- **Animation library**: `framer-motion` is now distributed as the `motion` npm package (`npm install motion`). `<AnimatePresence>` + `motion.div` + the `layout` prop covers all three required animation behaviours (fade in, fade out, layout reflow on delete).
- **Server action redirect after createTask**: use `redirect('/dashboard')` directly inside `createTaskAction`. Throws `NEXT_REDIRECT`, propagates cleanly.
- **`TaskDoc._id` shape**: Mongoose default `_id` is `ObjectId`. When serialising via `.toObject()` or `.lean()`, we get the ObjectId-as-string. The `TaskDoc` type should declare `_id: string` (and the action / list accepts it as a string).
- **Anti-IDOR check in `deleteTask`**: query by `{ _id: id, userId: userName }` — Mongoose's `deleteOne` will return `deletedCount: 0` if the task exists but belongs to someone else. Cleanest enforcement at the data-access layer.
- **`TasksList` state shape**: each task carries its own `isDeleting` flag during the pending action. Multiple deletes in flight is unlikely but possible; per-task state avoids race conditions in the UI.

### Reviewer enforcement
- All five mandatory-category tests must exist or the review FAILs (per the rule from `07-unit-tests`).
- AC for the IDOR check is the security-relevant one: a user must NOT be able to delete another user's task. Reviewer verifies via reading `src/lib/tasks.ts`'s `deleteTask` implementation.
- AC for the validation contract: both client AND server validate with the same schema. Reviewer verifies via reading `createTaskAction`.
