# Test Results: Task Priority — Polish Fixes + Compact Button

## Summary
**205 / 25 passing** (was 198 / 25). +7 net new cases:
- +2 in `Button.test.tsx` (default `px-4 py-2` + `compact → p-2`)
- +3 in `Dropdown.test.tsx` (`appearance-none + peer + pr-8`; chevron sibling; chevron rotate)
- +2 in `TaskCard.test.tsx` (Card flex-col; pill wrapper `mt-auto pt-3`); 1 existing case extended to assert `p-2`

0 failing.

## AC Coverage

| AC | Coverage |
|---|---|
| 1 — Card has `flex flex-col` | `TaskCard.test.tsx` new case 1 |
| 2 — Pill wrapper has `mt-auto pt-3` (not `mt-3`) | `TaskCard.test.tsx` new case 2 |
| 3 — Pill is positioned as the last in-flow content before absolute Delete | Implicit (flex-col + mt-auto on the wrapper; DOM order verified by case 2) |
| 4 — `Dropdown` select has `pl-3 pr-8` (not `px-3`) | `Dropdown.test.tsx` new case |
| 5 — Select has `appearance-none` + `peer` | `Dropdown.test.tsx` new case |
| 6 — Chevron icon renders as sibling in a `relative` wrapper | `Dropdown.test.tsx` new case |
| 7 — Chevron has the rotate-180 + pointer-events-none classes | `Dropdown.test.tsx` new case |
| 8 — `compact={true}` Button has `p-2`, not `px-4`/`py-2` | `Button.test.tsx` new case |
| 9 — Default Button keeps `px-4` + `py-2` | `Button.test.tsx` new case |
| 10 — TaskCard's Delete button has `p-2` | `TaskCard.test.tsx` (existing case extended) |
| 11 — Build pipeline green | Verified |
| 12 — Suite ≥ 205 / 25 | **205 / 25** exact hit |
| 13 — Forbidden patterns | Verified — `'use client'` count unchanged at 11; zero `: any`, bare `<a>`, bare `<img>`, `next/router`, `window.location`, `React.*`, `Readonly<{}>` |
| 14 — Visual rhythm | Honoured |

All 14 ACs met.

## Failing Tests
None.

## Bugs Found
None.

## Notes

- **JSDOM and `:focus` styling**: the `peer-focus:rotate-180` class presence is asserted; the actual rotation triggered by focus is a CSS-only contract that JSDOM can't simulate visually. Class-presence is the right granularity for unit tests.
- **Tailwind-merge resolution**: confirmed via the new "compact=true → p-2 and not px-4/py-2" case that `cn(buttonClass(variant), 'p-2', ...)` correctly collapses the shorthand-vs-longhand conflict.
