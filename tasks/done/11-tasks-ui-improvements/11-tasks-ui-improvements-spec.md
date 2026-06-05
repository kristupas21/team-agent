# Spec: Tasks UI Improvements + Palette Revert

## Summary
Two coordinated threads in one shipping unit:

1. **Palette revert** — back to the earthy retro-futuristic hexes from `09-design-updates-retro`. The neon palette shipped in `10-tasks` has insufficient `-500`-vs-surface contrast on the cream background. Same 5 tokens, same step counts, exact `09` hexes restored. Plus a new `max-w-content` Tailwind utility set to `1100px` for reusable main-content widths.
2. **Tasks UI polish** — widen the dashboard container via the new `max-w-content`, restructure `TaskCard` (Oleo display heading, icon-only Delete in the top-right, full-card click handler that logs id+title, motion `whileHover` scale + Tailwind `hover:shadow-lg`), ensure uniform card heights via `h-full + md:max-w-none`, swap the create-task form's description to a new `<Textarea>` UI primitive with `resize-none`, and change submit button text from "Create" to "Create Task".

One new UI primitive (`Textarea`) + its test file. `TaskCard.test.tsx` extends with 3 new behavioural cases. `CreateTaskForm.test.tsx` adjusts two matchers. Existing 122 tests stay green. Suite size grows to ~134 across 20 files.

## Assumptions

1. **Palette hexes (locked — copied byte-for-byte from `09-design-updates-retro-spec.md`)**:

   | Token | Step | Hex |
   |---|---|---|
   | `primary` | 50  | `#e7f0ee` |
   | `primary` | 500 | `#7faaa3` |
   | `primary` | 700 | `#5f8b85` |
   | `secondary` | 50  | `#f6e6e2` |
   | `secondary` | 500 | `#c89b94` |
   | `secondary` | 700 | `#a37b75` |
   | `neutral` | 50  | `#f5efe1` |
   | `neutral` | 100 | `#fbf7eb` |
   | `neutral` | 200 | `#e6dcc6` |
   | `neutral` | 500 | `#857c70` |
   | `neutral` | 700 | `#4a4030` |
   | `neutral` | 900 | `#2f2a23` |
   | `danger` | 50  | `#f5e1dc` |
   | `danger` | 500 | `#c97c6d` |
   | `danger` | 700 | `#a35a4c` |
   | `success` | 50  | `#e4e6cc` |
   | `success` | 500 | `#8aa775` |
   | `success` | 700 | `#688553` |

2. **New `max-w-content` Tailwind utility**: `theme.extend.maxWidth.content = '1100px'`. Px-based (bypasses the 10px-root rem rebase). Reusable wherever a main-content cap is wanted.

3. **`font-display` (Oleo Script Swash Caps) on TaskCard title.** Size: `text-2xl`. Combined classes: `font-display text-2xl text-neutral-900`. The base `font-semibold` (sans-serif weight) is dropped — `font-display` doesn't pair with explicit weight classes the same way.

4. **Delete button is icon-only** with `aria-label="Delete"`. No visible label inside the button. `Button` already supports this shape (since `09-design-updates-retro`).

5. **Delete button position is top-right** of the card. Implementation: top row uses `flex items-start justify-between gap-2`. Title sits on the left; Delete sits on the right. Description (when present) sits below.

