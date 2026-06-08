# Spec: Task Priority + Lib Restructure + Notes Route

## Summary
Three interlocking threads ship together. **(A) Lib restructure**: relocate `auth.ts`, `auth.config.ts`, `password.ts` into `src/lib/auth/`; relocate `db.ts`, `tasks.ts`, `users.ts` into `src/lib/db/`. Cross-cutting files (`env.ts`, `errors.ts`, `redirect-rules.ts`, `utils.ts`, `widget-images.ts`) stay at `src/lib/` root. **(B) Notes route**: new `/dashboard/notes/page.tsx` with `auth()` guard and an `<h1>Notes</h1>` placeholder; a new "Notes" widget on `/dashboard` using `butterfly.png` (preprocessed from `public/images/` → `public/img/`); `MainHeaderNav`'s back-button visibility rule generalises from explicit `/dashboard/tasks*` allow-list to `pathname.startsWith('/dashboard/') && pathname !== '/dashboard'`. **(C) Task priority**: `Task` model and `taskSchema` gain a `priority` field (enum: `urgent | high | medium | low`, default `medium`); one-shot migration script backfills existing docs; new color tokens (`bordeaux`, `amber`, `slate`, `light-blue`) land in `tailwind.config.ts`; new `Dropdown` and `Pill` UI primitives; `TaskForm` gains a priority dropdown between Description and Submit; `TaskCard` renders a priority pill underneath the description.

## Assumptions

### Thread A — Lib Restructure

1. **Final `src/lib/` tree**:
   ```
   src/lib/
     auth/
       auth.ts
       auth.config.ts
       password.ts
     db/
       db.ts
       tasks.ts
       users.ts
     validation/
       signIn.ts
       signUp.ts
       task.ts
     env.ts
     errors.ts
     redirect-rules.ts
     utils.ts
     widget-images.ts
     task-priority.ts          ← NEW (Thread C)
   ```
   File contents unchanged in this thread (priority field lands in `db/tasks.ts` during Thread C).

2. **Import-path updates** for every call site referencing the moved files. Discovered call sites (approximate; builder verifies via `grep`):
   - `@/lib/auth` → `@/lib/auth/auth` (consumed by route handlers, pages, server actions, middleware)
   - `@/lib/auth.config` → `@/lib/auth/auth.config` (consumed by middleware and the full-config in `auth.ts`)
   - `@/lib/password` → `@/lib/auth/password`
   - `@/lib/db` → `@/lib/db/db`
   - `@/lib/tasks` → `@/lib/db/tasks`
   - `@/lib/users` → `@/lib/db/users`
   - `@/lib/errors`, `@/lib/env`, `@/lib/utils`, `@/lib/redirect-rules`, `@/lib/widget-images`, `@/lib/validation/*` — unchanged paths.

3. **No barrel/index files** introduced. Each consumer imports the explicit module path.

### Thread B — Notes Route + Widget

4. **`/dashboard/notes/page.tsx`** is a server component. `auth()` guard → `redirect('/')` when no `session?.user`. Renders `<main className="flex min-h-screen items-start justify-center px-4 pt-20"><Card className="md:max-w-2xl"><h1 className="font-display text-4xl text-neutral-900">Notes</h1></Card></main>` for visual consistency with form pages. Metadata title `'Notes'`.

   Actually reconsidering: `/dashboard/tasks` uses `<main className="min-h-screen p-4 md:p-8"><div className="mx-auto max-w-content space-y-6">`. To match the "same shell as tasks" intent, `/dashboard/notes` uses the SAME shell as `/dashboard/tasks/page.tsx`, NOT the form-page shell. Final structure:
   ```tsx
   <main className="min-h-screen p-4 md:p-8">
     <div className="mx-auto max-w-content space-y-6">
       <h1 className="font-display text-4xl text-neutral-900">Notes</h1>
     </div>
   </main>
   ```

5. **Image preprocessing**: `public/images/butterfly.png` (raw, ~5.4 MB, 1919×1920) → `public/img/butterfly.png` (preprocessed, ≤ 300 KB) via `sips -Z 500 input --out output`. Builder runs this command once and commits the output. Raw file stays in `public/images/` (gitignored).

6. **`WIDGET_IMAGES` extension**: add a `notes` entry to the map:
   ```ts
   notes: { src: '/img/butterfly.png', alt: '', width: 500, height: 500 }
   ```
   (Width/height set to the preprocessed dimensions. If `sips -Z 500` produces 500×500 — it preserves aspect, so the square-ish 1919×1920 source → 500×500 output. Builder verifies and adjusts if needed.)

