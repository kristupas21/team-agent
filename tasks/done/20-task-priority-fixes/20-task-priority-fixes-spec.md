# Spec: Task Priority — Polish Fixes + Compact Button

## Summary
Three small polish fixes from the prior `task-priority` ship plus a new `compact` prop on `Button` applied to TaskCard's Delete. **F1**: pin the priority Pill to the bottom of the TaskCard via `flex flex-col` + `mt-auto pt-3` (works regardless of description presence). **F2**: give the Dropdown chevron right-edge breathing room by switching its select `BASE_CLASSES` from `px-3` to `pl-3 pr-8`. **F3**: replace the native chevron with a `MdKeyboardArrowDown` icon that rotates to "up" on focus via `peer-focus:rotate-180`. **I1**: add `compact?: boolean` to Button (default `false`) which layers `p-2` over the variant's `px-4 py-2`. **I2**: TaskCard's Delete button gets `compact`.

## Assumptions

1. **F1 — Pill positioning**:
   - `TaskCard.tsx` Card consumer className gains `flex flex-col`. Final string: `'group relative flex h-full flex-col cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'`.
   - Pill wrapper changes from `<div className="mt-3">` to `<div className="mt-auto pt-3">`.
   - The Delete button stays `absolute top-2 right-2` — unchanged anchor.

2. **F2 — Dropdown right padding**: `Dropdown.tsx` `BASE_CLASSES` `px-3` → `pl-3 pr-8`. The 32px right padding accommodates the new chevron icon plus visual breathing room.

3. **F3 — Custom chevron**:
   - Add `appearance-none` to `Dropdown.tsx` `BASE_CLASSES` so the native browser chevron is hidden.
   - Wrap the `<select>` in `<div className="relative">` (the existing fragment becomes: outer fragment → relative div containing select + chevron → optional error `<p>`).
   - Render `<MdKeyboardArrowDown>` (from `react-icons/md`) with classes `'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xl text-neutral-500 transition-transform peer-focus:rotate-180'`.
   - The select carries an additional `peer` class so the chevron's `peer-focus:` variant fires when the select gains focus.
   - `pointer-events-none` on the chevron ensures clicks pass through to the underlying `<select>` so the dropdown opens.

4. **I1 — Button `compact` prop**:
   - Extend `ButtonProps` (`src/components/ui/Button.tsx`) with `compact?: boolean` (default `false`).
   - In `Button.tsx`, when `compact === true`, layer `'p-2'` over the variant's `'px-4 py-2'` from `buttonClass(variant)`. `tailwind-merge` (via `cn()`) resolves the shorthand → longhand conflict in favour of `p-2`. Final className composition: `cn(buttonClass(variant), compact && 'p-2', className)`.
   - `buttonClass.ts` itself is NOT modified. The helper is also consumed by `MainHeaderNav` for sign-in/sign-up Link-as-button styling, which doesn't need `compact`. Keeping the helper signature stable avoids API spread.

5. **I2 — Apply compact to TaskCard Delete**:
   - The existing `className="absolute top-2 right-2 group-hover:text-neutral-50 group-hover:hover:bg-neutral-700"` stays.
   - Add `compact` as a boolean prop on the Button.

6. **No changes** to `Pill.tsx`, `Card.tsx`, `Input.tsx`, `Textarea.tsx`, `MainHeaderNav.tsx`, `MainHeader.tsx`, `TaskForm.tsx`, `DashboardWidgetCard.tsx`, or any non-listed file.

7. **No model / route / middleware / action / DAL change.**

8. **No new dependencies.** `MdKeyboardArrowDown` is already part of the `react-icons/md` set used elsewhere.

9. **Test coverage**:
   - `__tests__/components/ui/Button.test.tsx`: +2 cases (compact=true → `p-2`; compact omitted → keeps `px-4 py-2`).
   - `__tests__/components/ui/Dropdown.test.tsx`: +3 cases (`appearance-none` on select; chevron icon rendered; chevron rotates via `peer-focus:rotate-180`).
   - `__tests__/components/features/TaskCard.test.tsx`: existing "Delete button is icon-only" or "positions absolutely" cases extend to assert `p-2`; +1 new case for the pill wrapper having `mt-auto pt-3`; +1 new case for the Card having `flex flex-col`.
   - Suite target: ≥ 205 / 25 (was 198 / 25; +2 + 3 + 2 ≈ +7 cases).

## Acceptance Criteria

### F1 — Pill positioning
1. `TaskCard.tsx` Card consumer className contains `flex` AND `flex-col`.
2. The pill wrapper `<div>` has classes `mt-auto` and `pt-3` (and not `mt-3`).
3. Rendered in isolation (description present or absent), the pill DOM sits as the last interactive content in the Card before the absolutely-positioned Delete button.

### F2 — Dropdown right padding
4. `Dropdown.tsx`'s rendered select has classes `pl-3` AND `pr-8` (not `px-3`).

### F3 — Chevron
5. `Dropdown.tsx`'s rendered select has `appearance-none` and `peer` classes.
6. A chevron icon is rendered as a sibling of the select within a `relative` parent.
7. The chevron has classes `pointer-events-none`, `absolute`, `right-2`, `top-1/2`, `-translate-y-1/2`, `transition-transform`, AND `peer-focus:rotate-180`.

### I1 — Button compact
8. `Button` with `compact={true}` has rendered class `p-2` and NOT `px-4` / `py-2` (tailwind-merge collapses).
9. `Button` without `compact` (or `compact={false}`) keeps `px-4` AND `py-2`.

### I2 — TaskCard Delete compact
10. TaskCard's Delete button has rendered class `p-2`.

### Build & quality
11. `tsc --noEmit`, `npx next lint`, `npm run test:run`, `npx next build` all exit 0.
12. Suite total ≥ 205 / 25.

### Forbidden-pattern compliance
13. Zero `: any`, bare `<a>` for internal routes, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` empty-prop types.

### Code layout
14. Visual rhythm honoured.
