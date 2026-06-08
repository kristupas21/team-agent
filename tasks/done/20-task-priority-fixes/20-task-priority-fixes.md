# Task Priority — Polish Fixes + Compact Button Variant

## Description

Three small fixes from the prior `task-priority` ship, plus one new `compact` prop on `Button` (and applying it to TaskCard's icon-only Delete button).

## Scope

### In scope
- **F1**: pin TaskCard's priority Pill to the bottom of the card so it doesn't ride up against the title when there's no description.
- **F2**: give the Dropdown's chevron breathing room from the right edge of the select.
- **F3**: make the chevron flip to "up" when the dropdown is open (best-effort with native `<select>`).
- **I1**: introduce a `compact: boolean` prop on `Button` (default `false`). When `true`, padding becomes equal on x and y so an icon-only button reads as roughly square.
- **I2**: apply `compact={true}` to TaskCard's Delete button.

### Out of scope
- Any other Pill, Dropdown, Button, or TaskCard change.
- Custom dropdown popover (still native `<select>`).
- Other compact-styled buttons.

## F1 — Pin Pill to Bottom

Currently `TaskCard` renders the pill in a `<div className="mt-3">` placed directly after the optional description. If `task.description` is absent, the pill sits with just `mt-3` from the date row — visually ride-up.

Fix: switch the Card to a vertical flex column and push the pill block with `mt-auto`.

- Card consumer className gains `flex flex-col`. Full string: `'group relative flex h-full flex-col cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'`.
- Pill wrapper className changes from `mt-3` to `mt-auto pt-3`.
  - `mt-auto`: claims all remaining vertical space, pinning the pill to the bottom.
  - `pt-3`: keeps a minimum 12px gap from whatever is directly above (description or date) even when the card is compact.

The Delete button stays `absolute top-2 right-2` — unaffected by the flex change because of `position: absolute`.

## F2 — Chevron Right-Edge Spacing

Currently `Dropdown`'s `<select>` uses `px-3` from `BASE_CLASSES`. Browsers render the native chevron close to the right padding line, which crowds the chevron.

Fix: change `px-3` to `pl-3 pr-8` in the Dropdown's `BASE_CLASSES` only (Input/Textarea stay at `px-3`). 32px right padding gives the chevron breathing room without affecting the option text area's left side.

## F3 — Chevron Direction

Native `<select>` doesn't expose an "open" pseudo-class universally. The closest reliable proxy is `:focus` — when the user clicks the dropdown, focus lands on the select and the OS popover opens. The arrow should rotate to "up" during focus and return to "down" on blur.

Approach: hide the native chevron and render our own SVG.

- Add `appearance-none` to the select's `BASE_CLASSES` so the native chevron disappears.
- Wrap the `<select>` in a `<div className="relative">` (the existing top-level fragment becomes: outer fragment → relative div containing select + chevron icon → optional error `<p>`).
- Add a chevron icon (`MdKeyboardArrowDown` from `react-icons/md`, already used elsewhere) absolutely positioned at `right-2 top-1/2 -translate-y-1/2`. `pointer-events-none` so it doesn't intercept clicks.
- Use `peer` on the `<select>` and `peer-focus:rotate-180` on the chevron, plus `transition-transform` for a smooth flip.

This is the standard styled-native-select pattern. Doesn't require any JS state; CSS-only.

## I1 — Button Compact Prop

Goal: equal x-y padding so icon-only buttons read as roughly square.

- Extend `ButtonProps` with `compact?: boolean` (default `false`).
- In `Button.tsx`, when `compact === true`, layer `p-2` on top of `buttonClass(variant)`'s `px-4 py-2`. `tailwind-merge` collapses to `p-2`.
- `buttonClass.ts` itself doesn't change — the override happens inside `Button.tsx`:
  ```tsx
  className={cn(buttonClass(variant), compact && 'p-2', className)}
  ```

Reasoning for keeping `buttonClass.ts` unchanged: it's also consumed by `MainHeaderNav` for sign-in/sign-up Link-as-button styling. Those don't need compact. Keeping the helper signature narrow avoids API spread.

## I2 — Apply compact to TaskCard's Delete Button

In `TaskCard.tsx`, the Delete Button gains `compact`. The existing `className` (positioning + hover overrides) stays.

```tsx
<Button
  type="button"
  variant="ghost"
  compact
  aria-label="Delete"
  leftIcon={<MdClose />}
  loading={isDeleting}
  onClick={handleDeleteClick}
  className="absolute top-2 right-2 group-hover:text-neutral-50 group-hover:hover:bg-neutral-700"
/>
```

## Tests

### `__tests__/components/ui/Button.test.tsx`
- +1 case: "applies `p-2` when compact=true".
- +1 case: "uses `px-4 py-2` by default when compact is omitted".

### `__tests__/components/ui/Dropdown.test.tsx`
- +1 case: "applies `appearance-none` to the select".
- +1 case: "renders the chevron icon as a sibling of the select".
- +1 case: "applies `peer` to the select and `peer-focus:rotate-180` to the chevron".

### `__tests__/components/features/TaskCard.test.tsx`
- Update existing "Delete button is icon-only" or "positions Delete button" case (or add new one): assert the Delete button has `p-2` class.
- +1 case: "pill wrapper uses `mt-auto pt-3` so the pill is pinned to the bottom".
- Existing "Card classes" can also assert `flex flex-col` is present.

## Open Questions

1. **Chevron rotation: rotate-180 only on `:focus`, or also on `:active`?** Lean: `:focus` only. Sufficient for click-to-open and tab-then-space-to-open flows. Keyboard a11y not regressed.

2. **Dropdown right padding value: `pr-8` (32px) vs. `pr-10` (40px)?** Lean: `pr-8`. The chevron icon at `right-2 top-1/2` has ~8px from the right edge; `pr-8` keeps option text 8px away from the chevron's left edge — comfortable.

3. **Compact padding value: `p-2` (8px) vs. `p-1.5` (6px) vs. `p-3` (12px)?** Lean: `p-2`. Matches the current `py-2` so vertical stays consistent; horizontal shrinks from 16px → 8px.

4. **`compact` interaction with `leftIcon + text`?** Today's only consumer is the icon-only Delete. If a future button uses `compact` with both icon and text, the result would be a tightly-padded pill. Lean: accept as-is; no new constraints.

## Done Criteria

- TaskCard's Pill always sits at the bottom of the Card, regardless of description presence.
- Dropdown chevron has visible spacing from the right edge.
- Dropdown chevron rotates to "up" when focused; returns to "down" on blur.
- `Button` has a `compact` prop, defaults to `false`.
- TaskCard's Delete button passes `compact`.
- `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all green.
- Suite total ≥ 203 / 25 (was 198 / 25; +2 Button, +3 Dropdown, +1–2 TaskCard ≈ +5–7 cases).

## What This Task Does NOT Include

- Other compact-styled buttons across the app.
- Other Dropdown polish (custom focus ring, animated popover, etc.).
- TaskCard layout changes beyond the pill-pinning flex switch.
- Pill component changes.
- New tests beyond the categories above.
