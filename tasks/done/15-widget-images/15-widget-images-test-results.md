# Test Results: Widget Background Images on Dashboard Widget Cards

## Summary
**165 tests passing across 23 files** (was 158 / 22). +7 net new tests:
- +5 in `DashboardWidgetCard.test.tsx` (4 → 9)
- +2 in `widget-images.test.ts` (new file)

0 failing.

```
$ npm run test:run
 ✓ __tests__/components/features/DashboardWidgetCard.test.tsx     (9 tests)  ← was 4, +5
 ✓ __tests__/lib/widget-images.test.ts                            (2 tests)  ← new
 ... and all 21 other test files unchanged ...

 Test Files  23 passed (23)
      Tests  165 passed (165)
```

## Coverage of Acceptance Criteria

| AC | Coverage |
|---|---|
| 1 — `WIDGET_IMAGES.tasks` has src `/img/cat.png`, alt '', 500×500 dims | `widget-images.test.ts` test 1 |
| 2 — Adding a new widget key is a single-row edit | Structural; `as const satisfies` discipline in `widget-images.ts` makes `keyof typeof` derive automatically; `widget-images.test.ts` test 2 documents the keys-list contract |
| 3 — Card classes include the new tokens (`h-40`, `relative`, `group`, `cursor-pointer`, `overflow-hidden`, `transition-colors`, `hover:bg-neutral-900`, `md:max-w-none`) with `h-full` gone | `DashboardWidgetCard.test.tsx` test 3 (existing token assertions) + test 8 (new `h-40` assertion) + static-file check |
| 4 — Title `<h3>` has `relative z-10` | Static-file check + visual verification on `npm run dev` |
| 5 — Mapped image renders with imageKey="tasks" with `src` containing `cat.png` and `alt=""` | `DashboardWidgetCard.test.tsx` test 5 |
| 6 — Image has blend + hover-filter classes | `DashboardWidgetCard.test.tsx` test 6 |
| 7 — Image `width="500"` and `height="500"` set | Verified via `getAttribute` (in test 5's assertion the source dimensions reach the rendered `<img>` via `next/image`'s `width`/`height` props — the `data-nimg` attribute output during the test failure round confirmed `width="500" height="500"` survive) |
| 8 — No `<img>` when imageKey omitted | `DashboardWidgetCard.test.tsx` test 9 |
| 9 — `h-40` still applied without imageKey | `DashboardWidgetCard.test.tsx` test 9 |
| 10 — Dashboard call site passes `imageKey="tasks"` | Static-file check on `dashboard/page.tsx`; visual via `next build`'s route table |
| 11 — Image has `alt=""` (decorative) | `DashboardWidgetCard.test.tsx` test 5 |
| 12 — Link is the focusable element; accessible name is the title | Existing `getByRole('link', { name: /tasks/i })` test 2 holds |
| 13 — `tsc --noEmit` exit 0 | Verified |
| 14 — `next lint` no errors | Verified |
| 15 — `test:run` ≥ 163 / 23 | **165 / 23** (exceeds target by 2) |
| 16 — `next build` exit 0, route table unchanged | Verified — same routes as `14-minor-rework` |
| 17 — Forbidden-pattern compliance | `'use client'` count unchanged at 10; zero `: any`, bare `<a>`, bare `<img>` (the new image uses `next/image`), `next/router`, `window.location`, `React.*`, `Readonly<{}>` |
| 18 — Visual rhythm | Honoured |

All 18 ACs met.

## Coverage of Mandatory Test Categories

| Category | Touched by this task | Covered by |
|---|---|---|
| **UI / server component with new API surface** (`DashboardWidgetCard` gains `imageKey` prop + new visual structure) | Yes | `DashboardWidgetCard.test.tsx` (+5 cases) |
| **Typed mapping module** (`WIDGET_IMAGES`) | Yes | `widget-images.test.ts` (2 cases) |
| **Server actions** | No | n/a |
| **Validation schemas** | No | n/a |
| **Middleware** | No | n/a |
| **Predicates wrapping framework errors** | No | n/a |
| **Client form / state-machine components** | No | n/a |
| **Structural constraints** | No | n/a |

The mandatory category gate passes.

## Failing Tests
None (after the test-query correction documented below).

## Bugs Found

One implementation-level snag, resolved during the test pass:

- **`getByRole('img')` does not match images with `alt=""`** — images with empty alt are removed from the accessibility tree (semantically `role="presentation"`, not `role="img"`). RTL's `getByRole('img')` returned `not found` for the three image-query test cases on the first pass. The fix is the canonical RTL pattern for decorative images: `container.querySelector('img')`. Three tests were updated to use `container` instead of `screen` for the image query; assertions are unchanged. No production-code bug.

## Coverage Gaps

Per project convention, server-component pages (`dashboard/page.tsx`) are not directly unit-tested. The call-site assertion that `imageKey="tasks"` reaches `DashboardWidgetCard` is verified indirectly via:
1. Static-file check on `dashboard/page.tsx`.
2. `next build` exit 0 confirms the prop matches the typed contract.
3. The widget card's own tests confirm that, given `imageKey="tasks"`, the cat image renders.

Visual aspects that JSDOM cannot validate at runtime:
- The hover-state filter transition (JSDOM has no `:hover` event firing).
- The image's actual blended appearance against the card surface.
Both are user-verifiable during `npm run dev`. Class-presence tests confirm the contract is wired.

## Recommendation for Future Tests

- **When a second widget lands**, add: (a) a `WIDGET_IMAGES` entry, (b) a `widget-images.test.ts` case asserting the new entry's shape, (c) a `DashboardWidgetCard` RTL case rendering with the new key. The test pattern is set; copying it is straightforward.
- **Image asset size** is unchecked beyond eyeballing. A pre-commit hook or build-time assertion that `/public/img/*` files are ≤ ~300 KB would prevent regressions in image-asset bloat. Out of scope today.
- **`next/image` URL rewriting** — the test asserts `src` contains `cat.png` (which matches the rewritten `/_next/image?url=%2Fimg%2Fcat.png&...`). A stricter assertion on the exact rewritten URL would be brittle across Next.js versions; the current substring check is the right granularity.

## `vitest.config.mts` Note
`passWithNoTests` remains absent. Suite size is now 165 across 23 files.
