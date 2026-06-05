# Task: Tasks UI Improvements + Palette Revert

## Description
Two threads bundled. (1) Revert the neon palette from `10-tasks` back to the earthy retro-futuristic set from `09-design-updates-retro` — the neon hexes lacked contrast against the cream surface and made buttons hard to read. (2) Polish the tasks UI: wider container, restructured `TaskCard` (heading-font title, icon-only Delete in the top-right corner, click-the-card-to-log handler, hover animation), CSS-grid row alignment so card heights are uniform, and a new `<textarea>` description field on the create-task form via a new `Textarea` UI primitive.

## Scope

### In scope

**Palette revert**
- `tailwind.config.ts` `theme.extend.colors` goes back to the exact hexes shipped in `09-design-updates-retro`: muted teal primary (`#7faaa3` at -500), dusty orange secondary (`#d97e4b`), warm cream neutrals, terracotta danger, sage success. 17 hexes, same token names, same step counts.
- The earthy palette has clearly distinguishable -500 vs -700 pairs and saturated mid-tones that read as buttons against the cream surface — exactly the contrast property the user is missing now.

**Dashboard container width**
- The dashboard wrapper is currently `<div className="mx-auto max-w-3xl space-y-6">`. With `lg:grid-cols-3` and the rem-based default `maxWidth` scale resolving against our 10px root, `max-w-3xl` is ~480 px visible. Too narrow.
- **Add a reusable `content` entry to `theme.extend.maxWidth`** in `tailwind.config.ts` set to `1100px` — a fixed px value sitting between tablet (~768 px) and small-laptop (~1280 px). The new utility is `max-w-content`. Reusable across the app whenever a "main content max width" is needed.
- The dashboard wrapper changes to `<div className="mx-auto max-w-content space-y-6">`.
- Mobile (`<md`) is unchanged — single column, full-width minus the existing `p-4` gutter (the `mx-auto` + `max-w-content` is a no-op at viewports below 1100 px).

**`TaskCard` restructure**
- Title uses the `font-display` (Oleo Script Swash Caps) heading font instead of the current bold sans. Size stays at `text-2xl` or `text-lg` — spec-agent picks; defaults `text-2xl` to match the page heading hierarchy.
- Delete button becomes **icon-only** (`<Button leftIcon={<MdDelete />} aria-label="Delete" />` with no children). The "Delete" text is removed.
- Delete button moves to the **top-right corner** of the card. Layout: top row is a flex with title on the left and delete on the right; description (when present) sits below.
- **Card click handler**: clicking anywhere on the card (except the delete button) logs `{ id: task._id, title: task.title }` to the console. Delete's `onClick` calls `event.stopPropagation()` to prevent the card-click handler from also firing.
- **Hover animation**: the card slightly scales up (`scale: 1.02`) and gains a subtle shadow (`hover:shadow-lg` from Tailwind) on hover. The scale uses `motion.div`'s `whileHover` prop (we're already inside a `motion.div` for the entry/exit animations); the shadow uses a Tailwind transition class so the two effects compose cleanly.
- The Card surface needs `h-full` so each TaskCard fills its grid cell. Combined with the grid's default `align-items: stretch`, this ensures cards in the same row have equal heights and the row-gap reads as uniform. The Card's existing `md:max-w-md` is overridden via the consumer's `className` (`md:max-w-none`) so cards span their full grid column.
- `cursor-pointer` on the card so the click-affordance is visible.

**Create-task form — new `Textarea` primitive**
- New UI component `src/components/ui/Textarea.tsx`. API mirrors `Input.tsx`: `forwardRef`, optional `variant`, optional `error`, native `<textarea>` attributes spread, `disabled` handled the same way, error message rendered via the same `<p className="mt-1 text-base text-danger-500">` pattern.
- New prop specific to textarea: `rows` (defaults to ~4). The base classes include `resize-none` so the textarea is non-expandable per the user's brief.
- Tests required (mandatory category — UI primitive with public API): mirror `Input.test.tsx` shape with renders, variant classes, disabled, error overrides variant, ref-forwarding, onChange firing.
- `CreateTaskForm.tsx`: swap the description `<Input>` for the new `<Textarea>`. Title remains `<Input>`.
- Submit button text: `"Create"` → `"Create Task"`.