6. **Card click handler logs `{ id, title }` object** to the console. `console.log({ id: task._id, title: task.title })`. Object form (Open Question #4 default).

7. **Card click vs Delete click separation** — Delete `onClick` calls `event.stopPropagation()` before invoking `onDelete(task._id)`. Card-level handler fires for anywhere ELSE inside the card.

8. **Hover animation**:
   - Scale: `motion.div` `whileHover={{ scale: 1.02 }}`.
   - Shadow: Tailwind `hover:shadow-lg transition-shadow` on the Card itself.
   - Both compose cleanly. Motion handles the transform; Tailwind handles the shadow CSS transition.

9. **CSS grid uniform card heights** — fix is at the *item level*. The Card inside `TaskCard` gains `h-full md:max-w-none` (`md:max-w-none` overrides Card's default `md:max-w-md`, which would otherwise cap each card at 28 rem visible). Combined with the grid's default `align-items: stretch`, each motion.div fills its grid cell and the Card fills the motion.div.

10. **Dashboard wrapper widening**: `<div className="mx-auto max-w-3xl space-y-6">` → `<div className="mx-auto max-w-content space-y-6">`. One token swap.

11. **`Textarea` UI primitive** at `src/components/ui/Textarea.tsx`. API mirrors `Input.tsx`:
    ```ts
    type TextareaVariant = 'primary' | 'secondary' | 'danger'
    export type TextareaProps = Readonly<
      TextareaHTMLAttributes<HTMLTextAreaElement> & {
        variant?: TextareaVariant
        error?: string
      }
    >
    ```
    Base classes: `block w-full resize-none rounded-md border px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60`. The `resize-none` is the key difference vs `Input`. Variant classes identical to `Input`. Error rendering identical. Uses `forwardRef<HTMLTextAreaElement, TextareaProps>` with explicit `displayName = 'Textarea'`. Default `rows = 4` via destructuring.

12. **`CreateTaskForm.tsx`** swaps the description `<Input>` for `<Textarea>` (new import). Submit button text changes from `"Create"` to `"Create Task"`. Title stays as `<Input>`.

13. **Tests added**:
    - `__tests__/components/ui/Textarea.test.tsx` — **9 cases** mirroring `Input.test.tsx`: renders with placeholder, primary/secondary/danger variant classes, disabled, error renders + applies danger, error overrides explicit variant, ref-forwarding, onChange fires.
    - `__tests__/components/features/TaskCard.test.tsx` — **+3 new cases** on top of the existing 4:
      - Clicking the card logs `{ id, title }` to console once.
      - Delete button has no visible "Delete" text (icon-only via `aria-label`).
      - Clicking Delete does NOT trigger the card-click handler (console.log not called when Delete is clicked).
    - `__tests__/components/features/CreateTaskForm.test.tsx` — **matchers updated**: submit button name changes from `/create/i` to `/create task/i`; description query stays `getByRole('textbox', { name: /description/i })` (works for `<textarea>` too). Existing 6 cases continue to pass.

14. **Existing 122 tests continue to pass without modification**. The `Card.test.tsx` `bg-neutral-100` assertion stays valid (Card's class names are stable; only the resolved hex changes). The middleware, action, validation, sign-in, sign-up, MainHeaderNav, Input, Button tests are all class-name- or behaviour-targeted and unaffected.

15. **No CLAUDE.md or `agents/*` changes** — the existing rules cover everything.

16. **`'use client'` count grows by 1** — the new `Textarea` is a client component (it consumes `onChange` and forwards `ref`). New count: 10 (was 9 after `10-tasks`).

17. **No new dependencies.** `motion`, `react-icons`, `react-hook-form`, `@hookform/resolvers`, `zod` all already installed.

18. **`Card` component itself is NOT modified.** `Card` retains `bg-neutral-100`, `border-neutral-200`, etc. — class names stable, only resolved hex values change via Tailwind. TaskCard's consumer `className` overrides the parts it needs (`h-full md:max-w-none cursor-pointer transition-shadow hover:shadow-lg`).

19. **`onClick` flows through `Card`** because Card already accepts the full `HTMLAttributes<HTMLDivElement>` shape and spreads them onto the underlying `<div>`. No Card edit needed.

## Open Questions

1. **Title font size on TaskCard** — Default `text-2xl`. Alternatives: `text-xl` (smaller, less dominant), `text-3xl` (larger). Preference-driven.
2. **Hover scale** — Default `1.02`. Alternatives: `1.03`, `1.05`. The brief wanted "slight"; `1.02` is the lower-bound subtle.
3. **Hover shadow class** — Default `hover:shadow-lg`. Alternative `hover:shadow-md` is subtler.
4. **`console.log` payload shape** — Default `{ id, title }` object form. Alternative: separate args `(id, title)`.

## Routes / Pages

| Path | File | Title | Purpose |
|---|---|---|---|
| `/dashboard` (modify) | `src/app/(main)/(private)/dashboard/page.tsx` | unchanged | Wrapper width swap `max-w-3xl` → `max-w-content`. |
| `/create-task` (modify) | `src/app/(main)/(private)/create-task/page.tsx` | unchanged | Unchanged at page level — the form swap is internal to `CreateTaskForm`. |
| (all other routes) | unchanged | unchanged | Palette flows through Tailwind class names. |

No route adds, deletes, or moves.

## Data

### Data Types
```ts
// src/components/ui/Textarea.tsx
type TextareaVariant = 'primary' | 'secondary' | 'danger'

export type TextareaProps = Readonly<
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    variant?: TextareaVariant
    error?: string
  }
>
```

No other types introduced. `TaskCard`'s props stay the same (`{ task, onDelete, isDeleting }`).

### API Endpoints
None changed.

### Dependencies
None added.

### Environment Variables
None added.

## Components

| Name | Type | Purpose | Change |
|---|---|---|---|
| `Textarea` (new) | client | UI primitive — non-expandable textarea with variants + error state. | New file. |
| `TaskCard` (modify) | client | Renders one task. Top-right icon Delete, font-display heading, full-card clickable. | Restructured per Assumption 5–9. |
| `TasksList` (modify) | client | Owns the task array + delete handler. | Adds `whileHover={{ scale: 1.02 }}` to each `motion.div`. |
| `CreateTaskForm` (modify) | client | Create-task form. | Description swaps from `<Input>` to `<Textarea>`. Submit text → "Create Task". |
| `DashboardPage` (modify) | server | Tasks-list page. | Wrapper width swap. |

No new feature components beyond `Textarea`. No deletions.

## User Interactions

### Hovering a task card
1. Mouse enters the card region.
2. `motion.div` applies `scale: 1.02` smoothly via the `whileHover` prop's default transition.
3. The Card's `hover:shadow-lg` CSS class transitions the box-shadow to a larger size.
4. `cursor-pointer` shows a pointer cursor.
5. Mouse leaves → motion reverses scale to 1; shadow transitions back.

### Clicking a task card (not the Delete button)
1. User clicks anywhere on the card except the Delete button.
2. The Card's `onClick` handler fires → `console.log({ id, title })`.
3. No state change. (Future tasks will navigate to a detail page; for now it's a console-log placeholder.)

### Clicking the Delete button on a task card
1. User clicks the icon-only Delete button.
2. The button's `onClick` runs: `event.stopPropagation()` first, then `onDelete(task._id)`.
3. The Card's `onClick` is NOT triggered (propagation stopped).
4. `TasksList` enters its existing delete flow: sets `isDeleting` for the task, calls `deleteTaskAction`, removes the task on success with the fade-out animation. The Delete button shows `loading={true}` ("Loading..." label, icon hidden, button disabled, `aria-busy="true"`).

### Filling the create-task form
1. User on `/create-task` sees title input (autofocus) and the new description `<textarea>` (4 rows visible, `resize-none`).
2. User types a title and an optional multi-line description.
3. Clicks the "Create Task" button (renamed).
4. Form submits via the existing `createTaskAction` server action. Redirect to `/dashboard` on success.

### Failure paths (unchanged)
- Empty title → per-field "Title must be at least 3 characters." rendered under the title input.
- Server returns `{ success: false }` → root error rendered below the submit button.
- Submit-in-flight → both fields disabled, button label "Loading...".

## States

### Task card
- **Idle**: heading row (title left, Delete icon right), description below if present. Cream Card surface. Hover state available.
- **Hover**: card scales to `1.02`, gains `shadow-lg`.
- **Deleting**: Delete button shows `loading` (label `"Loading..."`, icons hidden, button disabled). Rest of the card stays interactive but mouse events on it are essentially no-ops since the user is committed to the delete.

### Tasks grid (uniform heights)
- Each TaskCard's root `<div>` (Card) has `h-full`, so within a row of the grid all cards stretch to the tallest card's height. Row-gap reads uniform regardless of content differences.

### Create-task form
- **Initial**: title input focused; description textarea has 4 rows visible (no resize handle).
- **Field error**: per-field plain-text error under the failing field.
- **Submit pending**: title and description disabled; submit button "Loading...".
- **Server error**: root error below the submit button.

### Palette flow-through
- Buttons (any variant) get the darker muted-teal / dusty-orange / terracotta hexes restored. Hover-darken from `-500` to `-700` is visibly distinguishable.
- Header surface (`bg-neutral-100` → `#fbf7eb` warm cream tint).
- Page background (`bg-neutral-50` → `#f5efe1` warm cream).
- Card surface (`bg-neutral-100` → `#fbf7eb`, slightly lighter than page).

## Acceptance Criteria

### Palette revert
1. Given `tailwind.config.ts`, when read, then `theme.extend.colors` declares exactly the 5 tokens with the hexes from Assumption 1.
2. Given the compiled CSS after `npx next build`, when grep'd, then `.bg-primary-500` resolves to `rgb(127 170 163)` (= `#7faaa3`).
3. Given the compiled CSS, then `.bg-danger-500` resolves to `rgb(201 124 109)` (= `#c97c6d`).
4. Given the running app, when a primary button is hovered, then the background visibly darkens from `#7faaa3` (`-500`) to `#5f8b85` (`-700`). (Visual — not strictly tested but enabled by the palette.)

### New Tailwind utility
5. Given `tailwind.config.ts`, when read, then `theme.extend.maxWidth.content` is `'1100px'`.
6. Given the compiled CSS, when grep'd for `.max-w-content`, then a rule exists mapping it to `max-width: 1100px`.

### Dashboard width
7. Given `src/app/(main)/(private)/dashboard/page.tsx`, when read, then the wrapper `<div>` uses `max-w-content` (not `max-w-3xl`).
8. Given a desktop viewport of 1440 px, when the dashboard renders, then the inner content area is at most 1100 px wide centered horizontally.

### TaskCard restructure
9. Given `src/components/features/TaskCard.tsx`, when read, then:
   - The Card receives `className` containing `h-full`, `md:max-w-none`, `cursor-pointer`, `transition-shadow`, `hover:shadow-lg`.
   - The Card receives an `onClick` handler that calls `console.log({ id, title })`.
   - The top row of content is a `flex items-start justify-between gap-2` containing the title and the Delete button.
   - The title `<h3>` has classes containing `font-display` and `text-2xl` and `text-neutral-900`. The `font-semibold` class is removed.
   - The Delete `<Button>` is icon-only — no children, `aria-label="Delete"`, `leftIcon={<MdDelete />}`. Calls `onClick` that stops propagation then calls `onDelete(task._id)`.
   - The description `<p>` renders below the top row, only when `task.description` is truthy.
10. Given a TaskCard rendered with a task, when the card is clicked, then `console.log` is called exactly once with `{ id: task._id, title: task.title }`.
11. Given a TaskCard rendered with a task, when the Delete button is clicked, then `onDelete` is called exactly once with the task id AND `console.log` is NOT called (propagation stopped).
12. Given a TaskCard, when inspected, then `getByRole('button', { name: 'Delete' })` succeeds via `aria-label` and has no visible "Delete" text inside the button (the button contains only the icon).

### TasksList hover animation
13. Given `src/components/features/TasksList.tsx`, when read, then each `motion.div` carries a `whileHover={{ scale: 1.02 }}` prop alongside the existing `initial / animate / exit / layout` props.

### CSS grid uniform heights
14. Given multiple task cards with different content lengths rendered in `lg:grid-cols-3`, when inspected, then each card's wrapping motion.div fills its grid cell and the Card inside fills the motion.div (via `h-full`). All cards in the same row share a height because of the grid's default `align-items: stretch`.

### Textarea primitive
15. Given `src/components/ui/Textarea.tsx`, when read, then it exports a default `Textarea` wrapped in `forwardRef<HTMLTextAreaElement, TextareaProps>` and a named `TextareaProps` type. `displayName === 'Textarea'`.
16. Given `<Textarea />`, when rendered, then the DOM contains a `<textarea>` element with the primary variant classes and the `resize-none` class.
17. Given `<Textarea variant="secondary" />` and `<Textarea variant="danger" />`, when rendered, then each carries the variant-specific class set.
18. Given `<Textarea disabled />`, when rendered, then the textarea has the `disabled` attribute and the `disabled:opacity-60` / `disabled:cursor-not-allowed` classes.
19. Given `<Textarea error="Bad" />`, when rendered, then the textarea carries the danger variant classes (overriding any explicit non-danger variant) AND a `<p>` containing `"Bad"` renders immediately after.
20. Given `<Textarea variant="primary" error="Bad" />`, when rendered, then the danger classes win.
21. Given `<Textarea ref={ref} />`, when rendered, then `ref.current` is the underlying `<textarea>` element.
22. Given `<Textarea onChange={fn} />`, when the user types, then `fn` is called.

### Create-task form
23. Given `src/components/features/CreateTaskForm.tsx`, when read, then it imports `Textarea` from `@/components/ui/Textarea` and uses it for the description field instead of `Input`. The title field continues to use `Input`.
24. Given the create-task form rendered, when inspected, then the description form control is a `<textarea>` element (not an `<input>`).
25. Given the create-task form rendered, when inspected, then the submit button label is `"Create Task"` (not `"Create"`).

### Mandatory tests
26. Given `__tests__/components/ui/Textarea.test.tsx`, when read, then it covers at least the 9 behaviours listed under Assumption 13.
27. Given `__tests__/components/features/TaskCard.test.tsx`, when read, then it covers at least 7 cases (4 existing + 3 new for card-click logging, icon-only Delete, and stop-propagation).
28. Given `__tests__/components/features/CreateTaskForm.test.tsx`, when read, then its submit button matcher uses `/create task/i`.
29. Given `npm run test:run`, when run, then it exits 0 with at least **134 tests across 20 files** (122 previous + ~9 Textarea + ~3 TaskCard). No existing tests regress.

### Build & quality
30. Given `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build`, when each is run, then each exits 0. Route table unchanged from `10-tasks`.
31. Given `mcp__ide__getDiagnostics`, when called, then no diagnostics surface in any source or test file.

### Forbidden-pattern compliance
32. Given the codebase, when grep'd, then no `: any`, no bare `<a>` for internal routes, no `<img>`, no `next/router`, no `window.location`, no `React.*` namespace references, no `Readonly<{}>` empty type. `'use client'` count grows by exactly 1 (the new `Textarea`).

### Code layout
33. Given all new and modified files, when read, then they honour CLAUDE.md → "Code Layout — Visual Rhythm".

## Notes for Downstream Agents

- **Architect**: confirm `Card`'s `cn(...)` correctly resolves `md:max-w-none` over `md:max-w-md` via `tailwind-merge`. tailwind-merge is conflict-aware on max-width utilities, so the consumer-provided `md:max-w-none` should win. Double-check during the build if the visual still caps at 28 rem.
- **Architect**: the `onClick` flowing through `Card` requires no `Card.tsx` modification — `HTMLAttributes<HTMLDivElement>` already includes `onClick`. Reviewer verifies by reading `Card.tsx` (unchanged).
- **Builder**: when extending the TaskCard test for `console.log`, use `vi.spyOn(console, 'log').mockImplementation(() => undefined)` in `beforeEach`. Assert call count and arguments via `expect(consoleSpy).toHaveBeenCalledWith({ id: ..., title: ... })`.
- **Builder**: for the "delete doesn't propagate" test, render the TaskCard, spy on console, click the Delete button, then assert `expect(consoleSpy).not.toHaveBeenCalled()`. The card-level onClick should not have fired.
- **Builder**: `motion`'s `whileHover` prop on `motion.div` is the documented API; no extra setup needed. JSDOM doesn't fire hover events natively, so the hover state isn't tested at the unit level — it's a visual check the user verifies manually.
- **Reviewer**: AC #11 (stop-propagation) is the linchpin of the card-click feature. Verify the Delete button's onClick calls `event.stopPropagation()` BEFORE calling `onDelete`. Order matters — if `onDelete` mutates state synchronously and triggers a re-render before stopPropagation runs, propagation has already happened.
- **Reviewer**: AC #14 (uniform card heights) is verifiable via DOM inspection but cleanest via static-file check on TaskCard's className containing `h-full md:max-w-none`.
- **Reviewer**: AC #29 — suite size 134+ minimum. Any drop below indicates a missing test category.
- **No runtime smoke required.** All behavioural ACs are covered by unit/RTL tests; visual ACs (hover scale + shadow, palette colours) are flow-through via Tailwind class names and verifiable by the spec's compiled-CSS greps.
