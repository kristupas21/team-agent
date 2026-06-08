# Review: Task Priority — Polish Fixes + Compact Button

## STATUS: PASS

## ACs

- [x] 1 — Card has `flex flex-col`. Confirmed via test + source read.
- [x] 2 — Pill wrapper has `mt-auto pt-3` (not `mt-3`). Confirmed.
- [x] 3 — Pill positioned as last in-flow content before absolute Delete. Confirmed by DOM order + class assertion.
- [x] 4 — Dropdown select has `pl-3 pr-8`. Confirmed.
- [x] 5 — Select has `appearance-none` + `peer`. Confirmed.
- [x] 6 — Chevron is sibling in a `relative` wrapper. Confirmed.
- [x] 7 — Chevron has `pointer-events-none absolute right-2 transition-transform peer-focus:rotate-180`. Confirmed.
- [x] 8 — `compact=true` collapses padding to `p-2`. Confirmed via tailwind-merge resolution test.
- [x] 9 — Default Button keeps `px-4 py-2`. Confirmed.
- [x] 10 — TaskCard's Delete button has `p-2`. Confirmed (existing case extended).
- [x] 11 — `tsc`, `lint`, `test:run`, `next build` green. Verified.
- [x] 12 — Suite ≥ 205 / 25. **205 / 25** exact hit.
- [x] 13 — Forbidden patterns clean. Verified.
- [x] 14 — Visual rhythm honoured.

All 14 ACs met.

## Plan Compliance

- All planned edits made. The 8-step build order ran cleanly.
- `buttonClass.ts` left untouched per the plan's stability-of-helper rationale.
- `react-icons/md` reused — no new dep.

## Code Quality

- **`compact` opt-in**: the prop is additive, default-false, doesn't affect existing call sites. `MainHeaderNav`'s sign-in/sign-up Links continue to use `buttonClass('primary')` without the compact override (they don't need it).
- **`cn()` ordering**: `cn(buttonClass(variant), compact && 'p-2', className)` puts the compact override AFTER the variant base but BEFORE the user's className. User's className still wins for downstream overrides.
- **Chevron a11y**: `aria-hidden` keeps screen readers from announcing the decorative chevron alongside the select's own accessible name.
- **`peer-focus:` pattern**: the standard styled-native-select pattern. Works in JSDOM (class presence) and live browsers (visual rotation on `:focus`).
- **`mt-auto` on a flex-column child** is the canonical "push to bottom" pattern in Tailwind. The `pt-3` adds a minimum gap when card content is tall enough that there's no space to absorb.
- **`mcp__ide__getDiagnostics`** — clean across source and test files.

## Blockers
None.

## Notes (non-blocking)

1. **JSDOM and CSS pseudo-class behaviour**: `peer-focus:rotate-180` rotation is class-presence-asserted, not visually verified. The actual rotation requires a live browser. Verify during `npm run dev` if cosmetic confidence is wanted.
2. **Native select popover styling**: still browser-default. The trigger surface is customized; the actual dropdown menu remains OS-native. Acceptable for v1.
3. **`compact={true}` + leftIcon + text combo**: a future button using both would render as a tightly-padded pill. No current consumer does this; if one lands and looks awkward, revisit `compact`'s semantics.
4. **Pre-existing `next lint` deprecation warning** and **`bcryptjs` audit warnings** still emit — out of scope.

## Approved Files

- **Modified (3 source)**: `src/components/ui/Button.tsx`, `src/components/ui/Dropdown.tsx`, `src/components/features/tasks/TaskCard.tsx`.
- **Modified (3 tests)**: `__tests__/components/ui/Button.test.tsx`, `__tests__/components/ui/Dropdown.test.tsx`, `__tests__/components/features/TaskCard.test.tsx`.

No files require changes. STATUS: PASS.