**Tests to update**
- `__tests__/components/ui/Textarea.test.tsx` — new. ~9 cases mirroring `Input.test.tsx`.
- `__tests__/components/features/TaskCard.test.tsx` — extend with cases for:
  - Card click calls `console.log` (or however the spec-agent decides to verify) with the task's id and title.
  - Clicking the Delete button does NOT trigger the card-click handler.
  - Delete button is icon-only (`getByRole('button', { name: /delete/i })` succeeds via `aria-label`, no visible "Delete" text in the DOM).
- `__tests__/components/features/CreateTaskForm.test.tsx` — adjust queries to use `getByRole('textbox', { name: /description/i })` (which works for both `<input>` and `<textarea>` — both expose the `textbox` role). Update submit-button matcher to `/create task/i`.
- Existing `Card.test.tsx` and `TasksList.test.tsx` should keep passing without changes — the Card primitive itself is unchanged; the grid layout is unchanged at the class-name level.

### Out of scope
- Editing tasks — still only create + delete.
- Click-to-open-detail-view — for now, only `console.log`. The brief explicitly says "for now".
- Tooltips on the icon-only Delete button.
- Animations on grid reflow beyond the existing `layout` prop behaviour.
- Pagination, search, sort, filter UI.
- Dark mode.
- New colour tokens or step counts.

## Specific Threads

### 1. Palette revert (exact hexes from `09-design-updates-retro`)
Replace `tailwind.config.ts`'s `theme.extend.colors` block:

| Token | Step | Hex |
|---|---|---|
| `primary` | 50, 500, 700 | `#e7f0ee`, `#7faaa3`, `#5f8b85` |
| `secondary` | 50, 500, 700 | `#f6e6e2`, `#c89b94`, `#a37b75` |
| `neutral` | 50, 100, 200, 500, 700, 900 | `#f7f5f2`, `#fbf7eb`, `#e6dcc6`, `#857c70`, `#4a4030`, `#2a2418` |

Wait — the `09` palette's `neutral-100` was `#fbf7eb` and `neutral-50` was `#f5efe1`. The architect / spec-agent will copy directly from the `09-design-updates-retro-spec.md` Assumption 4 in the archived task. Cross-reference at build time.

| Token | Step | Hex |
|---|---|---|
| `danger` | 50, 500, 700 | `#f5e1dc`, `#c97c6d`, `#a35a4c` |
| `success` | 50, 500, 700 | `#e4e6cc`, `#8aa775`, `#688553` |

Token names, step counts, and shape unchanged. Only hexes change.

### 2. `TaskCard` restructure (full new shape)

Current shape:
```tsx
<Card className="flex flex-col">
  <h3 className="text-lg font-semibold text-neutral-900">{task.title}</h3>
  {task.description && <p className="mt-2 ...">{task.description}</p>}
  <div className="mt-4 flex justify-end">
    <Button variant="danger" leftIcon={<MdDelete />}>Delete</Button>
  </div>
</Card>
```

Target shape:
```tsx
<Card
  className="h-full cursor-pointer transition-shadow hover:shadow-lg md:max-w-none"
  onClick={handleCardClick}
>
  <div className="flex items-start justify-between gap-2">
    <h3 className="font-display text-2xl text-neutral-900">{task.title}</h3>

    <Button
      type="button"
      variant="danger"
      aria-label="Delete"
      leftIcon={<MdDelete />}
      loading={isDeleting}
      onClick={handleDeleteClick}
    />
  </div>

  {task.description && (
    <p className="mt-2 text-base text-neutral-500">{task.description}</p>
  )}
</Card>
```

Plus the parent `motion.div` in `TasksList` gains a `whileHover` prop for the scale animation:
```tsx
<motion.div
  key={task._id}
  layout
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, scale: 0.95 }}
  whileHover={{ scale: 1.02 }}
  transition={{ duration: 0.2 }}
>
  <TaskCard ... />
</motion.div>
```

Handlers:
```tsx
const handleCardClick = () => {
  console.log({ id: task._id, title: task.title })
}

const handleDeleteClick = (e: React.MouseEvent) => {
  e.stopPropagation()
  onDelete(task._id)
}
```

### 3. CSS grid row alignment
The grid wrapper in `TasksList.tsx` stays at `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3`. The fix for uneven row gaps is at the **item level**: each `<TaskCard>` (or rather its `<Card>` root) needs `h-full` so it fills the grid cell. Combined with the grid's default `align-items: stretch`, cards in the same row share a height. Adjacent rows then have a consistent gap.

