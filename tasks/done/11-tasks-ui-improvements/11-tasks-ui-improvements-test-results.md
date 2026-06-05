# Test Results: Tasks UI Improvements + Palette Revert

## Summary
**134 tests passing across 20 files** (was 122 / 19). 12 new tests landed (9 Textarea + 3 TaskCard extensions). 0 failing.

```
$ npm run test:run
 ✓ __tests__/components/ui/Textarea.test.tsx              (9 tests)  ← new
 ✓ __tests__/components/features/TaskCard.test.tsx        (7 tests)  ← was 4, +3
 ... and all 18 other test files unchanged ...

 Test Files  20 passed (20)
      Tests  134 passed (134)
```

## Coverage of Mandatory Test Categories

| Category | Touched by this task | Covered by |
|---|---|---|
| Server actions | No | n/a |
| Validation schemas | No | n/a |
| Middleware | No | n/a |
| Predicates wrapping framework errors | No | n/a |
| Client form components with state machines | No (the existing `CreateTaskForm` form contract is unchanged; only the description's underlying element changed and the matcher continued to work) | n/a |
| **UI primitive with new public API** (`Textarea`) | Yes | `Textarea.test.tsx` (9 cases) |
| **Client component with new behaviour** (`TaskCard` gained card-click logging + stopPropagation) | Yes | `TaskCard.test.tsx` (+3 cases) |
| Structural constraints | No | n/a |

The mandatory category gate passes.

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — Tailwind palette declares the 5 tokens with `09` hexes | Static-file check |
| 2 — `.bg-primary-500` compiles to `rgb(127 170 163)` | Verified via grep |
| 3 — `.bg-danger-500` compiles to `rgb(201 124 109)` | Verified via grep |
| 4 — Primary hover-darken visible | Indirect: `-500` (`#7faaa3`) vs `-700` (`#5f8b85`) are visibly distinguishable |
| 5 — `theme.extend.maxWidth.content = '1100px'` | Static-file check |
| 6 — Compiled CSS has `.max-w-content` with `max-width: 1100px` | Verified via grep |
| 7 — Dashboard wrapper uses `max-w-content` | Static-file check |
| 8 — Dashboard width caps at 1100px on wide viewports | Indirect — uses the new utility |
| 9 — TaskCard structural updates (Card className, onClick, top-row flex, title classes, icon-only Delete) | Static-file check + tests 5–7 in `TaskCard.test.tsx` |
| 10 — Card click logs `{ id, title }` | `TaskCard.test.tsx` test 5 |
| 11 — Delete click calls `onDelete` AND does NOT log (stopPropagation) | `TaskCard.test.tsx` test 7 |
| 12 — Delete button accessible name "Delete" with no visible text | `TaskCard.test.tsx` test 6 |
| 13 — `motion.div` has `whileHover` prop | Static-file check |
| 14 — Uniform card heights (Card has `h-full md:max-w-none`) | Static-file check on `TaskCard.tsx` |
| 15 — Textarea exports `forwardRef`-wrapped default + `TextareaProps` type | Static-file check + `Textarea.test.tsx` test 8 (ref forwarding) |
| 16–22 — Textarea behaviours (placeholder, variants, disabled, error, ref, onChange) | `Textarea.test.tsx` (9 cases) |
| 23 — CreateTaskForm imports + uses Textarea | Static-file check |
| 24 — Description is a `<textarea>` element | Static-file check + queryable in `CreateTaskForm.test.tsx` (textbox role works for both) |
| 25 — Submit button label is "Create Task" | Static-file check; existing `CreateTaskForm.test.tsx` `/create/i` matcher still hits |
| 26 — Textarea test exists with 9 cases | Verified |
| 27 — TaskCard test extended to 7 cases | Verified |
| 28 — CreateTaskForm matcher uses `/create/i` (substring) | Existing matcher already matches "Create Task" |
| 29 — Suite ≥ 134 / 20 | **134 / 20 exactly** |
| 30 — tsc/lint/test/build green | Verified |
| 31 — IDE diagnostics clean | Verified |
| 32 — Forbidden-pattern compliance | Verified — `'use client'` count = 10 (+1 for Textarea) |
| 33 — Visual rhythm | Spot-checked |

All 33 ACs met.

## Failing Tests
None.

## Bugs Found

Two minor type-system issues during the build, both resolved:

1. **`MockInstance` generic signature** — Vitest's `MockInstance<T>` accepts 0–1 type args, not 2. The plan's outline suggested `MockInstance<Parameters<...>, ReturnType<...>>`. Vitest's current signature is `MockInstance<T extends Procedure>`. Resolution: replace with the simpler `ReturnType<typeof vi.spyOn>` form (without generic args).
2. **`vi.spyOn<typeof console, 'log'>` overload constraint mismatch** — TypeScript's strict overload resolution rejected the generic call. Resolution: drop the generic args entirely; inference handles the spy's typed surface.

Neither is a production-code bug.

## Recommendation for Future Tests

The current suite covers the high-value surfaces. When more features land:
1. **Task editing** — if added, the new EditTaskForm needs RTL coverage + an action test.
2. **Task detail page** — when the card-click navigates to a detail view instead of logging, add a routing-aware test.
3. **Sort / filter / search UI** — each new control needs RTL coverage.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 134 across 20 files.
