# Task Priority — Plus Lib Restructure and Notes Route

## Description

Three threads bundled together because they ship in sequence: a `/src/lib/` cleanup that lays groundwork; a small `/dashboard/notes` route and accompanying dashboard widget (no notes/[id] yet); and the main feature — a `priority` field on Tasks with four levels (Urgent / High / Medium / Low) wired through the data model, validation, create/edit form, dashboard list, and a new `Pill` UI primitive. Two new UI primitives drop along the way: a `Dropdown` (used by `TaskForm`) and a `Pill` (used by `TaskCard`). Existing tasks in the DB get migrated to `Medium`. No existing behaviour regresses.

## Thread A — Lib Restructure

### Goals
Group `/src/lib/` files by purpose into subfolders before piling on the new feature.

### Proposed buckets
- **`src/lib/auth/`** — `auth.ts`, `auth.config.ts`, `password.ts`.
- **`src/lib/db/`** — `db.ts`, `tasks.ts`, `users.ts`.
- **`src/lib/validation/`** — already exists; unchanged.
- **`src/lib/` (root)** — cross-cutting: `env.ts`, `errors.ts`, `redirect-rules.ts`, `utils.ts`, `widget-images.ts`.

### Notes for the spec-agent
- The spec-agent picks the final shape. Lean: the buckets above. Cross-cutting concerns stay at root; bucketing only kicks in when ≥ 2 files share a purpose.
- File contents unchanged. Only paths move.
- All import sites update accordingly. Verified call sites today: `@/lib/auth`, `@/lib/auth.config`, `@/lib/db`, `@/lib/tasks`, `@/lib/users`, `@/lib/password`, and likely some test fixtures.
- After the move, the new `lib/db/` and `lib/auth/` directories should be the only places that touch Mongoose / NextAuth internals directly.

## Thread B — Notes Route + Dashboard Widget

### B.1 — Route
- New page: `src/app/(main)/(private)/dashboard/notes/page.tsx`.
- Renders a server component with `auth()` guard (redirect `/` when no session) and a single `<h1>Notes</h1>` inside the same `<main>` + `max-w-content` shell that `/dashboard/tasks/page.tsx` uses.
- No data fetch this task. No `notes/[id]` route. No CRUD. Pure scaffold for the dashboard widget link target.
- Metadata title: `'Notes'`.

### B.2 — Header back-button rule
- `MainHeaderNav.tsx`'s `showBack` rule currently allows `/sign-in`, `/sign-up`, `/dashboard/tasks`, `/dashboard/tasks/*`. The new `/dashboard/notes` needs to be covered.
- Two options:
  - **Option A** (extend explicitly): add `pathname === '/dashboard/notes' || pathname.startsWith('/dashboard/notes/')` to the existing chain.
  - **Option B** (generalize): replace the `/dashboard/tasks*` allow-list with `pathname.startsWith('/dashboard/') && pathname !== '/dashboard'` — covers every current and future `/dashboard/<sub>` route automatically.
- Lean: **Option B**. Generalizing matches the user's intent of growing the dashboard with more sub-routes, and the back-target derivation (`pathname.replace(/\/[^/]+$/, '') || '/'`) already returns the correct parent for any depth.

### B.3 — Dashboard widget
- `DashboardWidgetCard` already supports arbitrary `imageKey`. Add a `notes` entry to `WIDGET_IMAGES`.
- Image source: `public/img/butterfly.png` (after preprocessing — see B.4).
- Dashboard page (`src/app/(main)/(private)/dashboard/page.tsx`): add a second `<DashboardWidgetCard href="/dashboard/notes" title="Notes" imageKey="notes" />` next to the Tasks widget.

### B.4 — Image preprocessing
- Raw source: `public/images/butterfly.png` (currently ~5.4 MB, 1919×1920 — already in the raw / gitignored zone).
- Preprocess to `public/img/butterfly.png` matching the workflow from CLAUDE.md (`sips -Z 500`, target ≤ 300 KB, PNG to preserve transparency).
- Expected output: ~500×500 PNG, well under 300 KB. The builder runs `sips` once; the result is committed.

## Thread C — Task Priority

### C.1 — Domain model
- Add `priority` field to the `Task` Mongoose schema. Type: enum string. Values: `'urgent' | 'high' | 'medium' | 'low'`. `default: 'medium'`. Required (with default).
- Add `priority` to the `TaskDoc` TypeScript type.
- Add `priority` to `taskSchema` (Zod): `z.enum(['urgent', 'high', 'medium', 'low']).default('medium')`.
- The `TaskInput` z.infer'd type gains the priority field.