This is achieved via the `className="h-full md:max-w-none"` addition on the Card inside TaskCard (per the new shape above). No grid-level changes.

### 4. Dashboard wrapper width
`src/app/(main)/(private)/dashboard/page.tsx`'s wrapper changes from `<div className="mx-auto max-w-3xl space-y-6">` to `<div className="mx-auto max-w-5xl space-y-6">`. One token-level change.

### 5. New `Textarea` UI primitive
`src/components/ui/Textarea.tsx`. Outline:

```ts
type TextareaVariant = 'primary' | 'secondary' | 'danger'

export type TextareaProps = Readonly<
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant?: TextareaVariant
    error?: string
  }
>
```

Implementation mirrors `Input.tsx`:
- `'use client'`.
- `forwardRef<HTMLTextAreaElement, TextareaProps>`.
- Base classes: `block w-full resize-none rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60`.
- Variant map: same as Input — primary/secondary use `border-neutral-200` + focus ring; danger uses `border-danger-500`.
- Error behaviour: when `error` is a non-empty string, variant flips to danger; a `<p>` is rendered after the textarea.
- `rows` defaults to 4 via destructuring (`rows = 4`).

The new file lives in `src/components/ui/`. Test file at `__tests__/components/ui/Textarea.test.tsx` covers ~9 cases (mirror of `Input.test.tsx`).

### 6. Create-task form changes
Two edits to `src/components/features/CreateTaskForm.tsx`:
- Swap the description `<Input>` for `<Textarea>` (new import).
- Submit button text: `"Create"` → `"Create Task"`.

### 7. Test updates

**New test file**: `__tests__/components/ui/Textarea.test.tsx` — ~9 cases mirroring `Input.test.tsx`.

**Extended tests**:
- `__tests__/components/features/TaskCard.test.tsx`: add 3 new cases for the redesigned behaviour:
  1. **Card click logs** `{ id, title }`. Spy on `console.log` via `vi.spyOn(console, 'log').mockImplementation(...)` and assert it was called once with the right shape.
  2. **Delete button is icon-only** — the accessible name is "Delete" (from `aria-label`), but the visible text inside the button is NOT "Delete". `expect(screen.getByRole('button', { name: 'Delete' })).not.toHaveTextContent('Delete')` (or query and assert children).
  3. **Clicking Delete does NOT trigger card-click**. Spy on `console.log`, click Delete, assert `console.log` was NOT called.

  The existing 4 cases stay; total grows to 7 for `TaskCard`.

- `__tests__/components/features/CreateTaskForm.test.tsx`: adjust two queries:
  - Submit button matcher changes from `/create/i` to `/create task/i`.
  - Description query stays at `getByRole('textbox', { name: /description/i })` because both `<input>` and `<textarea>` expose the `textbox` role.

  No new cases; existing 6 cases continue to pass after the matcher updates.

- `__tests__/components/features/TasksList.test.tsx`: no changes required at the class-name assertion level. The grid changes are internal to `TaskCard`. The "delete removes task" and "create card link" assertions stay valid. Verify by re-running.

**Existing tests** should keep passing: `Card.test.tsx`, `Input.test.tsx`, `Button.test.tsx`, all middleware / action / validation tests, MainHeaderNav, SignInForm, SignUpForm.

## Folder / File Touch Points
Rough sketch — architect produces the precise list.

**New**:
- `src/components/ui/Textarea.tsx`.
- `__tests__/components/ui/Textarea.test.tsx`.

**Modified**:
- `tailwind.config.ts` — palette revert + new `maxWidth.content = '1100px'` entry under `theme.extend`.
- `src/components/features/TaskCard.tsx` — full restructure per the new shape.
- `src/components/features/TasksList.tsx` — `whileHover` added to the `motion.div`.
- `src/app/(main)/(private)/dashboard/page.tsx` — `max-w-3xl` → `max-w-5xl`.
- `src/components/features/CreateTaskForm.tsx` — `<Input>` → `<Textarea>` for description; submit button text "Create" → "Create Task".
- `__tests__/components/features/TaskCard.test.tsx` — +3 cases (card click, icon-only, delete stops propagation).
- `__tests__/components/features/CreateTaskForm.test.tsx` — submit button matcher updated.