7. **Dashboard page** adds a second widget:
   ```tsx
   <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
     <DashboardWidgetCard href="/dashboard/tasks" title="Tasks" imageKey="tasks" />
     <DashboardWidgetCard href="/dashboard/notes" title="Notes" imageKey="notes" />
   </div>
   ```

8. **`MainHeaderNav.tsx` back-button visibility rule** generalises:
   - Was: `pathname === '/sign-in' || pathname === '/sign-up' || pathname === '/dashboard/tasks' || pathname.startsWith('/dashboard/tasks/')`.
   - New: `pathname === '/sign-in' || pathname === '/sign-up' || (pathname.startsWith('/dashboard/') && pathname !== '/dashboard')`.
   - The derived `backTarget` already handles arbitrary depth — no change needed there.
   - Behavioural effect: back button now visible on `/dashboard/notes` (and any future `/dashboard/<sub>` route).

### Thread C — Task Priority

9. **New file `src/lib/task-priority.ts`** exports:
   ```ts
   export const TASK_PRIORITIES = ['urgent', 'high', 'medium', 'low'] as const

   export type TaskPriority = (typeof TASK_PRIORITIES)[number]

   export const PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
     urgent: 'Urgent',
     high: 'High',
     medium: 'Medium',
     low: 'Low',
   }

   export const PRIORITY_PILL_VARIANT: Readonly<Record<TaskPriority, PillVariant>> = {
     urgent: 'bordeaux',
     high: 'amber',
     medium: 'slate',
     low: 'light-blue',
   }
   ```
   `PillVariant` is imported from `@/components/ui/Pill`.

10. **`Task` model (`src/models/Task.ts`)** gains:
    ```ts
    type TaskDoc = {
      _id: string
      title: string
      description?: string
      priority: TaskPriority      // NEW
      userId: string
      createdAt: Date
      updatedAt: Date
    }
    ```
    Mongoose schema entry:
    ```ts
    priority: { type: String, required: true, enum: TASK_PRIORITIES, default: 'medium' },
    ```

