# Review: Widget Images Fix

## STATUS: PASS

## Acceptance Criteria

- [x] 1 — `h-64` on Card. Verified via test 8 and source read.
- [x] 2 — `absolute -right-20 top-[15%] w-[30rem]` on image. Verified via test 7 and source read.
- [x] 3 — `left-[60%]`, `top-[50%]`, `w-32` removed. Verified via source read.
- [x] 4 — Blend / hover-filter classes still present. Test 6 (existing, unchanged) still passes.
- [x] 5 — Title classes unchanged. Test 3 (existing) still passes.
- [x] 6 — Fallback widget gets `h-64`. Test 9.
- [x] 7 — `tsc`, `lint`, `test:run`, `next build` green.
- [x] 8 — Suite total: **165 / 23** (unchanged).

All 8 ACs met.

## Notes

1. The negative `-right-20` (Tailwind: `right: -5rem`) pulls the image past the Card's right edge; `overflow-hidden` (already on Card from previous task) crops it cleanly. This is the mechanism by which the cat "peeks out" at 30rem width without bleeding past the rounded corners. Visual verification recommended via `npm run dev`.
2. The display rendering is unchanged in shape — `next/image` still receives `width=500 height=500` props (from `WIDGET_IMAGES.tasks`) for aspect-ratio reservation; only the CSS display size changed.
3. Pre-existing `next lint` deprecation warning and `bcryptjs` audit warnings still emit — out of scope.

## Blockers
None.

## Approved Files
- `src/components/features/DashboardWidgetCard.tsx`
- `__tests__/components/features/DashboardWidgetCard.test.tsx`

STATUS: PASS.