**Unchanged**:
- All auth-related files.
- Tasks data layer (`Task` model, `tasks.ts`, validation, server actions).
- `Card.tsx`, `Button.tsx`, `Input.tsx`, `buttonClass.ts` — UI primitives stay as-is. The `Card`'s default `md:max-w-md` stays; TaskCard overrides it via consumer className.
- Layouts (root, `(main)`), error.tsx, not-found.tsx, sign-in/sign-up pages.
- Middleware and redirect-rules.
- All other tests.

## Done Criteria
- The compiled CSS contains the `09-design-updates-retro` palette hexes (e.g. `bg-primary-500` → `rgb(127 170 163)` for `#7faaa3`).
- `tailwind.config.ts` exposes a new `max-w-content` utility (= `1100px`); the dashboard wrapper uses it. Cards have more breathing room on desktop.
- Task cards in the same row have equal heights regardless of description length.
- Task card title is rendered in `font-display` (Oleo Script Swash Caps).
- Task card has an icon-only Delete button in the top-right corner with `aria-label="Delete"`.
- Clicking anywhere on the card except the Delete button logs `{ id, title }` to the console.
- Clicking Delete deletes the task and does NOT log to the console.
- Hovering the card slightly scales it (1.02x) and adds a `shadow-lg`.
- `/create-task` form's description field is a non-expandable `<textarea>` with at least 4 visible rows.
- Submit button text is "Create Task".
- `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0.
- Test suite size: previous 122 + ~9 new (Textarea) + ~3 new (TaskCard) = **~134 tests across 20 files**.
- `mcp__ide__getDiagnostics` clean.

## What This Task Does NOT Include
- Task editing.
- A detail view on card click (only `console.log` for now).
- Tooltips, modals, drawers, or any further UX surface.
- New colour tokens, font additions, or animation library changes.
- Pagination, search, sort, filter.
- Dark mode.
- Optimistic UI on create.
- Test infrastructure changes (no new Vitest config, no coverage thresholds).

## Notes for the Spec-Agent

### Open Questions to surface
1. **Title font size on TaskCard** — `text-2xl` assumed; `text-xl` is a reasonable alternative if `text-2xl` reads too loud in `font-display`. Oleo Script Swash Caps is decorative; very large sizes can dominate the card. The spec-agent locks `text-2xl`; the user can override.
2. **Scale on hover** — `1.02` is subtle. `1.05` is more pronounced. Default `1.02` per the brief's "slight" wording.
3. **Shadow class** — `hover:shadow-lg` is the default. `hover:shadow-md` is subtler. Default `hover:shadow-lg`.
4. **`console.log` payload shape** — `{ id, title }` (object) vs separate args `(id, title)`. Default object form — more discoverable in DevTools.

### Architectural calls
- **`Card` `onClick` prop**: Card uses `HTMLAttributes<HTMLDivElement>` which includes `onClick`. The current `{...props}` spread forwards it. Adding `onClick` from TaskCard works without modifying Card. Confirm during review.
- **Server vs client Card**: Card has no `'use client'` directive. When rendered inside the client `TaskCard`, it becomes part of the client bundle automatically — that's how React's `'use client'` boundary works. The `onClick` prop passing through is fine.
- **`motion.div` `whileHover` interaction with `layout` prop**: motion's `layout` and `whileHover` cooperate without issue. Hover transitions are smooth even during a layout-driven reflow elsewhere in the list.
- **Textarea `forwardRef`**: same `displayName = 'Textarea'` pattern as Input. RHF's `register('description')` returns ref + change handlers; the Textarea spread + ref-forwarding wires them up automatically.
- **Test for `console.log`**: use `vi.spyOn(console, 'log').mockImplementation(() => undefined)` in a `beforeEach` to silence + capture. Assert call counts and arguments.

### Reviewer enforcement
- AC for hover effect requires both scale (motion) AND shadow (Tailwind) — verify both apply.
- AC for click separation (delete does not log) is verified by the `stopPropagation` assertion in TaskCard.test.tsx.
- AC for icon-only delete: button accessible name comes from `aria-label`, NOT from visible text. Reviewer reads the source.
- AC for Textarea: new mandatory-category test file exists (UI primitive with public API). Skipping it is a Blocker per CLAUDE.md → Testing Rules.
