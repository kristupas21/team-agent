# Build Summary: Task Priority — Polish Fixes + Compact Button

## Files Modified

### Production source (3)
- `src/components/ui/Button.tsx`:
  - `ButtonProps` gains `compact?: boolean`.
  - Destructure with `compact = false`.
  - Added `import { cn } from '@/lib/utils'`.
  - className composition: `cn(buttonClass(variant), compact && 'p-2', className)`. Tailwind-merge collapses `p-2` over the variant's `px-4 py-2`.
- `src/components/ui/Dropdown.tsx`:
  - `BASE_CLASSES` gains `appearance-none`, `peer`. `px-3` → `pl-3 pr-8` (more room for the chevron).
  - Imports `MdKeyboardArrowDown` from `react-icons/md`.
  - Wraps the `<select>` in `<div className="relative">` containing select + chevron icon. Chevron classes: `'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xl text-neutral-500 transition-transform peer-focus:rotate-180'`. `aria-hidden` set.
  - Error `<p>` continues to render outside the relative wrapper.
- `src/components/features/tasks/TaskCard.tsx`:
  - Card consumer className gains `flex flex-col`. Full: `'group relative flex h-full flex-col cursor-pointer transition-colors hover:bg-neutral-900 md:max-w-none'`.
  - Pill wrapper className: `mt-3` → `mt-auto pt-3`.
  - Delete Button gains `compact` prop.

### Tests (3 files)
- `__tests__/components/ui/Button.test.tsx`: +2 cases (default keeps `px-4 py-2`; `compact` collapses to `p-2`). Total: 14.
- `__tests__/components/ui/Dropdown.test.tsx`: +3 cases (`appearance-none` + `peer` + `pl-3 pr-8` on select; chevron sibling in `relative` wrapper; chevron classes including `peer-focus:rotate-180`). Total: 13.
- `__tests__/components/features/TaskCard.test.tsx`: existing "positions Delete button absolutely" case extended to assert `p-2`; +2 new cases (Card has `flex flex-col`; pill wrapper has `mt-auto pt-3`). Total: 14.

## Files NOT Modified

- `src/components/ui/buttonClass.ts` — unchanged. The `compact` override happens inside `Button.tsx` to keep `buttonClass.ts`'s helper signature stable for `MainHeaderNav`'s sign-in/sign-up Link styling.
- `src/components/ui/Pill.tsx`, `Card.tsx`, `Input.tsx`, `Textarea.tsx` — unchanged.
- `MainHeaderNav.tsx`, `MainHeader.tsx`, `TaskForm.tsx`, `TasksList.tsx`, `DashboardWidgetCard.tsx`, `auth/SignInForm.tsx`, `auth/SignUpForm.tsx` — unchanged.
- All pages, layouts, lib, validation, actions, models, middleware — unchanged.
- `tailwind.config.ts`, `vitest.config.mts`, `package.json`, `tsconfig.json` — unchanged.

## Deviations

None. The 8-step build order held verbatim.

## Ambiguities

None required `// NOTE:` markers. Two judgement calls handled inline:

- **`aria-hidden` on the chevron icon** — the chevron is purely decorative (the `<select>` itself has its accessible name from `aria-label` or its associated `<label>`). Marking the icon hidden from a11y tree avoids it being announced as redundant.
- **Chevron color `text-neutral-500`** — matches the existing "secondary text" tone used elsewhere (TaskCard date row, error fallback). Visible against light surfaces; works against the Dropdown's `bg-white`.

## Known Issues

- **`/dashboard/tasks/[id]` First Load JS** unchanged at 1.89 kB — Dropdown's new code is small (one icon import, one wrapper div, one rotate class).
- **Native `<select>` popover styling** — still browser-default for the actual options menu. Only the trigger surface is customized. Acceptable for v1.
- **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Verification Run

- `tsc --noEmit` → exit 0.
- `next lint` → no warnings.
- `test:run` → **205 / 25** (was 198 / 25; target ≥ 205 / 25 — exact hit).
- `next build` → exit 0. Route table unchanged.
- `mcp__ide__getDiagnostics` → no source / test diagnostics.

### Test count breakdown
- `components/ui/Button.test.tsx`: 14 (was 12, +2)
- `components/ui/Dropdown.test.tsx`: 13 (was 10, +3)
- `components/features/TaskCard.test.tsx`: 14 (was 12, +2)
- All other test files unchanged.
- **Total: 205 across 25 files.**

## Mandatory Test Categories (per CLAUDE.md → Testing Rules)

- **UI primitive with new API surface** (`Button.compact`): covered by 2 new cases. ✓
- **UI primitive with new internal structure** (`Dropdown` chevron + appearance-none): covered by 3 new cases. ✓
- **Client component changed behaviour** (`TaskCard` layout + Delete compact): covered by 2 new cases + 1 extended. ✓

The mandatory category gate passes.