11. **`taskSchema` (Zod, `src/lib/validation/task.ts`)** gains:
    ```ts
    priority: z.enum(TASK_PRIORITIES).default('medium'),
    ```
    `TaskInput` (z.infer'd) gains the `priority` field.

12. **Server actions** (`src/actions/createTask.ts`, `src/actions/updateTask.ts`):
    - Their input parameter type extends to include `priority?: TaskPriority` (because clients pass it through). The Zod parse fills in `'medium'` when omitted via the `.default('medium')`.
    - `createTask` DAL helper signature extends to accept `priority: TaskPriority`. Persists it.
    - `updateTask` DAL helper signature extends similarly. Persists.
    - The actions spread the parsed input including `priority` (already happens via the existing `{ title, description, ...parsed.data }` pattern — `priority` flows through).

13. **Migration script `scripts/migrate-task-priority.ts`**:
    ```ts
    import { connectDB } from '@/lib/db/db'
    import { TaskModel } from '@/models/Task'
    import mongoose from 'mongoose'

    async function main() {
      await connectDB()
      const result = await TaskModel.updateMany(
        { priority: { $exists: false } },
        { $set: { priority: 'medium' } }
      )
      console.log(`Migration complete: ${result.modifiedCount} tasks updated.`)
      await mongoose.disconnect()
    }

    main().catch((err) => {
      console.error(err)
      process.exit(1)
    })
    ```
    Idempotent — re-running adds 0 docs.

14. **New palette tokens** in `tailwind.config.ts` under `theme.extend.colors`:
    ```ts
    bordeaux: { 50: '#f0d8d4', 500: '#8a2e2e', 700: '#5f1f1f' },
    amber: { 50: '#fbeed1', 500: '#c98c1f', 700: '#8e5f0c' },
    slate: { 50: '#dde2e6', 500: '#6b7a85', 700: '#465058' },
    'light-blue': { 50: '#d9e8f2', 500: '#5a8cb0', 700: '#3a5e7a' },
    ```
    These match the existing palette's muted, warm-leaning character. The spec-agent acknowledges these hexes are draft picks; the user (or architect) may tune them. The shade ratios (50 light wash, 500 mid, 700 dark) parallel the existing 5 semantic tokens.

15. **`Pill` primitive (`src/components/ui/Pill.tsx`)**:
    ```ts
    export type PillVariant = 'bordeaux' | 'amber' | 'slate' | 'light-blue'

    type PillProps = Readonly<{
      variant: PillVariant
      children: ReactNode
      className?: string
    }>
    ```
    Renders `<span className={cn(base, variantClass, props.className)}>{children}</span>` where:
    - `base` = `'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'`.
    - `variantClass` is looked up from a `Record<PillVariant, string>` map:
      ```ts
      const VARIANT_CLASSES: Record<PillVariant, string> = {
        bordeaux: 'bg-bordeaux-50 text-bordeaux-700',
        amber: 'bg-amber-50 text-amber-700',
        slate: 'bg-slate-50 text-slate-700',
        'light-blue': 'bg-light-blue-50 text-light-blue-700',
      }
      ```

16. **`Dropdown` primitive (`src/components/ui/Dropdown.tsx`)**:
    - `'use client'` directive.
    - `forwardRef<HTMLSelectElement, DropdownProps>` with `displayName = 'Dropdown'`.
    - Type:
      ```ts
      type DropdownOption = Readonly<{ value: string; label: string }>

      type DropdownProps = Readonly<
        Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
          options: ReadonlyArray<DropdownOption>
          variant?: 'primary' | 'secondary' | 'danger'
          error?: string
        }
      >
      ```
    - Renders a styled native `<select>`. The container layout mirrors `Input` / `Textarea`:
      - `<select>` carries the same border / focus-ring / padding tokens as `Input`.
      - When `error` is non-empty: variant overrides to `danger` and an error message `<p>` renders below the select.
    - The error and disabled visual states match existing primitives byte-for-byte for visual rhythm.
    - The dropdown's `<option>` elements are emitted from the `options` prop via a map.
    - Default variant: `'primary'`.

17. **`TaskForm` (`src/components/features/tasks/TaskForm.tsx`)** gains:
    - Import: `Dropdown`, `TASK_PRIORITIES`, `PRIORITY_LABELS`.
    - `TaskFormProps` extends:
      ```ts
      initialValues?: { title: string; description?: string; priority?: TaskPriority }
      action: (input: { title: string; description?: string; priority: TaskPriority }) => …
      ```
    - `useForm<TaskInput>({ resolver, defaultValues: { ...initialValues, priority: initialValues?.priority ?? 'medium' } })`.
    - New form field between Description and Submit:
      ```tsx
      <label className="block">
        <span className="block text-base text-neutral-700">Priority</span>
        <Dropdown
          {...register('priority')}
          options={TASK_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          disabled={formState.isSubmitting}
          error={formState.errors.priority?.message}
        />
      </label>
      ```

18. **`TaskCard` (`src/components/features/tasks/TaskCard.tsx`)** gains a `<Pill>` element underneath the description:
    ```tsx
    {task.description && (
      <p ...>{task.description}</p>
    )}

    <div className="mt-3">
      <Pill variant={PRIORITY_PILL_VARIANT[task.priority]}>
        {PRIORITY_LABELS[task.priority]}
      </Pill>
    </div>
    ```
    Imports from `@/lib/task-priority` and `@/components/ui/Pill`. The pill renders regardless of whether the task has a description (the wrapper `<div>` sits below the optional description block, with `mt-3` for spacing).

### Tests (Threads A–C)

19. **Lib restructure**: all existing tests that import from moved modules update their paths. No new test cases.

20. **Notes route + widget**:
    - `__tests__/lib/widget-images.test.ts`: +1 case asserting `WIDGET_IMAGES.notes` shape.
    - `__tests__/components/features/MainHeaderNav.test.tsx`: +2 cases:
      - "renders the Back button on /dashboard/notes" (signed-in).
      - "calls router.push('/dashboard') when Back is clicked on /dashboard/notes" (signed-in).

21. **Task priority — primitives**:
    - `__tests__/components/ui/Dropdown.test.tsx` (new): ~8 cases — renders options, default value, variant classes (primary / secondary / danger), disabled, error renders + applies danger variant, error overrides explicit variant, ref forwarding, onChange firing.
    - `__tests__/components/ui/Pill.test.tsx` (new): ~7 cases — children render, each of 4 variants applies correct classes, className prop overrides, base classes always present.

22. **Task priority — validation + actions + form + card**:
    - `__tests__/lib/validation/task.test.ts`: +2 cases — priority defaults to medium when omitted; priority rejects unknown values.
    - `__tests__/actions/createTask.test.ts`: 1 assertion update — the success-path test now asserts `createTask` called with `priority: 'medium'` (default) or whatever value was passed. Re-test invalid-priority path implicitly via existing schema-fail test.
    - `__tests__/actions/updateTask.test.ts`: same.
    - `__tests__/components/features/tasks/TaskForm.test.tsx`: +2 cases — renders the Priority dropdown with the four options + Medium pre-selected; submitting passes through the priority value.
    - `__tests__/components/features/tasks/TaskCard.test.tsx`: +2 cases — renders the priority pill with the correct label + variant; existing 10 cases extend their `baseTask` fixture with `priority: 'medium'`.

### Estimated suite growth

23. **Suite total target**: ≥ 195 / 25 (was 170 / 23; +8 Dropdown, +7 Pill, +2 TaskCard, +2 TaskForm, +2 validation, +2 MainHeaderNav, +1 widget-images ≈ +24 cases; +2 new test files).

### Build / quality

24. **`'use client'` directive count grows by 1** (Dropdown — needs `'use client'` because RHF's `register` returns event handlers it'll spread onto a native element; the styled `<select>` works fine either way, but consistency with `Input` / `Textarea` (both `'use client'`) wins). Final count: 11.

25. **No new dependencies.**

26. **`.next` cache eviction expected** after lib restructure (file moves). Builder runs `rm -rf .next` once after the moves, before the final `tsc --noEmit`.

## Routes / Pages

| Path | Change |
|---|---|
| `/dashboard` | Adds a second `<DashboardWidgetCard>` (Notes). |
| `/dashboard/notes` | NEW. Server component. Renders `<h1>Notes</h1>` inside the same shell as `/dashboard/tasks`. |
| `/dashboard/tasks`, `/dashboard/tasks/[id]`, `/dashboard/tasks/new` | Unchanged at the page level. |
| All other routes | Unchanged. |

## Data

### Mongoose schema delta
- `Task.priority`: enum string (`'urgent' | 'high' | 'medium' | 'low'`), required, default `'medium'`.

### Zod schema delta
- `taskSchema.priority`: `z.enum(TASK_PRIORITIES).default('medium')`.

### TypeScript types
- `TaskDoc` gains `priority: TaskPriority`.
- `TaskInput` (z.infer'd) gains `priority: TaskPriority`.
- New `TaskPriority` type union.
- New `PillVariant` type union.
- New `DropdownOption` type.

### Migration
- `scripts/migrate-task-priority.ts` runs `TaskModel.updateMany({ priority: { $exists: false } }, { $set: { priority: 'medium' } })`. Idempotent.

## Components

| Name | Change |
|---|---|
| `Pill` (NEW) | Color-named badge. 4 variants: `bordeaux`, `amber`, `slate`, `light-blue`. |
| `Dropdown` (NEW) | Styled native `<select>`. Accepts `options` prop array. Mirrors `Input` / `Textarea` patterns. |
| `TaskForm` (modified) | Adds the Priority dropdown between Description and Submit. |
| `TaskCard` (modified) | Adds a `<Pill>` underneath the description. |
| `MainHeaderNav` (modified) | Generalises `showBack` rule to cover `/dashboard/<any>`. |
| `DashboardWidgetCard` | Unchanged code; new call site adds a Notes instance. |

## User Interactions

### Happy path — create a task with a custom priority
1. User on `/dashboard/tasks/new`.
2. Title field auto-focused; user types a title.
3. User opens the Priority dropdown (defaults to "Medium") and selects "Urgent".
4. User submits. `createTaskAction` runs with `priority: 'urgent'`. Action persists and redirects to `/dashboard/tasks`.
5. User sees the new task in the list with a bordeaux "Urgent" pill underneath.

### Happy path — edit a task's priority
1. User clicks a task on `/dashboard/tasks`. Browser navigates to `/dashboard/tasks/<id>`.
2. The TaskForm pre-fills with the task's current `priority` selected in the dropdown.
3. User changes the priority to "Low" and clicks "Save Task".
4. `updateTaskAction` runs with the new priority. Redirects to `/dashboard/tasks`. The pill on the task card updates accordingly.

### Happy path — notes route
1. User on `/dashboard`. Sees two widget cards: "Tasks" (cat.png) and "Notes" (butterfly.png).
2. User clicks the Notes widget. Browser navigates to `/dashboard/notes`. Page renders `<h1>Notes</h1>`.
3. Header back button is visible; clicking it returns to `/dashboard`.

### Failure path — invalid priority submitted (defensive)
- Client cannot submit an invalid priority because the dropdown only emits the four enum values. If a malformed payload arrives at the server action (e.g. via direct API call), Zod's `.enum(...)` parse fails and the action returns the generic error.

### Failure path — migration on a populated DB
- The migration script is idempotent. Running it twice: second run reports `0 modified`.

## States

### `Dropdown`
- **Idle**: variant border, hover-darken on the chevron arrow (browser-default).
- **Disabled**: lighter cursor, no focus ring.
- **Error**: variant overrides to `danger`; error message rendered in a `<p>` below the select.

### `Pill`
- Static. No interactive states.

### `TaskForm`
- Priority dropdown is enabled, with all four options. Default `'medium'` selected for create mode; `initialValues.priority` for edit mode.

### `TaskCard`
- Pill always rendered (every task has a priority after migration).

## Acceptance Criteria

### Thread A — Lib Restructure
1. `src/lib/auth/` directory contains `auth.ts`, `auth.config.ts`, `password.ts`. No other auth-related files at `src/lib/` root.
2. `src/lib/db/` directory contains `db.ts`, `tasks.ts`, `users.ts`. No other db-related files at `src/lib/` root.
3. Cross-cutting files (`env.ts`, `errors.ts`, `redirect-rules.ts`, `utils.ts`, `widget-images.ts`, `task-priority.ts`) remain at `src/lib/` root.
4. `src/lib/validation/` remains unchanged.
5. All import paths in `/src` and `/__tests__` point at the new module locations.

### Thread B — Notes Route + Widget
6. `/dashboard/notes` renders `<h1>Notes</h1>` for an authenticated user. Renders the same shell layout as `/dashboard/tasks`.
7. `/dashboard/notes` redirects unauthenticated users to `/` via the existing middleware.
8. `WIDGET_IMAGES.notes` exists with `src='/img/butterfly.png'`, `alt=''`, and matching width/height of the preprocessed file.
9. `public/img/butterfly.png` exists and is ≤ 300 KB.
10. `/dashboard` renders two widget cards: Tasks (cat.png) and Notes (butterfly.png) in the existing 2-col grid.
11. `MainHeaderNav` shows the back button on `/dashboard/notes`.
12. Clicking the back button on `/dashboard/notes` calls `router.push('/dashboard')`.

### Thread C — Task Priority
13. `Task` model's `priority` field has Mongoose enum `['urgent', 'high', 'medium', 'low']` and `default: 'medium'`.
14. `taskSchema` (Zod) includes `priority: z.enum(TASK_PRIORITIES).default('medium')`.
15. `TaskDoc` and `TaskInput` TypeScript types include `priority: TaskPriority`.
16. `scripts/migrate-task-priority.ts` exists and the script is idempotent.
17. `tailwind.config.ts` contains `bordeaux`, `amber`, `slate`, `light-blue` color tokens, each with `50 / 500 / 700` shades.
18. `Pill` primitive exists at `src/components/ui/Pill.tsx` with the 4 color-named variants. Each variant applies `bg-{name}-50 text-{name}-700`.
19. `Dropdown` primitive exists at `src/components/ui/Dropdown.tsx`. Accepts `options: { value; label }[]`. Mirrors `Input` / `Textarea` API for `variant`, `error`, `disabled`, ref-forwarding.
20. `lib/task-priority.ts` exports `TASK_PRIORITIES`, `TaskPriority`, `PRIORITY_LABELS`, `PRIORITY_PILL_VARIANT`.
21. `TaskForm` renders a Priority dropdown between Description and Submit with the four options. "Medium" is the default for create mode.
22. `TaskForm` in edit mode pre-selects the task's current priority.
23. `TaskCard` renders a `<Pill>` underneath the description with the correct label + variant.
24. `createTaskAction` and `updateTaskAction` validate and persist `priority`.

### Build & quality
25. `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all exit 0.
26. Suite total ≥ 195 / 25.

### Forbidden-pattern compliance
27. Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` empty-prop types.

### Code layout
28. Visual rhythm honoured in all new and modified files.
