# Build Plan: Task Priority — Polish Fixes + Compact Button

## Overview
Three source edits (Button, Dropdown, TaskCard) and three test extensions. No new files.

## Files to Modify

### `src/components/ui/Button.tsx`
- Add `compact?: boolean` to `ButtonProps`.
- Destructure `compact = false`.
- Update className: `cn(buttonClass(variant), compact && 'p-2', className)`.
- Import `cn` from `@/lib/utils`.

### `src/components/ui/Dropdown.tsx`
- `BASE_CLASSES`: `px-3` → `pl-3 pr-8`; add `appearance-none` and `peer` (already, the `peer` is added to the select element via the className string).
- Wrap the `<select>` in `<div className="relative">`. Add `MdKeyboardArrowDown` icon as sibling.
- Chevron classes: `'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xl text-neutral-500 transition-transform peer-focus:rotate-180'`.

### `src/components/features/tasks/TaskCard.tsx`
- Card consumer className: add `flex flex-col`.
- Pill wrapper: `mt-3` → `mt-auto pt-3`.
- Delete Button: add `compact` prop.

### Tests
- `__tests__/components/ui/Button.test.tsx`: +2 cases.
- `__tests__/components/ui/Dropdown.test.tsx`: +3 cases.
- `__tests__/components/features/TaskCard.test.tsx`: +2 cases (pill wrapper + Card flex); update existing Delete-button case to assert `p-2`.

## Build Order
1. Edit `Button.tsx`.
2. Edit `Dropdown.tsx`.
3. Edit `TaskCard.tsx`.
4. Edit `Button.test.tsx`.
5. Edit `Dropdown.test.tsx`.
6. Edit `TaskCard.test.tsx`.
7. `tsc --noEmit`, `next lint`, `test:run`, `next build`. All exit 0.
8. Write artefact docs.
