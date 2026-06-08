# Build Plan: Task Priority + Lib Restructure + Notes Route

## Overview
Sequenced in three phases. Phase 1 (lib restructure) is a pure file-move + import-update sweep. Phase 2 (notes route + widget) is small and isolated. Phase 3 (task priority) is the bulk: new palette tokens, two new UI primitives, schema/model changes, migration script, TaskForm + TaskCard integration.

## Reuse

- `src/lib/validation/*.ts` — unchanged paths; one file (`task.ts`) gets the priority field.
- `src/middleware.ts` — unchanged matcher.
- `src/lib/redirect-rules.ts`, `env.ts`, `errors.ts`, `utils.ts`, `widget-images.ts` — paths unchanged.
- `src/components/ui/Card.tsx`, `Button.tsx`, `buttonClass.ts`, `Input.tsx`, `Textarea.tsx` — unchanged. `Dropdown` and `Pill` are NEW siblings.
- `src/components/features/MainHeader.tsx`, `tasks/TasksList.tsx`, `dashboard/DashboardWidgetCard.tsx`, `auth/SignInForm.tsx`, `auth/SignUpForm.tsx` — unchanged.
- `src/app/(main)/layout.tsx`, error.tsx, not-found.tsx, root pages — unchanged at the source level (some test files referencing `@/lib/auth` etc. get path updates).
- `vitest.config.mts`, `package.json`, `tsconfig.json` — unchanged. (No new deps; the migration script may use `tsx` which we'd add — see Build Order.)
- `tailwind.config.ts` — gains 4 new color tokens. Existing tokens untouched.

## Files to Create

### Production source (4)

#### `src/lib/task-priority.ts`
- Module with `TASK_PRIORITIES` tuple, `TaskPriority` type, `PRIORITY_LABELS`, `PRIORITY_PILL_VARIANT`.
- `PillVariant` imported from `@/components/ui/Pill` (created in step 5 of the build order — task-priority.ts lands after Pill).
- Reference pattern: `src/components/ui/buttonClass.ts` (small typed map with `as const` discipline).

#### `src/components/ui/Pill.tsx`
- `'use client'` is NOT needed — Pill has no hooks, no event handlers, no browser APIs. Server component.
- Type: `PillVariant = 'bordeaux' | 'amber' | 'slate' | 'light-blue'`.
- Props: `Readonly<{ variant: PillVariant; children: ReactNode; className?: string }>`.
- Module-level `VARIANT_CLASSES: Record<PillVariant, string>` map.
- Renders `<span className={cn(BASE, VARIANT_CLASSES[variant], className)}>{children}</span>`.
- Reference pattern: `Button.tsx` + `buttonClass.ts` for the typed variant map idiom.

#### `src/components/ui/Dropdown.tsx`
- `'use client'` directive (mirrors `Input` and `Textarea`).
- `forwardRef<HTMLSelectElement, DropdownProps>` with `displayName = 'Dropdown'`.
- Type:
  ```ts
  type DropdownOption = Readonly<{ value: string; label: string }>

  type DropdownVariant = 'primary' | 'secondary' | 'danger'

  type DropdownProps = Readonly<
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
      options: ReadonlyArray<DropdownOption>
      variant?: DropdownVariant
      error?: string
    }
  >
  ```
- Reference pattern: `src/components/ui/Input.tsx` (forwardRef + variant + error rendering).

#### `scripts/migrate-task-priority.ts`
- Standalone Node script. Imports `connectDB` and `TaskModel`.
- Calls `TaskModel.updateMany({ priority: { $exists: false } }, { $set: { priority: 'medium' } })`.
- Logs the result and disconnects.
- No formal test (user runs it once).

### Test files (2)

#### `__tests__/components/ui/Pill.test.tsx`
- ~7 cases (one per variant + children + className + base classes).

#### `__tests__/components/ui/Dropdown.test.tsx`
- ~8 cases (options render, default value, variant tokens × 3, disabled, error renders + applies danger, error overrides explicit variant, ref forwarding, onChange).

### Page (1)

#### `src/app/(main)/(private)/dashboard/notes/page.tsx`
- Server component. `auth()` guard → `redirect('/')`. Renders `<main className="min-h-screen p-4 md:p-8"><div className="mx-auto max-w-content space-y-6"><h1 className="font-display text-4xl text-neutral-900">Notes</h1></div></main>`.
- Metadata title `'Notes'`.

## Files to Modify

### Phase 1 — Lib restructure (file moves)
- Move: `src/lib/auth.ts` → `src/lib/auth/auth.ts`.
- Move: `src/lib/auth.config.ts` → `src/lib/auth/auth.config.ts`.
- Move: `src/lib/password.ts` → `src/lib/auth/password.ts`.
- Move: `src/lib/db.ts` → `src/lib/db/db.ts`.
- Move: `src/lib/tasks.ts` → `src/lib/db/tasks.ts`.
- Move: `src/lib/users.ts` → `src/lib/db/users.ts`.

### Phase 1 — Internal relative imports (inside moved files)
- `src/lib/auth/auth.ts` likely imports `./auth.config`, `./password`, `../db` (db.ts), `../users` (users.ts). After moves:
  - `./auth.config` → `./auth.config` (stays — same folder).
  - `./password` → `./password` (stays).
  - `../db` → `../db/db` (new path).
  - `../users` → `../db/users` (new path).
- `src/lib/auth/auth.config.ts` likely has no internal imports.
- `src/lib/db/tasks.ts` imports `./db` (db.ts) → stays.
- `src/lib/db/users.ts` similarly imports `./db` → stays.
- Verified during build step.

### Phase 1 — External import-path updates (call sites)
Builder uses `grep -rln '@/lib/auth' /Users/2131989/WebstormProjects/team-agent/src /Users/2131989/WebstormProjects/team-agent/__tests__` (and the other paths) to find every call site, then a `sed` batch rewrites them.

Mappings:
- `'@/lib/auth'` → `'@/lib/auth/auth'`
- `'@/lib/auth.config'` → `'@/lib/auth/auth.config'`
- `'@/lib/password'` → `'@/lib/auth/password'`
- `'@/lib/db'` → `'@/lib/db/db'`
- `'@/lib/tasks'` → `'@/lib/db/tasks'`
- `'@/lib/users'` → `'@/lib/db/users'`

These are the exact prefixes used today; greps confirm there's no aliasing trick (e.g. `@/lib/auth/something`) that would clash.

### Phase 2 — Notes route + widget
- `src/lib/widget-images.ts`: add the `notes` entry to `WIDGET_IMAGES`.
- `src/app/(main)/(private)/dashboard/page.tsx`: add the second `<DashboardWidgetCard>` for Notes.
- `src/components/features/MainHeaderNav.tsx`: replace the `showBack` rule.

### Phase 3 — Task priority
- `src/models/Task.ts`: extend `TaskDoc` type, add `priority` Mongoose schema entry.
- `src/lib/validation/task.ts`: extend `taskSchema` with `priority`.
- `tailwind.config.ts`: add the 4 new palette tokens.
- `src/lib/db/tasks.ts`: extend `createTask` and `updateTask` input signatures to accept `priority`. (Already passes the spread; explicit type extension.)
- `src/actions/createTask.ts`: extend the input type and pass-through.
- `src/actions/updateTask.ts`: same.
- `src/components/features/tasks/TaskForm.tsx`: import `Dropdown`, `TASK_PRIORITIES`, `PRIORITY_LABELS`. Extend `TaskFormProps`. Add the Priority dropdown field.
- `src/components/features/tasks/TaskCard.tsx`: import `Pill`, `PRIORITY_LABELS`, `PRIORITY_PILL_VARIANT`. Render the pill below the description.

### Phase 3 — Tests
- `__tests__/lib/widget-images.test.ts`: +1 case (notes entry).
- `__tests__/components/features/MainHeaderNav.test.tsx`: +2 cases (notes route).
- `__tests__/lib/validation/task.test.ts`: +2 cases (priority default + invalid).
- `__tests__/actions/createTask.test.ts`: assertion update for new priority param shape.
- `__tests__/actions/updateTask.test.ts`: same.
- `__tests__/components/features/tasks/TaskForm.test.tsx`: +2 cases (Priority dropdown + default).
- `__tests__/components/features/tasks/TaskCard.test.tsx`: +2 cases (priority pill rendering), plus base-fixture extension (every existing test uses a `baseTask` that needs `priority: 'medium'`).

## Data Flow

- Server-side: `dashboard/tasks/page.tsx` reads tasks via `getTasksForUser`. Tasks now include `priority`. Passes to `TasksList` → `TaskCard` (with the Pill).
- Form-side: `TaskForm` (client) uses RHF. The `priority` field defaults to `'medium'` (or `initialValues.priority` in edit mode). Form submission passes through `priority` to the server action, which calls the DAL. The DAL writes the field.
- Migration: one-shot Node script reads from the DB, sets missing priorities, exits.

## State Management

- Server state: tasks list (with priority) — fetched in the page server component. No change to the fetch path.
- Client state: `TaskForm`'s RHF state grows by one field. No new client state outside RHF.
- Global state: none.

## Types

(See spec for full type definitions. Key additions: `TaskPriority`, `PillVariant`, `DropdownOption`, `DropdownVariant`.)

## File Tree

(See spec for full visual.)

## Build Order

A 20-step build. Phase-by-phase with intermediate `tsc --noEmit` checks after Phase 1 and Phase 3's primitive additions.

### Phase 1 — Lib restructure (steps 1–4)
1. Create `src/lib/auth/` and `src/lib/db/` directories.
2. `mv` the 6 lib files into the new directories.
3. Run `grep -rln "@/lib/auth\|@/lib/auth.config\|@/lib/password\|@/lib/db\|@/lib/tasks\|@/lib/users" src __tests__` to enumerate call sites. Then run a `sed -i` batch rewriting the 6 import path patterns across all matched files. Use a precise sed expression to avoid double-rewrites (e.g. `@/lib/auth` matches `@/lib/auth/auth` after rewrite — use word-boundary or quote-anchored matching).

   Practical approach: rewrite the most-specific first. Order:
   - `'@/lib/auth.config'` → `'@/lib/auth/auth.config'` (4 chars suffix unique; safe)
   - `'@/lib/password'` → `'@/lib/auth/password'`
   - `'@/lib/tasks'` → `'@/lib/db/tasks'`
   - `'@/lib/users'` → `'@/lib/db/users'`
   - `'@/lib/db'` → `'@/lib/db/db'`
   - `'@/lib/auth'` (must be LAST and the regex must NOT match `'@/lib/auth/...'`) → `'@/lib/auth/auth'`
4. **Verify** internal imports inside the moved files (relative paths). Update where needed. Then `rm -rf .next && npx tsc --noEmit`. Expect clean.

### Phase 2 — Image preprocessing + notes route (steps 5–9)
5. Run `sips -Z 500 /Users/2131989/WebstormProjects/team-agent/public/images/butterfly.png --out /Users/2131989/WebstormProjects/team-agent/public/img/butterfly.png`. Verify file size ≤ 300 KB. Read dimensions via `sips -g pixelWidth -g pixelHeight`.
6. Edit `src/lib/widget-images.ts` to add the `notes` entry (use the dimensions from step 5).
7. Create `src/app/(main)/(private)/dashboard/notes/page.tsx`.
8. Edit `src/app/(main)/(private)/dashboard/page.tsx` to add the Notes widget card.
9. Edit `src/components/features/MainHeaderNav.tsx` — replace the `showBack` rule with the generalised version.

### Phase 3 — Task priority (steps 10–18)
10. Edit `tailwind.config.ts` — add the 4 new color tokens.
11. Create `src/components/ui/Pill.tsx`.
12. Create `src/components/ui/Dropdown.tsx`.
13. Create `src/lib/task-priority.ts`. (After Pill so it can import the type.)
14. Edit `src/models/Task.ts` — add `priority` to `TaskDoc` and Mongoose schema.
15. Edit `src/lib/validation/task.ts` — add `priority` to `taskSchema`.
16. Edit `src/lib/db/tasks.ts` — extend `createTask` and `updateTask` input signatures and pass-through.
17. Edit `src/actions/createTask.ts` and `src/actions/updateTask.ts` — extend input types.
18. Edit `src/components/features/tasks/TaskForm.tsx` — add the Priority dropdown.
19. Edit `src/components/features/tasks/TaskCard.tsx` — add the Pill below description.

### Phase 4 — Migration script (step 20)
20. Create `scripts/migrate-task-priority.ts`.

### Phase 5 — Tests (steps 21–28)
21. Create `__tests__/components/ui/Pill.test.tsx`.
22. Create `__tests__/components/ui/Dropdown.test.tsx`.
23. Edit `__tests__/lib/validation/task.test.ts` (+2 cases).
24. Edit `__tests__/lib/widget-images.test.ts` (+1 case).
25. Edit `__tests__/components/features/MainHeaderNav.test.tsx` (+2 cases).
26. Edit `__tests__/actions/createTask.test.ts` and `updateTask.test.ts` (assertion updates).
27. Edit `__tests__/components/features/tasks/TaskForm.test.tsx` (+2 cases).
28. Edit `__tests__/components/features/tasks/TaskCard.test.tsx` (+2 cases + base-fixture extension).

### Phase 6 — Verify (step 29)
29. Run `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build`, `mcp__ide__getDiagnostics`. All clean. Then write artefact docs.