### C.2 — Migration
- Existing tasks in the DB don't have `priority`. Two layers of safety:
  - **Schema default**: `default: 'medium'` in the Mongoose schema. New writes get it automatically. Reads of existing documents without the field return `undefined`.
  - **One-shot migration script**: `scripts/migrate-task-priority.ts`. Connects to the DB via `connectDB`, runs `TaskModel.updateMany({ priority: { $exists: false } }, { $set: { priority: 'medium' } })`, logs the result, disconnects. The user runs it once (e.g. `npx tsx scripts/migrate-task-priority.ts` or `node --import tsx`). Idempotent.
- Lean for the spec-agent: include both. Schema default is mandatory; the script ensures historical data is consistent for queries that filter on priority.

### C.3 — UI primitive: Dropdown (NEW)
- `src/components/ui/Dropdown.tsx`.
- Built as a styled native `<select>` (accessible by default, no JS for open/close, no popover positioning to manage). Custom dropdowns can wait until the design needs them.
- Props: extends `SelectHTMLAttributes<HTMLSelectElement>` plus our standard `variant`, `error`, optional `label`.
- API mirrors `Input` and `Textarea`: `forwardRef<HTMLSelectElement, DropdownProps>`, `displayName = 'Dropdown'`, variant tokens via the existing primary/secondary/danger palette, error overrides to danger and renders the message in a `<p>` below the select.
- Accepts an `options: { value: string; label: string }[]` prop (resolved per Open Question #4 — user picked the prop-array API over `<option>` children).
- Visual treatment: match `Input` / `Textarea` exactly — same border, rounded, padding, focus ring. The chevron stays as the browser default (acceptable for v1; a custom chevron can land later).
- Tests: 6–8 RTL cases (renders options, variant classes, disabled, error, ref forwarding, onChange).

### C.4 — Palette additions + Pill primitive (NEW)

**Palette additions** (per Open Questions #5 + #6 — user picked color-named variants over semantic naming):
- Four new color tokens land in `tailwind.config.ts` under `theme.extend.colors`. Each follows the existing `50 / 500 / 700` shade pattern:
  - `bordeaux` — deep red, for "Urgent" pills. Example shades (spec-agent / architect pick exact hexes that match the existing palette's warm muted style): 50 `#f3dcd9`-ish, 500 `#8a2e2e`-ish, 700 `#5e1c1c`-ish.
  - `amber` — warm yellow-orange, for "High". Spec-agent picks the hexes; aim for a muted, not-too-saturated tone to match the existing palette's warmth.
  - `slate` — neutral mid-tone, for "Medium". Cooler than the existing `neutral` (which is cream-warm). Spec-agent picks; aim for a desaturated blue-gray.
  - `light-blue` — cool calm tone, for "Low". Per the user's draft hint ("maybe low is light blue-ish").
- The existing semantic tokens (`primary`, `secondary`, `danger`, `success`, `neutral`) stay untouched — they're consumed by `Button`, the form pages, the dashboard, etc.

**Pill component**:
- `src/components/ui/Pill.tsx`.
- A small badge: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium`.
- Props: `Readonly<{ variant: PillVariant; children: ReactNode; className?: string }>`.
- `PillVariant` is a color-named union (NOT semantic). Initial set covers the four new tokens; extensible by adding rows to the variant map:
  ```ts
  type PillVariant = 'bordeaux' | 'amber' | 'slate' | 'light-blue'
  ```
- Variant → classes mapping (lean):
  - `bordeaux`: `bg-bordeaux-50 text-bordeaux-700`
  - `amber`: `bg-amber-50 text-amber-700`
  - `slate`: `bg-slate-50 text-slate-700`
  - `light-blue`: `bg-light-blue-50 text-light-blue-700`
- The 50-tone background + 700-tone text yields the badge look. The naming convention: each Pill variant is the name of an actual color in the palette — no semantic abstraction layer.
- Tests: 4 variant cases + 1 children-render case + 1 className-override case = ~6 RTL cases.

### C.5 — Priority → Pill variant mapping
- Confirmed mapping (per Open Question #6):
  - `urgent` → `bordeaux` (deep red — alarming)
  - `high` → `amber` (warm orange — attention)
  - `medium` → `slate` (neutral mid-tone — default)
  - `low` → `light-blue` (cool calm — relaxed)
- Lives as a constant in a new `lib/task-priority.ts` module. Exports:
  - `TASK_PRIORITIES`: tuple `['urgent', 'high', 'medium', 'low'] as const` — single source of truth for the enum.
  - `TaskPriority`: derived type.
  - `PRIORITY_LABELS`: `Record<TaskPriority, string>` → user-facing strings (`'Urgent'`, `'High'`, `'Medium'`, `'Low'`).
  - `PRIORITY_PILL_VARIANT`: `Record<TaskPriority, PillVariant>` → maps to the four color names above.

### C.6 — TaskForm gains the Dropdown
- Add a Priority `<Dropdown>` to the form, with the four `<option>` elements and `defaultValue="medium"`.
- For edit mode, `initialValues` extends to include `priority`; the dropdown pre-selects it.
- The dropdown sits between Description and the Submit button (or above the Submit — exact placement is a design call; lean: between Description and Submit).
- The Zod-resolved form value flows through `action` (the server-action wrapper) just like title/description.

### C.7 — Server actions
- `createTaskAction` and `updateTaskAction` accept the new `priority` field in their input shape. The Zod schema already constrains the value to the four enum strings.
- The DAL `createTask` and `updateTask` write the new field. No further code change because they spread the parsed input.

### C.8 — TaskCard renders the Pill
- Below the description (or if no description, below the date row). Per draft: "the priority pill in underneath the content for now".
- Pill label uses `PRIORITY_LABELS[task.priority]` ("Urgent" / "High" / "Medium" / "Low").
- Pill variant uses `PRIORITY_PILL_VARIANT[task.priority]`.

## Folder / File Touch Points

Rough sketch — architect picks final paths.

```
public/
  img/
    butterfly.png                            ← NEW (preprocessed, committed)
  images/
    butterfly.png                            ← existing raw source (gitignored)

src/
  lib/
    auth/
      auth.ts                                ← MOVED from lib/auth.ts
      auth.config.ts                         ← MOVED
      password.ts                            ← MOVED
    db/
      db.ts                                  ← MOVED
      tasks.ts                               ← MOVED + EDITED (priority)
      users.ts                               ← MOVED
    validation/                              ← unchanged
    task-priority.ts                         ← NEW (maybe — labels + variant map)
  models/
    Task.ts                                  ← EDITED (priority field)
  components/
    ui/
      Dropdown.tsx                           ← NEW
      Pill.tsx                               ← NEW
    features/
      tasks/
        TaskCard.tsx                         ← EDITED (Pill rendering)
        TaskForm.tsx                         ← EDITED (Dropdown field)
        TasksList.tsx                        ← unchanged
      MainHeaderNav.tsx                      ← EDITED (back-button rule)
  app/(main)/(private)/dashboard/
    page.tsx                                 ← EDITED (Notes widget)
    notes/page.tsx                           ← NEW
  actions/
    createTask.ts                            ← EDITED (priority pass-through)
    updateTask.ts                            ← EDITED (same)

scripts/
  migrate-task-priority.ts                   ← NEW (one-shot migration)

__tests__/
  components/ui/
    Dropdown.test.tsx                        ← NEW
    Pill.test.tsx                            ← NEW
  components/features/tasks/
    TaskCard.test.tsx                        ← EDITED (pill assertions)
    TaskForm.test.tsx                        ← EDITED (priority field)
  components/features/
    MainHeaderNav.test.tsx                   ← EDITED (notes route case)
  lib/
    widget-images.test.ts                    ← EDITED (notes entry)
    validation/task.test.ts                  ← EDITED (priority cases)
  actions/
    createTask.test.ts                       ← EDITED (priority pass-through)
    updateTask.test.ts                       ← same
```

## Open Questions

The user resolved Q1–Q7; the remaining items (Q8–Q11) keep their leans as binding defaults for the spec-agent.

1. **Lib subfolder layout** — **RESOLVED**: `lib/auth/` + `lib/db/` only. Cross-cutting concerns stay at root.

2. **Notes back-button rule** — **RESOLVED**: Option B (generalize to `pathname.startsWith('/dashboard/') && pathname !== '/dashboard'`).

3. **Migration mechanism** — **RESOLVED**: schema default + one-shot script.

4. **Dropdown API** — **RESOLVED**: `options: { value: string; label: string }[]` prop array (not `<option>` children).

5. **Pill variant naming** — **RESOLVED**: variants are color-named (NOT semantic). New palette tokens are introduced for `bordeaux`, `amber`, `slate`, `light-blue` (see Section C.4). Pill variants reference those color names directly, e.g. `<Pill variant="light-blue" />`. Existing semantic tokens (`primary`, `secondary`, `danger`, `success`, `neutral`) stay untouched and are not used as Pill variants.

6. **Priority colour mapping** — **RESOLVED** (consistent with Q5): `urgent → bordeaux`, `high → amber`, `medium → slate`, `low → light-blue`. New palette tokens land in `tailwind.config.ts` to back these names.

7. **Priority dropdown placement in TaskForm** — **RESOLVED**: between Description and Submit.

8. **Task-priority mapping module location** — Lean: new `lib/task-priority.ts` (exports `TaskPriority` type, `TASK_PRIORITIES` tuple, `PRIORITY_LABELS`, `PRIORITY_PILL_VARIANT`). Affects: import-path discipline.

9. **Notes page content** — Lean: only `<h1>Notes</h1>`, same `<main>` shell as `/dashboard/tasks`. Affects: file content (trivial).

10. **Existing TaskForm `initialValues` typing** — Lean: extend to include `priority` (optional). Affects: TaskForm prop shape.

11. **Render order** — Lean: lib restructure → preprocess image → add new palette tokens → migrate model/schema → primitives (Dropdown, Pill) → task-priority module → TaskForm dropdown → TaskCard pill → server actions → notes route + widget → header rule. Build-order matters for the builder to avoid intermediate breakage.

### Open Questions added by Q5/Q6 resolution

12. **Exact hex values for the four new palette tokens** — `bordeaux`, `amber`, `slate`, `light-blue`. Each needs at minimum `50 / 500 / 700` shades to match the existing palette structure. Lean: spec-agent picks tones that match the existing palette's muted / warm character (i.e. NOT the default Tailwind blue/amber/slate, which would clash). Affects: visual feel.

13. **Future extensibility of Pill variants** — should the Pill module also include the existing 5 semantic-named-but-could-be-color-named tokens (e.g. add `teal`/`coral`/`terracotta`/`sage`/`cream` aliases)? Lean: no. Only the four new tokens get Pill variants this task. Extending the variant union is one-row-per-color when needed. Affects: scope creep.

## Done Criteria

### Lib restructure
- Files moved per the chosen buckets.
- All imports updated.
- `tsc`, `lint`, tests, build all green.
- No file contents changed.

### Notes route + widget
- `/dashboard/notes` renders with `<h1>Notes</h1>` behind the `auth()` guard.
- `/dashboard` shows two widgets: Tasks (`cat.png`) and Notes (`butterfly.png`).
- `butterfly.png` exists at `public/img/butterfly.png`, ≤ 300 KB.
- Clicking the Notes widget navigates to `/dashboard/notes`.
- Header back-button visible on `/dashboard/notes` and navigates to `/dashboard`.

### Task priority
- Four new color tokens (`bordeaux`, `amber`, `slate`, `light-blue`) are present in `tailwind.config.ts` under `theme.extend.colors`, each with `50 / 500 / 700` shades.
- Existing tasks in the DB have `priority: 'medium'` after the migration script runs (verified by the user running the script — out of scope for unit tests).
- New tasks created via the form have a `priority` set (defaults to `'medium'` if unchanged).
- Editing a task can change the priority.
- TaskCard shows a pill underneath description with the correct label and color variant (`urgent → bordeaux`, `high → amber`, `medium → slate`, `low → light-blue`).
- The `Pill` primitive exists with color-named variants (`bordeaux`, `amber`, `slate`, `light-blue`) and class mapping `bg-{color}-50 text-{color}-700`.
- The `Dropdown` primitive exists, accepts `options: { value; label }[]` as a prop, and styles to match `Input` / `Textarea`.
- `taskSchema` (Zod) enforces the enum.
- The Mongoose schema enforces `default: 'medium'`.

### Build & quality
- `tsc`, `lint`, `npm run test:run`, `next build` all green.
- Test suite total ≥ 195 / 25 (estimated: was 170 / 23; +5 widget-images-related, +6–8 Dropdown, +7 Pill, +3 validation, +2 TaskForm, +2 TaskCard, +2 MainHeaderNav notes-route cases ≈ +27 cases; +2 test files for Dropdown and Pill).
- No regression in existing tests.

## What This Task Does NOT Include

- `/dashboard/notes/[id]` (out of scope per draft).
- Sorting / filtering by priority on `/dashboard/tasks`.
- Animation on priority changes.
- Bulk priority edit on multiple tasks.
- Theme toggling, custom dropdown chevron, or any other primitive cosmetics beyond the spec.
- Changes to the auth flow, middleware matcher (already covers `/dashboard/:path*`), or redirect rules beyond what the back-button rule needs.
- Internationalization of priority labels.
- A `Notes` data model or DAL.
