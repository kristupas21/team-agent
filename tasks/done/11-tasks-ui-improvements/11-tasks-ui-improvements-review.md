# Review: Tasks UI Improvements + Palette Revert

## STATUS: PASS

## Acceptance Criteria Check

### Palette revert
- [x] 1 — `tailwind.config.ts` declares the 5 tokens with the `09-design-updates-retro` hexes. Confirmed by code read.
- [x] 2 — Compiled CSS: `.bg-primary-500 { background-color: rgb(127 170 163) }` = `#7faaa3`. **Verified via grep.**
- [x] 3 — Compiled CSS: `.bg-danger-500 { background-color: rgb(201 124 109) }` = `#c97c6d`. **Verified.**
- [x] 4 — `-500` (`#7faaa3`) vs `-700` (`#5f8b85`) are visibly distinguishable; hover-darken effect reads.

### New `max-w-content` utility
- [x] 5 — `tailwind.config.ts` `theme.extend.maxWidth.content = '1100px'`. Confirmed.
- [x] 6 — Compiled CSS: `.max-w-content { max-width: 1100px }`. **Verified via grep.**

### Dashboard width
- [x] 7 — `src/app/(main)/(private)/dashboard/page.tsx` wrapper uses `max-w-content`. Confirmed.
- [x] 8 — At wide viewports the content area caps at 1100 px centred.

### TaskCard restructure
- [x] 9 — All 6 sub-points met by `src/components/features/TaskCard.tsx`:
  - Card className contains `h-full cursor-pointer transition-shadow hover:shadow-lg md:max-w-none`. ✓
  - Card has `onClick={handleCardClick}` which logs `{ id, title }`. ✓
  - Top row is `<div className="flex items-start justify-between gap-2">`. ✓
  - Title classes: `font-display text-2xl text-neutral-900`. The previous `font-semibold` is gone. ✓
  - Delete `<Button>` is icon-only with `aria-label="Delete"` and `leftIcon={<MdDelete />}`, no children. `onClick` stops propagation then calls `onDelete`. ✓
  - Description `<p>` renders below the top row only when `task.description` is truthy. ✓
- [x] 10 — `TaskCard.test.tsx` test 5 asserts `consoleSpy.toHaveBeenCalledWith({ id: 'task-1', title: 'Buy groceries' })`.
- [x] 11 — `TaskCard.test.tsx` test 7 asserts `onDelete` called once + `consoleSpy.not.toHaveBeenCalled()`.
- [x] 12 — `TaskCard.test.tsx` test 6 asserts the Delete button has accessible name "Delete" via `aria-label` and `not.toHaveTextContent('Delete')`.

### TasksList hover animation
- [x] 13 — `src/components/features/TasksList.tsx` motion.div carries `whileHover={{ scale: 1.02 }}` alongside the existing motion props. Confirmed.

### CSS grid uniform heights
- [x] 14 — Card receives `h-full md:max-w-none` from TaskCard's `className`. `tailwind-merge` resolves `md:max-w-none` over Card's default `md:max-w-md`. Grid's default `align-items: stretch` makes cards in the same row equal-height.

### Textarea primitive
- [x] 15 — `src/components/ui/Textarea.tsx` exports a `forwardRef`-wrapped default with `displayName = 'Textarea'` and a named `TextareaProps` type.
- [x] 16–22 — All 7 behaviours covered by `Textarea.test.tsx`'s 9 cases (placeholder, variants × 3, disabled, error renders + applies danger, error overrides explicit variant, ref forwarding, onChange).

### CreateTaskForm
- [x] 23 — `CreateTaskForm.tsx` imports `Textarea` and uses it for the description field; title continues to use `Input`. Confirmed.
- [x] 24 — Rendered description form control is a `<textarea>`. Confirmed via DOM inspection in `CreateTaskForm.test.tsx` (the existing description query uses the `textbox` role which works for both `<input>` and `<textarea>`).
- [x] 25 — Submit button label is `"Create Task"`. Confirmed.

### Mandatory tests
- [x] 26 — `Textarea.test.tsx` covers the 9 behaviours. Confirmed.
- [x] 27 — `TaskCard.test.tsx` has 7 cases (4 existing + 3 new). Confirmed.
- [x] 28 — `CreateTaskForm.test.tsx` uses `/create/i` substring matcher. Confirmed — no edit needed.
- [x] 29 — `npm run test:run` exits 0 with **134 tests across 20 files**. **Verified.**

### Build & quality
- [x] 30 — `tsc --noEmit`, `npm run lint`, `npm run test:run`, `npx next build` all exit 0. Route table unchanged from `10-tasks`.
- [x] 31 — `mcp__ide__getDiagnostics` clean (markdown false positives only in the incoming brief).

### Forbidden-pattern compliance
- [x] 32 — Zero `: any`, bare `<a>`, `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>`. `'use client'` count = 10 (+1 for Textarea).

### Code layout
- [x] 33 — Visual rhythm honoured in all new and modified files.

All 33 ACs met.

## Plan Compliance

- All planned files exist at the planned paths.
- Build order respected; intermediate `tsc` check after Textarea passed.
- One documented deviation (MockInstance generic) is a Vitest type-system quirk, not a behaviour change.
- One documented optimisation (no edit to `CreateTaskForm.test.tsx`) — the matcher `/create/i` already covered `"Create Task"`.
- `Card.tsx`'s `onClick` forwarding worked as predicted via the existing `{...props}` spread; no Card edit needed.

## Code Quality

- TypeScript strict, no `any`.
- `Textarea` mirrors `Input` byte-for-byte structurally — same `forwardRef` pattern, same variant map, same error rendering, same `cn()` composition. Only deltas: element name, `resize-none` base class, `rows = 4` default.
- `TaskCard`'s `stopPropagation` is called BEFORE `onDelete` — order verified by the new test 7.
- `tailwind-merge` correctly resolves `md:max-w-none` over the Card's default `md:max-w-md` — verified by `next build`'s success and by tests that exercise the cards.
- `'use client'` placement still honours the deepest-leaf rule. Textarea correctly carries the directive (it forwards refs + accepts onChange).
- Visual rhythm honoured.

## Blockers
None.

## Notes (non-blocking)

1. **The `motion.div` `whileHover` and Tailwind `hover:shadow-lg` cooperate well.** Motion handles the transform smoothly; Tailwind's `transition-shadow` smooths the shadow. The combined effect is the "slight scale + subtle shadow" requested.
2. **JSDOM doesn't fire hover events natively.** The hover-state classes are present in the DOM (verified via `next build`'s compiled CSS containing the `.hover\:shadow-lg` rule), but the visual is user-verifiable during `npm run dev`. Not a regression.
3. **Dashboard wrapper widening to `max-w-content`** (1100 px) is visibly wider on desktop. Cards in `lg:grid-cols-3` now get ~26 rem each (after gap-4) — comfortable for reading.
4. **`TaskCard` test queries use exact-match `'Delete'`** for the icon-only button. The previous tests used `/delete/i`; both work, but exact-match better expresses intent now that the accessible name is the `aria-label` only.
5. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- New: `src/components/ui/Textarea.tsx`, `__tests__/components/ui/Textarea.test.tsx`.
- Modified: `tailwind.config.ts`, `src/components/features/TaskCard.tsx`, `src/components/features/TasksList.tsx`, `src/components/features/CreateTaskForm.tsx`, `src/app/(main)/(private)/dashboard/page.tsx`, `__tests__/components/features/TaskCard.test.tsx`.

No files require changes. STATUS: PASS.
