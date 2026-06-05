# Spec: Tasks — Edit + Route Refactor + UI Polish

## Summary
Three interlocking threads ship together. **(1) Edit story**: a new `/tasks/[id]` route with a pre-filled form lets users update tasks; the existing `/create-task` route moves to `/tasks/new` for URL coherence. A shared `<TaskForm>` component replaces `CreateTaskForm` and serves both modes. New `updateTask` data-access helper + `updateTaskAction` server action; both enforce ownership at the database layer (anti-IDOR). **(2) TaskCard polish**: Delete becomes a ghost-styled close icon; the title drops the display font in favour of regular weight; clicking the card navigates to `/tasks/[id]` via `useRouter`; the hover animation flips from scale-up to an inverse-colour effect (dark surface + light text). **(3) Form card width**: both `/tasks/new` and `/tasks/[id]` use a wider Card (`md:max-w-lg`). Plus a new `ghost` Button variant. Test suite grows 134 → ~150 across 21 files.

## Assumptions

1. **Shared `TaskForm` component** (Open Question #1 default). `src/components/features/CreateTaskForm.tsx` is renamed to `src/components/features/TaskForm.tsx` and generalised: accepts `action` (the server action wrapper), `submitLabel`, and optional `initialValues`. Both the new `/tasks/new` page and the new `/tasks/[id]` page render `<TaskForm>` with the appropriate props.

2. **`TaskForm` props**:
   ```ts
   type TaskFormProps = Readonly<{
     submitLabel: string
     initialValues?: { title: string; description?: string }
     action: (input: { title: string; description?: string }) => Promise<
       { success: true } | { success: false; error: string }
     >
   }>
   ```
   The `action` prop is the server action wrapper. For the create page, this is `createTaskAction` directly. For the edit page, it's an inline server-action wrapper that binds the task id and calls `updateTaskAction(id, input)`.

3. **Schema rename: `createTaskSchema` → `taskSchema`** in `src/lib/validation/task.ts` (Open Question #4 default). The exported name changes; rules are unchanged. The `CreateTaskInput` type also renames to `TaskInput`. Both consumers (`createTaskAction`, the new `updateTaskAction`, and `TaskForm`) update their imports. The existing schema test file's imports update accordingly.

4. **TaskCard title classes** (Open Question #2 default): `text-lg font-medium text-neutral-900`. `font-display text-2xl` is removed. Regular sans-serif weight.

5. **Form card width** (Open Question #3 default): `md:max-w-lg` (32 rem visible). Override Card's default `md:max-w-md` via `<Card className="md:max-w-lg">` on both pages.

6. **`ghost` Button variant** (Open Question #5 default):
   ```ts
   ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500'
   ```
   No `group-hover` styles baked into the variant — those are TaskCard's concern at the consumer level.

7. **TaskCard inverse-hover** (Open Question #6 default):
   - Card root: `group h-full cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none`. (Drops `hover:shadow-lg` and `transition-shadow`.)
   - Title: `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`.
   - Description: `mt-2 text-base text-neutral-500 transition-colors group-hover:text-neutral-200`.
   - Delete button: `className="group-hover:text-neutral-50"` passed through to override the ghost variant's default `text-neutral-700` when the card is hovered.

8. **Card click navigation** (Open Question #7 default): `useRouter().push(\`/tasks/${task._id}\`)` from `next/navigation`. Keeps the existing `stopPropagation` pattern intact for the Delete button.

9. **`motion.div`'s `whileHover` prop is REMOVED** from `TasksList.tsx` — the new inverse-hover replaces the scale animation. The motion props `initial`, `animate`, `exit`, `layout`, `transition` stay (for entry, exit, and reflow animations).

10. **`TasksList` STAYS `'use client'`** (per the brief's Investigations section). The three load-bearing reasons documented in the brief — `useState` for tasks + deletingIds, `motion.div` / `AnimatePresence` being client components themselves, and the optimistic-after-confirmation delete coordination — all hold. Dropping the directive would require splitting each TaskCard into its own self-managing island (breaks shared `AnimatePresence` exit choreography), swapping animation libraries, or eliminating local optimistic-removal state. Nonsensical refactor — skip. Documented here so the architect / builder does not revisit.

11. **Route refactor**:
    - `src/app/(main)/(private)/create-task/page.tsx` moves to `src/app/(main)/(private)/tasks/new/page.tsx`. The empty `create-task/` directory is deleted afterward.
    - New `src/app/(main)/(private)/tasks/[id]/page.tsx`.
    - Next.js's literal-segment-before-dynamic-segment ordering ensures `/tasks/new` always hits `new/page.tsx`, never the `[id]` handler. No matcher work needed for that ordering.

12. **Middleware**:
    - `src/middleware.ts` matcher: `'/create-task'` → `'/tasks/:path*'`. Other matcher entries unchanged.
    - `src/lib/redirect-rules.ts` `isPrivate`: drops `/create-task` checks, adds `path === '/tasks' || path.startsWith('/tasks/')`.

13. **Anti-IDOR for `getTaskById` and `updateTask`** — both query by `{ _id: id, userId: userName }`. Returns null when the task doesn't exist OR belongs to someone else. Mirrors the existing `deleteTask` pattern.

14. **`updateTask` uses `findOneAndUpdate({ _id, userId }, { title, description }, { new: true, lean: true })`** — atomic, race-free. If null is returned, the action surfaces `'Task not found.'`.

15. **`/tasks/[id]/page.tsx`** uses `notFound()` from `next/navigation` when `getTaskById` returns null. Renders Next.js's `not-found.tsx` (the existing custom 404 page from `09-design-updates-retro`).

16. **`updateTaskAction(id, input)`** — server action, two args. The page passes `id` as `task._id` via an inline wrapper. The wrapper must itself be a server action (so `'use server'` annotated) because the page-level function passes it to a client component as a prop.

17. **Inline-action wrapper pattern in `/tasks/[id]/page.tsx`**:
    ```tsx
    async function action(input: { title: string; description?: string }) {
      'use server'
      return updateTaskAction(task._id, input)
    }
    ```
    The `'use server'` inline directive marks the inner function as a server action. The architect picks the exact wiring — either inline directive (as above) or a separate `src/actions/updateTaskById.ts` file that exports a curried wrapper. Lean: inline directive at the page level (single use, minimal surface).

18. **TaskCard click handler is the only path to the edit page** in this task. There's no separate "Edit" button. Clicking the card body or title navigates. The Delete button's `stopPropagation` prevents accidental navigation.

19. **Tests** (mandatory categories per CLAUDE.md):
    - `__tests__/actions/updateTask.test.ts` — new (4 cases).
    - `__tests__/components/features/TaskForm.test.tsx` — new (8 cases). Replaces `__tests__/components/features/CreateTaskForm.test.tsx` which is deleted.
    - `__tests__/lib/validation/task.test.ts` — update imports from `createTaskSchema`/`CreateTaskInput` → `taskSchema`/`TaskInput`. Same 6 test cases.
    - `__tests__/components/ui/Button.test.tsx` — extend with 1 new case asserting the `ghost` variant class set.
    - `__tests__/components/features/TaskCard.test.tsx` — significant rework. Drop the `console.log` assertions (the card click no longer logs). Add `useRouter` mock and assert `router.push(\`/tasks/${id}\`)` is called once on card click. The "delete stopPropagation" case becomes "delete does NOT trigger router.push". Final case count: 7 (same as before, different assertions).
    - `__tests__/middleware.test.ts` — replace the 2 `/create-task` cases with 2 `/tasks/new` cases plus 2 new `/tasks/<id>` cases. Total middleware test count: 14 (was 12; 2 net new).
    - Existing `__tests__/components/features/TasksList.test.tsx` — `whileHover` removal doesn't change rendered DOM at the assertion level. The "Create new task" Link's href changes from `/create-task` → `/tasks/new` — that test case updates the href assertion. Existing 5 cases continue to pass with one href tweak.
    - `__tests__/actions/createTask.test.ts` — no changes needed; the existing 4 cases continue to pass since `createTaskAction` is unchanged.

20. **No CLAUDE.md or `agents/*` changes**. No new dependencies. No new env vars.

21. **Final `'use client'` count**: 10 (unchanged). TasksList, TaskCard, TaskForm (replaces CreateTaskForm), Button, Input, Textarea, MainHeaderNav, SignInForm, SignUpForm, error.tsx.

## Open Questions
None remaining. All 7 from the brief are resolved in Assumptions.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/dashboard` (no source change but linked behaviour changes) | `src/app/(main)/(private)/dashboard/page.tsx` | unchanged | The tasks list now navigates per-card to `/tasks/<id>`. Page source is unchanged. |
| `/create-task` (REMOVED) | n/a | n/a | Route removed; URL no longer routable. |
| `/tasks/new` (new) | `src/app/(main)/(private)/tasks/new/page.tsx` | "Create task" | Moved from `create-task/page.tsx`. Same content (TaskForm in create mode). |
| `/tasks/[id]` (new) | `src/app/(main)/(private)/tasks/[id]/page.tsx` | "Edit task" | New server component. `auth()` + `getTaskById` + `notFound()` defensive. Renders TaskForm in edit mode. |

URL changes:
- `/create-task` → `/tasks/new` (move).
- `/tasks/<id>` is new.
- Every other URL stays.

## Data

### Data Types
```ts
// src/lib/validation/task.ts — renamed
export const taskSchema = z.object({ /* unchanged rules */ })
export type TaskInput = z.infer<typeof taskSchema>
```

```ts
// src/lib/tasks.ts — additions
export function getTaskById(id: string, userName: string): Promise<TaskDoc | null>
export function updateTask(
  id: string,
  userName: string,
  input: { title: string; description?: string }
): Promise<TaskDoc | null>
```

```ts
// src/actions/updateTask.ts
export type UpdateTaskResult = { success: true } | { success: false; error: string }
export async function updateTaskAction(
  id: string,
  input: { title: string; description?: string }
): Promise<UpdateTaskResult>
```

```ts
// src/components/ui/Button.tsx — variant union expands
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
```

```ts
// src/components/features/TaskForm.tsx
type TaskFormProps = Readonly<{
  submitLabel: string
  initialValues?: { title: string; description?: string }
  action: (input: { title: string; description?: string }) => Promise<
    { success: true } | { success: false; error: string }
  >
}>
```

### API Endpoints
None changed.

### Dependencies
None added.

### Environment Variables
None added.

## Components

| Name | Type | Purpose | Change |
|---|---|---|---|
| `Button` (modify) | client | UI primitive | Add `ghost` to `ButtonVariant`. Add `ghost` row to `VARIANT_CLASSES`. |
| `TaskForm` (new) | client | Shared create/edit form | Generic over `action`, `submitLabel`, optional `initialValues`. Replaces `CreateTaskForm`. |
| `TaskCard` (modify) | client | Renders one task | Icon swap (`MdDelete` → `MdClose`); variant swap (`danger` → `ghost`); title classes (regular weight); `useRouter().push` on card click; group-hover inverse styles. |
| `TasksList` (modify) | client | Owns task array + delete handler | Drop `whileHover` prop. Update "Create new task" Link href. |
| `EditTaskPage` (new) | server | `/tasks/[id]` page | `auth()` + `getTaskById` + `notFound()` + renders TaskForm with edit binding. |
| `CreateTaskPage` (moved) | server | `/tasks/new` page | Same content as before, new path. |
| `DashboardPage` (no change) | server | Tasks list page | Tasks list itself navigates per-card now, but the page source doesn't change. |
| `CreateTaskForm` (DELETED) | — | — | Replaced by `TaskForm`. |

## User Interactions

### Happy path — edit a task
1. Signed-in user on `/dashboard` clicks a task card (anywhere except the close icon).
2. `useRouter().push(\`/tasks/${task._id}\`)` runs. Browser navigates.
3. `/tasks/[id]` server component runs: `auth()` → `getTaskById(params.id, session.user.name)`.
4. If found: page renders centred `<main>` + wider `<Card>` + `<TaskForm submitLabel="Save Task" initialValues={...} action={...} />`. Title and description inputs are pre-filled. Title input has autoFocus.
5. User edits the title and/or description. Clicks Save Task.
6. `action(input)` runs server-side. Internally: `updateTaskAction(task._id, input)`. Validates input via `taskSchema`. Reads session. Calls `updateTask(id, userName, input)`. On success: `redirect('/dashboard')`.
7. Browser performs a fresh GET to `/dashboard`. The page re-fetches tasks via `getTasksForUser`. The updated task is in the list with the new values.

### Failure path — task not found / not owned
1. User navigates to `/tasks/<some-stale-id>` or `/tasks/<id-owned-by-another-user>`.
2. `getTaskById` returns null (anti-IDOR — caller can't distinguish).
3. Page calls `notFound()` → Next.js renders the custom 404 page (`src/app/not-found.tsx`).

### Failure path — server returns failure (title taken back, e.g. concurrent delete)
1. User edits a task, clicks Save Task.
2. By the time the action runs, another tab/device has deleted the task.
3. `updateTask` returns null. Action returns `{ success: false, error: 'Task not found.' }`.
4. TaskForm renders the root error below the submit button. The user can dismiss / navigate away. (No special recovery flow.)

### Happy path — delete a task (unchanged behaviour, new appearance)
1. User hovers a task card → bg flips to `neutral-900`, title text becomes `neutral-50`, description becomes `neutral-200`. The close button's icon also lightens (via `group-hover:text-neutral-50`).
2. User clicks the close icon. `stopPropagation` prevents the router push. `onDelete(task._id)` fires.
3. Same delete flow as before: `deleteTaskAction` runs; on success, the task is removed from the local state and animates out.

### Failure path — direct navigation to `/tasks/new` while signed out
1. Middleware intercepts. `req.auth === null`, `path === '/tasks/new'`, `isPrivate === true`.
2. Redirects to `/`.

### Failure path — direct navigation to `/tasks/<id>` while signed out
1. Same — middleware redirects to `/`.

## States

### `/tasks/[id]` (edit page)
- **Renders form**: when `getTaskById` returns a task.
- **404**: when `getTaskById` returns null (task missing OR not owned).
- **Loading**: not applicable. Server-rendered.

### TaskCard
- **Idle**: cream surface (`neutral-100`), title in `text-lg font-medium text-neutral-900`, optional description in `text-base text-neutral-500`, close icon ghost button in top-right.
- **Hover**: bg `neutral-900`, title `neutral-50`, description `neutral-200`, close icon `neutral-50`. Smooth `transition-colors`.
- **Deleting**: close button shows `loading` (label `"Loading..."`, icon hidden, button disabled, `aria-busy="true"`). Other interactions on the card remain available technically, but the card is animated-out by AnimatePresence almost immediately afterward on success.

### TaskForm
- **Initial (create mode)**: empty title + description, "Create Task" submit. Title autofocused.
- **Initial (edit mode)**: pre-filled title + description from `initialValues`, "Save Task" submit. Title autofocused.
- **Submitting**: title + description disabled; submit button label `"Loading..."`; any prior root error cleared.
- **Server-rejected**: root error message below the submit. Inputs re-enabled with current values.
- **Success**: action redirects; form unmounts on navigation.

## Acceptance Criteria

### Route refactor
1. Given the source tree, when listed, then `src/app/(main)/(private)/tasks/new/page.tsx` exists and `src/app/(main)/(private)/create-task/page.tsx` is GONE.
2. Given the source tree, when listed, then `src/app/(main)/(private)/tasks/[id]/page.tsx` exists.
3. Given `next build`'s route table, when read, then it contains `ƒ /tasks/new` and `ƒ /tasks/[id]` (and no `ƒ /create-task`).
4. Given a request to `/tasks/new`, when routed, then Next.js resolves the literal `new` segment ahead of the dynamic `[id]` segment.

### Middleware
5. Given `src/middleware.ts`, when read, then its matcher includes `/tasks/:path*` and does NOT include `/create-task`.
6. Given `src/lib/redirect-rules.ts`, when read, then `decideRedirect`'s `isPrivate` check returns true for any path starting with `/tasks/` (and for `/tasks` exactly).
7. Given a signed-out user, when they request `/tasks/new` or `/tasks/some-id`, then middleware redirects to `/`.
8. Given a signed-in user, when they request `/tasks/new` or `/tasks/some-id`, then middleware passes through (no redirect).

### Data layer
9. Given `src/lib/tasks.ts`, when read, then it exports `getTaskById(id, userName)` and `updateTask(id, userName, input)` with the documented signatures. Both helpers query Mongoose with the compound `{ _id, userId: userName }` filter (anti-IDOR).
10. Given `getTaskById('id-that-belongs-to-userB', 'userA')`, when called, then it returns null (Mongoose returns null because the filter doesn't match).
11. Given `updateTask('id-belonging-to-userB', 'userA', { title: 'hack', description: 'pwn' })`, when called, then it returns null AND the document in the DB is NOT modified.

### `updateTaskAction`
12. Given `src/actions/updateTask.ts`, when read, then it exports `updateTaskAction(id, input)` returning `Promise<UpdateTaskResult>`. It validates input via the renamed `taskSchema`, calls `auth()`, calls `updateTask`, and on success calls `redirect('/dashboard')`. The `redirect(...)` call is NOT wrapped in try/catch (NEXT_REDIRECT propagates).
13. Given `updateTaskAction(id, invalidInput)`, when run, then it returns `{ success: false, error: 'Something went wrong. Please try again.' }` and does NOT call `updateTask`.
14. Given `updateTaskAction(id, validInput)` with no session, then it returns the same generic error and does NOT call `updateTask`.
15. Given `updateTaskAction(id, validInput)` with a session and `updateTask` returning null, then it returns `{ success: false, error: 'Task not found.' }`.
16. Given `updateTaskAction(id, validInput)` with a session and `updateTask` returning the updated task, then `redirect` is called with `'/dashboard'` and NEXT_REDIRECT propagates (test asserts via `rejects.toThrow(/NEXT_REDIRECT/)`).

### `/tasks/[id]/page.tsx`
17. Given `src/app/(main)/(private)/tasks/[id]/page.tsx`, when read, then it is a server component that calls `await auth()`, defensively redirects to `/` if no session, calls `getTaskById(params.id, session.user.name)`, calls `notFound()` if the result is null, and otherwise renders `<main>` + `<Card className="md:max-w-lg">` + `<TaskForm submitLabel="Save Task" initialValues={...} action={...} />`. Page metadata `{ title: 'Edit task' }`.

### `/tasks/new/page.tsx`
18. Given `src/app/(main)/(private)/tasks/new/page.tsx`, when read, then it is a server component that calls `await auth()`, defensively redirects to `/` if no session, and renders `<main>` + `<Card className="md:max-w-lg">` + `<TaskForm submitLabel="Create Task" action={createTaskAction} />`. Metadata `{ title: 'Create task' }`.

### `TaskForm` shared component
19. Given `src/components/features/TaskForm.tsx`, when read, then it is a `'use client'` component accepting `TaskFormProps`. It uses `useForm<TaskInput>({ resolver: zodResolver(taskSchema), defaultValues: initialValues })`. The submit button label comes from `submitLabel`. The action call comes from `action`.
20. Given `<TaskForm submitLabel="Create Task" action={mockAction} />`, when rendered, then the title input is empty (no `defaultValue`), the submit button reads "Create Task".
21. Given `<TaskForm submitLabel="Save Task" initialValues={{ title: 'Hi', description: 'There' }} action={mockAction} />`, when rendered, then the title input value is "Hi", the description value is "There", and the submit button reads "Save Task".

### `Button` ghost variant
22. Given `src/components/ui/Button.tsx`, when read, then `ButtonVariant` includes `'ghost'`.
23. Given `src/components/ui/buttonClass.ts`, when read, then `VARIANT_CLASSES.ghost` contains exactly: `bg-transparent text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-500`.
24. Given `<Button variant="ghost">x</Button>`, when rendered, then the button carries the ghost variant class set (no background by default, neutral-700 foreground).

### TaskCard updates
25. Given `src/components/features/TaskCard.tsx`, when read, then:
    - The Delete button uses `<MdClose />` (imported from `react-icons/md`), NOT `<MdDelete />`.
    - The Delete button uses `variant="ghost"`, NOT `variant="danger"`.
    - The Delete button's `className` includes `group-hover:text-neutral-50`.
    - The title has classes `text-lg font-medium text-neutral-900 transition-colors group-hover:text-neutral-50`. `font-display` and `text-2xl` are GONE.
    - The description (when rendered) has classes `mt-2 text-base text-neutral-500 transition-colors group-hover:text-neutral-200`.
    - The Card className contains `group`, `cursor-pointer`, `transition-colors`, `hover:bg-neutral-900`. It does NOT contain `transition-shadow` or `hover:shadow-lg`.
    - The card-click handler calls `useRouter().push(\`/tasks/${task._id}\`)` (no longer `console.log`).
    - The Delete button's `onClick` calls `event.stopPropagation()` before `onDelete(task._id)`.
26. Given a rendered TaskCard, when clicked anywhere except the Delete button, then `useRouter().push` is called with `\`/tasks/${task._id}\`` exactly once.
27. Given a rendered TaskCard, when the Delete button is clicked, then `onDelete(task._id)` is called once AND `useRouter().push` is NOT called.

### TasksList updates
28. Given `src/components/features/TasksList.tsx`, when read, then `motion.div` no longer carries a `whileHover` prop. Existing `initial / animate / exit / layout / transition` props stay.
29. Given the "Create new task" Link in `TasksList.tsx`, when read, then its `href` is `/tasks/new` (not `/create-task`).

### Schema rename
30. Given `src/lib/validation/task.ts`, when read, then it exports `taskSchema` and `TaskInput`. The old `createTaskSchema` / `CreateTaskInput` names are GONE.
31. Given all consumers (`createTaskAction`, `updateTaskAction`, `TaskForm`), when their imports are read, then they pull `taskSchema` and `TaskInput` from `@/lib/validation/task`.

### Tests
32. Given `__tests__/actions/updateTask.test.ts`, when read, then it exists and covers at least the 4 branches: schema fail, unauthenticated, not-found, success + NEXT_REDIRECT propagation.
33. Given `__tests__/components/features/TaskForm.test.tsx`, when read, then it exists with at least 8 cases covering renders inputs, autofocus on title, empty submit blocks action, valid submit calls action, action-failure renders root error, pending state, initialValues pre-fills correctly in edit mode, submitLabel renders correctly in both modes.
34. Given `__tests__/components/features/CreateTaskForm.test.tsx`, when listed, then it is GONE (replaced by `TaskForm.test.tsx`).
35. Given `__tests__/components/features/TaskCard.test.tsx`, when read, then the console.log spy + assertions are GONE. The card-click test asserts `useRouter().push(\`/tasks/${id}\`)` was called. The Delete-stops-propagation test asserts `router.push` was NOT called when Delete is clicked.
36. Given `__tests__/middleware.test.ts`, when read, then the `/create-task` cases are replaced by `/tasks/new` cases AND new `/tasks/<some-id>` cases exist (for both signed-out and signed-in branches).
37. Given `__tests__/components/features/TasksList.test.tsx`, when read, then the "Create new task" Link href assertion uses `/tasks/new`.
38. Given `npm run test:run`, when run, then it exits 0 with at least **148 tests across 21 files** (134 previous + ~14 net new from the additions/replacements). No existing tests regress beyond the documented matcher/href changes.

### Build & quality
39. Given `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build`, when each is run, then each exits 0. Route table contains `/tasks/new` and `/tasks/[id]`, not `/create-task`.
40. Given `mcp__ide__getDiagnostics`, when called, then no diagnostics surface in any source or test file.

### Forbidden-pattern compliance
41. Given the codebase, when grep'd, then no `: any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace references, no `Readonly<{}>` empty type. `'use client'` count stays at 10 (Textarea, Button, Input, TasksList, TaskCard, MainHeaderNav, SignInForm, SignUpForm, error.tsx — and TaskForm replaces CreateTaskForm at the same slot).

### Code layout
42. Given all new and modified files, when read, then they honour CLAUDE.md → "Code Layout — Visual Rhythm".

## Investigation Outcomes

**`TasksList` `'use client'` retention** (per the brief's Investigations section): the directive STAYS. The three load-bearing reasons are documented in Assumption 10. No refactor performed.

## Notes for Downstream Agents

- **Architect**: the inline server-action wrapper pattern in `/tasks/[id]/page.tsx`:
  ```tsx
  async function action(input: { title: string; description?: string }) {
    'use server'
    return updateTaskAction(task._id, input)
  }
  ```
  is acceptable Next.js 15 idiom. The `'use server'` directive INSIDE a function makes that single function a server action. The architect/builder confirms during the build that this compiles cleanly. If it doesn't, fall back to a separate `src/actions/updateTaskById.ts` file with a `bind`-curried wrapper.

- **Builder**: the schema rename `createTaskSchema → taskSchema` ripples through 4 files (`task.ts`, `createTask.ts`, `updateTask.ts` (new), `TaskForm.tsx` (renamed from CreateTaskForm)) + 1 test file (`task.test.ts` imports). The test file's behaviour doesn't change; only the import line.

- **Builder**: when reworking `TaskCard.test.tsx`, mock `next/navigation`'s `useRouter` to return `{ push: vi.fn(), ... }` so the card-click test can assert `push` was called. Same pattern as `SignInForm.test.tsx`.

- **Builder**: `Card`'s default `md:max-w-md` is overridden by the page's `<Card className="md:max-w-lg">` via `tailwind-merge`. No Card source edit needed.

- **Builder**: the TasksList Link href change from `/create-task` to `/tasks/new` is a one-line edit. The TasksList.test.tsx case "always renders the Create new task link pointing at /create-task" updates its assertion to `/tasks/new`.

- **Reviewer**: AC #11 (anti-IDOR on update) is the security-relevant assertion. Verify by reading `updateTask`'s implementation — the query MUST include `userId` as a filter, not be filtered after the read.

- **Reviewer**: AC #16 (NEXT_REDIRECT propagation for `updateTaskAction`) is the cookie-clear-bug lesson reapplied. The action's body must NOT wrap `redirect(...)` in try/catch.

- **Reviewer**: ACs #26 and #27 (card-click router.push + delete-doesn't-propagate) are the linchpins of the card-as-link behaviour. Verify the `stopPropagation` call is BEFORE `onDelete` in the Delete handler.

- **No runtime smoke is required**. All behavioural ACs covered by unit/RTL tests. Visual ACs (inverse-hover, ghost button, regular title weight) are flow-through via Tailwind class names.
